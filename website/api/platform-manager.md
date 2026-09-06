# Platform Manager

Registers, looks up, updates, and (de)activates platforms. Reachable as `provider.platformManager`. See
[Registering Platforms](/guides/registering-platforms.md) for a walkthrough.

## Methods

### `registerPlatform(platform)`

```ts
registerPlatform(platform: PlatformRegistrationInput): Promise<Platform>
```

Registers a new platform, generating its RSA keypair. Throws `PlatformAlreadyRegisteredError` if the
`url`/`clientId` pair already exists.

### `getPlatforms(filter?)`

```ts
getPlatforms(filter?: PlatformSearchInput): Promise<Platform[]>
```

Lists registered platforms, optionally narrowed by `filter`.

### `getPlatformById(platformId)`

```ts
getPlatformById(platformId: string): Promise<Platform | undefined>
```

### `getPlatformByUrlAndClientId(url, clientId)`

```ts
getPlatformByUrlAndClientId(url: string, clientId: string): Promise<Platform | undefined>
```

The lookup used at login time: `url`/`clientId` together identify a platform, mirroring how the OIDC login
request identifies it.

### `updatePlatform(platform, update)`

```ts
updatePlatform(platform: Platform, update: PlatformUpdateInput): Promise<Platform>
```

Merges `update` onto `platform`'s current fields. Throws `UrlClientIdCombinationAlreadyExistsError` if
changing `url`/`clientId` would collide with another platform.

### `deletePlatform(platform)`

```ts
deletePlatform(platform: Platform): Promise<void>
```

### `activatePlatform(platform)` / `deactivatePlatform(platform)`

```ts
activatePlatform(platform: Platform): Promise<Platform>
deactivatePlatform(platform: Platform): Promise<Platform>
```

A deactivated platform's login/launch requests are rejected (or routed to `onInactivePlatform`, if set)
until reactivated.

### `rotateKeys(platform)`

```ts
rotateKeys(platform: Platform): Promise<Platform>
```

Generates a fresh RSA keypair for the platform and invalidates the cached keyset. The old key stops being
served immediately.

### `getPublicKey(platform)` / `getPrivateKey(platform)`

```ts
getPublicKey(platform: Platform): Promise<string>
getPrivateKey(platform: Platform): Promise<string>
```

> **Legacy compatibility**
>
> `getAllPlatforms()` and `getPlatform(url, clientId?)` are kept as v5-migration bridges, aliasing
> `getPlatforms()` and `getPlatformByUrlAndClientId()`/`getPlatforms()` respectively. Prefer the
> non-deprecated methods above in new code.

## `Platform`

```ts
interface Platform {
  readonly id: string
  readonly url: string
  readonly clientId: string
  readonly name: string
  readonly authenticationEndpoint: string
  readonly accessTokenEndpoint: string
  readonly authorizationServer: string
  readonly idTokenValidation: IdTokenValidation
  readonly active: boolean
  readonly keys: PlatformKeys

  /** @deprecated Use keys.public field instead */
  readonly publicKey: string
  /** @deprecated Use keys.private field instead */
  readonly privateKey: string
  /** @deprecated Use idTokenValidation field instead */
  readonly authConfig: IdTokenValidation
  /** @deprecated Use accessTokenEndpoint field instead */
  readonly accesstokenEndpoint: string
}

interface IdTokenValidation {
  readonly method: IdTokenValidationMethod
  readonly key: string
}

interface PlatformKeys {
  readonly public: string
  readonly private: string
}
```

`idTokenValidation.method` is one of three ways to verify a platform's signed id_tokens (see
[`IdTokenValidationMethod`](errors-and-enums.md#idtokenvalidationmethod)): `JwkSet` (fetch the platform's
JWKS endpoint, most common), `JwkKey` (a single JWK given up front), or `RsaKey` (a raw PEM key).

## `PlatformRegistrationInput`

```ts
interface PlatformRegistrationInput {
  url: string
  clientId: string
  name: string
  authenticationEndpoint: string
  accessTokenEndpoint: string
  authorizationServer?: string
  idTokenValidation: { method: IdTokenValidationMethod; key: string }
}
```

The shape `registerPlatform()` accepts.

## `PlatformUpdateInput`

```ts
type PlatformUpdateInput = Partial<PlatformRegistrationInput> & {
  active?: boolean
  idTokenValidation?: Partial<{ method: IdTokenValidationMethod; key: string }>
}
```

The shape `updatePlatform()` accepts: every `PlatformRegistrationInput` field made optional, plus `active`.

## `PlatformSearchInput`

```ts
interface PlatformSearchInput {
  url?: string
  name?: string
  clientId?: string | string[]
}
```

The shape `getPlatforms()` accepts as a filter. `clientId` accepts an array to resolve multiple candidate
client IDs in one call, matching how a spec-permitted multi-value id_token `aud` claim is resolved at
login time.
