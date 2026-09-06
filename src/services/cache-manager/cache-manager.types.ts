export interface CacheManager {
  setup: () => Promise<void>
  close: () => Promise<void>
  get: <T = unknown>(key: string) => Promise<T | undefined>
  set: <T = unknown>(key: string, value: T, ttlMs: number) => Promise<void>
  delete: (key: string) => Promise<void>
}
