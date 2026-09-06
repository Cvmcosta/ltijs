import IoredisMock from 'ioredis-mock'
import { RedisCacheManager } from '#services/cache-manager/redis/redis-cache-manager.service'
import { MissingCacheConfigError } from '#services/cache-manager/redis/errors'
import type { Logger } from '#services/logger/logger.types'

jest.mock('ioredis', () => IoredisMock)

const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }

const buildCache = async (): Promise<RedisCacheManager> => {
  const cache = new RedisCacheManager({ url: 'redis://localhost:6379' }, logger)
  await cache.setup()
  return cache
}

describe('RedisCacheManager constructor', () => {
  it('throws MISSING_CACHE_CONFIG when constructed without a config', () => {
    expect(() => new RedisCacheManager(undefined, logger)).toThrow('MISSING_CACHE_CONFIG')
  })

  it('throws MISSING_CACHE_CONFIG when the url is an empty string', () => {
    expect(() => new RedisCacheManager({ url: '' }, logger)).toThrow(MissingCacheConfigError)
  })
})

describe('RedisCacheManager.get()', () => {
  it('resolves undefined for a key that was never set', async () => {
    const cache = await buildCache()

    await expect(cache.get('missing')).resolves.toBeUndefined()
  })

  it('resolves undefined instead of throwing when the stored value is not valid JSON', async () => {
    const cache = await buildCache()
    // Write raw, non-JSON data directly through the underlying ioredis client, bypassing
    // RedisCacheManager.set()'s own JSON.stringify -- simulates corrupted or foreign data.
    await (cache as unknown as { client: { set: (key: string, value: string) => Promise<unknown> } }).client.set(
      'corrupted',
      'not-json{',
    )

    await expect(cache.get('corrupted')).resolves.toBeUndefined()
  })
})

describe('RedisCacheManager.set() / get()', () => {
  it('round-trips a JSON-serializable value', async () => {
    const cache = await buildCache()

    await cache.set('key', { foo: 'bar' }, 1000)

    await expect(cache.get('key')).resolves.toEqual({ foo: 'bar' })
  })

  it('expires an entry once its TTL has elapsed', async () => {
    const cache = await buildCache()

    await cache.set('key', 'value', 50)
    await new Promise(resolve => setTimeout(resolve, 100))

    await expect(cache.get('key')).resolves.toBeUndefined()
  })

  it('still resolves the value before the TTL elapses', async () => {
    const cache = await buildCache()

    await cache.set('key', 'value', 1000)

    await expect(cache.get('key')).resolves.toBe('value')
  })
})

describe('RedisCacheManager.delete()', () => {
  it('removes a cached entry immediately, before its TTL would otherwise elapse', async () => {
    const cache = await buildCache()
    await cache.set('key', 'value', 60_000)

    await cache.delete('key')

    await expect(cache.get('key')).resolves.toBeUndefined()
  })

  it('is a no-op when the key was never set', async () => {
    const cache = await buildCache()

    await expect(cache.delete('missing')).resolves.toBeUndefined()
  })
})

describe('RedisCacheManager.setup() / close()', () => {
  it('setup() resolves without throwing', async () => {
    const cache = new RedisCacheManager({ url: 'redis://localhost:6379' }, logger)

    await expect(cache.setup()).resolves.toBeUndefined()
  })

  it('close() resolves without throwing', async () => {
    const cache = await buildCache()

    await expect(cache.close()).resolves.toBeUndefined()
  })
})
