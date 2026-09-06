export { Provider } from '#services/provider/provider.service'

// Errors -- for catch (err) { if (err instanceof LtijsError) ... } style handling.
export { LtijsError } from '#shared/errors'
export { ValidationError } from '#utils/validation/errors'

// Provider construction/configuration/deployment.
export type {
  ProviderOptions,
  ProviderRoutes,
  ProviderServerOptions,
  DeployOptions,
} from '#services/provider/provider.types'
export type { MongoConnectionConfig } from '#services/database-manager/mongo/mongo-database-manager.types'

// Launch handlers -- the shape of onResourceLink/onDeepLinking/onSubmissionReview, and the
// LaunchContext object every one of them receives.
export type { LaunchHandlers, OnLaunchHandler, RedirectOptions } from '#services/launch/launch.types'
export type { LaunchContext } from '#services/launch/launch-context.service'
export type { IdToken, LegacyIdToken } from '#services/launch/id-token.types'
// `LtiMessageType` (idToken.launch.type) is a real enum -- a real export is required for its
// runtime values, not just its type. Same reasoning applies to `IdTokenValidationMethod` below.
export { LtiMessageType } from '#services/launch/id-token.constants'

// Platform management -- context.platform and everything provider.platformManager exposes.
export type {
  Platform,
  PlatformRegistrationInput,
  PlatformUpdateInput,
  PlatformSearchInput,
} from '#services/platform-manager/platform-manager.types'
export { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'

// Grading (AGS) -- context.grading's method parameter/return shapes.
export type {
  LineItem,
  Score,
  Result,
  GetLineItemsOptions,
  GetScoresOptions,
  GetLineItemsResult,
  GetScoresResult,
} from '#services/grading/grading.types'

// Deep Linking -- context.deepLinking's method parameter shapes.
export type { ContentItem, ContentItemsInput, DeepLinkingOptions } from '#services/deep-linking/deep-linking.types'

// Names and Roles (NRPS) -- context.namesAndRoles's method parameter/return shapes.
export type { Member, Memberships, GetMembersOptions } from '#services/names-and-roles/names-and-roles.types'

// Dynamic Registration -- ProviderOptions.dynamicRegistration and a custom onDynamicRegistration handler.
export type {
  DynamicRegistrationOptions,
  DynamicRegistrationMessageOptions,
} from '#services/dynamic-registration/dynamic-registration.types'
export type { DynamicRegistrationHandlerFactory } from '#services/provider/provider.types'

// Raw HTTP plumbing -- for onUnregisteredPlatform/onInactivePlatform/onDynamicRegistration overrides.
export type { UnregisteredPlatformHandler, InactivePlatformHandler } from '#services/launch/launch.types'
export type {
  RouteHandler,
  HttpRequestParameters,
  HttpResponse,
  CookieOptions,
  SslOptions,
  CorsOptions,
} from '#services/http-handler/http-handler.types'
// `HttpMethod` is a real enum, not a type-only construct -- a real (non-type-only) export is required
// so its runtime values (HttpMethod.Get, HttpMethod.Post, ...) survive compilation, not just its type.
export { HttpMethod } from '#services/http-handler/http-handler.types'

// Pluggable interfaces -- implement one of these to swap the default MongoDB/fetch/Express/no-op-cache/
// debug backing implementation for your own, and pass it via the matching ProviderOptions field.
export type { DatabaseManager } from '#services/database-manager/database-manager.types'
export type {
  PlatformRecord,
  PlatformAttributes,
  PlatformFilter,
  AccessTokenRecord,
  IdTokenRecord,
  IdTokenClaims,
} from '#services/database-manager/database-manager.types'
export type {
  RequestHandler,
  RequestOptions,
  RequestHeaders,
  RequestResponse,
} from '#services/request-handler/request-handler.types'
export type { HttpHandler } from '#services/http-handler/http-handler.types'
export type { CacheManager } from '#services/cache-manager/cache-manager.types'
export type { Logger } from '#services/logger/logger.types'

// Opt-in, non-default implementations -- Provider never auto-constructs these, so the class itself
// must be exported for a consumer to import, construct, and pass via ProviderOptions.databaseManager /
// .cacheManager.
export { MongoLegacyDatabaseManager } from '#services/database-manager/mongo-legacy/mongo-legacy-database-manager.service'
export type { MongoConnectionConfig as MongoLegacyConnectionConfig } from '#services/database-manager/mongo-legacy/mongo-legacy-database-manager.types'
export { RedisCacheManager } from '#services/cache-manager/redis/redis-cache-manager.service'
export type { RedisConnectionConfig } from '#services/cache-manager/redis/redis-cache-manager.types'

// `ExpressHttpHandler` is the *default* `httpHandler`, exported so a consumer can construct their own
// instance -- registering custom middleware, `express.static`, or custom CORS on `.app` before passing it
// to `new Provider({ httpHandler, ... })` -- ahead of Provider's own route registration. (Grabbing
// `provider.httpHandler` *after* construction and casting it doesn't work for this: Provider's
// constructor registers all its own routes synchronously, and since those handlers always end the
// response themselves, middleware added afterward never runs for them.)
export { ExpressHttpHandler } from '#services/http-handler/express/express-http-handler.service'
export type { ExpressHttpHandlerOptions } from '#services/http-handler/express/express-http-handler.service'
