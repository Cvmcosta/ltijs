import mongoose from 'mongoose'
import { decryptAes256 } from '#utils/crypto/aes-encryption'
import { MongoLegacyDatabaseManager } from '#services/database-manager/mongo-legacy/mongo-legacy-database-manager.service'
import {
  ContextTokenModel,
  LegacyAccessTokenModel,
  LegacyIdTokenModel,
  LegacyPlatformModel,
  PlatformStatusModel,
  PrivateKeyModel,
  PublicKeyModel,
} from '#services/database-manager/mongo-legacy/database-schemas'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import { LTI_VERSION } from '#services/oidc/oidc.constants'
import type {
  AccessTokenRecord,
  IdTokenClaims,
  PlatformAttributes,
} from '#services/database-manager/database-manager.types'
import type { Logger } from '#services/logger/logger.types'

const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }

// Runs against a real mongodb-memory-server instance via jest.dbconfig.ts's
// global setup. Unlike `MongoDatabaseManager`'s own suite, this one exercises
// real overrides -- platform CRUD merges/decomposes across the real legacy
// `platform`/`platformStatus`/`publickey`/`privatekey` collections, and
// idToken CRUD merges/decomposes across the real legacy `idToken`/
// `contexttoken` collections -- so it asserts against the raw collection
// shapes directly, not just the `DatabaseManager` interface surface.

// `globalTeardown` stops the shared mongodb-memory-server, but it runs in a
// separate process from this file's own module registry, so it can't reach
// (and close) the mongoose connection opened here -- left open, the socket
// keeps Jest's process alive past the end of the test run.
afterAll(async () => {
  await mongoose.disconnect()
})

const mongoUrl = (): string => {
  const url = process.env.MONGO_URL
  if (url === undefined) throw new Error('MONGO_URL was not set by the jest.dbconfig.ts global setup')
  return url
}

const ENCRYPTIONKEY = 'ENCRYPTIONKEY'

const buildManager = async (): Promise<MongoLegacyDatabaseManager> => {
  const manager = new MongoLegacyDatabaseManager({ url: mongoUrl() }, ENCRYPTIONKEY, logger)
  await manager.setup()
  return manager
}

// `platforms`/`accesstokens` are real collection names `MongoDatabaseManager`
// also targets (by design, both implementations must coexist against the
// same real deployed collections) -- its own dbtest suite runs in this same
// `--runInBand` process against the same database, and can leave behind
// platform documents in a shape this suite's own `toPlatformRecord()`
// doesn't expect (its `accessTokenEndpoint`/`idTokenValidation` fields
// aren't this collection's real `accesstokenEndpoint`/`authConfig` ones).
// Clearing both before this file's own tests run keeps them isolated from
// whichever suite happened to run first, regardless of execution order.
beforeAll(async () => {
  await buildManager()
  await mongoose.connection.collection('platforms').deleteMany({})
  await mongoose.connection.collection('accesstokens').deleteMany({})
})

const platformAttributes: PlatformAttributes = {
  url: 'http://localhost/moodle',
  clientId: 'ClientId1',
  name: 'Moodle',
  authenticationEndpoint: 'http://localhost/moodle/auth',
  accessTokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
  authorizationServer: 'http://localhost/moodle/AccessTokenUrl',
  idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: 'public-key-pem' },
  active: true,
  keys: { public: 'public-key-pem', private: 'private-key-pem' },
}

