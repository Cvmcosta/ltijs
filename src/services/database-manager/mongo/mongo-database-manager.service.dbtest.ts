import mongoose from 'mongoose'
import { MongoDatabaseManager } from '#services/database-manager/mongo/mongo-database-manager.service'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import { LTI_VERSION } from '#services/oidc/oidc.constants'
import type {
  AccessTokenRecord,
  IdTokenClaims,
  PlatformAttributes,
  PlatformRecord,
} from '#services/database-manager/database-manager.types'
import type { Logger } from '#services/logger/logger.types'

const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }

// Runs against a real mongodb-memory-server instance via jest.dbconfig.ts's
// global setup. Third-party ltijs database plugins depend on this real
// round-trip behavior, not just the `DatabaseManager` type shape.

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

const buildManager = async (): Promise<MongoDatabaseManager> => {
  const manager = new MongoDatabaseManager(logger, { url: mongoUrl() })
  await manager.listen()
  return manager
}

// `platforms`/`accesstokens` are real collection names `MongoLegacyDatabaseManager`
// also targets (by design, both implementations must coexist against the
// same real deployed collections) -- its own dbtest suite runs in this same
// `--runInBand` process against the same database, and can leave behind
// platform documents in a shape `PlatformRecordSchema` doesn't accept (its
// own fields live in separate collections). Clearing both before this
// file's own tests run keeps them isolated from whichever suite happened to
// run first, regardless of execution order.
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

