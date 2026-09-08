import type { CacheManager } from '#services/cache-manager/cache-manager.types'
import { safeCacheGet, safeCacheSet } from '#services/cache-manager/cache-manager.utils'

const buildCacheManager = (overrides: Partial<CacheManager> = {}): CacheManager => ({
  listen: jest.fn(),
  close: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  ...overrides,
})

describe('safeCacheGet()', () => {
  it('resolves with the cached value on a normal hit', async () => {
    const cacheManager = buildCacheManager({ get: jest.fn().mockResolvedValue('cached-value') })

    await expect(safeCacheGet(cacheManager, 'some-key')).resolves.toBe('cached-value')
  })

  it('resolves with undefined on a normal miss', async () => {
    const cacheManager = buildCacheManager({ get: jest.fn().mockResolvedValue(undefined) })

    await expect(safeCacheGet(cacheManager, 'some-key')).resolves.toBeUndefined()
  })

  // The actual bug this exists to fix: a cache implementation rejecting (a transient Redis blip, say)
  // must degrade to a miss, not propagate the rejection, since every caller already treats undefined as
  // "go fetch fresh." This is what makes that fallback path actually reachable on a cache failure.
  it('resolves with undefined, not a rejection, when the cache manager throws', async () => {
    const cacheManager = buildCacheManager({ get: jest.fn().mockRejectedValue(new Error('connection lost')) })

    await expect(safeCacheGet(cacheManager, 'some-key')).resolves.toBeUndefined()
  })

  it('calls get() with the exact key given', async () => {
    const getSpy = jest.fn().mockResolvedValue(undefined)
    const cacheManager = buildCacheManager({ get: getSpy })

    await safeCacheGet(cacheManager, 'exact-key')

    expect(getSpy).toHaveBeenCalledWith('exact-key')
  })
})

describe('safeCacheSet()', () => {
  it('resolves normally when the write succeeds', async () => {
    const cacheManager = buildCacheManager({ set: jest.fn().mockResolvedValue(undefined) })

    await expect(safeCacheSet(cacheManager, 'some-key', 'some-value', 1000)).resolves.toBeUndefined()
  })

  // The actual bug this exists to fix: every current caller already has the value it's caching in hand
  // (freshly computed or fetched) and doesn't depend on the write succeeding, so a rejected write
  // shouldn't fail the caller's own request any more than a rejected read should.
  it('resolves normally, not a rejection, when the cache manager throws on set()', async () => {
    const cacheManager = buildCacheManager({ set: jest.fn().mockRejectedValue(new Error('connection lost')) })

    await expect(safeCacheSet(cacheManager, 'some-key', 'some-value', 1000)).resolves.toBeUndefined()
  })

  it('calls set() with the exact key, value, and ttl given', async () => {
    const setSpy = jest.fn().mockResolvedValue(undefined)
    const cacheManager = buildCacheManager({ set: setSpy })

    await safeCacheSet(cacheManager, 'exact-key', 'exact-value', 1234)

    expect(setSpy).toHaveBeenCalledWith('exact-key', 'exact-value', 1234)
  })
})
