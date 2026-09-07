# Swapping Backends

Every dependency `Provider` relies on is a small interface with a working default, documented in full in
the [Backends API reference](../api/backends.md). This guide walks through swapping in an opt-in
alternative, or implementing one of the interfaces yourself, for each one.

## Database

The default `database` option builds a `MongoDatabaseManager` for you:

```ts
new Provider({ database: { url: 'mongodb://localhost/ltijs', connection: {}, debug: false } })
```

`database` only ever applies to the default `MongoDatabaseManager`: pass a fully-constructed
`databaseManager` instead and `database` is ignored entirely, the same way `ProviderOptions.server` only
applies to the default `ExpressHttpHandler`.

### Migrating from ltijs v5

If you're moving an existing v5 deployment to v7 without migrating its data, `MongoLegacyDatabaseManager`
reads and writes the exact collection structure v5 used (including its own encryption scheme), so you can
point it at your existing database as-is:

```ts
import { Provider, MongoLegacyDatabaseManager } from 'ltijs'

const logger = { debug: console.debug, warn: console.warn, error: console.error }

const provider = new Provider({
  databaseManager: new MongoLegacyDatabaseManager(
    logger,
    { url: 'mongodb://localhost/ltijs' },
    'the-same-key-your-v5-Provider.setup() call used',
  ),
})
```

Note the extra `encryptionKey` argument. Unlike the default manager's two-arg constructor, this one needs
the same key legacy's `Provider.setup('LTIKEY', ...)` used, so it can decrypt the existing
`publickey`/`privatekey`/`accesstoken` documents it reads. See
[Migrating from ltijs v5](migrating-from-v5.md) for the full picture, and
[`MongoLegacyDatabaseManager`](../api/backends.md#mongolegacydatabasemanager) in the API reference for
its exact constructor signature.

### A custom database

Implement the `DatabaseManager` interface directly to back ltijs with anything else: a different
database, an ORM, a remote service.

```ts
import type { DatabaseManager } from 'ltijs'

class MyDatabaseManager implements DatabaseManager {
  async listen() { /* ... */ }
  async close() { /* ... */ }
  async getPlatforms(filter) { /* ... */ }
  // ...the rest of DatabaseManager, see the API Reference
}

new Provider({ databaseManager: new MyDatabaseManager() })
```

See the full method list in the [API Reference](../api/backends.md#databasemanager).

## Cache

Defaults to a no-op, so nothing is cached. That's always safe regardless of how many ltijs instances are
running (see [Philosophy & Architecture](philosophy-and-architecture.md)). Opt into real, shared caching
with `RedisCacheManager`:

```ts
import { Provider, RedisCacheManager } from 'ltijs'

const logger = { debug: console.debug, warn: console.warn, error: console.error }

new Provider({
  cacheManager: new RedisCacheManager(logger, { url: 'redis://localhost:6379' }),
})
```

Or implement [`CacheManager`](../api/backends.md#cachemanager) yourself, just five methods (`listen`,
`close`, `get`, `set`, `delete`), for any other cache. See
[`RedisCacheManager`](../api/backends.md#rediscachemanager) in the API reference for its constructor
signature.

## HTTP framework

Defaults to `ExpressHttpHandler`. Construct your own to register middleware or static files ahead of
ltijs's own routes, or to change the port/TLS/CORS configuration it's built with:

```ts
import { Provider, ExpressHttpHandler } from 'ltijs'

const logger = { debug: console.debug, warn: console.warn, error: console.error }
const httpHandler = new ExpressHttpHandler(logger, { port: 3000 })
httpHandler.app.use(myCustomMiddleware)

new Provider({ httpHandler })
```

See [`HttpHandler`](../api/backends.md#httphandler) in the API reference for the exact ordering
constraints (middleware has to be registered before `httpHandler` is handed to `Provider`) and the full
`ExpressHttpHandlerOptions` shape.

Or implement [`HttpHandler`](../api/backends.md#httphandler) yourself to run ltijs on top of Fastify, Koa,
a serverless handler, or anything else:

```ts
import type { HttpHandler, RouteHandler, HttpMethod } from 'ltijs'

class MyHttpHandler implements HttpHandler {
  registerRoute(path: string, methods: HttpMethod[], handler: RouteHandler) { /* ... */ }
  async listen() { /* ... */ }
  async close() { /* ... */ }
}

new Provider({ httpHandler: new MyHttpHandler() })
```

Unlike `database`/`cacheManager`, there's no separate config option threaded through by `Provider`: a
custom `httpHandler` is expected to already be fully configured (port, TLS, middleware, everything) by the
time it's passed in. `ProviderOptions.server` only ever applies to the default `ExpressHttpHandler`.

## Outbound requests

Defaults to `FetchRequestHandler`, built on the global `fetch`, for every outbound call ltijs makes: a
platform's token endpoint, its JWKS, AGS, or NRPS services. Implement
[`RequestHandler`](../api/backends.md#requesthandler) yourself to route those through something else
(a proxy, a request library with different retry/timeout behavior, request logging):

```ts
import type { RequestHandler } from 'ltijs'

class MyRequestHandler implements RequestHandler {
  async get(url, options) { /* ... */ }
  async post(url, body, options) { /* ... */ }
  async put(url, body, options) { /* ... */ }
  async delete(url, options) { /* ... */ }
  setPermanentHeader(name: string, value: string) { /* ... */ }
}

new Provider({ requestHandler: new MyRequestHandler() })
```

## Logger

Defaults to `DefaultLogger`, which writes to `console`. `Logger` is three methods, so a plain object
satisfies it, no class required, the same pattern used throughout these guides:

```ts
new Provider({
  logger: {
    debug: (component, message) => { /* ... */ },
    warn: (component, message) => { /* ... */ },
    error: (component, message) => { /* ... */ },
  },
})
```

See [`Logger`](../api/backends.md#logger) in the API reference for the exact signature.
