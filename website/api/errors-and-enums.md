# Errors & Enums

See [Error Handling](/guides/error-handling.md) for how to work with these day to day.

## `LtijsError`

```ts
class LtijsError extends Error {
  readonly name: string // the specific error class name, e.g. "TokenTooOldError"
  readonly message: string // a stable, SCREAMING_SNAKE_CASE code, e.g. "TOKEN_TOO_OLD"
}
```

The base class every error ltijs throws extends. Only `LtijsError` and `ValidationError` (below) are
exported; the many other specific subclasses aren't individually importable, so check
`err.name`/`err.message` instead of `instanceof`ing a specific subclass.

## `ValidationError`

```ts
class ValidationError extends LtijsError {
  readonly issues: ZodIssue[]
  readonly errors: Record<string, string[]>
}
```

Thrown whenever input fails schema validation: a malformed `registerPlatform` call, an invalid `LineItem`,
a launch request missing a required claim.

- `issues`: the raw [Zod](https://zod.dev) issues, for detailed programmatic handling.
- `errors`: the same issues grouped by field path, usually what you want for showing per-field feedback.

## `LtiMessageType`

```ts
enum LtiMessageType {
  ResourceLinkRequest = 'LtiResourceLinkRequest',
  DeepLinkingRequest = 'LtiDeepLinkingRequest',
  SubmissionReviewRequest = 'LtiSubmissionReviewRequest',
}
```

The value of `idToken.launch.type`. What `Provider` dispatches on to pick which of
`onResourceLink`/`onDeepLinking`/`onSubmissionReview` runs for a given launch.

## `IdTokenValidationMethod`

```ts
enum IdTokenValidationMethod {
  RsaKey = 'RSA_KEY',
  JwkKey = 'JWK_KEY',
  JwkSet = 'JWK_SET',
}
```

How a platform's signed id_tokens get verified, set via `Platform.idTokenValidation.method`. `JwkSet`
fetches the platform's JWKS endpoint (most common), `JwkKey` takes a single JWK given up front, and
`RsaKey` takes a raw PEM key.

## `HttpMethod`

```ts
enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Delete = 'DELETE',
  All = 'ALL',
}
```

Used by `HttpHandler.registerRoute()` to declare which methods a route responds to.
