import crypto from 'node:crypto'
import { KeysetService } from '#services/keyset/keyset.service'
import { PlatformManager } from '#services/platform-manager/platform-manager.service'
import { buildMockDatabaseManager } from '#utils/tests/mock-database-manager'
import { buildMockHttpHandler } from '#utils/tests/mock-http-handler'
import { buildMockCacheManager } from '#utils/tests/mock-cache-manager'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import { HttpMethod } from '#services/http-handler/http-handler.types'
import type { HttpRequestParameters, HttpResponse } from '#services/http-handler/http-handler.types'
import type { DatabaseManager, PlatformAttributes } from '#services/database-manager/database-manager.types'
import type { CacheManager } from '#services/cache-manager/cache-manager.types'
import type { Logger } from '#services/logger/logger.types'

const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }

const generateKeyPair = (): { publicKey: string; privateKey: string } =>
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  })

const savePlatform = async (
  databaseManager: DatabaseManager,
  overrides: Partial<PlatformAttributes> = {},
): Promise<string> => {
  const { publicKey, privateKey } = generateKeyPair()
  return await databaseManager.savePlatform({
    url: 'http://localhost/moodle',
    clientId: 'ClientId1',
    name: 'Moodle',
    authenticationEndpoint: 'http://localhost/moodle/auth',
    accessTokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
    authorizationServer: 'http://localhost/moodle/AccessTokenUrl',
    idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: publicKey },
    active: true,
    keys: { public: publicKey, private: privateKey },
    ...overrides,
  })
}

const buildService = (
  databaseManager: DatabaseManager,
  cacheManager: CacheManager = buildMockCacheManager(),
): { service: KeysetService; httpHandler: ReturnType<typeof buildMockHttpHandler> } => {
  const platformManager = new PlatformManager(databaseManager, logger)
  const httpHandler = buildMockHttpHandler()
  return { service: new KeysetService(platformManager, httpHandler, cacheManager, logger), httpHandler }
}

const buildRequest = (): HttpRequestParameters => ({
  method: 'GET',
  path: '/keys',
  query: {},
  body: {},
  headers: {},
})

interface FakeHttpResponse extends HttpResponse {
  jsonBody?: unknown
}

const buildFakeHttpResponse = (): FakeHttpResponse => {
  const response: FakeHttpResponse = {
    status: () => response,
    redirect: () => undefined,
    html: () => undefined,
    json: body => {
      response.jsonBody = body
    },
  }
  return response
}

const buildKeyset = async (httpHandler: ReturnType<typeof buildMockHttpHandler>, route: string): Promise<unknown> => {
  const handler = httpHandler.getHandler(route, HttpMethod.Get)
  const response = buildFakeHttpResponse()
  await handler(buildRequest(), response)
  return response.jsonBody
}

