# Provider

The library's main entry point. Construct one per application (`new Provider(options)`), wire up launch
handlers, then call `deploy()` to start listening. Everything else, platform registration, resuming a
launch outside the original request, closing down cleanly, goes through this instance or the sub-services
exposed on it.

## Constructor

```ts
new Provider(options: ProviderOptions)
```

Every dependency (`databaseManager`, `cacheManager`, `httpHandler`, `requestHandler`, `logger`) has a
working default. Pass nothing beyond a database connection (or a full `databaseManager`) to get a
runnable provider. Route defaults are `/lti/login`, `/lti/launch`, `/lti/keys`, `/lti/register`.

## Properties

```ts
readonly databaseManager: DatabaseManager
readonly platformManager: PlatformManager
readonly httpHandler: HttpHandler
readonly cacheManager: CacheManager
readonly keysetService: KeysetService
readonly dynamicRegistrationService?: DynamicRegistration
```

- `databaseManager`: the active storage backend. Defaults to `MongoDatabaseManager`; override via
  `ProviderOptions.databaseManager`.
- `platformManager`: registers, looks up, updates, and (de)activates platforms. See
  [Platform Manager](platform-manager.md) for its full method list.
- `httpHandler`: the active HTTP framework adapter. Defaults to `ExpressHttpHandler`; override via
  `ProviderOptions.httpHandler`.
- `cacheManager`: the active cache backend. Defaults to a no-op; override via `ProviderOptions.cacheManager`
  (e.g. `RedisCacheManager`).
- `keysetService`: serves the JWKS keyset route platforms fetch to verify this tool's signed responses.
- `dynamicRegistrationService`: only set when `ProviderOptions.dynamicRegistration` was provided at
  construction.

## Methods

### `onResourceLink(handler)`

```ts
onResourceLink(handler: OnLaunchHandler): void
```

Called on a standard resource-link launch, the common case of a student or instructor opening the tool
from the LMS.

### `onConnect(handler)`

```ts
onConnect(handler: OnLaunchHandler): void
```

Alias of `onResourceLink()`, matching legacy ltijs's method name for anyone migrating from an earlier
version.

### `onDeepLinking(handler)`

```ts
onDeepLinking(handler: OnLaunchHandler): void
```

Called when the platform launches the tool for content selection (the deep-linking message type).

### `onSubmissionReview(handler)`

```ts
onSubmissionReview(handler: OnLaunchHandler): void
```

Called on a submission-review launch, an instructor reviewing a learner's graded submission.

### `onUnregisteredPlatform(handler)`

```ts
onUnregisteredPlatform(handler: UnregisteredPlatformHandler): void
```

Called instead of throwing the default `UnregisteredPlatformError` when a login request arrives from a
platform this tool hasn't registered yet. The handler must fully send the response itself.

### `onInactivePlatform(handler)`

```ts
onInactivePlatform(handler: InactivePlatformHandler): void
```

Called instead of throwing the default `PlatformNotActivatedError` when a login request arrives from a
platform that's registered but deactivated. The handler must fully send the response itself.

### `onDynamicRegistration(handler)`

```ts
onDynamicRegistration(handler: RouteHandler): void
```

Overrides the default GET handler for the dynamic-registration route. Throws
`DynamicRegistrationNotConfiguredError` if `ProviderOptions.dynamicRegistration` wasn't set.

### `getLaunchContext(ltik)`

```ts
getLaunchContext(ltik: string): Promise<LaunchContext>
```

Resumes a previously-issued launch by its `ltik`: the session-resumption entry point for a follow-up
request (protecting a custom app route, or submitting a grade from a background job) using a `ltik`
obtained from an earlier `LaunchContext`.

### `deploy(options?)`

```ts
deploy(options?: DeployOptions): Promise<void>
```

Connects the database and cache backends, starts the HTTP listener, and registers a `SIGINT` handler that
calls `close()` before exiting. Prints a startup banner unless `options.silent` is `true`. Port, TLS, and
CORS are configured at construction time via `ProviderOptions.server`, not here.

### `close()`

```ts
close(): Promise<void>
```

Stops the HTTP listener and closes the database and cache connections, in that order.

## `ProviderOptions`

