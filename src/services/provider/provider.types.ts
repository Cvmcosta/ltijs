import type { DatabaseManager } from '#services/database-manager/database-manager.types'
import type { MongoConnectionConfig } from '#services/database-manager/mongo/mongo-database-manager.types'
import type { RequestHandler } from '#services/request-handler/request-handler.types'
import type { CorsOptions, HttpHandler, SslOptions } from '#services/http-handler/http-handler.types'
import type { CacheManager } from '#services/cache-manager/cache-manager.types'
import type { Logger } from '#services/logger/logger.types'
import type { DynamicRegistration } from '#services/dynamic-registration/dynamic-registration.service'
import type { DynamicRegistrationOptions } from '#services/dynamic-registration/dynamic-registration.types'

export interface ProviderRoutes {
  loginRoute?: string
  launchRoute?: string
  keysetRoute?: string
  dynamicRegistrationRoute?: string
}

export interface ProviderServerOptions {
  /** Defaults to `3000`. */
  port?: number
  /** Terminates TLS in-process instead of listening over plain HTTP -- pass a PEM-encoded key/cert pair. */
  ssl?: SslOptions
  /**
   * Defaults to reflecting any request origin with credentials allowed. Pass `false` to disable CORS
   * entirely.
   */
  cors?: false | CorsOptions
}

export interface DynamicRegistrationSetup {
  route: string
  service: DynamicRegistration
}

export interface ProviderOptions {
  databaseManager?: DatabaseManager
  database?: MongoConnectionConfig
  requestHandler?: RequestHandler
  httpHandler?: HttpHandler
  /**
   * Port, TLS, and CORS for the default `ExpressHttpHandler`. Only applies when `httpHandler` above is
   * left unset -- a custom `httpHandler` is assumed to already be fully configured (it was constructed
   * with whatever options it needs before being passed in here), so this field is ignored entirely once
   * `httpHandler` is given. See `ProviderServerOptions` below.
   */
  server?: ProviderServerOptions
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
}

export interface DeployOptions {
  /** Suppresses the startup banner `listen()` prints by default. */
  silent?: boolean
}