describe('KeysetService.prepareHttpRoutes()', () => {
  it('resolves an empty keyset when no platforms are registered', async () => {
    const databaseManager = buildMockDatabaseManager()
    const { service, httpHandler } = buildService(databaseManager)
    service.prepareHttpRoutes()

    await expect(buildKeyset(httpHandler, '/lti/keys')).resolves.toEqual({ keys: [] })
  })

  it('resolves one JWK per registered platform, keyed by platform id', async () => {
    const databaseManager = buildMockDatabaseManager()
    const idA = await savePlatform(databaseManager, { clientId: 'ClientIdA' })
    const idB = await savePlatform(databaseManager, { clientId: 'ClientIdB', url: 'http://localhost/other' })
    const { service, httpHandler } = buildService(databaseManager)
    service.prepareHttpRoutes()

    const keyset = (await buildKeyset(httpHandler, '/lti/keys')) as {
      keys: Array<{ kid: string; n: string; e: string }>
    }

    expect(keyset.keys).toHaveLength(2)
    expect(keyset.keys.map(jwk => jwk.kid).sort()).toEqual([idA, idB].sort())
    for (const jwk of keyset.keys) {
      expect(jwk).toMatchObject({ kty: 'RSA', alg: 'RS256', use: 'sig' })
      expect(jwk.n).toEqual(expect.any(String))
      expect(jwk.e).toEqual(expect.any(String))
    }
  })

  it('registers a GET route at /lti/keys that responds with the built keyset', async () => {
    const databaseManager = buildMockDatabaseManager()
    const id = await savePlatform(databaseManager)
    const { service, httpHandler } = buildService(databaseManager)
    service.prepareHttpRoutes()

    await expect(buildKeyset(httpHandler, '/lti/keys')).resolves.toEqual({
      keys: [expect.objectContaining({ kid: id, kty: 'RSA', alg: 'RS256', use: 'sig' })],
    })
  })

  it('caches the built keyset: a second request within the TTL does not re-query platforms', async () => {
    const databaseManager = buildMockDatabaseManager()
    await savePlatform(databaseManager)
    const { service, httpHandler } = buildService(databaseManager)
    const getPlatformsSpy = jest.spyOn(databaseManager, 'getPlatforms')
    service.prepareHttpRoutes()

    await buildKeyset(httpHandler, '/lti/keys')
    await buildKeyset(httpHandler, '/lti/keys')

    expect(getPlatformsSpy).toHaveBeenCalledTimes(1)
  })

  it('re-queries platforms once the keyset cache entry has expired', async () => {
    const databaseManager = buildMockDatabaseManager()
    await savePlatform(databaseManager)
    const { service, httpHandler } = buildService(databaseManager)
    const getPlatformsSpy = jest.spyOn(databaseManager, 'getPlatforms')
    service.prepareHttpRoutes()
    const realNow = Date.now()
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow)

    await buildKeyset(httpHandler, '/lti/keys')
    nowSpy.mockReturnValue(realNow + 61 * 1000) // past the 60s keyset cache TTL
    await buildKeyset(httpHandler, '/lti/keys')

    expect(getPlatformsSpy).toHaveBeenCalledTimes(2)
    nowSpy.mockRestore()
  })

  // Regression test for a real bug: a CacheManager.get() rejection (a transient Redis blip, say) used
  // to propagate and take down the whole /lti/keys route, instead of degrading to a cache miss the same
  // way a normal "not cached yet" outcome does.
  it('still serves the keyset by fetching fresh when the cache manager rejects on get()', async () => {
    const databaseManager = buildMockDatabaseManager()
    const id = await savePlatform(databaseManager)
    const cacheManager: CacheManager = {
      listen: jest.fn(),
      close: jest.fn(),
      get: jest.fn().mockRejectedValue(new Error('connection lost')),
      set: jest.fn(),
      delete: jest.fn(),
    }
    const { service, httpHandler } = buildService(databaseManager, cacheManager)
    service.prepareHttpRoutes()

    await expect(buildKeyset(httpHandler, '/lti/keys')).resolves.toEqual({
      keys: [expect.objectContaining({ kid: id, kty: 'RSA', alg: 'RS256', use: 'sig' })],
    })
  })

  // Regression test for the same class of bug as the get() one above: buildKeyset() already has the
  // freshly-built keyset in hand by the time it calls set(), so a rejected write here shouldn't fail
  // the request that doesn't actually need the write to succeed.
  it('still serves the keyset by returning the freshly built one when the cache manager rejects on set()', async () => {
    const databaseManager = buildMockDatabaseManager()
    const id = await savePlatform(databaseManager)
    const cacheManager: CacheManager = {
      listen: jest.fn(),
      close: jest.fn(),
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockRejectedValue(new Error('connection lost')),
      delete: jest.fn(),
    }
    const { service, httpHandler } = buildService(databaseManager, cacheManager)
    service.prepareHttpRoutes()

    await expect(buildKeyset(httpHandler, '/lti/keys')).resolves.toEqual({
      keys: [expect.objectContaining({ kid: id, kty: 'RSA', alg: 'RS256', use: 'sig' })],
    })
  })

  it('registers the route on a custom path when one is given', async () => {
    const databaseManager = buildMockDatabaseManager()
    const { service, httpHandler } = buildService(databaseManager)

    service.prepareHttpRoutes('/custom/keys')

    expect(() => httpHandler.getHandler('/custom/keys', HttpMethod.Get)).not.toThrow()
    expect(() => httpHandler.getHandler('/lti/keys', HttpMethod.Get)).toThrow()
  })
})
