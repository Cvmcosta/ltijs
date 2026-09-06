import { LtijsError } from '#shared/errors'

export class MissingCacheConfigError extends LtijsError {
  constructor() {
    super('MISSING_CACHE_CONFIG')
  }
}
