import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { OidcService } from '#services/oidc/oidc.service'
import { decodeToken } from '#utils/crypto/jwt'
import * as cryptoJwt from '#utils/crypto/jwt'
import { signValue } from '#utils/crypto/signed-value'
import { PlatformManager } from '#services/platform-manager/platform-manager.service'
import { FetchRequestHandler } from '#services/request-handler/fetch/fetch-request-handler.service'
import { buildMockCacheManager } from '#utils/tests/mock-cache-manager'
import { buildMockDatabaseManager } from '#utils/tests/mock-database-manager'
import { buildMockFetchResponse } from '#utils/tests/mock-fetch-response'
import { expectValidationErrorOnField } from '#utils/tests/expect-validation-error'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import { LTI_VERSION } from '#services/oidc/oidc.constants'
import type {
  DatabaseManager,
  PlatformAttributes,
  PlatformRecord,
} from '#services/database-manager/database-manager.types'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import type { CacheManager } from '#services/cache-manager/cache-manager.types'
import type { Logger } from '#services/logger/logger.types'
import type { AuthenticationRequestParams } from '#services/oidc/oidc.types'

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
})

const buildClaims = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  [IdTokenClaim.MessageType]: LtiMessageType.ResourceLinkRequest,
  [IdTokenClaim.TargetLinkUri]: 'https://tool.example.com/launch',
  [IdTokenClaim.ResourceLink]: { id: 'resource-1' },
  [IdTokenClaim.Version]: LTI_VERSION,
  [IdTokenClaim.DeploymentId]: 'deployment-1',
  [IdTokenClaim.Roles]: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
  ...overrides,
})

// A nonce not explicitly present in `claims` is auto-generated and
// registered via saveNonce(), matching what
// OidcService.buildAuthenticationRequestUrl() does at real login-initiation
// time, since validateToken() now only accepts a nonce that was actually
// issued (and not yet consumed). Tests that pass their own explicit `nonce`
// (including `undefined`, for the "missing nonce" case) manage its
// registration themselves instead.
const signToken = async (
  databaseManager: DatabaseManager,
  claims: Record<string, unknown>,
  options: jwt.SignOptions = {},
): Promise<string> => {
  // jsonwebtoken respects an `iat` already present in the payload (and bases
  // `expiresIn`'s computed `exp` off of it) as long as `noTimestamp` isn't
  // set. `noTimestamp: true` doesn't just skip auto-setting `iat`, it
  // deletes whatever `iat` the payload already had.
  const payload = { sub: 'user-1', nonce: crypto.randomUUID(), ...claims }
  if (!('nonce' in claims)) await databaseManager.saveNonce(payload.nonce)
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    issuer: 'http://localhost/moodle',
    audience: 'ClientId1',
    keyid: 'kid-1',
    expiresIn: '1h',
    ...options,
  })
}

const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }
const requestHandler = new FetchRequestHandler()