```ts
interface ProviderOptions {
  handlers?: Partial<LaunchHandlers>
  databaseManager?: DatabaseManager
  database?: MongoConnectionConfig
  requestHandler?: RequestHandler
  httpHandler?: HttpHandler
  server?: ProviderServerOptions
  cacheManager?: CacheManager
  logger?: Logger
  routes?: ProviderRoutes
  tokenMaxAge?: number | false
  dynamicRegistration?: DynamicRegistrationOptions
  onDynamicRegistration?: DynamicRegistrationHandlerFactory
  onUnregisteredPlatform?: UnregisteredPlatformHandler
  onInactivePlatform?: InactivePlatformHandler
}
```

All fields are optional. See [Configuring a Provider](/guides/configuring-a-provider.md) for a walkthrough
of each one.

- `handlers`: `onResourceLink`/`onDeepLinking`/`onSubmissionReview`. Each has a real default (HTTP 200,
  body `It works!`) until overridden, and is equivalent to calling the matching `provider.onX()` method
  after construction.
- `databaseManager` / `database`: pass a fully-constructed `databaseManager` to use a different backend
  entirely, or just a `database` connection config to use the built-in `MongoDatabaseManager`.
- `requestHandler`: how ltijs makes outbound HTTP requests. Defaults to the built-in `fetch`.
- `httpHandler`: the HTTP framework adapter. Defaults to Express.
- `server`: port, TLS, and CORS for the default `ExpressHttpHandler`. See `ProviderServerOptions` below.
- `cacheManager`: defaults to a no-op cache (nothing is ever cached), safe for any deployment topology
  including multiple ltijs instances behind a load balancer. Pass `RedisCacheManager` to opt into real
  caching shared across instances.
- `logger`: defaults to `console`-based logging.
- `routes`: see `ProviderRoutes` below.
- `tokenMaxAge`: maximum age, in seconds, an id_token's `iat` claim is accepted at launch time before it's
  rejected as `TOKEN_TOO_OLD`. Defaults to 10 seconds, matching legacy. Pass `false` to disable the check
  entirely.
- `dynamicRegistration`: see [Services](services.md#dynamic-registration).
- `onDynamicRegistration`: overrides the default GET handler for the dynamic-registration route entirely.
- `onUnregisteredPlatform` / `onInactivePlatform`: called instead of throwing the default error when a
  login request arrives from an unregistered or deactivated platform. Given `(request, response)`, must
  fully send the response itself; the login route returns immediately afterward regardless.

## `ProviderServerOptions`

```ts
interface ProviderServerOptions {
  port?: number
  ssl?: SslOptions
  cors?: false | CorsOptions
}
```

`port` defaults to `3000`. `ssl` terminates TLS in-process (a PEM-encoded `key`/`cert` pair, see
[`HttpHandler`](backends.md#httphandler)) instead of listening over plain HTTP -- most deployments leave
this unset and terminate TLS at a reverse proxy or load balancer in front of the process instead. Both
`port` and `ssl` apply no matter which `httpHandler` is active, since `deploy()` passes them to
`httpHandler.listen(port, ssl)`, part of the `HttpHandler` interface itself.

`cors` is different: it only takes effect on the default `ExpressHttpHandler`, the same way `database` is
ignored once `databaseManager` is given. It defaults to reflecting any request origin with credentials
allowed; pass `false` to disable CORS entirely, or a `CorsOptions` object to restrict it -- see
[Configuring a Provider](/guides/configuring-a-provider.md) for an example. If you supply your own
`httpHandler` instead, `server.cors` is ignored.

## `ProviderRoutes`

```ts
interface ProviderRoutes {
  loginRoute?: string
  launchRoute?: string
  keysetRoute?: string
  dynamicRegistrationRoute?: string
}
```

Defaults: `/lti/login`, `/lti/launch`, `/lti/keys`, `/lti/register`.

## `DeployOptions`

```ts
interface DeployOptions {
  silent?: boolean
}
```

Suppresses the startup banner `deploy()` prints by default. Port, TLS, and CORS live on
`ProviderOptions.server` instead, since they're startup configuration rather than a per-`deploy()`-call
concern -- see `ProviderServerOptions` above.
