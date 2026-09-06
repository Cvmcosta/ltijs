import crypto from 'node:crypto'
import { ValidationError } from '#utils/validation/errors'
import * as cryptoJwt from '#utils/crypto/jwt'
import { AccessTokenManager } from '#services/access-token-manager/access-token-manager.service'
import { FetchRequestHandler } from '#services/request-handler/fetch/fetch-request-handler.service'
import { buildMockDatabaseManager } from '#utils/tests/mock-database-manager'
import { buildMockFetchResponse } from '#utils/tests/mock-fetch-response'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import type { Logger } from '#services/logger/logger.types'

const requestHandler = new FetchRequestHandler()
const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }

afterEach(() => {
  jest.restoreAllMocks()
})

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
})

const buildPlatform = (overrides: Partial<Platform> = {}): Platform => ({
  id: '123456',
  url: 'http://localhost/moodle',
  clientId: 'ClientId1',
  name: 'Moodle',
  authenticationEndpoint: 'http://localhost/moodle/auth',
  accessTokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
  accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
  authorizationServer: 'http://localhost/moodle/AccessTokenUrl',
  idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: 'public-key-pem' },
  authConfig: { method: IdTokenValidationMethod.RsaKey, key: 'public-key-pem' },
  active: true,
  keys: { public: 'public-key-pem', private: privateKey },
  publicKey: 'public-key-pem',
  privateKey,
  ...overrides,
})

const tokenResponse = {
  access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
  token_type: 'bearer',
  expires_in: 3600,
  scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
}

describe('AccessTokenManager.getAccessToken()', () => {
  it('requests, caches, and returns a new token when none is cached', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: tokenResponse }))
    const databaseManager = buildMockDatabaseManager()
    const manager = new AccessTokenManager(databaseManager, requestHandler, logger)

    const token = await manager.getAccessToken(buildPlatform(), 'scope-a')

    expect(token.access_token).toBe(tokenResponse.access_token)
    expect(token.token_type).toBe('Bearer') // normalized casing

    const cached = await databaseManager.getAccessToken('http://localhost/moodle', 'ClientId1', 'scope-a')
    expect(cached).toMatchObject({ access_token: tokenResponse.access_token })
  })

  it('sends the client_credentials assertion as a form-encoded body', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: tokenResponse }))
    const manager = new AccessTokenManager(buildMockDatabaseManager(), requestHandler, logger)

    await manager.getAccessToken(buildPlatform(), 'scope-a')

    const [, calledInit] = fetchSpy.mock.calls[0]
    const body = calledInit?.body as URLSearchParams
    expect(body.get('grant_type')).toBe('client_credentials')
    expect(body.get('client_assertion_type')).toBe('urn:ietf:params:oauth:client-assertion-type:jwt-bearer')
    expect(body.get('scope')).toBe('scope-a')
    expect(typeof body.get('client_assertion')).toBe('string')
  })

  it('returns the cached token without an HTTP call when it has not expired', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch')
    const databaseManager = buildMockDatabaseManager()
    await databaseManager.saveAccessToken('http://localhost/moodle', 'ClientId1', 'scope-a', {
      ...tokenResponse,
      token_type: 'Bearer',
      createdAt: Date.now(),
    })
    const manager = new AccessTokenManager(databaseManager, requestHandler, logger)

    const token = await manager.getAccessToken(buildPlatform(), 'scope-a')

    expect(token.access_token).toBe(tokenResponse.access_token)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('requests a new token when the cached one has expired', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: tokenResponse }))
    const databaseManager = buildMockDatabaseManager()
    await databaseManager.saveAccessToken('http://localhost/moodle', 'ClientId1', 'scope-a', {
      ...tokenResponse,
      token_type: 'Bearer',
      createdAt: Date.now() - (tokenResponse.expires_in + 60) * 1000,
    })
    const manager = new AccessTokenManager(databaseManager, requestHandler, logger)

    await manager.getAccessToken(buildPlatform(), 'scope-a')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('surfaces a ValidationError when the token endpoint returns a malformed response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: { access_token: 'abc' } }))
    const manager = new AccessTokenManager(buildMockDatabaseManager(), requestHandler, logger)

    await expect(manager.getAccessToken(buildPlatform(), 'scope-a')).rejects.toBeInstanceOf(ValidationError)
  })

  it('throws PRIVATE_KEY_NOT_FOUND instead of signing the client assertion with an empty key', async () => {
    const manager = new AccessTokenManager(buildMockDatabaseManager(), requestHandler, logger)
    const platform = buildPlatform({ keys: { public: 'public-key-pem', private: '' } })

    await expect(manager.getAccessToken(platform, 'scope-a')).rejects.toThrow('PRIVATE_KEY_NOT_FOUND')
  })

  it('signs the client assertion via the shared signJwt() wrapper, not a separate direct jsonwebtoken call', async () => {
    const signJwtSpy = jest.spyOn(cryptoJwt, 'signJwt')
    jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: tokenResponse }))
    const manager = new AccessTokenManager(buildMockDatabaseManager(), requestHandler, logger)
    const platform = buildPlatform()

    await manager.getAccessToken(platform, 'scope-a')

    expect(signJwtSpy).toHaveBeenCalledWith(
      expect.objectContaining({ sub: platform.clientId, iss: platform.clientId, aud: platform.authorizationServer }),
      platform.keys.private,
      expect.objectContaining({ algorithm: 'RS256', expiresIn: 60, keyid: platform.id }),
    )
  })
})
