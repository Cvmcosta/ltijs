/* eslint-disable @typescript-eslint/no-deprecated */
import { PlatformManager } from '#services/platform-manager/platform-manager.service'
import { generateKeyPair } from '#utils/crypto/keys'
import { buildMockDatabaseManager } from '#utils/tests/mock-database-manager'
import { expectValidationErrorOnField } from '#utils/tests/expect-validation-error'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import { buildMockCacheManager } from '#utils/tests/mock-cache-manager'
import { KEYSET_CACHE_KEY } from '#services/keyset/keyset.constants'
import type { Logger } from '#services/logger/logger.types'
import type { PlatformRegistrationInput } from '#services/platform-manager/platform-manager.types'

jest.mock('#utils/crypto/keys')
const mockedGenerateKeyPair = jest.mocked(generateKeyPair)

let keyPairCallCount = 0
mockedGenerateKeyPair.mockImplementation(async () => {
  keyPairCallCount += 1
  const kid = keyPairCallCount === 1 ? 'generated-kid' : `generated-kid-${keyPairCallCount}`
  return { kid, public: `public-key-${kid}`, private: `private-key-${kid}` }
})

beforeEach(() => {
  keyPairCallCount = 0
})

const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }

const registrationInput = {
  url: 'http://localhost/moodle',
  clientId: 'ClientId1',
  name: 'Moodle',
  authenticationEndpoint: 'http://localhost/moodle/auth',
  accessTokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
  idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: 'public-key-pem' },
}

describe('PlatformManager.registerPlatform()', () => {
  // A registration-input validation failure is a `ValidationError`, no
  // longer mapped back onto a specific legacy error class (see standing
  // conventions), so these assert on `.errors`, the field-path-grouped map
  // every `ValidationError` carries, to confirm which field actually failed.
  it('throws a ValidationError on url when url or clientId is missing', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    await expectValidationErrorOnField(manager.registerPlatform({ ...registrationInput, url: '' }), 'url')
  })

  it('throws a ValidationError when required registration fields are missing for a new platform', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    const incompleteInput = {
      url: registrationInput.url,
      clientId: registrationInput.clientId,
    } as unknown as PlatformRegistrationInput
    await expectValidationErrorOnField(manager.registerPlatform(incompleteInput), 'name')
  })

  it('throws a ValidationError on idTokenValidation.method for an invalid method', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    await expectValidationErrorOnField(
      manager.registerPlatform({
        ...registrationInput,
        idTokenValidation: { method: 'BAD_METHOD' as IdTokenValidationMethod, key: 'x' },
      }),
      'idTokenValidation.method',
    )
  })

  it('throws a ValidationError on idTokenValidation.key when it is empty', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    await expectValidationErrorOnField(
      manager.registerPlatform({
        ...registrationInput,
        idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: '' },
      }),
      'idTokenValidation.key',
    )
  })

  it('registers a brand-new platform, generating a key pair and persisting it', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)

    const platform = await manager.registerPlatform(registrationInput)

    expect(platform).toMatchObject({
      id: expect.any(String) as string,
      url: registrationInput.url,
      clientId: registrationInput.clientId,
      name: registrationInput.name,
      active: true,
    })
  })

  it('invalidates the keyset cache so /lti/keys picks up the new platform immediately, not once the TTL expires', async () => {
    const cacheManager = buildMockCacheManager()
    const deleteSpy = jest.spyOn(cacheManager, 'delete')
    const manager = new PlatformManager(buildMockDatabaseManager(), logger, cacheManager)

    await manager.registerPlatform(registrationInput)

    expect(deleteSpy).toHaveBeenCalledWith(KEYSET_CACHE_KEY)
  })

  it('does not throw when constructed without a cacheManager: registration simply skips invalidation', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)

    await expect(manager.registerPlatform(registrationInput)).resolves.toBeDefined()
  })

  it('throws PlatformAlreadyRegisteredError when a platform with the same url/clientId is already registered', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    await manager.registerPlatform(registrationInput)

    await expect(manager.registerPlatform(registrationInput)).rejects.toThrow('PLATFORM_ALREADY_REGISTERED')
  })
})

