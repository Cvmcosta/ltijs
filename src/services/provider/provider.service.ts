import { DefaultLogger } from '#services/logger/default/default-logger.service'
import { FetchRequestHandler } from '#services/request-handler/fetch/fetch-request-handler.service'
import { MongoDatabaseManager } from '#services/database-manager/mongo/mongo-database-manager.service'
import { ExpressHttpHandler } from '#services/http-handler/express/express-http-handler.service'
import { MockCacheManager } from '#services/cache-manager/mock/mock-cache-manager.service'
import { PlatformManager } from '#services/platform-manager/platform-manager.service'
import { AccessTokenManager } from '#services/access-token-manager/access-token-manager.service'
import { OidcService } from '#services/oidc/oidc.service'
import { LaunchService } from '#services/launch/launch.service'
import { KeysetService } from '#services/keyset/keyset.service'
import { DynamicRegistration } from '#services/dynamic-registration/dynamic-registration.service'
import { DynamicRegistrationNotConfiguredError } from '#services/provider/errors'
import type { DatabaseManager } from '#services/database-manager/database-manager.types'
import type { RequestHandler } from '#services/request-handler/request-handler.types'
import type { HttpHandler, RouteHandler, SslOptions } from '#services/http-handler/http-handler.types'
import type { CacheManager } from '#services/cache-manager/cache-manager.types'
import type { Logger } from '#services/logger/logger.types'
import type {
  InactivePlatformHandler,
  OnLaunchHandler,
  UnregisteredPlatformHandler,
} from '#services/launch/launch.types'
import type { LaunchContext } from '#services/launch/launch-context.service'
import type { DeployOptions, DynamicRegistrationSetup, ProviderOptions } from '#services/provider/provider.types'

/**
 * The library's main entry point. Construct one per application (`new Provider(options)`), wire up
 * launch handlers, then call {@link Provider.deploy} to start listening. Everything else -- platform
 * registration, resuming a launch outside the original request, closing down cleanly -- goes through
 * this instance or the sub-services exposed on it.
 */
export class Provider {
  private readonly DEFAULT_LOGIN_ROUTE = '/lti/login'
  private readonly DEFAULT_LAUNCH_ROUTE = '/lti/launch'
  private readonly DEFAULT_KEYSET_ROUTE = '/lti/keys'
  private readonly DEFAULT_DYNAMIC_REGISTRATION_ROUTE = '/lti/register'
  private readonly DEFAULT_PORT = 3000
  private readonly DEFAULT_TOKEN_MAX_AGE_SECONDS = 10

  private readonly STARTUP_BANNER =
    '  _   _______ _____      _  _____\n' +
    ' | | |__   __|_   _|    | |/ ____|\n' +
    ' | |    | |    | |      | | (___  \n' +
    ' | |    | |    | |  _   | |\\___ \\ \n' +
    ' | |____| |   _| |_| |__| |____) |\n' +
    ' |______|_|  |_____|\\____/|_____/ \n'

  /** The active storage backend -- defaults to `MongoDatabaseManager`; override via `ProviderOptions.databaseManager`. */
  public readonly databaseManager: DatabaseManager
  /** Register, look up, update, and (de)activate platforms -- see its own methods for the full CRUD surface. */
  public readonly platformManager: PlatformManager
  /** The active HTTP framework adapter -- defaults to `ExpressHttpHandler`; override via `ProviderOptions.httpHandler`. */
  public readonly httpHandler: HttpHandler
  /** The active cache backend -- defaults to a no-op; override via `ProviderOptions.cacheManager` (e.g. `RedisCacheManager`). */
  public readonly cacheManager: CacheManager
  /** Serves the JWKS keyset route platforms fetch to verify this tool's signed responses. */
  public readonly keysetService: KeysetService
  /** Only set when `ProviderOptions.dynamicRegistration` was provided at construction. */
  public readonly dynamicRegistrationService?: DynamicRegistration

