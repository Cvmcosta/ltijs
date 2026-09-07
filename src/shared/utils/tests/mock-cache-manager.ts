import type { CacheManager } from '#services/cache-manager/cache-manager.types'

// A real, working (test-only) in-memory CacheManager for exercising actual caching/TTL/invalidation
// behavior, the same way buildMockDatabaseManager() stands in for Mongo. There is no production
// in-memory CacheManager (see MockCacheManager's own comment for why).
export const buildMockCacheManager = (): CacheManager => {
  const store = new Map<string, { value: unknown; expiresAt: number }>()

  return {
    listen: async () => undefined,
    close: async () => undefined,
    get: async <T = unknown>(key: string): Promise<T | undefined> => {
      const entry = store.get(key)
      if (entry === undefined) return undefined
      if (entry.expiresAt <= Date.now()) {
        store.delete(key)
        return undefined
      }
      return entry.value as T
    },
    set: async <T = unknown>(key: string, value: T, ttlMs: number): Promise<void> => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
    },
    delete: async (key: string): Promise<void> => {
      store.delete(key)
    },
  }
}