describe('PlatformManager.getPlatform()', () => {
  it('resolves the single matching Platform when a clientId is given', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    await manager.registerPlatform(registrationInput)

    const platform = await manager.getPlatform(registrationInput.url, registrationInput.clientId)

    expect(platform).toMatchObject({ url: registrationInput.url, clientId: registrationInput.clientId })
  })

  it('resolves false when a clientId is given but nothing matches', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    await expect(manager.getPlatform('http://localhost/unknown', 'ClientId1')).resolves.toBe(false)
  })

  it('resolves an array of every platform matching the url when no clientId is given', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    await manager.registerPlatform(registrationInput)

    const platforms = await manager.getPlatform(registrationInput.url)

    expect(platforms).toHaveLength(1)
  })

  it('resolves false when no clientId is given and nothing matches', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    await expect(manager.getPlatform('http://localhost/unknown')).resolves.toBe(false)
  })
})

describe('PlatformManager.getPlatformById()', () => {
  it('resolves undefined when platformId is empty', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    await expect(manager.getPlatformById('')).resolves.toBeUndefined()
  })

  it('resolves the Platform by id', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)

    await expect(manager.getPlatformById(platform.id)).resolves.toMatchObject({ id: platform.id })
  })

  it('resolves undefined when no platform matches the id', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    await expect(manager.getPlatformById('missing-kid')).resolves.toBeUndefined()
  })
})

describe('PlatformManager.updatePlatform()', () => {
  it('updates the given fields and returns the updated Platform', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)

    const updated = await manager.updatePlatform(platform, { name: 'New Name' })

    expect(updated).toMatchObject({ id: platform.id, name: 'New Name', url: registrationInput.url })
  })

  // updatePlatform() never touches `keys` (rotateKeys() is the only path that does), so the published
  // /lti/keys response is never affected by it; deliberately does not invalidate the keyset cache.
  it('does not invalidate the keyset cache: it never changes the keys the keyset publishes', async () => {
    const cacheManager = buildMockCacheManager()
    const manager = new PlatformManager(buildMockDatabaseManager(), logger, cacheManager)
    const platform = await manager.registerPlatform(registrationInput)
    const deleteSpy = jest.spyOn(cacheManager, 'delete')

    await manager.updatePlatform(platform, { name: 'New Name' })

    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it('keeps existing values for fields not included in the update', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)

    const updated = await manager.updatePlatform(platform, { name: 'New Name' })

    expect(updated.authenticationEndpoint).toBe(registrationInput.authenticationEndpoint)
    expect(updated.idTokenValidation).toEqual(registrationInput.idTokenValidation)
  })

  // Regression test for a real lost-update race: updatePlatform() used to write every base field back
  // to the database on every call (filled in from the caller's snapshot), so a concurrent update to a
  // *different* field could be silently reverted by whichever write landed second. Asserting the exact
  // database payload here is what actually catches that; a test that only checks the returned Platform
  // (as the ones above do) can't tell a true partial write from a full-record one.
  it('writes only the changed field to the database, not the whole record', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)
    const updateSpy = jest.spyOn(database, 'updatePlatformById')

    await manager.updatePlatform(platform, { name: 'New Name' })

    expect(updateSpy).toHaveBeenCalledWith(platform.id, { name: 'New Name' })
  })

  // The actual failure scenario the finding described: two concurrent "GET then PUT" updates, each
  // starting from the same stale snapshot, changing two different fields. Neither should revert the
  // other's change.
  it('does not revert a concurrent update to a different field', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const staleSnapshot = await manager.registerPlatform(registrationInput)

    await manager.updatePlatform(staleSnapshot, { name: 'New Name' })
    await manager.updatePlatform(staleSnapshot, { authenticationEndpoint: 'http://localhost/moodle/new-auth' })

    await expect(manager.getPlatformById(staleSnapshot.id)).resolves.toMatchObject({
      name: 'New Name',
      authenticationEndpoint: 'http://localhost/moodle/new-auth',
    })
  })

  it.each(['url', 'clientId', 'name', 'authenticationEndpoint', 'accessTokenEndpoint', 'authorizationServer'])(
    'throws a ValidationError on %s when it is an empty string',
    async field => {
      const database = buildMockDatabaseManager()
      const manager = new PlatformManager(database, logger)
      const platform = await manager.registerPlatform(registrationInput)

      await expectValidationErrorOnField(manager.updatePlatform(platform, { [field]: '' }), field)
    },
  )

  it('merges idTokenValidation field-by-field instead of replacing it wholesale', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)

    const updated = await manager.updatePlatform(platform, { idTokenValidation: { key: 'new-key' } })

    expect(updated.idTokenValidation).toEqual({ method: registrationInput.idTokenValidation.method, key: 'new-key' })
  })

  it('persists the update, not just the returned object', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)

    await manager.updatePlatform(platform, { name: 'New Name' })

    await expect(manager.getPlatformById(platform.id)).resolves.toMatchObject({ name: 'New Name' })
  })

  it('does not throw a collision error when url/clientId are provided but unchanged', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)

    await expect(
      manager.updatePlatform(platform, { url: platform.url, clientId: platform.clientId, name: 'New Name' }),
    ).resolves.toMatchObject({ name: 'New Name' })
  })

  it('throws URL_CLIENT_ID_COMBINATION_ALREADY_EXISTS when the new url/clientId collides with another platform', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)
    await manager.registerPlatform({ ...registrationInput, url: 'http://localhost/other', clientId: 'OtherClient' })

    await expect(
      manager.updatePlatform(platform, { url: 'http://localhost/other', clientId: 'OtherClient' }),
    ).rejects.toThrow('URL_CLIENT_ID_COMBINATION_ALREADY_EXISTS')
  })

  it('throws a ValidationError on idTokenValidation.method for an invalid method', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)

    await expectValidationErrorOnField(
      manager.updatePlatform(platform, { idTokenValidation: { method: 'BAD_METHOD' as IdTokenValidationMethod } }),
      'idTokenValidation.method',
    )
  })
})

