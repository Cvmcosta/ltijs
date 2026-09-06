# Launch Context

## `LaunchContext`

Everything a launch handler needs about the current launch. Passed as the first argument to
`onResourceLink`/`onDeepLinking`/`onSubmissionReview`, and returned by `Provider.getLaunchContext(ltik)` to
resume a launch outside the original request. See [Handling Launches](/guides/handling-launches.md).

```ts
class LaunchContext {
  readonly rawIdToken: IdTokenRecord
  readonly idToken: IdToken
  readonly platform: Platform
  readonly ltik: string

  readonly namesAndRoles: NamesAndRoles
  readonly grading: Grading
  readonly deepLinking: DeepLinking

  /** @deprecated Use idToken instead. */
  readonly legacyIdToken: LegacyIdToken

  get contextId(): string
}
```

- `rawIdToken`: the full validated id_token record as stored, keyed by its database `id`.
- `idToken`: the id_token's claims, reshaped into ltijs's own (non-legacy) `IdToken` type, below.
- `platform`: the [`Platform`](platform-manager.md#platform) this launch came from.
- `ltik`: opaque token identifying this launch. Pass it to `Provider.getLaunchContext()` to resume the
  launch later.
- `namesAndRoles`, `grading`, `deepLinking`: the three LTI services, see [Services](services.md).
- `legacyIdToken`: deprecated, prefer `idToken`.
- `contextId`: shorthand for `rawIdToken.id`.

## `IdToken`

```ts
interface IdToken {
  readonly id: string
  readonly ltiVersion: string
  readonly user: IdTokenUser
  readonly platform: IdTokenPlatform
  readonly launch: IdTokenLaunch
  readonly services: IdTokenServices
}

interface IdTokenUser {
  readonly id: string
  readonly name?: string
  readonly email?: string
  readonly givenName?: string
  readonly familyName?: string
  readonly roles: readonly string[]
  readonly roleScopeMentor?: readonly string[]
}

interface IdTokenPlatform {
  readonly id: string
  readonly url: string
  readonly clientId: string
  readonly deploymentId: string
  readonly name?: string
  readonly description?: string
  readonly guid?: string
  readonly contactEmail?: string
  readonly version?: string
  readonly productFamilyCode?: string
  readonly lis?: Record<string, unknown>
}

interface IdTokenLaunch {
  readonly type: LtiMessageType
  readonly target?: string
  readonly context?: Record<string, unknown>
  readonly resource?: Record<string, unknown>
  readonly custom?: Record<string, unknown>
  readonly presentation?: IdTokenLaunchPresentation
}

interface IdTokenLaunchPresentation {
  readonly documentTarget?: string
  readonly width?: number
  readonly height?: number
  readonly returnUrl?: string
  readonly locale?: string
}

interface IdTokenServices {
  readonly namesAndRoles: { readonly available: boolean }
  readonly assignmentAndGrades: {
    readonly available: boolean
    readonly lineItemId?: string
    readonly scopes?: readonly string[]
  }
  readonly deepLinking: {
    readonly available: boolean
    readonly acceptTypes?: readonly string[]
    readonly acceptMediaTypes?: readonly string[]
    readonly acceptPresentationDocumentTargets?: readonly string[]
    readonly acceptMultiple?: boolean
    readonly autoCreate?: boolean
    readonly title?: string
    readonly text?: string
    readonly data?: string
    readonly deepLinkReturnUrl?: string
  }
}
```

`launch.type` is an [`LtiMessageType`](errors-and-enums.md#ltimessagetype) value: it's what `Provider`
dispatches on to pick which of `onResourceLink`/`onDeepLinking`/`onSubmissionReview` runs. `services.*`
mirrors whether the launch declared support for each LTI service; `context.grading`/`deepLinking`/
`namesAndRoles` throw if called on a launch that didn't.

## `LegacyIdToken`

```ts
interface LegacyIdToken {
  readonly iss: string
  readonly user?: string
  readonly clientId: string
  readonly deploymentId?: string
  readonly platformContext?: {
    readonly contextId?: string
    readonly resource?: { readonly id: string; readonly title?: string; readonly description?: string }
    readonly namesRoles?: { readonly context_memberships_url: string; readonly service_versions?: readonly string[] }
  }
}
```

Reshapes the id_token into the flat, snake_case-heavy structure legacy ltijs returned. Deprecated; prefer
`IdToken` in new code.

## Launch handler types

```ts
type OnLaunchHandler = (
  context: LaunchContext,
  request: HttpRequestParameters,
  response: HttpResponse,
) => Promise<void>

interface LaunchHandlers {
  onResourceLink: OnLaunchHandler
  onDeepLinking: OnLaunchHandler
  onSubmissionReview: OnLaunchHandler
}

type UnregisteredPlatformHandler = RouteHandler
type InactivePlatformHandler = RouteHandler
```

`LaunchHandlers` is the shape `ProviderOptions.handlers` accepts, matching `Provider.onResourceLink`/
`onDeepLinking`/`onSubmissionReview`. `UnregisteredPlatformHandler`/`InactivePlatformHandler` are given
`(request, response)` and are expected to send the response themselves; the login route always returns
immediately after invoking one, on either side of the port.
