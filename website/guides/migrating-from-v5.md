# Migrating from ltijs v5

v7 is a full rewrite. This guide walks through porting an existing v5 tool, section by section, roughly in
the order you'll touch things: setting the provider back up, wiring your handlers back in, then the more
specific corners. Each section leads with how v7 does it; the v5 code only shows up where it helps orient
you.

## v7 needs Node 24+

Check this before anything else. v7 requires Node 24 or newer, up from legacy's Node 12.13, and
`package.json` enforces it: `npm install` refuses to install on an older Node version at all. If you're
upgrading an existing deployment, upgrading its Node version is the actual first step, before touching any
code.

## Remove `@types/ltijs`

v7 ships its own types, so the community `@types/ltijs` package isn't needed anymore:

```bash
npm uninstall @types/ltijs
```

Leaving it installed isn't just redundant, it globally augments Express's `Response` interface with v5's
old `locals.token`/`locals.context` shapes, which don't match anything in v7. That augmentation applies
whether or not anything actually resolves types through the package, so it's worth removing rather than
leaving in place.

## Setting up a provider

Construct a `Provider` once with everything it needs, wire up a launch handler, and start it:

```ts
import { Provider } from 'ltijs'

const provider = new Provider({
  database: { url: 'mongodb://localhost/database', connection: { user: 'user', pass: 'password' } },
  server: { port: 3000 },
})

provider.onResourceLink(async (context, request, response) => {
  response.send("It's alive!")
})

await provider.listen()
```

If you're coming from v5, this replaces the old singleton, configured through a static call:

```js
const lti = require('ltijs').Provider

lti.setup('LTIKEY', { url: 'mongodb://localhost/database', connection: { user: 'user', pass: 'password' } }, {
  cookies: { secure: false, sameSite: '' },
  devMode: true,
})
lti.onConnect((token, req, res) => res.send("It's alive!"))
await lti.deploy({ port: 3000 })
```

A few things you'd normally pass to `setup()` simply aren't needed anymore:

- **No more `LTIKEY`.** Legacy used one shared secret for three unrelated jobs: signing the `ltik` session
  token, encrypting platform private keys at rest, and signing the state cookie. v7 signs the `ltik` with
  the platform's own RSA key instead, and its default database backend doesn't encrypt keys at rest at
  all, the database itself is the trust boundary now. There's nothing left in `ProviderOptions` that needs
  a shared secret. (`MongoLegacyDatabaseManager` still takes one, see below, but only to decrypt data an
  existing v5 deployment already encrypted with it.)
- **No more `cookies` or `devMode`.** The OIDC `state` value no longer round-trips through a cookie at
  all, it goes through `localStorage`, falling back to the platform's own postMessage storage API when
  that's unavailable. That's what `cookies` configured and what `devMode` worked around, so neither is
  needed: nothing to configure, and no dev-only mode required to make an LMS iframe or a non-HTTPS dev
  server behave.
- **`deploy()` still works.** It's kept as an alias for `listen()`, so you don't have to touch every call
  site right away.

### Choosing a database backend

If you're moving an existing deployment without migrating its data, reach for
`MongoLegacyDatabaseManager`: it reads and writes the exact collections and encryption scheme v5 used, so
your existing database keeps working as-is, no data migration required.

```ts
import { Provider, MongoLegacyDatabaseManager } from 'ltijs'

const logger = { debug: console.debug, warn: console.warn, error: console.error }

const provider = new Provider({
  databaseManager: new MongoLegacyDatabaseManager(
    logger,
    { url: 'mongodb://localhost/database' },
    'the-same-key-your-v5-Provider.setup() call used',
  ),
})
```

See [the migration section of Swapping Backends](swapping-backends.md#migrating-from-ltijs-v5) for the
full constructor signature. Left unspecified, `database`/`databaseManager` builds the default
`MongoDatabaseManager` instead, which uses its own schema and doesn't encrypt at rest, so it isn't a
drop-in replacement for existing v5 data. There's no supported script that moves data from one schema to
the other; leaving the legacy schema behind later is a manual migration you'd have to write yourself.

## Launch handlers

Register a handler for the launch types your tool cares about, and read everything about the launch off
the `context` argument it's given:

```ts
provider.onResourceLink(async (context, request, response) => {
  response.send(`Hello, ${context.idToken.user.name}!`)
})
```

`onResourceLink` is the standard student/instructor launch, matching v5's `onConnect` (`onConnect` still
works too, kept as an alias). `onDeepLinking` is unchanged. `onSubmissionReview` is new, for an LTI 1.3
message type v5 never supported.

