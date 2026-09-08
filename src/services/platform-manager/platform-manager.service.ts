import type { Logger } from '#services/logger/logger.types'
import { validate } from '#utils/validation/validation'
import { generateKeyPair } from '#utils/crypto/keys'
import {
  PlatformRegistrationInputSchema,
  PlatformSearchInputSchema,
  PlatformUpdateInputSchema,
} from '#services/platform-manager/platform-manager.schemas'
import { buildPlatform } from '#services/platform-manager/platform.serializer'
import { resolvePlatformPrivateKey, resolvePlatformPublicKey } from '#services/platform-manager/platform-keys'
import {
  PlatformAlreadyRegisteredError,
  UrlClientIdCombinationAlreadyExistsError,
} from '#services/platform-manager/errors'
import type {
  DatabaseManager,
  PlatformRecord,
  PlatformAttributes,
} from '#services/database-manager/database-manager.types'
import type { Platform } from './platform-manager.types'
import type {
  PlatformRegistrationInput,
  PlatformSearchInput,
  PlatformUpdateInput,
} from '#services/platform-manager/platform-manager.types'
import type { CacheManager } from '#services/cache-manager/cache-manager.types'
import { KEYSET_CACHE_KEY } from '#services/keyset/keyset.constants'

/** Registers, looks up, updates, and (de)activates platforms. Reachable as `Provider.platformManager`. */
export class PlatformManager {
  private readonly LOG_COMPONENT = 'platformManager'

  private readonly databaseManager: DatabaseManager
  private readonly logger: Logger
  private readonly cacheManager: CacheManager | undefined

  constructor(databaseManager: DatabaseManager, logger: Logger, cacheManager?: CacheManager) {
    this.databaseManager = databaseManager
    this.logger = logger
    this.cacheManager = cacheManager
  }

  /** Registers a new platform, generating its RSA keypair. Throws `PlatformAlreadyRegisteredError` if the `url`/`clientId` pair already exists. */
  public async registerPlatform(platform: PlatformRegistrationInput): Promise<Platform> {
    const validated = validate<PlatformRegistrationInput>(PlatformRegistrationInputSchema, platform)
    const existingPlatform = await this.getPlatformByUrlAndClientId(validated.url, validated.clientId)
    if (existingPlatform !== undefined) throw new PlatformAlreadyRegisteredError()
    return await this.createNewPlatform(validated)
  }

  /** Lists registered platforms, optionally narrowed by `filter` (e.g. `{ active: true }`). */
  public async getPlatforms(filter?: PlatformSearchInput): Promise<Platform[]> {
    const validated =
      filter !== undefined ? validate<PlatformSearchInput>(PlatformSearchInputSchema, filter) : undefined
    const records = await this.databaseManager.getPlatforms(validated)
    return records.map(record => buildPlatform(record))
  }

  public async getPlatformById(platformId: string): Promise<Platform | undefined> {
    const record = await this.databaseManager.getPlatformById(platformId)
    if (record !== undefined) return buildPlatform(record)
  }

  /** The lookup used at login time: `url`/`clientId` together identify a platform, mirroring how the OIDC login request identifies it. */
  public async getPlatformByUrlAndClientId(url: string, clientId: string): Promise<Platform | undefined> {
    const record = await this.databaseManager.getPlatformByUrlAndClientId(url, clientId)
    if (record !== undefined) return buildPlatform(record)
  }

  /**
   * Writes only the fields present in `update` (never the rest of `platform`'s current fields), so a
   * concurrent update to a different field can't be silently reverted. Throws
   * `UrlClientIdCombinationAlreadyExistsError` if changing `url`/`clientId` would collide with another
   * platform.
   */
  public async updatePlatform(platform: Platform, update: PlatformUpdateInput): Promise<Platform> {
    const validated = validate<PlatformUpdateInput>(PlatformUpdateInputSchema, update)
    const changes = this.buildPlatformUpdate(platform, validated)

    const newUrl = changes.url ?? platform.url
    const newClientId = changes.clientId ?? platform.clientId
    if (newUrl !== platform.url || newClientId !== platform.clientId) {
      const collision = await this.databaseManager.getPlatformByUrlAndClientId(newUrl, newClientId)
      if (collision !== undefined) throw new UrlClientIdCombinationAlreadyExistsError()
    }

    await this.databaseManager.updatePlatformById(platform.id, changes)
    this.logger.debug(this.LOG_COMPONENT, `Platform updated: ${platform.id}`)
    return buildPlatform({ ...platform, ...changes })
  }

  public async deletePlatform(platform: Platform): Promise<void> {
    await this.databaseManager.deletePlatformById(platform.id)
    await this.invalidateKeysetCache()
    this.logger.debug(this.LOG_COMPONENT, `Platform deleted: ${platform.id}`)
  }

