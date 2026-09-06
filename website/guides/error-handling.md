# Error Handling

Every error ltijs throws extends [`LtijsError`](../api/errors-and-enums.md#ltijserror). Only `LtijsError`
and `ValidationError` themselves are exported, so the many specific subclasses (`TokenTooOldError`,
`UnregisteredPlatformError`, and so on) aren't individually importable. Check `err.name` (the specific
error class name) or `err.message` (a stable, `SCREAMING_SNAKE_CASE` code) instead of `instanceof`ing a
specific subclass:

```ts
import { LtijsError, ValidationError } from 'ltijs'

try {
  await context.grading.submitScore(lineItemId, score)
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.errors) // { "scoreGiven": ["Expected number, received string"] }
    return
  }
  if (err instanceof LtijsError) {
    console.error(err.name, err.message) // e.g. "TokenTooOldError" "TOKEN_TOO_OLD"
    return
  }
  throw err // not an ltijs error at all
}
```

## `ValidationError`

See the [`ValidationError` API reference](../api/errors-and-enums.md#validationerror). Thrown whenever
input fails schema validation: a malformed `registerPlatform` call, an invalid
`LineItem`, a launch request missing a required claim. Beyond the inherited `.name`/`.message`, it carries:

- `.issues`: the raw [Zod](https://zod.dev) issues, for detailed programmatic handling
- `.errors`: the same issues grouped by field path (`Record<string, string[]>`), usually what you want
  for showing per-field feedback

## Common errors you'll actually handle

Most errors surface as an HTTP response automatically (a failed launch, an unregistered platform) rather
than something your own code catches. See
[Configuring a Provider](configuring-a-provider.md#unregistered-inactive-platforms) for overriding those
responses. Here are the ones you're likeliest to catch directly, when calling a
`PlatformManager`/`Grading`/etc. method yourself:

| `err.name` | `err.message` | When |
| --- | --- | --- |
| `PlatformAlreadyRegisteredError` | `PLATFORM_ALREADY_REGISTERED` | `registerPlatform` called for an already-registered `url`+`clientId` |
| `UrlClientIdCombinationAlreadyExistsError` | `URL_CLIENT_ID_COMBINATION_ALREADY_EXISTS` | `updatePlatform` would collide with another platform |
| `MissingLineItemsEndpointError` | `MISSING_LINEITEMS_ENDPOINT` | AGS called on a launch that didn't declare grading support |
| `MissingNamesRolesServiceUrlError` | `MISSING_NAMES_ROLES_SERVICE_URL` | NRPS called on a launch that didn't declare it |
| `MissingDeepLinkSettingsError` | `MISSING_DEEP_LINK_SETTINGS` | Deep Linking called on a non-deep-linking launch |
| `SessionNotFoundError` / `InvalidLtikError` | `SESSION_NOT_FOUND` / `INVALID_LTIK` | `getLaunchContext(ltik)` given an expired/unknown/tampered `ltik` |

Every error's exact `.message` code lives alongside the class in the library's source, and each is
documented on the method that can throw it in the [API Reference](../api/README.md).