const buildDatabaseManagerWithPlatform = async (
  overrides: Partial<PlatformAttributes> = {},
): Promise<{ databaseManager: DatabaseManager; platform: Platform }> => {
  const databaseManager = buildMockDatabaseManager()
  const platformManager = new PlatformManager(databaseManager, logger)
  // `savePlatform()` generates the id itself now (no more caller-supplied
  // `id`, see `MongoDatabaseManager.savePlatform()`), resolved back into a
  // full `Platform` here, since `OidcService`'s methods now all take an
  // already-resolved `Platform` instead of resolving one internally.
  const platformId = await databaseManager.savePlatform({
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
  const platform = await platformManager.getPlatformById(platformId)
  if (platform === undefined) throw new Error('expected the just-registered platform to exist')
  return { databaseManager, platform }
}

afterEach(() => {
  jest.restoreAllMocks()
})

const buildService = (
  databaseManager: DatabaseManager,
  tokenMaxAge: number | false = 10,
  cacheManager: CacheManager = buildMockCacheManager(),
): OidcService => {
  return new OidcService(databaseManager, requestHandler, cacheManager, logger, tokenMaxAge)
}

describe('OidcService.validateToken()', () => {
  it('resolves the verified token for a valid RS256 id_token', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, buildClaims())

    const result = await service.validateIdToken(token, decodeToken(token).header, platform)

    expect(result).toMatchObject({
      sub: 'user-1',
      iss: 'http://localhost/moodle',
    })
  })

  it('resolves for a multi-value aud claim whose azp matches the platform clientId', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, buildClaims({ azp: 'ClientId1' }), {
      audience: ['ClientId1', 'OtherClient'],
    })

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).resolves.toMatchObject({
      azp: 'ClientId1',
    })
  })

  it('throws AZP_DOES_NOT_MATCH_CLIENTID for a multi-value aud claim whose azp does not match', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, buildClaims({ azp: 'WrongClient' }), {
      audience: ['ClientId1', 'OtherClient'],
    })

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).rejects.toThrow(
      'AZP_DOES_NOT_MATCH_CLIENTID',
    )
  })

  it('resolves for a single-element aud array with no azp, since azp is only spec-required for multiple audiences', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, buildClaims(), {
      audience: ['ClientId1'],
    })

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).resolves.toMatchObject({
      sub: 'user-1',
    })
  })

  it('throws when the token was signed with a key other than the platform-registered one', async () => {
    const { privateKey: otherPrivateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    })
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const token = jwt.sign({ sub: 'user-1', nonce: 'nonce-1', ...buildClaims() }, otherPrivateKey, {
      algorithm: 'RS256',
      issuer: 'http://localhost/moodle',
      audience: 'ClientId1',
      keyid: 'kid-1',
      expiresIn: '1h',
    })

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).rejects.toThrow()
  })

  it('throws AUTHCONFIG_NOT_FOUND for an unrecognized idTokenValidation method', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform({
      idTokenValidation: { method: 'UNKNOWN', key: publicKey } as unknown as PlatformRecord['idTokenValidation'],
    })
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, buildClaims())

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).rejects.toThrow(
      'AUTHCONFIG_NOT_FOUND',
    )
  })

  it('verifies via a JWK_KEY auth config', async () => {
    const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' })
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform({
      idTokenValidation: { method: IdTokenValidationMethod.JwkKey, key: JSON.stringify(jwk) },
    })
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, buildClaims())

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).resolves.toMatchObject({
      sub: 'user-1',
    })
  })

  it('verifies via a JWK_SET auth config, fetched over HTTP and matched by kid', async () => {
    const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' })
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { keys: [{ ...jwk, kid: 'kid-1' }] } }))
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform({
      idTokenValidation: { method: IdTokenValidationMethod.JwkSet, key: 'http://localhost/moodle/jwks' },
    })
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, buildClaims())

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).resolves.toMatchObject({
      sub: 'user-1',
    })
  })

  it('caches the JWKS response: a second launch for the same jwks_uri does not re-fetch it', async () => {
    const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' })
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { keys: [{ ...jwk, kid: 'kid-1' }] } }))
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform({
      idTokenValidation: { method: IdTokenValidationMethod.JwkSet, key: 'http://localhost/moodle/jwks' },
    })
    const service = buildService(databaseManager)
    const tokenA = await signToken(databaseManager, buildClaims())
    const tokenB = await signToken(databaseManager, buildClaims())

    await service.validateIdToken(tokenA, decodeToken(tokenA).header, platform)
    await service.validateIdToken(tokenB, decodeToken(tokenB).header, platform)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('re-fetches the JWKS once its cache entry has expired', async () => {
    const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' })
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { keys: [{ ...jwk, kid: 'kid-1' }] } }))
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform({
      idTokenValidation: { method: IdTokenValidationMethod.JwkSet, key: 'http://localhost/moodle/jwks' },
    })
    // tokenMaxAge disabled: this test is about JWKS-cache expiry, not token freshness, and advancing
    // Date.now() past the cache TTL would otherwise also trip the unrelated TOKEN_TOO_OLD check.
    const service = buildService(databaseManager, false)
    const tokenA = await signToken(databaseManager, buildClaims())
    const tokenB = await signToken(databaseManager, buildClaims())
    const realNow = Date.now()
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow)

    await service.validateIdToken(tokenA, decodeToken(tokenA).header, platform)
    nowSpy.mockReturnValue(realNow + 6 * 60 * 1000) // past the 5-minute JWKS cache TTL
    await service.validateIdToken(tokenB, decodeToken(tokenB).header, platform)

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    nowSpy.mockRestore()
  })

  it('throws AUTHCONFIG_NOT_FOUND when no JWK_SET key matches the token kid, after retrying once (not looping)', async () => {
    const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' })
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { keys: [{ ...jwk, kid: 'other-kid' }] } }))
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform({
      idTokenValidation: { method: IdTokenValidationMethod.JwkSet, key: 'http://localhost/moodle/jwks' },
    })
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, buildClaims())

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).rejects.toThrow(
      'AUTHCONFIG_NOT_FOUND',
    )
    // One initial fetch, one retry-after-cache-invalidation fetch: bounded, not an infinite loop.
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('invalidates the cached JWKS and retries once when the cached response is missing the needed kid', async () => {
    const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' })
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(buildMockFetchResponse({ body: { keys: [{ ...jwk, kid: 'stale-kid' }] } }))
      .mockResolvedValueOnce(buildMockFetchResponse({ body: { keys: [{ ...jwk, kid: 'fresh-kid' }] } }))
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform({
      idTokenValidation: { method: IdTokenValidationMethod.JwkSet, key: 'http://localhost/moodle/jwks' },
    })
    const cacheManager = buildMockCacheManager()
    const deleteSpy = jest.spyOn(cacheManager, 'delete')
    const service = buildService(databaseManager, 10, cacheManager)
    // The platform's own signing key didn't change; only which `kid` label the JWKS response
    // advertises it under, simulating the platform having rotated since the (still-cached) first fetch.
    const token = await signToken(databaseManager, buildClaims(), { keyid: 'fresh-kid' })

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).resolves.toMatchObject({
      sub: 'user-1',
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(deleteSpy).toHaveBeenCalledWith('oidc:jwks:http://localhost/moodle/jwks')
  })

  it('resolves when the token is within the max age', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, { ...buildClaims(), iat: Math.floor(Date.now() / 1000) })

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).resolves.toMatchObject({
      sub: 'user-1',
    })
  })

  it('throws TOKEN_TOO_OLD when the token exceeds the max age', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    // iat old enough to breach the max age, but exp still valid; otherwise
    // jsonwebtoken's own "jwt expired" check fires first, at the signature
    // step, before this max-age check is ever reached.
    const token = await signToken(
      databaseManager,
      { ...buildClaims(), iat: Math.floor(Date.now() / 1000) - 3700 },
      { expiresIn: '2h' },
    )

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).rejects.toThrow('TOKEN_TOO_OLD')
  })

  it('rejects a token within the default 10s max age when constructed with a stricter tokenMaxAge', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager, 1)
    const token = await signToken(databaseManager, { ...buildClaims(), iat: Math.floor(Date.now() / 1000) - 5 })

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).rejects.toThrow('TOKEN_TOO_OLD')
  })

  it('never throws TOKEN_TOO_OLD when constructed with tokenMaxAge: false', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager, false)
    const token = await signToken(
      databaseManager,
      { ...buildClaims(), iat: Math.floor(Date.now() / 1000) - 3700 },
      { expiresIn: '2h' },
    )

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).resolves.toMatchObject({
      sub: 'user-1',
    })
  })

  it('throws INVALID_NONCE_RECEIVED for a nonce that was never issued (saved)', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, { ...buildClaims(), nonce: 'never-issued-nonce' })

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).rejects.toThrow(
      'INVALID_NONCE_RECEIVED',
    )
  })

  it('throws INVALID_NONCE_RECEIVED when the same nonce is validated a second time', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    await databaseManager.saveNonce('replayed-nonce')
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, { ...buildClaims(), nonce: 'replayed-nonce' })

    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).resolves.toMatchObject({
      sub: 'user-1',
    })
    await expect(service.validateIdToken(token, decodeToken(token).header, platform)).rejects.toThrow(
      'INVALID_NONCE_RECEIVED',
    )
  })

  it('consumes the nonce after a successful validation, so it cannot be consumed again', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    await databaseManager.saveNonce('fresh-nonce')
    const service = buildService(databaseManager)
    const token = await signToken(databaseManager, { ...buildClaims(), nonce: 'fresh-nonce' })

    await service.validateIdToken(token, decodeToken(token).header, platform)

    await expect(databaseManager.consumeNonce('fresh-nonce')).resolves.toBe(false)
  })

  describe('base token shape validation', () => {
    it('throws a ValidationError when the verified payload is missing a base OIDC claim (nonce)', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(databaseManager, { ...buildClaims(), nonce: undefined })

      await expect(service.validateIdToken(token, decodeToken(token).header, platform)).rejects.toThrow(
        'Validation failed',
      )
    })

    it('throws a ValidationError when the verified payload is missing exp', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      // No `expiresIn`: jsonwebtoken only sets `exp` when asked to, so this
      // genuinely produces a token with no `exp` claim at all.
      const token = jwt.sign({ sub: 'user-1', nonce: crypto.randomUUID(), ...buildClaims() }, privateKey, {
        algorithm: 'RS256',
        issuer: 'http://localhost/moodle',
        audience: 'ClientId1',
        keyid: 'kid-1',
      })

      await expect(service.validateIdToken(token, decodeToken(token).header, platform)).rejects.toThrow(
        'Validation failed',
      )
    })
  })

  describe('claim validation', () => {
    it('does not throw for a fully valid LtiResourceLinkRequest token', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(databaseManager, buildClaims())

      await expect(service.validateIdToken(token, decodeToken(token).header, platform)).resolves.toBeDefined()
    })

    // Confirms claim requirements are actually selected by message_type, not
    // just uniformly enforced: the same claim shape (missing target_link_uri/
    // resource_link) fails for a resource link request but passes for a deep
    // linking request, since only the resource-link-specific schema requires
    // those two claims.
    it('does not throw for a DeepLinkingRequest token missing target_link_uri/resource_link', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(
        databaseManager,
        buildClaims({
          [IdTokenClaim.MessageType]: LtiMessageType.DeepLinkingRequest,
          [IdTokenClaim.TargetLinkUri]: undefined,
          [IdTokenClaim.ResourceLink]: undefined,
        }),
      )

      await expect(service.validateIdToken(token, decodeToken(token).header, platform)).resolves.toBeDefined()
    })

    // message_type itself is checked manually (not via Zod) since it's what
    // selects which schema to validate the rest of the claims against --
    // resolveClaimSchema()'s own switch/default throws this directly.
    it('throws INVALID_MESSAGE_TYPE when message_type is missing or unrecognized', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(databaseManager, buildClaims({ [IdTokenClaim.MessageType]: 'SomethingElse' }))

      await expect(service.validateIdToken(token, decodeToken(token).header, platform)).rejects.toThrow(
        'INVALID_MESSAGE_TYPE',
      )
    })

    // Every other claim-validation failure is still a `ValidationError`,
    // not mapped back onto a specific legacy error class (see standing
    // conventions), so these assert on `.errors`, the field-path-grouped
    // map every `ValidationError` carries, to confirm which claim failed.

    it('throws a ValidationError on target_link_uri when missing on a resource link request', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(databaseManager, buildClaims({ [IdTokenClaim.TargetLinkUri]: undefined }))

      await expectValidationErrorOnField(
        service.validateIdToken(token, decodeToken(token).header, platform),
        IdTokenClaim.TargetLinkUri,
      )
    })

    it('throws a ValidationError on resource_link when its id is missing on a resource link request', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(databaseManager, buildClaims({ [IdTokenClaim.ResourceLink]: {} }))

      await expectValidationErrorOnField(
        service.validateIdToken(token, decodeToken(token).header, platform),
        `${IdTokenClaim.ResourceLink}.id`,
      )
    })

    it('throws a ValidationError on for_user when its user_id is missing on a submission review request', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(
        databaseManager,
        buildClaims({
          [IdTokenClaim.MessageType]: LtiMessageType.SubmissionReviewRequest,
          [IdTokenClaim.Endpoint]: {},
        }),
      )

      await expectValidationErrorOnField(
        service.validateIdToken(token, decodeToken(token).header, platform),
        IdTokenClaim.ForUser,
      )
    })

    it('throws a ValidationError on the AGS endpoint claim when missing on a submission review request', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(
        databaseManager,
        buildClaims({
          [IdTokenClaim.MessageType]: LtiMessageType.SubmissionReviewRequest,
          [IdTokenClaim.ForUser]: { user_id: 'user-1' },
        }),
      )

      await expectValidationErrorOnField(
        service.validateIdToken(token, decodeToken(token).header, platform),
        IdTokenClaim.Endpoint,
      )
    })

    it('throws a ValidationError on the version claim when it is missing', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(databaseManager, buildClaims({ [IdTokenClaim.Version]: undefined }))

      await expectValidationErrorOnField(
        service.validateIdToken(token, decodeToken(token).header, platform),
        IdTokenClaim.Version,
      )
    })

    it('throws a ValidationError on the version claim when it is not 1.3.0', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(databaseManager, buildClaims({ [IdTokenClaim.Version]: '1.1.0' }))

      await expectValidationErrorOnField(
        service.validateIdToken(token, decodeToken(token).header, platform),
        IdTokenClaim.Version,
      )
    })

    it('throws a ValidationError on the deployment_id claim when it is missing', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(databaseManager, buildClaims({ [IdTokenClaim.DeploymentId]: undefined }))

      await expectValidationErrorOnField(
        service.validateIdToken(token, decodeToken(token).header, platform),
        IdTokenClaim.DeploymentId,
      )
    })

    it('throws a ValidationError on the sub claim when it is missing', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(databaseManager, { ...buildClaims(), sub: undefined })

      await expectValidationErrorOnField(
        service.validateIdToken(token, decodeToken(token).header, platform),
        IdTokenClaim.Sub,
      )
    })

    it('throws a ValidationError on the roles claim when it is missing', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const service = buildService(databaseManager)
      const token = await signToken(databaseManager, buildClaims({ [IdTokenClaim.Roles]: undefined }))

      await expectValidationErrorOnField(
        service.validateIdToken(token, decodeToken(token).header, platform),
        IdTokenClaim.Roles,
      )
    })
  })
})

