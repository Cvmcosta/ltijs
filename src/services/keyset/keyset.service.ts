import { HttpMethod } from '#services/http-handler/http-handler.types'
import type { HttpHandler } from '#services/http-handler/http-handler.types'
import type { PlatformManager } from '#services/platform-manager/platform-manager.service'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import { rsaToJwk } from '#utils/crypto/keys'
import { RS256_ALGORITHM } from '#utils/crypto/jwt.constants'
import type { CacheManager } from '#services/cache-manager/cache-manager.types'
import type { Logger } from '#services/logger/logger.types'
import type { Jwk, Keyset } from '#services/keyset/keyset.types'
import { KEYSET_CACHE_KEY } from '#services/keyset/keyset.constants'

export class KeysetService {
  private readonly LOG_COMPONENT = 'keysetService'
  private readonly DEFAULT_KEYSET_ROUTE = '/lti/keys'
  private readonly SIG_USE = 'sig'
  private readonly KEYSET_CACHE_TTL_MS = 60 * 1000

  private readonly platformManager: PlatformManager
  private readonly httpHandler: HttpHandler
  private readonly cacheManager: CacheManager
  private readonly logger: Logger

  constructor(platformManager: PlatformManager, httpHandler: HttpHandler, cacheManager: CacheManager, logger: Logger) {
    this.platformManager = platformManager
    this.httpHandler = httpHandler
    this.cacheManager = cacheManager
    this.logger = logger
  }

  public prepareHttpRoutes(route: string = this.DEFAULT_KEYSET_ROUTE): void {
    this.httpHandler.registerRoute(route, [HttpMethod.Get], async (_request, response) => {
      const keyset = await this.buildKeyset()
      this.logger.debug(this.LOG_COMPONENT, `Served keyset with ${keyset.keys.length} key(s)`)
      response.json(keyset)
    })
  }

  // Short-TTL cache (via the injected CacheManager) -- this endpoint is polled by every registered
  // platform verifying a signed response, and buildKeyset() would otherwise re-scan the full platform
  // table (plus, on the mongo-legacy store, 3 additional queries per returned platform) on every single
  // hit. The TTL is a safety net, not the primary invalidation mechanism -- PlatformManager actively
  // deletes this same KEYSET_CACHE_KEY entry on register/delete/rotateKeys, so a change is normally
  // visible immediately, not just once the TTL happens to expire.
  private async buildKeyset(): Promise<Keyset> {
    const cached = await this.cacheManager.get<Keyset>(KEYSET_CACHE_KEY)
    if (cached !== undefined) return cached

    const platforms = await this.platformManager.getPlatforms()
    const keyset: Keyset = { keys: platforms.map(platform => this.buildJwk(platform)) }
    await this.cacheManager.set(KEYSET_CACHE_KEY, keyset, this.KEYSET_CACHE_TTL_MS)
    return keyset
  }

  private buildJwk(platform: Platform): Jwk {
    return { ...rsaToJwk(platform.keys.public), kid: platform.id, alg: RS256_ALGORITHM, use: this.SIG_USE }
  }
}

export default KeysetService
