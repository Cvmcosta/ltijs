# Error Handling

Most errors ltijs throws extend [`LtijsError`](../api/errors-and-enums.md#ltijserror). Only `LtijsError`
and `ValidationError` themselves are exported, so the many specific subclasses (`TokenTooOldError`,
`UnregisteredPlatformError`, and so on) aren't individually importable. Check `err.name` (the specific
error class name) or `err.message` (a stable, `SCREAMING_SNAKE_CASE` code) instead of `instanceof`ing a
specific subclass. The one exception is `HttpError` (below): it comes from the platform's own response,
not from ltijs's own validation, so it isn't a `LtijsError`.

```ts
import { LtijsError, ValidationError, HttpError } from 'ltijs'

try {
  await context.grading.submitScore(lineItemId, score)
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.errors) // { "scoreGiven": ["Expected number, received string"] }
    return
  }
  if (err instanceof HttpError) {
    console.error(err.status, err.response) // the platform's own status code and response body
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

## `HttpError`

Thrown whenever an outbound call to the platform itself fails: an AGS score submission it rejects, an
expired access token exchange, a JWKS endpoint that times out. Beyond the inherited `.message`, it carries:

- `.status` / `.statusText`: the platform's own HTTP status code and status text, when available
- `.url`: the URL that was called
- `.response`: the platform's parsed response body (JSON if it parsed as JSON, raw text otherwise)

If it reaches an `HttpHandler` route unhandled, whether one of ltijs's own or a custom route you
registered yourself, it's mapped to a `502` response carrying that same detail:
`{ error: 'HttpError', message, platformStatus, platformResponse }`, rather than the opaque
`{ error: 'INTERNAL_SERVER_ERROR' }` an unrecognized error gets.

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