  private readonly logger: Logger
  private readonly loginRoute: string
  private readonly launchRoute: string
  private readonly keysetRoute: string
  private readonly dynamicRegistrationRoute?: string
  private readonly launchService: LaunchService
  private readonly port: number
  private readonly ssl?: SslOptions

  /**
   * Every dependency (`databaseManager`, `cacheManager`, `httpHandler`, `requestHandler`, `logger`) has a
   * working default -- pass nothing beyond a database connection (or a full `databaseManager`) to get a
   * runnable provider. Route defaults are `/lti/login`, `/lti/launch`, `/lti/keys`, `/lti/register`.
   */
  constructor(options: ProviderOptions) {
    this.logger = options.logger ?? new DefaultLogger()
    const requestHandler: RequestHandler = options.requestHandler ?? new FetchRequestHandler()
    this.cacheManager = options.cacheManager ?? new MockCacheManager()
    this.httpHandler = options.httpHandler ?? new ExpressHttpHandler(this.logger, { cors: options.server?.cors })
    this.port = options.server?.port ?? this.DEFAULT_PORT
    this.ssl = options.server?.ssl
    this.databaseManager = options.databaseManager ?? new MongoDatabaseManager(options.database, this.logger)

    this.platformManager = new PlatformManager(this.databaseManager, this.logger, this.cacheManager)
    const accessTokenManager = new AccessTokenManager(this.databaseManager, requestHandler, this.logger)
    const oidcService = new OidcService(
      this.databaseManager,
      requestHandler,
      this.cacheManager,
      this.logger,
      options.tokenMaxAge ?? this.DEFAULT_TOKEN_MAX_AGE_SECONDS,
    )

    this.loginRoute = options.routes?.loginRoute ?? this.DEFAULT_LOGIN_ROUTE
    this.launchRoute = options.routes?.launchRoute ?? this.DEFAULT_LAUNCH_ROUTE
    this.keysetRoute = options.routes?.keysetRoute ?? this.DEFAULT_KEYSET_ROUTE

    this.launchService = new LaunchService(
      oidcService,
      this.platformManager,
      accessTokenManager,
      this.databaseManager,
      requestHandler,
      this.httpHandler,
      this.logger,
    )
    this.launchService.prepareHttpRoutes({ loginRoute: this.loginRoute, launchRoute: this.launchRoute })

    if (options.handlers?.onResourceLink !== undefined) this.onResourceLink(options.handlers.onResourceLink)
    if (options.handlers?.onDeepLinking !== undefined) this.onDeepLinking(options.handlers.onDeepLinking)
    if (options.handlers?.onSubmissionReview !== undefined) this.onSubmissionReview(options.handlers.onSubmissionReview)
    if (options.onUnregisteredPlatform !== undefined) this.onUnregisteredPlatform(options.onUnregisteredPlatform)
    if (options.onInactivePlatform !== undefined) this.onInactivePlatform(options.onInactivePlatform)

    this.keysetService = new KeysetService(this.platformManager, this.httpHandler, this.cacheManager, this.logger)
    this.keysetService.prepareHttpRoutes(this.keysetRoute)

    const dynamicRegistration = this.setupDynamicRegistration(options, requestHandler)
    this.dynamicRegistrationRoute = dynamicRegistration?.route
    this.dynamicRegistrationService = dynamicRegistration?.service
  }

  /** Called on a standard resource-link launch (the common case -- a student/instructor opening the tool from the LMS). */
  public onResourceLink(handler: OnLaunchHandler): void {
    this.launchService.setOnResourceLinkHandler(handler)
  }

  /** Alias of `onResourceLink()`, matching legacy's exact method name for anyone migrating from legacy ltijs. */
  public onConnect(handler: OnLaunchHandler): void {
    this.onResourceLink(handler)
  }

  /** Called when the platform launches the tool for content selection (the deep-linking message type). */
  public onDeepLinking(handler: OnLaunchHandler): void {
    this.launchService.setOnDeepLinkingHandler(handler)
  }

