# Swapping Storage Backends

## Database

The default `database` option builds a `MongoDatabaseManager` for you:

```ts
new Provider({ database: { url: 'mongodb://localhost/ltijs', connection: {}, debug: false } })
```

### Migrating from ltijs v5

If you're moving an existing v5 deployment to v7 without migrating its data, `MongoLegacyDatabaseManager`
reads and writes the exact collection structure v5 used (including its own encryption scheme), so you can
point it at your existing database as-is:

```ts
import { Provider, MongoLegacyDatabaseManager } from 'ltijs'

const logger = { debug: console.debug, warn: console.warn, error: console.error }

const provider = new Provider({
  databaseManager: new MongoLegacyDatabaseManager(
    { url: 'mongodb://localhost/ltijs' },
    'the-same-key-your-v5-Provider.setup() call used',
    logger,
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
  async setup() { /* ... */ }
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

new Provider({
  cacheManager: new RedisCacheManager({ url: 'redis://localhost:6379' }),
})
```

Or implement [`CacheManager`](../api/backends.md#cachemanager) yourself, just five methods (`setup`,
`close`, `get`, `set`, `delete`), for any other cache. See
[`RedisCacheManager`](../api/backends.md#rediscachemanager) in the API reference for its constructor
signature.