describe('PlatformManager.deletePlatform()', () => {
  it('deletes a matching platform', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)

    await manager.deletePlatform(platform)

    await expect(manager.getPlatformById(platform.id)).resolves.toBeUndefined()
  })

  it('does not throw when the platform no longer exists', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)
    await manager.deletePlatform(platform)

    await expect(manager.deletePlatform(platform)).resolves.toBeUndefined()
  })

  it('invalidates the keyset cache so the deleted platform stops being served immediately', async () => {
    const cacheManager = buildMockCacheManager()
    const manager = new PlatformManager(buildMockDatabaseManager(), logger, cacheManager)
    const platform = await manager.registerPlatform(registrationInput)
    const deleteSpy = jest.spyOn(cacheManager, 'delete')

    await manager.deletePlatform(platform)

    expect(deleteSpy).toHaveBeenCalledWith(KEYSET_CACHE_KEY)
  })
})

describe('PlatformManager.getPlatforms()', () => {
  it('resolves every registered platform when no filter is given', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    await manager.registerPlatform(registrationInput)
    await manager.registerPlatform({ ...registrationInput, url: 'http://localhost/other', clientId: 'OtherClient' })

    await expect(manager.getPlatforms()).resolves.toHaveLength(2)
  })

  it('filters by url', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    await manager.registerPlatform(registrationInput)
    await manager.registerPlatform({ ...registrationInput, url: 'http://localhost/other', clientId: 'OtherClient' })

    const platforms = await manager.getPlatforms({ url: registrationInput.url })

    expect(platforms).toHaveLength(1)
    expect(platforms[0]).toMatchObject({ url: registrationInput.url })
  })

  it('filters by name', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    await manager.registerPlatform(registrationInput)
    await manager.registerPlatform({
      ...registrationInput,
      url: 'http://localhost/other',
      clientId: 'OtherClient',
      name: 'Other Name',
    })

    const platforms = await manager.getPlatforms({ name: registrationInput.name })

    expect(platforms).toHaveLength(1)
    expect(platforms[0]).toMatchObject({ name: registrationInput.name })
  })

  it('resolves an empty array when nothing matches the filter', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    await expect(manager.getPlatforms({ url: 'http://localhost/unknown' })).resolves.toEqual([])
  })
})

