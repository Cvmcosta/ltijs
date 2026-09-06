import { MockCacheManager } from '#services/cache-manager/mock/mock-cache-manager.service'

describe('MockCacheManager', () => {
  it('get() always resolves undefined, even right after set()', async () => {
    const cache = new MockCacheManager()

    await cache.set('key', 'value', 60_000)

    await expect(cache.get('key')).resolves.toBeUndefined()
  })

  it('set() resolves without throwing and does not retain the value', async () => {
    const cache = new MockCacheManager()

    await expect(cache.set('key', { foo: 'bar' }, 1000)).resolves.toBeUndefined()
    await expect(cache.get('key')).resolves.toBeUndefined()
  })

  it('delete() resolves without throwing', async () => {
    const cache = new MockCacheManager()

    await expect(cache.delete('key')).resolves.toBeUndefined()
  })

  it('setup() and close() resolve without throwing', async () => {
    const cache = new MockCacheManager()

    await expect(cache.setup()).resolves.toBeUndefined()
    await expect(cache.close()).resolves.toBeUndefined()
  })
})
