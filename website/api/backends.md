# Backends

The pluggable interfaces `Provider` reads/writes through, and the opt-in implementations you can swap in
via `ProviderOptions`. See [Swapping Backends](/guides/swapping-backends.md) and
[Philosophy & Architecture](/guides/philosophy-and-architecture.md).

## `DatabaseManager`

```ts
interface DatabaseManager {
  listen(): Promise<void>
  close(): Promise<void>

  getPlatforms(filter?: PlatformFilter): Promise<PlatformRecord[]>
  getPlatformById(id: string): Promise<PlatformRecord | undefined>
  getPlatformByUrlAndClientId(url: string, clientId: string): Promise<PlatformRecord | undefined>
  savePlatform(platform: PlatformAttributes): Promise<string>
  updatePlatformById(id: string, fields: Partial<PlatformAttributes>): Promise<void>
  deletePlatformById(id: string): Promise<void>

  getAccessToken(platformUrl: string, clientId: string, scopes: string): Promise<AccessTokenRecord | undefined>
  saveAccessToken(platformUrl: string, clientId: string, scopes: string, token: AccessTokenRecord): Promise<string>

  getIdToken(id: string): Promise<IdTokenRecord | undefined>
  saveIdToken(token: IdTokenClaims): Promise<string>

  saveNonce(nonce: string): Promise<string>
  consumeNonce(nonce: string): Promise<boolean>
}
```

The default implementation is `MongoDatabaseManager` (not itself exported; built internally from
`ProviderOptions.database`). `saveNonce`/`consumeNonce` implement OIDC replay protection:
`consumeNonce` atomically checks-and-deletes a nonce, returning `false` if it was already consumed or
never existed.

### `DatabaseManager` data types

```ts
/** The persisted fields for a platform, excluding its id (assigned by savePlatform). */
interface PlatformAttributes {
  url: string
  clientId: string
  name: string
  authenticationEndpoint: string
  accessTokenEndpoint: string
  authorizationServer?: string
  idTokenValidation: { method: IdTokenValidationMethod; key: string }
  active: boolean
  keys: { public: string; private: string }
}

/** A stored platform as returned by DatabaseManager's read methods: PlatformAttributes plus its assigned id. */
interface PlatformRecord extends PlatformAttributes {
  id: string
}

interface PlatformFilter {
  url?: string
  name?: string
  clientId?: string | string[]
}

/** A cached platform-issued OAuth2 access token (client-credentials grant), keyed by platformUrl+clientId+scopes. */
interface AccessTokenRecord {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
  createdAt: number
}

/** The raw, validated claims of an LTI 1.3 id_token, keyed by their spec-defined claim URIs/names. */
interface IdTokenClaims {
  iss: string
  sub: string
  aud?: string | string[]
  azp?: string
  exp?: number
  iat?: number
  nonce?: string
  given_name?: string
  family_name?: string
  name?: string
  email?: string
  client_id: string
  platform_id: string
  // ...plus the LTI-spec claim URIs (deployment_id, message_type, version, roles, target_link_uri,
  // context, resource_link, launch_presentation, custom, endpoint, namesroleservice,
  // deep_linking_settings, and so on)
  [claim: string]: unknown
}

/** A stored id_token as returned by getIdToken: IdTokenClaims plus the record's own id. */
interface IdTokenRecord extends IdTokenClaims {
  id: string
}
```

## `CacheManager`

```ts
interface CacheManager {
  listen(): Promise<void>
  close(): Promise<void>
  get<T = unknown>(key: string): Promise<T | undefined>
  set<T = unknown>(key: string, value: T, ttlMs: number): Promise<void>
  delete(key: string): Promise<void>
}
```

The default implementation (`MockCacheManager`) is a no-op: every method resolves immediately and `get()`
always misses. Used to cache platform JWKS responses and the served keyset.

## `RequestHandler`

```ts
interface RequestHandler {
  get<T = unknown>(url: string, options?: RequestOptions): Promise<RequestResponse<T>>
  post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<RequestResponse<T>>
  put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<RequestResponse<T>>
  delete<T = unknown>(url: string, options?: RequestOptions): Promise<RequestResponse<T>>
  setPermanentHeader(name: string, value: string): void
}

interface RequestOptions {
  headers?: RequestHeaders
  query?: URLSearchParams
}

interface RequestHeaders {
  authorization?: string
  accept?: string
  contentType?: string
}

interface RequestResponse<T = unknown> {
  data: T
  headers: Record<string, string | undefined>
}
```

How ltijs makes outbound HTTP requests, to a platform's token endpoint, JWKS, or AGS/NRPS services. The
default implementation (`FetchRequestHandler`) is built on the global `fetch`.

## `HttpHandler`

```ts
interface HttpHandler {
  registerRoute(path: string, methods: HttpMethod[], handler: RouteHandler): void
  listen(): Promise<void>
  close(): Promise<void>
}

interface SslOptions {
  key: string
  cert: string
}

interface CorsOptions {
  origin?: string | string[]
  credentials?: boolean
}

type RouteHandler = (request: HttpRequestParameters, response: HttpResponse) => Promise<void>

interface HttpRequestParameters {
  method: string
  path: string
  query: Record<string, string>
  body: Record<string, unknown>
  headers: Record<string, string>
}

interface HttpResponse {
  status(code: number): HttpResponse
  redirect(url: string): void
  html(content: string): void
  json(body: unknown): void
}
```