describe('OidcService.buildStateToken() / validateStateToken()', () => {
  it('round-trips the stashed query params through a signed token', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)

    const token = service.buildStateToken(platform, { a: '1', b: '2' })

    await expect(service.validateStateToken(token, platform)).resolves.toMatchObject({ query: { a: '1', b: '2' } })
  })

  it('round-trips an absent query', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)

    const token = service.buildStateToken(platform)

    const result = await service.validateStateToken(token, platform)

    expect(result.query).toBeUndefined()
  })

  it('throws PRIVATE_KEY_NOT_FOUND instead of signing with an empty key when the platform has none', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)

    expect(() => service.buildStateToken({ ...platform, keys: { ...platform.keys, private: '' } })).toThrow(
      'PRIVATE_KEY_NOT_FOUND',
    )
  })

  it('verifies via the shared verifyTokenSignature() wrapper, not a separate direct jsonwebtoken call', async () => {
    // validateStateToken() and validateIdToken() both verify an RS256-signed token, so they must go
    // through the same shared wrapper: otherwise clock/algorithm handling could silently drift apart
    // between the two call sites.
    const verifyTokenSignatureSpy = jest.spyOn(cryptoJwt, 'verifyTokenSignature')
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const token = service.buildStateToken(platform)

    await service.validateStateToken(token, platform)

    expect(verifyTokenSignatureSpy).toHaveBeenCalledWith(token, platform.keys.public, ['RS256'])
    verifyTokenSignatureSpy.mockRestore()
  })

  it('throws INVALID_STATE for a state token verified against a different platform', async () => {
    const { databaseManager, platform: platformA } = await buildDatabaseManagerWithPlatform()
    const platformManager = new PlatformManager(databaseManager, logger)
    const otherKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    })
    const otherPlatformId = await databaseManager.savePlatform({
      url: 'http://localhost/other',
      clientId: 'OtherClientId',
      name: 'Other Moodle',
      authenticationEndpoint: 'http://localhost/other/auth',
      accessTokenEndpoint: 'http://localhost/other/AccessTokenUrl',
      authorizationServer: 'http://localhost/other/AccessTokenUrl',
      idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: 'unused-in-this-flow' },
      active: true,
      keys: { public: otherKeyPair.publicKey, private: otherKeyPair.privateKey },
    })
    const platformB = await platformManager.getPlatformById(otherPlatformId)
    if (platformB === undefined) throw new Error('expected the just-registered platform to exist')
    const service = buildService(databaseManager)
    const token = service.buildStateToken(platformA, { a: '1' })

    await expect(service.validateStateToken(token, platformB)).rejects.toThrow('INVALID_STATE')
  })

  it('throws INVALID_STATE for a malformed token', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)

    await expect(service.validateStateToken('not-a-jwt', platform)).rejects.toThrow('INVALID_STATE')
  })

  it('throws INVALID_STATE for an expired token', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const token = jwt.sign({ query: { a: '1' } }, platform.keys.private, { algorithm: 'RS256', expiresIn: -1 })

    await expect(service.validateStateToken(token, platform)).rejects.toThrow('INVALID_STATE')
  })
})

