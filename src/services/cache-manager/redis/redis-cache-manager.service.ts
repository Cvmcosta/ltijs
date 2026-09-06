import Redis from 'ioredis'
import type { CacheManager } from '#services/cache-manager/cache-manager.types'
import type { Logger } from '#services/logger/logger.types'
import { MissingCacheConfigError } from '#services/cache-manager/redis/errors'
import type { RedisConnectionConfig } from '#services/cache-manager/redis/redis-cache-manager.types'

/**
 * A `CacheManager` backed by Redis -- the opt-in choice for real, cross-instance-coordinated caching
 * (the default `MockCacheManager` is a no-op, since a per-process cache can't stay consistent across
 * multiple ltijs instances behind a load balancer). Not constructed by `Provider` automatically; import
 * it, construct it, and pass it as `ProviderOptions.cacheManager`, the same way `MongoLegacyDatabaseManager`
 * is opted into.
 */
export class RedisCacheManager implements CacheManager {
  private readonly LOG_COMPONENT = 'redisCacheManager'
  private readonly PX_OPTION = 'PX'

  private readonly client: Redis
  private readonly logger: Logger

  /** Throws `MissingCacheConfigError` if `config` is missing or `config.url` is empty. */
  constructor(config: RedisConnectionConfig | undefined, logger: Logger) {
    if (config === undefined || config.url === '') throw new MissingCacheConfigError()
    // `lazyConnect` mirrors DatabaseManager's setup()-gated connection lifecycle -- the client doesn't
    // connect on construction, only once setup() explicitly does so.
    this.client = new Redis(config.url, { lazyConnect: true, ...config.connection })
    this.logger = logger
  }

  public async setup(): Promise<void> {
    await this.client.connect()
    this.logger.debug(this.LOG_COMPONENT, 'Redis connected')
  }

  public async close(): Promise<void> {
    await this.client.quit()
  }

  public async get<T = unknown>(key: string): Promise<T | undefined> {
    const raw = await this.client.get(key)
    if (raw === null) return undefined
    try {
      return JSON.parse(raw) as T
    } catch {
      // Corrupted or foreign (non-JSON) data under this key -- treated as a miss, not an error,
      // consistent with the CacheManager interface's "a miss is always a safe outcome" contract.
      return undefined
    }
  }

  public async set<T = unknown>(key: string, value: T, ttlMs: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), this.PX_OPTION, ttlMs)
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(key)
  }
}

export default RedisCacheManager