describe('MongoDatabaseManager', () => {
  it('throws MISSING_DATABASE_CONFIG when no url is provided', () => {
    expect(() => new MongoDatabaseManager(logger, { url: '' })).toThrow('MISSING_DATABASE_CONFIG')
  })

  it('connects to the database via listen()', async () => {
    const manager = new MongoDatabaseManager(logger, { url: mongoUrl() })
    await expect(manager.listen()).resolves.toBeUndefined()
  })

  describe('platform operations', () => {
    it('creates and retrieves a platform (including status and keys) by url+clientId, by id, and via getPlatforms', async () => {
      const manager = await buildManager()
      const id = await manager.savePlatform(platformAttributes)
      const platformRecord: PlatformRecord = { ...platformAttributes, id }

      await expect(manager.getPlatformByUrlAndClientId(platformRecord.url, platformRecord.clientId)).resolves.toEqual(
        platformRecord,
      )
      await expect(manager.getPlatformById(id)).resolves.toEqual(platformRecord)
      await expect(manager.getPlatforms()).resolves.toEqual([platformRecord])
    })

    it('returns undefined when no platform matches', async () => {
      const manager = await buildManager()
      await expect(manager.getPlatformById('missing')).resolves.toBeUndefined()
      await expect(manager.getPlatformByUrlAndClientId('http://unknown', 'x')).resolves.toBeUndefined()
    })

    it('getPlatforms({ url }) resolves every platform registered under that url, empty filter resolves every platform', async () => {
      // Own dedicated url/clientIds, and counts relative to what already
      // existed -- `savePlatform()` always inserts fresh (no more dedup by
      // url+clientId, see `MongoDatabaseManager.savePlatform()`), so this
      // can no longer assume it's the only test that's ever registered
      // `platformAttributes.url`/`clientId` against this uncleared instance.
      const manager = await buildManager()
      const url = 'http://localhost/moodle-url-filter'
      const before = await manager.getPlatforms()

      await manager.savePlatform({ ...platformAttributes, url, clientId: 'ClientIdUrlFilter1' })
      await manager.savePlatform({ ...platformAttributes, url, clientId: 'ClientIdUrlFilter2' })
      await manager.savePlatform({
        ...platformAttributes,
        clientId: 'ClientIdUrlFilter3',
        url: 'http://other-url-filter',
      })

      await expect(manager.getPlatforms({ url })).resolves.toHaveLength(2)
      await expect(manager.getPlatforms()).resolves.toHaveLength(before.length + 3)
    })

    it('getPlatforms({ name }) resolves every platform registered under that name', async () => {
      // Uses a name/id combo unique to this test, not `platformAttributes`'s
      // shared default -- every test in this file runs against the same
      // real, uncleared mongodb-memory-server instance, so a shared value
      // would pick up unrelated leftover platforms from other tests.
      const manager = await buildManager()
      const named = { ...platformAttributes, clientId: 'ClientIdName1', name: 'Name Filter Platform' }
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
      const withClientId = { ...platformAttributes, clientId: 'ClientIdFilter1', url: 'http://localhost/clientid-1' }
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

    it('updatePlatform() updates only the given fields', async () => {
      // Own clientId -- `savePlatform()` always inserts fresh (no more dedup
      // by url+clientId), so reusing `platformAttributes`'s bare identity
      // would collide with whatever other test in this file already
      // registered it against this uncleared instance.
      const manager = await buildManager()
      const id = await manager.savePlatform({ ...platformAttributes, clientId: 'ClientIdUpdateFields' })

      await manager.updatePlatformById(id, { name: 'Renamed' })

      await expect(manager.getPlatformById(id)).resolves.toMatchObject({
        name: 'Renamed',
        clientId: 'ClientIdUpdateFields',
      })
    })

    it('updatePlatform() can update active status and keys directly', async () => {
      const manager = await buildManager()
      const id = await manager.savePlatform({ ...platformAttributes, clientId: 'ClientIdUpdateActive' })

      await manager.updatePlatformById(id, {
        active: false,
        keys: { public: 'new-public-key-pem', private: 'new-private-key-pem' },
      })

      await expect(manager.getPlatformById(id)).resolves.toMatchObject({
        active: false,
        keys: { public: 'new-public-key-pem', private: 'new-private-key-pem' },
      })
    })

    it('deletePlatformById() removes the platform', async () => {
      const manager = await buildManager()
      const id = await manager.savePlatform({ ...platformAttributes, clientId: 'ClientIdDelete' })

      await manager.deletePlatformById(id)

      await expect(manager.getPlatformById(id)).resolves.toBeUndefined()
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

    it('resolves undefined when no token is cached', async () => {
      const manager = await buildManager()
      await expect(
        manager.getAccessToken(platformAttributes.url, platformAttributes.clientId, 'scope-a'),
      ).resolves.toBeUndefined()
    })

    it('saves and retrieves a cached token, stored in plain readable form', async () => {
      const manager = await buildManager()
      await manager.saveAccessToken(platformAttributes.url, platformAttributes.clientId, 'scope-a', token)

      const result = await manager.getAccessToken(platformAttributes.url, platformAttributes.clientId, 'scope-a')
      expect(result).toMatchObject({ access_token: token.access_token, token_type: token.token_type })
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
      [IdTokenClaim.PlatformId]: 'kid-1',
      [IdTokenClaim.DeploymentId]: 'deployment-1',
      [IdTokenClaim.MessageType]: LtiMessageType.ResourceLinkRequest,
      [IdTokenClaim.Version]: LTI_VERSION,
      [IdTokenClaim.Roles]: ['Learner'],
      [IdTokenClaim.TargetLinkUri]: 'http://localhost/moodle/launch',
    }

    it('saves and retrieves an id token by its opaque ID, including arbitrary extra claims', async () => {
      const manager = await buildManager()
      const id = await manager.saveIdToken(idToken)

      await expect(manager.getIdToken(id)).resolves.toEqual({ ...idToken, id })
    })

    it('resolves undefined when no id token matches', async () => {
      const manager = await buildManager()
      await expect(manager.getIdToken(new mongoose.Types.ObjectId().toString())).resolves.toBeUndefined()
    })

    it('resolves undefined for a malformed id', async () => {
      const manager = await buildManager()
      await expect(manager.getIdToken('not-a-valid-object-id')).resolves.toBeUndefined()
    })

    // A real LtiDeepLinkingRequest legitimately has no target_link_uri claim
    // (unlike LtiResourceLinkRequest/LtiSubmissionReviewRequest) -- confirms
    // IdTokenRecordSchema no longer rejects that on read-back.
    it('saves and retrieves a deep-linking id token with no target_link_uri', async () => {
      const manager = await buildManager()
      const { [IdTokenClaim.TargetLinkUri]: _targetLinkUri, ...deepLinkingIdToken } = idToken
      const deepLinkingClaims: IdTokenClaims = {
        ...deepLinkingIdToken,
        [IdTokenClaim.MessageType]: LtiMessageType.DeepLinkingRequest,
      }

      const id = await manager.saveIdToken(deepLinkingClaims)

      await expect(manager.getIdToken(id)).resolves.toEqual({ ...deepLinkingClaims, id })
    })
  })

  describe('nonce operations', () => {
    it('consumeNonce() resolves false for a nonce that was never saved', async () => {
      const manager = await buildManager()
      await expect(manager.consumeNonce('nonce-1')).resolves.toBe(false)
    })

    it('consumeNonce() resolves true once for a saved nonce, then false on a second attempt', async () => {
      const manager = await buildManager()
      await manager.saveNonce('nonce-1')

      await expect(manager.consumeNonce('nonce-1')).resolves.toBe(true)
      await expect(manager.consumeNonce('nonce-1')).resolves.toBe(false)
    })
  })

  it('disconnects via close()', async () => {
    const manager = await buildManager()
    await expect(manager.close()).resolves.toBeUndefined()
  })
})