  /** A deactivated platform's login/launch requests are rejected (or routed to `onInactivePlatform`, if set) until reactivated. */
  public async activatePlatform(platform: Platform): Promise<Platform> {
    await this.databaseManager.updatePlatformById(platform.id, { active: true })
    this.logger.debug(this.LOG_COMPONENT, `Platform activated: ${platform.id}`)
    return buildPlatform({ ...platform, active: true })
  }

  public async deactivatePlatform(platform: Platform): Promise<Platform> {
    await this.databaseManager.updatePlatformById(platform.id, { active: false })
    this.logger.debug(this.LOG_COMPONENT, `Platform deactivated: ${platform.id}`)
    return buildPlatform({ ...platform, active: false })
  }

  /** Generates a fresh RSA keypair for the platform and invalidates the cached keyset: the old key stops being served immediately. */
  public async rotateKeys(platform: Platform): Promise<Platform> {
    const keys = await generateKeyPair()
    await this.databaseManager.updatePlatformById(platform.id, { keys })
    await this.invalidateKeysetCache()
    this.logger.debug(this.LOG_COMPONENT, `Platform keys rotated: ${platform.id}`)
    return buildPlatform({ ...platform, keys })
  }

  public async getPublicKey(platform: Platform): Promise<string> {
    return resolvePlatformPublicKey(platform)
  }

  public async getPrivateKey(platform: Platform): Promise<string> {
    return resolvePlatformPrivateKey(platform)
  }

  private async createNewPlatform(platform: PlatformRegistrationInput): Promise<Platform> {
    const keys = await generateKeyPair()
    const platformAttributes: PlatformAttributes = {
      active: true,
      keys,
      ...platform,
    }
    const id = await this.databaseManager.savePlatform(platformAttributes)
    await this.invalidateKeysetCache()
    this.logger.debug(this.LOG_COMPONENT, `Platform registered: ${id}`)
    const record: PlatformRecord = { ...platformAttributes, id }
    return buildPlatform(record)
  }

  // Reaches directly into KeysetService's cache key instead of taking a KeysetService dependency, since
  // Provider constructs KeysetService *after* PlatformManager (which KeysetService itself depends on);
  // the reverse dependency would be circular. `cacheManager` is optional so invalidation is simply
  // skipped when absent.
  private async invalidateKeysetCache(): Promise<void> {
    if (this.cacheManager === undefined) return
    await this.cacheManager.delete(KEYSET_CACHE_KEY)
  }

  // Only includes a field when `update` actually provided it. `DatabaseManager.updatePlatformById`
  // is already built to accept (and correctly write) a true partial update, so there's no need to fill
  // in every other field from `existing` just to hand it a complete record. `idTokenValidation` is the
  // one exception: since a `$set` on a nested object replaces it wholesale, a caller providing only one
  // of its two sub-fields still needs the other filled in from `existing` to avoid wiping it out.
  private buildPlatformUpdate(
    existing: Platform,
    update: PlatformUpdateInput,
  ): Partial<Omit<PlatformRecord, 'id' | 'keys'>> {
    const changes: Partial<Omit<PlatformRecord, 'id' | 'keys'>> = {}
    if (update.url !== undefined) changes.url = update.url
    if (update.clientId !== undefined) changes.clientId = update.clientId
    if (update.name !== undefined) changes.name = update.name
    if (update.authenticationEndpoint !== undefined) changes.authenticationEndpoint = update.authenticationEndpoint
    if (update.accessTokenEndpoint !== undefined) changes.accessTokenEndpoint = update.accessTokenEndpoint
    if (update.authorizationServer !== undefined) changes.authorizationServer = update.authorizationServer
    if (update.active !== undefined) changes.active = update.active
    if (update.idTokenValidation !== undefined) {
      changes.idTokenValidation = {
        method: update.idTokenValidation.method ?? existing.idTokenValidation.method,
        key: update.idTokenValidation.key ?? existing.idTokenValidation.key,
      }
    }
    return changes
  }

  // Deprecated methods
  /**
   * @deprecated Kept as a v5-migration bridge. Use {@link PlatformManager.getPlatforms} with no parameters instead.
   */
  public async getAllPlatforms(): Promise<Platform[]> {
    return await this.getPlatforms()
  }

  /**
   * @deprecated Kept as a v5-migration bridge. Use {@link PlatformManager.getPlatforms} (or
   * {@link PlatformManager.getPlatformByUrlAndClientId} for a single result) instead.
   */
  public async getPlatform(url: string, clientId: string): Promise<Platform | false>
  public async getPlatform(url: string, clientId?: undefined): Promise<Platform[] | false>
  public async getPlatform(url: string, clientId?: string): Promise<Platform | Platform[] | false> {
    const platforms = await this.getPlatforms({ url, clientId })
    if (platforms.length === 0) return false
    if (clientId !== undefined) return platforms[0]
    return platforms
  }
}

export default PlatformManager