describe('OidcService.buildRecoveryToken() / verifyRecoveryToken()', () => {
  it('round-trips the stateId through the signed value', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)

    const token = service.buildRecoveryToken('state-id-1', platform)

    expect(service.verifyRecoveryToken(token, platform)).toBe('state-id-1')
  })

  it('throws INVALID_STATE for a tampered signature', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const token = service.buildRecoveryToken('state-id-1', platform)
    const tampered = `${token.slice(0, -2)}xx`

    expect(() => service.verifyRecoveryToken(tampered, platform)).toThrow('INVALID_STATE')
  })

  it('throws INVALID_STATE for a malformed token', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)

    expect(() => service.verifyRecoveryToken('not-a-signed-value', platform)).toThrow('INVALID_STATE')
  })

  it('throws INVALID_STATE for an expired recovery token', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const expiredToken = signValue(`state-id-1:${Date.now() - 1000}`, platform.keys.private)

    expect(() => service.verifyRecoveryToken(expiredToken, platform)).toThrow('INVALID_STATE')
  })

  it('throws INVALID_STATE for a recovery token verified against a different platform', async () => {
    const { databaseManager, platform: platformA } = await buildDatabaseManagerWithPlatform()
    const platformManager = new PlatformManager(databaseManager, logger)
    const otherKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    })
    const otherPlatformId = await databaseManager.savePlatform({
      url: 'http://localhost/other',
      clientId: 'OtherClientId',
      name: 'Other Moodle',
      authenticationEndpoint: 'http://localhost/other/auth',
      accessTokenEndpoint: 'http://localhost/other/AccessTokenUrl',
      authorizationServer: 'http://localhost/other/AccessTokenUrl',
      idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: 'unused-in-this-flow' },
      active: true,
      keys: { public: otherKeyPair.publicKey, private: otherKeyPair.privateKey },
    })
    const platformB = await platformManager.getPlatformById(otherPlatformId)
    if (platformB === undefined) throw new Error('expected the just-registered platform to exist')
    const service = buildService(databaseManager)
    const token = service.buildRecoveryToken('state-id-1', platformA)

    expect(() => service.verifyRecoveryToken(token, platformB)).toThrow('INVALID_STATE')
  })

  // Regression test: state and the recovery token used to both be RS256 JWTs signed with the same
  // platform key, so a state token could be resubmitted in place of a recovery token (and vice versa)
  // and still verify: exactly the bypass this two-token design exists to prevent. HMAC-signing the
  // recovery token instead makes the two structurally incompatible, not just conventionally different.
  it('rejects a real state token when verified as a recovery token', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const state = service.buildStateToken(platform)

    expect(() => service.verifyRecoveryToken(state, platform)).toThrow('INVALID_STATE')
  })

  it('rejects a real recovery token when verified as a state token', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const recoveryToken = service.buildRecoveryToken('state-id-1', platform)

    await expect(service.validateStateToken(recoveryToken, platform)).rejects.toThrow('INVALID_STATE')
  })
})

