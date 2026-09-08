import type { CacheManager } from '#services/cache-manager/cache-manager.types'

// A cache read failing (a transient Redis blip, say) should never be worse than a cache miss. Every
// caller already has a "fetch fresh on miss" fallback, so treating a failed read as a miss just takes
// that same path instead of throwing. Callers use this instead of calling `cacheManager.get()` directly,
// so that guarantee holds regardless of which CacheManager implementation is plugged in, rather than
// relying on each implementation to honor it itself.
export async function safeCacheGet<T = unknown>(cacheManager: CacheManager, key: string): Promise<T | undefined> {
  try {
    return await cacheManager.get<T>(key)
  } catch {
    return undefined
  }
}

// Every current caller sets a value it already has in hand (freshly computed or fetched) purely to warm
// the cache for next time, with nothing depending on the write actually succeeding. A failed write here
// shouldn't fail the request that doesn't need it to succeed, any more than a failed read should.
export async function safeCacheSet<T = unknown>(
  cacheManager: CacheManager,
  key: string,
  value: T,
  ttlMs: number,
): Promise<void> {
  try {
    await cacheManager.set(key, value, ttlMs)
  } catch {
    // Swallowed; see the comment above.
  }
}