Handlers are `async` and awaited now. A rejection is caught and turned into a `500` automatically, where an
unguarded throw in a v5 handler could leave the request hanging with no response at all. `request` and
`response` give you what `req`/`res` used to, reshaped into a framework-agnostic pair rather than raw
Express objects, since v7's HTTP layer isn't tied to Express anymore. See
[Handling Launches](handling-launches.md) for the full picture.

## Calling LTI services

Grading, roster, and deep linking all hang off `context`, already scoped to the current launch, so you
don't pass an id_token or manage an access token yourself:

```ts
provider.onResourceLink(async (context, request, response) => {
  await context.grading.submitScore(lineItemId, {
    scoreGiven: 10,
    scoreMaximum: 10,
    activityProgress: 'Completed',
    gradingProgress: 'FullyGraded',
  })

  const { members } = await context.namesAndRoles.getMembers()

  const form = await context.deepLinking.createDeepLinkingForm(contentItems)
  response.html(form)
})
```

Not every launch declares support for every service, calling one that isn't available throws, so check
first when you're not sure:

```ts
if (context.grading.isAvailable()) {
  await context.grading.submitScore(lineItemId, score)
}
```

If you're coming from v5, this replaces `lti.Grade`, `lti.NamesAndRoles`, and `lti.DeepLinking`, each of
which took the id_token as an explicit first argument on every call (`lti.Grade.submitScore(idtoken,
lineItemId, score)`, and so on), and some of which also took an access token you'd fetched yourself. v7
handles both internally. See [Grading](grading.md), [Names and Roles](names-and-roles.md), and
[Deep Linking](deep-linking.md) for each service's full method list.

## Route protection is now opt-in

There's no global middleware anymore, and no whitelist. A route only gets LTI protection if you
explicitly give it one:

- **An LTI launch destination** (an extra `target_link_uri` your tool redirects to, a deep-linked resource,
  and so on) needs [`provider.registerLtiRoute(path)`](handling-launches.md#adding-lti-launch-routes),
  which runs the full launch pipeline exactly like the default launch route.
- **Any other route** that needs a launch's data (protecting an app page, resuming a launch in a
  background job) calls [`provider.getLaunchContext(ltik)`](../api/provider.md#getlaunchcontextltik)
  itself, and needs to handle the case where it throws:

  ```ts
  app.get('/my-protected-route', async (req, res) => {
    let context
    try {
      context = await provider.getLaunchContext(req.query.ltik)
    } catch (err) {
      res.status(401).json({ error: 'UNAUTHORIZED' })
      return
    }
    // ...
  })
  ```

**If a route does neither, it has no LTI protection at all**, same as any other unauthenticated route in
your app. This is easy to miss when porting routes from a v5 tool, which validated every route on `lti.app`
by default through a global middleware, opting a route *out* with `lti.whitelist()` rather than in. Audit
every custom route you register directly on `provider.httpHandler.app` and confirm each one that should be
protected actually calls `getLaunchContext`, or is registered through `registerLtiRoute`.

## Default route paths have changed

The default routes are now `/lti/login`, `/lti/launch`, and `/lti/keys` (plus a new `/lti/register` for
Dynamic Registration), where v5 defaulted to `/login`, `/` (the launch/app route), and `/keys`. If you're
upgrading an existing v5 deployment, your platform registrations almost certainly reference the old URLs
directly, and those requests will 404 against the new defaults unless you do one of the following:

- **Re-register each platform** with the new URLs, or
- **Configure v7 to use your existing v5 paths**, so nothing on the platform side needs to change:

  ```ts
  new Provider({
    routes: {
      loginRoute: '/login',
      launchRoute: '/',
      keysetRoute: '/keys',
    },
  })
  ```

## Registering a platform

Register a platform through `platformManager`, on the provider instance rather than a singleton:

```ts
import { IdTokenValidationMethod } from 'ltijs'

await provider.platformManager.registerPlatform({
  url,
  name,
  clientId,
  authenticationEndpoint,
  accessTokenEndpoint,
  idTokenValidation: { method: IdTokenValidationMethod.JwkSet, key: 'https://platform.url/keyset' },
})
```

Two fields were renamed along the way: v5's `accesstokenEndpoint` is `accessTokenEndpoint`, and
`authConfig` is `idTokenValidation`. The `method` values inside it didn't change, `'RSA_KEY'`, `'JWK_KEY'`,
and `'JWK_SET'` still work as plain strings if you'd rather not import the `IdTokenValidationMethod` enum.
Bad input throws a `ValidationError` immediately, instead of being accepted silently or failing later with
a confusing error somewhere inside the login flow.

The `Platform` objects these methods return are plain data now too, not instances with v5's own async
getter/setter methods (`platform.platformUrl()` and friends). See
[Platform Manager](../api/platform-manager.md) for the current method list and `Platform` shape.

### Dynamic Registration

If a platform registers itself, the option that turns this on moved from `dynReg` to `dynamicRegistration`:

```ts
new Provider({
  dynamicRegistration: {
    name: 'My Tool',
    url: 'https://your-tool.example.com',
    useDeepLinking: true,
  },
})
```

The fields inside it kept their v5 names. See [Registering Platforms](registering-platforms.md#dynamic-registration)
for the full option list and the registration flow itself.

## Catching errors

Catch specific failure classes instead of matching on a message string:

```ts
import { LtijsError, ValidationError, HttpError } from 'ltijs'

try {
  await context.grading.submitScore(lineItemId, score)
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.errors) // per-field validation messages
  } else if (err instanceof HttpError) {
    console.error(err.status, err.response) // the platform's own status code and response
  } else if (err instanceof LtijsError) {
    console.error(err.name, err.message) // e.g. "TokenTooOldError" "TOKEN_TOO_OLD"
  } else {
    throw err
  }
}
```

If your existing v5 error handling matches on `err.message` strings, most of it keeps working unchanged,
the message codes are usually the same `SCREAMING_SNAKE_CASE` strings v5 used. What's new is `instanceof`
support for the three cases above, and structured HTTP error responses: a thrown error that reaches a
route unhandled is now mapped to `{ error: 'TokenTooOldError', message: 'TOKEN_TOO_OLD' }` rather than v5's
`{ status, error: 'Bad Request', details: { message } }`, so update any frontend code that parses ltijs's
own error responses directly. See [Error Handling](error-handling.md) for the full picture.

## Reading the id_token

Read claims off `context.idToken`, a structured, namespaced object:

```ts
context.idToken.user.name
context.idToken.platform.url
context.idToken.launch.context
```

See [Launch Context](../api/launch-context.md#idtoken) for the full shape. If you're porting a v5 handler
body that expects the old flat structure (`token.iss`, `token.user`, `token.userInfo.name`,
`token.platformContext`, and so on), `context.legacyIdToken` reshapes the id_token back into it, so you can
often port a handler by changing only its registration and signature, not its body:

```ts
provider.onResourceLink(async (context, request, response) => {
  const token = context.legacyIdToken
  console.log(token.user, token.platformContext?.contextId)
})
```

It only covers what v5 exposed on the top-level `token`/`context` objects: `iss`, the user id, `clientId`,
`deploymentId`, and the context/resource-link/names-and-roles shape under `platformContext`. Fields v5
carried elsewhere, `userInfo`, `platformInfo`, `launchPresentation`, and so on, aren't there; reach for
`idToken` for those, or for anything not already covered. `legacyIdToken` is deprecated: treat it as a
stepping stone while you migrate handler bodies over time, not a permanent home, since it won't grow new
fields as the LTI spec does.

## Custom HTTP backends: cookies are gone

If you implemented your own `HttpHandler` (rare, most tools use the default Express one) or touched
`HttpRequestParameters.cookies`, `HttpResponse.setCookie()`, or `.clearCookie()` directly, all three are
gone, along with `CookieOptions`. This follows from state no longer round-tripping through a cookie (see
[Setting up a provider](#setting-up-a-provider) above): once nothing needed to read or write a cookie, the
interface stopped mentioning them.