describe('OidcService.verifyRecoveredState()', () => {
  it('does not throw when the recovery token is valid and its stateId matches the state token', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const state = service.buildStateToken(platform, undefined, undefined, 'state-id-1')
    const recoveryToken = service.buildRecoveryToken('state-id-1', platform)

    expect(() => {
      service.verifyRecoveredState(recoveryToken, state, platform)
    }).not.toThrow()
  })

  it('throws INVALID_STATE when the recovery token is invalid', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const state = service.buildStateToken(platform, undefined, undefined, 'state-id-1')

    expect(() => {
      service.verifyRecoveredState('not-a-signed-value', state, platform)
    }).toThrow('INVALID_STATE')
  })

  it('throws INVALID_STATE when the recovery token is valid but its stateId does not match the state token', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const state = service.buildStateToken(platform, undefined, undefined, 'state-id-1')
    const recoveryToken = service.buildRecoveryToken('state-id-2', platform)

    expect(() => {
      service.verifyRecoveredState(recoveryToken, state, platform)
    }).toThrow('INVALID_STATE')
  })

  // Regression test for the CSRF bypass this design replaced: resubmitting the raw state token itself
  // as the "recovered" value must not verify, even though it's a validly-signed token overall.
  it('throws INVALID_STATE when the state token itself is passed as the recovered value', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)
    const state = service.buildStateToken(platform, undefined, undefined, 'state-id-1')

    expect(() => {
      service.verifyRecoveredState(state, state, platform)
    }).toThrow('INVALID_STATE')
  })
})