describe('MongoLegacyDatabaseManager', () => {
  it('throws MISSING_DATABASE_CONFIG when no url is provided', () => {
    expect(() => new MongoLegacyDatabaseManager({ url: '' }, ENCRYPTIONKEY, logger)).toThrow('MISSING_DATABASE_CONFIG')
  })

  describe('platform operations', () => {
    it('createPlatform() decomposes a PlatformRecord across platform/platformStatus/publickey/privatekey, encrypting the keys', async () => {
      const manager = await buildManager()
      const id = await manager.savePlatform(platformAttributes)

      const legacyDoc = await LegacyPlatformModel.findOne({ kid: id }).lean()
      expect(legacyDoc).toMatchObject({
        kid: id,
        platformUrl: platformAttributes.url,
        clientId: platformAttributes.clientId,
        platformName: platformAttributes.name,
        authEndpoint: platformAttributes.authenticationEndpoint,
        accesstokenEndpoint: platformAttributes.accessTokenEndpoint,
        authConfig: platformAttributes.idTokenValidation,
      })

      const statusDoc = await PlatformStatusModel.findOne({ id }).lean()
      expect(statusDoc).toMatchObject({ active: true })

      const publicKeyDoc = await PublicKeyModel.findOne({ kid: id }).lean()
      expect(publicKeyDoc).toMatchObject({
        platformUrl: platformAttributes.url,
        clientId: platformAttributes.clientId,
        iv: expect.any(String) as string,
        data: expect.any(String) as string,
      })
      expect(publicKeyDoc?.data).not.toBe(platformAttributes.keys.public)

      const privateKeyDoc = await PrivateKeyModel.findOne({ kid: id }).lean()
      expect(privateKeyDoc).toMatchObject({ iv: expect.any(String) as string, data: expect.any(String) as string })
    })

    it('stores the real legacy encrypted-plaintext envelope for keys: {key, kid}, not the raw PEM', async () => {
      // Own clientId -- `savePlatform()` always inserts fresh (no more dedup
      // by platformUrl+clientId), so reusing `platformAttributes`'s bare
      // identity would collide with whatever other test in this file
      // already registered it against this uncleared instance.
      const manager = await buildManager()
      const attributes = { ...platformAttributes, clientId: 'ClientIdKeyEnvelope' }
      const id = await manager.savePlatform(attributes)

      const publicKeyDoc = await PublicKeyModel.findOne({ kid: id }).lean()
      if (publicKeyDoc === null) throw new Error('publicKeyDoc was not created')
      const decrypted = decryptAes256(publicKeyDoc.data, publicKeyDoc.iv, ENCRYPTIONKEY)
      expect(JSON.parse(decrypted)).toEqual({ key: attributes.keys.public, kid: id })
    })

    it('getPlatformById() merges status and decrypted keys back into a single PlatformRecord', async () => {
      const manager = await buildManager()
      const attributes = { ...platformAttributes, clientId: 'ClientIdMerge' }
      const id = await manager.savePlatform(attributes)

      await expect(manager.getPlatformById(id)).resolves.toEqual({ ...attributes, id })
    })

    it('getPlatformById() resolves active:true when no platformStatus document exists at all', async () => {
      // Uses a url/clientId combo unique to this test, not `platformAttributes`'s
      // shared default -- every test in this file runs against the same real,
      // uncleared mongodb-memory-server instance, so a shared value would
      // pick up unrelated leftover platforms from other tests.
      const manager = await buildManager()
      const attributes = {
        ...platformAttributes,
        url: 'http://localhost/moodle-no-status',
        clientId: 'ClientIdNoStatus',
      }
      const id = await manager.savePlatform(attributes)
      await PlatformStatusModel.deleteOne({ id })

      await expect(manager.getPlatformById(id)).resolves.toMatchObject({ active: true })
    })

    it('getPlatformByUrlAndClientId() and getPlatforms({ url }) resolve the merged record too', async () => {
      // Own dedicated url/clientIds -- `savePlatform()` always inserts fresh
      // (no more dedup by platformUrl+clientId, see
      // `MongoLegacyDatabaseManager.savePlatform()`), so this can no longer
      // assume it's the only test that's ever registered
      // `platformAttributes.url`/`clientId` against this uncleared instance.
      const manager = await buildManager()
      const attributes = { ...platformAttributes, url: 'http://localhost/moodle-url-filter' }
      const id = await manager.savePlatform(attributes)
      await manager.savePlatform({ ...attributes, clientId: 'ClientIdUrlFilter2' })

      await expect(manager.getPlatformByUrlAndClientId(attributes.url, attributes.clientId)).resolves.toEqual({
        ...attributes,
        id,
      })
      await expect(manager.getPlatforms({ url: attributes.url })).resolves.toHaveLength(2)
    })

    it('getPlatforms({ name }) resolves every platform registered under that name', async () => {
      // Uses a name/clientId combo unique to this test, not `platformAttributes`'s
      // shared default -- every test in this file runs against the same
      // real, uncleared mongodb-memory-server instance, so a shared value
      // would pick up unrelated leftover platforms from other tests.
      const manager = await buildManager()
      const named = {
        ...platformAttributes,
        clientId: 'ClientIdName1',
        name: 'Legacy Name Filter Platform',
      }
      const id = await manager.savePlatform(named)
      await manager.savePlatform({
        ...platformAttributes,
        clientId: 'ClientIdName2',
        name: 'Other Name',
      })

      await expect(manager.getPlatforms({ name: named.name })).resolves.toEqual([{ ...named, id }])
    })

    it('getPlatforms({ clientId }) resolves every platform registered under that clientId', async () => {
      const manager = await buildManager()
      const withClientId = {
        ...platformAttributes,
        clientId: 'ClientIdFilter1',
        url: 'http://localhost/clientid-1',
      }
      const id = await manager.savePlatform(withClientId)
      await manager.savePlatform({
        ...platformAttributes,
        clientId: 'ClientIdFilter2',
        url: 'http://localhost/clientid-2',
      })

      await expect(manager.getPlatforms({ clientId: withClientId.clientId })).resolves.toEqual([
        { ...withClientId, id },
      ])
    })

    it('getPlatforms({ clientId: [...] }) resolves every platform matching any of the given clientIds', async () => {
      const manager = await buildManager()
      const first = { ...platformAttributes, clientId: 'ClientIdBatchA', url: 'http://localhost/batch-a' }
      const second = { ...platformAttributes, clientId: 'ClientIdBatchB', url: 'http://localhost/batch-b' }
      const idA = await manager.savePlatform(first)
      const idB = await manager.savePlatform(second)
      await manager.savePlatform({ ...platformAttributes, clientId: 'ClientIdBatchC', url: 'http://localhost/batch-c' })

      const result = await manager.getPlatforms({ clientId: ['UnknownClientId', 'ClientIdBatchA', 'ClientIdBatchB'] })

      expect(result.map(record => record.id).sort()).toEqual([idA, idB].sort())
    })

    it('updatePlatform() updates base fields, status, and keys', async () => {
      const manager = await buildManager()
      const id = await manager.savePlatform({ ...platformAttributes, clientId: 'ClientIdUpdateFields' })

      await manager.updatePlatformById(id, {
        name: 'Renamed',
        active: false,
        keys: { public: 'new-public-key-pem', private: 'new-private-key-pem' },
      })

      await expect(manager.getPlatformById(id)).resolves.toMatchObject({
        name: 'Renamed',
        active: false,
        keys: { public: 'new-public-key-pem', private: 'new-private-key-pem' },
      })
    })

    it('updatePlatform() cascades a url/clientId change onto the publickey/privatekey docs’ own denormalized copies', async () => {
      const manager = await buildManager()
      const id = await manager.savePlatform({ ...platformAttributes, clientId: 'ClientIdCascade' })

      const newUrl = 'http://localhost/moodle-new'
      await manager.updatePlatformById(id, { url: newUrl, clientId: 'ClientIdCascadeNew' })

      const publicKeyDoc = await PublicKeyModel.findOne({ kid: id }).lean()
      expect(publicKeyDoc).toMatchObject({ platformUrl: newUrl, clientId: 'ClientIdCascadeNew' })
      const privateKeyDoc = await PrivateKeyModel.findOne({ kid: id }).lean()
      expect(privateKeyDoc).toMatchObject({ platformUrl: newUrl, clientId: 'ClientIdCascadeNew' })
    })

    it('deletePlatformById() removes the platform across all four legacy collections', async () => {
      const manager = await buildManager()
      const id = await manager.savePlatform({ ...platformAttributes, clientId: 'ClientIdDelete' })

      await manager.deletePlatformById(id)

      await expect(manager.getPlatformById(id)).resolves.toBeUndefined()
      await expect(LegacyPlatformModel.findOne({ kid: id }).lean()).resolves.toBeNull()
      await expect(PlatformStatusModel.findOne({ id }).lean()).resolves.toBeNull()
      await expect(PublicKeyModel.findOne({ kid: id }).lean()).resolves.toBeNull()
      await expect(PrivateKeyModel.findOne({ kid: id }).lean()).resolves.toBeNull()
    })
  })

  describe('accesstoken operations', () => {
    const token: AccessTokenRecord = {
      access_token: 'abc123',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'scope-a',
      createdAt: Date.now(),
    }

    it('round-trips a cached token through save/get, storing it encrypted at rest', async () => {
      const manager = await buildManager()
      await manager.saveAccessToken(platformAttributes.url, platformAttributes.clientId, 'scope-a', token)

      const result = await manager.getAccessToken(platformAttributes.url, platformAttributes.clientId, 'scope-a')
      expect(result).toMatchObject({ access_token: token.access_token, token_type: token.token_type })

      const rawDoc = await LegacyAccessTokenModel.findOne({
        platformUrl: platformAttributes.url,
        clientId: platformAttributes.clientId,
        scopes: 'scope-a',
      }).lean()
      expect(rawDoc).toMatchObject({ iv: expect.any(String) as string, data: expect.any(String) as string })
    })

    it('stores the real legacy encrypted-plaintext envelope for access tokens: {token: {...}}, not the flattened fields', async () => {
      const manager = await buildManager()
      await manager.saveAccessToken(platformAttributes.url, platformAttributes.clientId, 'scope-b', token)

      const rawDoc = await LegacyAccessTokenModel.findOne({
        platformUrl: platformAttributes.url,
        clientId: platformAttributes.clientId,
        scopes: 'scope-b',
      }).lean()
      if (rawDoc === null) throw new Error('rawDoc was not created')
      const decrypted = decryptAes256(rawDoc.data, rawDoc.iv, ENCRYPTIONKEY)
      const { createdAt: _createdAt, ...value } = token
      expect(JSON.parse(decrypted)).toEqual({ token: value })
    })

    it('resolves undefined when no token is cached', async () => {
      const manager = await buildManager()
      await expect(
        manager.getAccessToken(platformAttributes.url, platformAttributes.clientId, 'unknown-scope'),
      ).resolves.toBeUndefined()
    })
  })

  describe('idToken operations', () => {
    const idToken: IdTokenClaims = {
      iss: 'http://localhost/moodle',
      sub: 'user-1',
      aud: 'ClientId1',
      exp: 9999999999,
      iat: 1111111111,
      nonce: 'nonce-1',
      given_name: 'Test',
      family_name: 'User',
      name: 'Test User',
      email: 'test@example.com',
      [IdTokenClaim.ClientId]: 'ClientId1',
      [IdTokenClaim.PlatformId]: 'kid-legacy-1',
      [IdTokenClaim.DeploymentId]: 'deployment-1',
      [IdTokenClaim.ToolPlatform]: { name: 'Moodle' },
      [IdTokenClaim.MessageType]: LtiMessageType.ResourceLinkRequest,
      [IdTokenClaim.Version]: LTI_VERSION,
      [IdTokenClaim.Roles]: ['Learner'],
      [IdTokenClaim.TargetLinkUri]: 'http://localhost/moodle/launch',
      [IdTokenClaim.Context]: { id: 'course-1' },
      [IdTokenClaim.ResourceLink]: { id: 'resource-1' },
    }

    it('saveIdToken() decomposes the raw record across the idToken and contexttoken collections, correlated by a generated launchId', async () => {
      const manager = await buildManager()
      const id = await manager.saveIdToken(idToken)

      const legacyIdTokenDoc = await LegacyIdTokenModel.findOne({ launchId: id }).lean()
      expect(legacyIdTokenDoc).toMatchObject({
        launchId: id,
        iss: idToken.iss,
        user: idToken.sub,
        clientId: idToken[IdTokenClaim.ClientId],
        deploymentId: idToken[IdTokenClaim.DeploymentId],
        userInfo: {
          given_name: idToken.given_name,
          family_name: idToken.family_name,
          name: idToken.name,
          email: idToken.email,
        },
        platformInfo: idToken[IdTokenClaim.ToolPlatform],
        platformId: idToken[IdTokenClaim.PlatformId],
      })

      const contextTokenDoc = await ContextTokenModel.findOne({ launchId: id }).lean()
      expect(contextTokenDoc).toMatchObject({
        launchId: id,
        contextId: id,
        user: idToken.sub,
        context: idToken[IdTokenClaim.Context],
        resource: idToken[IdTokenClaim.ResourceLink],
        messageType: idToken[IdTokenClaim.MessageType],
        version: idToken[IdTokenClaim.Version],
        roles: idToken[IdTokenClaim.Roles],
        targetLinkUri: idToken[IdTokenClaim.TargetLinkUri],
      })
    })

    it('getIdToken() merges the idToken and contexttoken collections back into a raw record by opaque ID, omitting what legacy storage never persisted', async () => {
      const manager = await buildManager()
      const id = await manager.saveIdToken(idToken)

      const { aud: _aud, exp: _exp, iat: _iat, nonce: _nonce, ...persisted } = idToken
      await expect(manager.getIdToken(id)).resolves.toEqual({ ...persisted, id })
    })

    it('resolves undefined when no matching idToken exists', async () => {
      const manager = await buildManager()
      await expect(manager.getIdToken('missing-launch-id')).resolves.toBeUndefined()
    })

    // A real LtiDeepLinkingRequest legitimately has no target_link_uri claim
    // (unlike LtiResourceLinkRequest/LtiSubmissionReviewRequest) -- confirms
    // IdTokenRecordSchema no longer rejects that on read-back.
    it('saves and retrieves a deep-linking id token with no target_link_uri', async () => {
      const manager = await buildManager()
      const {
        [IdTokenClaim.TargetLinkUri]: _targetLinkUri,
        aud: _aud,
        exp: _exp,
        iat: _iat,
        nonce: _nonce,
        ...rest
      } = idToken
      const deepLinkingClaims: IdTokenClaims = {
        ...rest,
        [IdTokenClaim.MessageType]: LtiMessageType.DeepLinkingRequest,
      }

      const id = await manager.saveIdToken(deepLinkingClaims)

      await expect(manager.getIdToken(id)).resolves.toEqual({ ...deepLinkingClaims, id })
    })
  })

  describe('nonce operations', () => {
    it('tracks nonces via its own standalone NonceModel', async () => {
      const manager = await buildManager()
      await expect(manager.consumeNonce('nonce-legacy-1')).resolves.toBe(false)
      await manager.saveNonce('nonce-legacy-1')
      await expect(manager.consumeNonce('nonce-legacy-1')).resolves.toBe(true)
      await expect(manager.consumeNonce('nonce-legacy-1')).resolves.toBe(false)
    })
  })
})
