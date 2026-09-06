# Getting Started

## Install

v7 is currently published under the `beta` npm tag, not `latest`, so install it explicitly:

```bash
npm install ltijs@beta
```

You'll also need somewhere to store platform registrations, id tokens, and OIDC nonces. By default
ltijs uses MongoDB, so you'll need a running MongoDB instance (local or hosted) to get started. See
[Swapping Storage Backends](swapping-storage-backends.md) if you'd rather use something else.

## A minimal tool

```ts
import { Provider } from 'ltijs'

const provider = new Provider({
  database: { url: 'mongodb://localhost/ltijs' },
})

provider.onResourceLink(async (context, request, response) => {
  response.html(`Hello, ${context.idToken.user.name ?? 'learner'}!`)
})

await provider.deploy()
```

That's a complete, launchable LTI 1.3 tool: `deploy()` connects the database, starts an HTTP server
(Express by default) on port `3000`, and registers the standard `/lti/login`, `/lti/launch`, and
`/lti/keys` routes. `onResourceLink` is called every time a user opens the tool from an LMS. See the
[Provider API reference](../api/provider.md) for every constructor option and method.

## Registering a platform

Before an LMS can launch your tool, it needs to be registered. You can do this by hand, use
[Dynamic Registration](registering-platforms.md#dynamic-registration), or build your own admin UI on top
of `provider.platformManager`:

```ts
import { IdTokenValidationMethod } from 'ltijs'

await provider.platformManager.registerPlatform({
  url: 'https://platform.example.com',
  clientId: 'your-client-id',
  name: 'Example LMS',
  authenticationEndpoint: 'https://platform.example.com/auth',
  accessTokenEndpoint: 'https://platform.example.com/token',
  idTokenValidation: { method: IdTokenValidationMethod.JwkSet, key: 'https://platform.example.com/jwks' },
})
```

See [Registering Platforms](registering-platforms.md) for the full picture, including activation and key
rotation.

## Where to next

- [Configuring a Provider](configuring-a-provider.md): every `ProviderOptions` field.
- [Handling Launches](handling-launches.md): what actually happens between a login and your handler
  running.
- [Philosophy & Architecture](philosophy-and-architecture.md): how the pieces fit together, and why
  almost everything is swappable.
