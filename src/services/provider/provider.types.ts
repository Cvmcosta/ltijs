import type { DatabaseManager } from '#services/database-manager/database-manager.types'
import type { MongoConnectionConfig } from '#services/database-manager/mongo/mongo-database-manager.types'
import type { RequestHandler } from '#services/request-handler/request-handler.types'
import type { HttpHandler, RouteHandler } from '#services/http-handler/http-handler.types'
import type { CacheManager } from '#services/cache-manager/cache-manager.types'
import type { Logger } from '#services/logger/logger.types'
import type {
  InactivePlatformHandler,
  LaunchHandlers,
  UnregisteredPlatformHandler,
} from '#services/launch/launch.types'
import type { DynamicRegistration } from '#services/dynamic-registration/dynamic-registration.service'
import type { DynamicRegistrationOptions } from '#services/dynamic-registration/dynamic-registration.types'

export interface ProviderRoutes {
  loginRoute?: string
  launchRoute?: string
  keysetRoute?: string
  dynamicRegistrationRoute?: string
}

// Takes the already-constructed `DynamicRegistration` instance rather than a plain handler, since the
// service doesn't exist yet when a consumer builds `ProviderOptions` -- the factory runs once it does,
// so a custom handler can still call back into `register()`/`performRegistration()`/
// `getOpenIDConfiguration()` instead of reimplementing the flow from scratch.
export type DynamicRegistrationHandlerFactory = (service: DynamicRegistration) => RouteHandler

export interface DynamicRegistrationSetup {
  route: string
  service: DynamicRegistration
}

export interface ProviderOptions {
  /**
   * All three fields are optional -- `LaunchService` now bakes in a real default for each (HTTP 200, body
   * `'It works!'`, until overridden). Anything given here is wired through the same public `onResourceLink()`/
   * `onDeepLinking()`/`onSubmissionReview()` methods a consumer could call post-construction.
   */
  handlers?: Partial<LaunchHandlers>
  databaseManager?: DatabaseManager
  database?: MongoConnectionConfig
  requestHandler?: RequestHandler
  httpHandler?: HttpHandler
  /**
   * Defaults to a no-op cache (nothing is ever cached) -- safe for any deployment topology, including
   * multiple ltijs instances behind a load balancer, since there's no per-process state to leave
   * inconsistent across nodes. Pass `RedisCacheManager` to opt into real caching -- every instance shares
   * the same backing store, so cache invalidation is actually coordinated across the cluster. Imported
   * and constructed directly, the same way `MongoLegacyDatabaseManager` is opted into.
   */
  cacheManager?: CacheManager
  logger?: Logger
  routes?: ProviderRoutes
  /**
   * Maximum age, in seconds, an id_token's `iat` claim is accepted at launch time before it's rejected
   * as `TOKEN_TOO_OLD`. Defaults to 10 seconds (matching legacy). Pass `false` to disable the check
   * entirely.
   */
  tokenMaxAge?: number | false
  dynamicRegistration?: DynamicRegistrationOptions
  /** Overrides the default GET handler for the dynamic-registration route entirely -- matches legacy's `onDynamicRegistration(cb)`. */
  onDynamicRegistration?: DynamicRegistrationHandlerFactory
  /**
   * Called instead of throwing the default `UnregisteredPlatformError` when a login request arrives from
   * an unregistered platform -- given `(request, response)`, must fully send the response itself (e.g.
   * after registering the platform via `provider.platformManager.registerPlatform()`). The login route
   * returns immediately afterward; the OIDC flow does not continue automatically.
   */
  onUnregisteredPlatform?: UnregisteredPlatformHandler
  /**
   * Called instead of throwing the default `PlatformNotActivatedError` when a login request arrives from
   * a deactivated platform -- given `(request, response)`, must fully send the response itself (e.g.
   * after reactivating via `provider.platformManager.activatePlatform()`). The login route returns
   * immediately afterward; the OIDC flow does not continue automatically.
   */
  onInactivePlatform?: InactivePlatformHandler
}

export interface DeployOptions {
  port?: number
  silent?: boolean
}
