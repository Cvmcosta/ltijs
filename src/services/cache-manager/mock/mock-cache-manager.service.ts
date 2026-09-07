import type { CacheManager } from '#services/cache-manager/cache-manager.types'

// The default CacheManager -- every operation is a no-op (get() always misses). A process-local
// in-memory cache would be unsafe to default to: in a multi-instance deployment, neither its TTL
// convergence nor its delete()-based invalidation is coordinated across nodes, so "no caching" is the
// only choice that's always correct regardless of topology. Opt into real, coordinated caching via
// `RedisCacheManager` (`ProviderOptions.cacheManager`), the same way `MongoLegacyDatabaseManager` is
// opted into.
export class MockCacheManager implements CacheManager {
  public async listen(): Promise<void> {
    return undefined
  }

  public async close(): Promise<void> {
    return undefined
  }

  public async get<T = unknown>(_key: string): Promise<T | undefined> {
    return undefined
  }

  public async set<T = unknown>(_key: string, _value: T, _ttlMs: number): Promise<void> {
    return undefined
  }

  public async delete(_key: string): Promise<void> {
    return undefined
  }
}

export default MockCacheManager