describe('OidcService.buildAuthenticationRequestUrl()', () => {
  const buildRequestParams = (overrides: Partial<AuthenticationRequestParams> = {}): AuthenticationRequestParams => ({
    loginHint: 'user-1',
    redirectUri: 'https://tool.example.com/launch',
    state: 'state-jwt',
    ...overrides,
  })

  it('builds a redirect URL to the platform authentication endpoint, with the expected OIDC query', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)

    const redirectUrl = new URL(await service.buildAuthenticationRequestUrl(platform, buildRequestParams()))

    expect(redirectUrl.origin + redirectUrl.pathname).toBe('http://localhost/moodle/auth')
    expect(redirectUrl.searchParams.get('response_type')).toBe('id_token')
    expect(redirectUrl.searchParams.get('response_mode')).toBe('form_post')
    expect(redirectUrl.searchParams.get('id_token_signed_response_alg')).toBe('RS256')
    expect(redirectUrl.searchParams.get('scope')).toBe('openid')
    expect(redirectUrl.searchParams.get('client_id')).toBe('ClientId1')
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe('https://tool.example.com/launch')
    expect(redirectUrl.searchParams.get('login_hint')).toBe('user-1')
    expect(redirectUrl.searchParams.get('prompt')).toBe('none')
    expect(redirectUrl.searchParams.get('state')).toBe('state-jwt')
    expect(redirectUrl.searchParams.get('nonce')).toEqual(expect.any(String))
  })

  it('generates a fresh nonce on every call', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)

    const first = new URL(await service.buildAuthenticationRequestUrl(platform, buildRequestParams()))
    const second = new URL(await service.buildAuthenticationRequestUrl(platform, buildRequestParams()))

    expect(first.searchParams.get('nonce')).not.toBe(second.searchParams.get('nonce'))
  })

  it('includes lti_message_hint and lti_deployment_id only when provided', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const service = buildService(databaseManager)

    const withoutHints = new URL(await service.buildAuthenticationRequestUrl(platform, buildRequestParams()))
    expect(withoutHints.searchParams.has('lti_message_hint')).toBe(false)
    expect(withoutHints.searchParams.has('lti_deployment_id')).toBe(false)

    const withHints = new URL(
      await service.buildAuthenticationRequestUrl(
        platform,
        buildRequestParams({ ltiMessageHint: 'hint-1', ltiDeploymentId: 'deployment-1' }),
      ),
    )
    expect(withHints.searchParams.get('lti_message_hint')).toBe('hint-1')
    expect(withHints.searchParams.get('lti_deployment_id')).toBe('deployment-1')
  })
})
