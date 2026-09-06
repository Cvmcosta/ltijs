# API Reference

Every class, interface, and type ltijs exports from its root import (`import { ... } from 'ltijs'`).

- **[Provider](provider.md)**: the class you construct. `ProviderOptions`, `ProviderRoutes`,
  `ProviderServerOptions`, `DeployOptions`.
- **[Platform Manager](platform-manager.md)**: `Provider.platformManager`, the `Platform` type, and its
  registration/update/search input types.
- **[Launch Context](launch-context.md)**: what every launch handler receives. `LaunchContext`, `IdToken`,
  `LegacyIdToken`, and the launch-handler types.
- **[Services](services.md)**: `context.grading`, `context.deepLinking`, and `context.namesAndRoles`, plus
  Dynamic Registration's own config types.
- **[Backends](backends.md)**: the pluggable `DatabaseManager`, `CacheManager`, `RequestHandler`,
  `HttpHandler`, and `Logger` interfaces, and the opt-in `MongoLegacyDatabaseManager`/`RedisCacheManager`
  implementations.
- **[Errors & Enums](errors-and-enums.md)**: `LtijsError`, `ValidationError`, and the three real (runtime)
  enums: `LtiMessageType`, `IdTokenValidationMethod`, `HttpMethod`.

For a task-oriented walkthrough instead of a type-by-type reference, see the [Guides](/guides/getting-started.md).
