# Configuring a Provider

Every field on `ProviderOptions` is optional except what's needed to reach a database. Pass nothing else
and you get working defaults for everything (see [Philosophy & Architecture](philosophy-and-architecture.md)).
Full field-by-field detail is in the [API Reference](../api/provider.md#provideroptions); this guide walks
through the ones you'll actually reach for.

## Storage

```ts
new Provider({ database: { url: 'mongodb://localhost/ltijs' } })
```

`database` is a shorthand that builds the default `MongoDatabaseManager` for you. Pass a fully-constructed
`databaseManager` instead to use a different backend entirely. See
[Swapping Storage Backends](swapping-storage-backends.md).

## Launch handlers

```ts
new Provider({
  handlers: {
    onResourceLink: async (context, request, response) => { /* ... */ },
    onDeepLinking: async (context, request, response) => { /* ... */ },
    onSubmissionReview: async (context, request, response) => { /* ... */ },
  },
})
```

This is equivalent to calling `provider.onResourceLink(...)` etc. after construction. Use whichever reads
better for your setup. See [Handling Launches](handling-launches.md) for what each one receives.

## Routes

```ts
new Provider({
  routes: {
    loginRoute: '/lti/login', // default
    launchRoute: '/lti/launch', // default
    keysetRoute: '/lti/keys', // default
    dynamicRegistrationRoute: '/lti/register', // default
  },
})
```

## Cache

```ts
import { Provider, RedisCacheManager } from 'ltijs'

new Provider({
  cacheManager: new RedisCacheManager({ url: 'redis://localhost:6379' }),
})
```

Defaults to a no-op cache. Pass `RedisCacheManager` (or your own `CacheManager`) to enable real,
cross-instance-coordinated caching.

## Token freshness

```ts
new Provider({ tokenMaxAge: 10 }) // default: 10 seconds; pass `false` to disable the check entirely
```

Rejects a launch if the id_token's `iat` claim is older than this many seconds.

## Unregistered / inactive platforms

By default, a login from a platform that isn't registered (or is registered but deactivated) gets a JSON
error response. Override either one to handle it yourself, for example by redirecting to a
self-registration flow:

```ts
new Provider({
  onUnregisteredPlatform: async (request, response) => {
    response.redirect('https://your-tool.example.com/register-with-us')
  },
})
```

The handler must fully send the response itself; the login route always returns immediately afterward
(there's no way to resolve a platform and have the OIDC flow continue automatically on the same request).

## Dynamic Registration

```ts
new Provider({
  dynamicRegistration: {
    name: 'My Tool',
    url: 'https://your-tool.example.com',
  },
})
```

See [Registering Platforms](registering-platforms.md#dynamic-registration) for the full flow.

## Everything else

`requestHandler`, `httpHandler`, and `logger` each accept a custom implementation of their respective
interface. See [Philosophy & Architecture](philosophy-and-architecture.md) for what each one is
responsible for, and the [Backends API reference](../api/backends.md) for their exact method signatures.

## Server: port, TLS, and CORS

Port, TLS, and CORS are construction-time config, not deploy-time. They live on `ProviderOptions.server`:

```ts
const provider = new Provider({
  ...options,
  server: { port: 443 },
})
```

To terminate TLS in-process instead of behind a reverse proxy or load balancer, add `ssl`:

```ts
const provider = new Provider({
  ...options,
  server: {
    port: 443,
    ssl: {
      key: fs.readFileSync('key.pem', 'utf8'),
      cert: fs.readFileSync('cert.pem', 'utf8'),
    },
  },
})
```

By default, CORS reflects any request origin and allows credentials. This is safe for ltijs's own routes,
but worth restricting if you add your own authenticated JSON routes on top of the `ltik` cookie session. To
restrict it to specific frontend origins, or disable it entirely, add `cors`:

```ts
const provider = new Provider({
  ...options,
  server: { cors: { origin: ['https://app.example.com'] } }, // or `cors: false` to disable it
})
```

`port` defaults to `3000` if `server` is omitted entirely. See
[`ProviderServerOptions`](../api/provider.md#providerserveroptions) for the full reference.

## Deploying and closing

```ts
await provider.deploy() // connects storage/cache, starts listening
// ...
await provider.close() // stops listening, closes storage/cache connections
```

`deploy()` also registers a `SIGINT` handler that calls `close()` before the process exits. Its only
option is `silent`, which suppresses the startup banner it prints by default:

```ts
await provider.deploy({ silent: true })
```

Most deployments leave `ssl` unset and let a reverse proxy or load balancer handle TLS in front of the
process instead -- that's also the only way to get automatic certificate renewal without restarting.