  /** Called on a submission-review launch (an instructor reviewing a learner's graded submission). */
  public onSubmissionReview(handler: OnLaunchHandler): void {
    this.launchService.setOnSubmissionReviewHandler(handler)
  }

  /**
   * Called instead of throwing the default `UnregisteredPlatformError` when a login request arrives
   * from a platform this tool hasn't registered yet. Must fully send the response itself.
   */
  public onUnregisteredPlatform(handler: UnregisteredPlatformHandler): void {
    this.launchService.setOnUnregisteredPlatformHandler(handler)
  }

  /**
   * Called instead of throwing the default `PlatformNotActivatedError` when a login request arrives
   * from a platform that's registered but deactivated. Must fully send the response itself.
   */
  public onInactivePlatform(handler: InactivePlatformHandler): void {
    this.launchService.setOnInactivePlatformHandler(handler)
  }

  /**
   * Overrides the default GET handler for the dynamic-registration route. Throws
   * `DynamicRegistrationNotConfiguredError` if `ProviderOptions.dynamicRegistration` wasn't set.
   */
  public onDynamicRegistration(handler: RouteHandler): void {
    if (this.dynamicRegistrationService === undefined) throw new DynamicRegistrationNotConfiguredError()
    this.dynamicRegistrationService.setHandler(handler)
  }

  /**
   * Resumes a previously-issued launch by its ltik -- the session-resumption entry point for a
   * follow-up request (e.g. protecting a custom app route, or submitting a grade from a background
   * job) using a ltik obtained from an earlier `LaunchContext`.
   */
  public async getLaunchContext(ltik: string): Promise<LaunchContext> {
    return await this.launchService.getLaunchContext(ltik)
  }

  private setupDynamicRegistration(
    options: ProviderOptions,
    requestHandler: RequestHandler,
  ): DynamicRegistrationSetup | undefined {
    if (options.dynamicRegistration === undefined) return undefined

    const route = options.routes?.dynamicRegistrationRoute ?? this.DEFAULT_DYNAMIC_REGISTRATION_ROUTE
    const service = new DynamicRegistration(
      options.dynamicRegistration,
      { appRoute: this.launchRoute, loginRoute: this.loginRoute, keysetRoute: this.keysetRoute },
      this.platformManager,
      requestHandler,
      this.httpHandler,
      this.logger,
    )
    if (options.onDynamicRegistration !== undefined) service.setHandler(options.onDynamicRegistration(service))
    service.prepareHttpRoutes(route)
    return { route, service }
  }

  /**
   * Connects the database and cache backends, starts the HTTP listener, and registers a `SIGINT` handler
   * that calls {@link Provider.close} before exiting. Prints a startup banner unless `options.silent`. Port
   * and TLS come from `ProviderOptions.server`, set at construction time, not from `options` here.
   */
  public async deploy(options: DeployOptions = {}): Promise<void> {
    await this.databaseManager.setup()
    await this.cacheManager.setup()
    await this.httpHandler.listen(this.port, this.ssl)
    if (options.silent !== true) this.printStartupBanner(this.port)

    process.on('SIGINT', () => {
      void this.close().finally(() => process.exit())
    })
  }

  /** Stops the HTTP listener and closes the database and cache connections, in that order. */
  public async close(): Promise<void> {
    await this.httpHandler.close()
    await this.databaseManager.close()
    await this.cacheManager.close()
  }

  private printStartupBanner(port: number): void {
    const message =
      `LTI Provider is listening on port ${port}!\n\n` +
      ' LTI provider config: \n' +
      ` >Login Route: ${this.loginRoute}\n` +
      ` >Launch Route: ${this.launchRoute}\n` +
      ` >Keyset Route: ${this.keysetRoute}\n` +
      ` >Dynamic Registration Route: ${this.dynamicRegistrationRoute ?? '(disabled)'}`

    console.log(this.STARTUP_BANNER)
    console.log(message)
  }
}

export default Provider