The HTTP framework adapter. The default implementation (`ExpressHttpHandler`) is built on Express.
Implement this interface to run ltijs on top of Fastify, Koa, a serverless handler, or anything else.

All configuration is constructor-time: an `httpHandler` is expected to be fully set up (middleware
installed, CORS applied, port/TLS captured) by the time it's handed to `Provider`, either as the default
`ExpressHttpHandler` `Provider` constructs from [`ProviderOptions.server`](provider.md#providerserveroptions),
or as your own already-configured instance passed via `ProviderOptions.httpHandler` -- `Provider` never
reconfigures a custom `httpHandler`, it just calls `registerRoute()`/`listen()`/`close()` on it. `listen()`
takes no arguments: it starts the server with whatever the constructor already configured, called from
`Provider.listen()` (`Provider.deploy()` remains as a backwards-compatible alias).

`ExpressHttpHandlerOptions` (the default implementation's constructor options) looks like this:

```ts
interface ExpressHttpHandlerOptions {
  port: number
  ssl?: SslOptions
  cors?: false | CorsOptions
}
```

`ssl` terminates TLS in-process instead of listening over plain HTTP -- pass a PEM-encoded `key`/`cert`
pair (`ExpressHttpHandler` uses them with Node's `https.createServer` in place of `app.listen`). Omit it,
as most deployments do, when TLS is terminated by a reverse proxy or load balancer in front of the process
instead. `cors` defaults to reflecting any request origin with credentials allowed; pass `false` to disable
CORS entirely, or a `CorsOptions` object to restrict it.

`ExpressHttpHandler` itself is exported so you can construct it yourself, register your own middleware,
and pass the already-configured instance in as `httpHandler`:

```ts
import { Provider, ExpressHttpHandler } from 'ltijs'

const httpHandler = new ExpressHttpHandler(myLogger, { port: 3000 })
httpHandler.app.use(myCustomMiddleware)

const provider = new Provider({ ...options, httpHandler })
```

Order matters here: `Provider`'s constructor registers all of its own routes (login, launch, keyset,
dynamic registration) synchronously, and since those route handlers always end the response themselves
(they never call `next()`), any middleware added to `app` *after* construction never runs for them --
grabbing `provider.httpHandler` post-construction and calling `.app.use()` on it only affects routes you
register afterward, not ltijs's own. Constructing `httpHandler` first and passing it in, as above, puts
your middleware ahead of ltijs's routes in the stack, so it runs for every request the way legacy's
`serverAddon` did.

The same pattern serves static files, matching legacy's `staticPath` option:

```ts
import { Provider, ExpressHttpHandler } from 'ltijs'
import express from 'express'

const httpHandler = new ExpressHttpHandler(myLogger, { port: 3000 })
httpHandler.app.use(express.static('public', { index: '_' }))

const provider = new Provider({ ...options, httpHandler })
```

`express.static` is less order-sensitive than arbitrary middleware -- it calls `next()` for any path that
isn't a real file under the served directory, so it wouldn't break ltijs's own routes even if registered
afterward, as long as no static asset happens to collide with `/lti/login`/`/lti/launch`/etc. Registering
it first still matches legacy exactly and avoids that collision case entirely. The `{ index: '_' }` option
is worth keeping too: it disables `express.static`'s default behavior of auto-serving `index.html` for
directory-like GET requests, which would otherwise intercept `GET /` before your own app code ever sees it.

## `Logger`

```ts
interface Logger {
  debug(component: string, message: string): void
  warn(component: string, message: string): void
  error(component: string, message: string): void
}
```

Where debug output goes. The default implementation (`DefaultLogger`) writes to `console`.

## `MongoLegacyDatabaseManager`

```ts
class MongoLegacyDatabaseManager implements DatabaseManager {
  constructor(logger: Logger, config: MongoLegacyConnectionConfig, encryptionKey: string)
}

interface MongoLegacyConnectionConfig {
  url: string
  connection?: Record<string, unknown>
  debug?: boolean
}
```

Opt-in. Reads and writes the exact collection structure ltijs v4/v5 used (including its own encryption
scheme), for migrating an existing deployment without a data migration. Note the extra `encryptionKey`
argument, unlike the default manager: it needs the same key legacy's `Provider.setup('LTIKEY', ...)` used,
so it can decrypt the existing `publickey`/`privatekey`/`accesstoken` documents it reads. Exported as
`MongoLegacyConnectionConfig` to avoid a naming collision with the default manager's own config type.

## `RedisCacheManager`

```ts
class RedisCacheManager implements CacheManager {
  constructor(logger: Logger, config: RedisConnectionConfig)
}

interface RedisConnectionConfig {
  url: string
  connection?: Record<string, unknown>
}
```

Opt-in. Gives every ltijs instance a shared, coordinated cache, backed by [ioredis](https://github.com/redis/ioredis).