describe('PlatformManager.getAllPlatforms()', () => {
  it('resolves an empty array when no platforms are registered', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    await expect(manager.getAllPlatforms()).resolves.toEqual([])
  })

  it('resolves every registered platform', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    await manager.registerPlatform(registrationInput)
    await manager.registerPlatform({ ...registrationInput, url: 'http://localhost/other', clientId: 'OtherClient' })

    await expect(manager.getAllPlatforms()).resolves.toHaveLength(2)
  })
})

describe('PlatformManager.activatePlatform() / deactivatePlatform()', () => {
  it('persists and returns a new, frozen platform with active: false', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)

    const deactivated = await manager.deactivatePlatform(platform)
    expect(deactivated.active).toBe(false)
    expect(Object.isFrozen(deactivated)).toBe(true)

    const refetched = await manager.getPlatformById(platform.id)
    expect(refetched).toMatchObject({ active: false })
  })

  it('persists and returns a new, frozen platform with active: true', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)
    await manager.deactivatePlatform(platform)

    const activated = await manager.activatePlatform(platform)
    expect(activated.active).toBe(true)
    expect(Object.isFrozen(activated)).toBe(true)

    const refetched = await manager.getPlatformById(platform.id)
    expect(refetched).toMatchObject({ active: true })
  })
})

describe('PlatformManager.rotateKeys()', () => {
  it('persists and returns a new, frozen platform with new keys', async () => {
    const database = buildMockDatabaseManager()
    const manager = new PlatformManager(database, logger)
    const platform = await manager.registerPlatform(registrationInput)

    const rotated = await manager.rotateKeys(platform)
    expect(rotated.keys).not.toEqual(platform.keys)
    expect(Object.isFrozen(rotated)).toBe(true)

    const refetched = await manager.getPlatformById(platform.id)
    expect(refetched).toMatchObject({ keys: rotated.keys })
  })

  it('invalidates the keyset cache so the rotated public key is served immediately, not the stale one', async () => {
    const cacheManager = buildMockCacheManager()
    const manager = new PlatformManager(buildMockDatabaseManager(), logger, cacheManager)
    const platform = await manager.registerPlatform(registrationInput)
    const deleteSpy = jest.spyOn(cacheManager, 'delete')

    await manager.rotateKeys(platform)

    expect(deleteSpy).toHaveBeenCalledWith(KEYSET_CACHE_KEY)
  })
})

describe('PlatformManager.getPublicKey() / getPrivateKey()', () => {
  it('returns the stored public key', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    const platform = await manager.registerPlatform(registrationInput)

    await expect(manager.getPublicKey(platform)).resolves.toBe('public-key-generated-kid')
  })

  it('returns the stored private key', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    const platform = await manager.registerPlatform(registrationInput)

    await expect(manager.getPrivateKey(platform)).resolves.toBe('private-key-generated-kid')
  })

  it('throws PUBLIC_KEY_NOT_FOUND when the platform has no public key', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    const platform = await manager.registerPlatform(registrationInput)

    await expect(manager.getPublicKey({ ...platform, keys: { ...platform.keys, public: '' } })).rejects.toThrow(
      'PUBLIC_KEY_NOT_FOUND',
    )
  })

  it('throws PRIVATE_KEY_NOT_FOUND when the platform has no private key', async () => {
    const manager = new PlatformManager(buildMockDatabaseManager(), logger)
    const platform = await manager.registerPlatform(registrationInput)

    await expect(manager.getPrivateKey({ ...platform, keys: { ...platform.keys, private: '' } })).rejects.toThrow(
      'PRIVATE_KEY_NOT_FOUND',
    )
  })
})
