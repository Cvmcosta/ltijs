# Code Review Findings — Full Pass (2026-08-31)

28 findings from an 8-angle review pass (reuse, simplification, efficiency, correctness/auth-core,
altitude/bandaid-fixes, removed-behavior-vs-legacy, conventions, cross-file wiring), each verified
against the actual code before being recorded here — not raw agent output. Ordered critical first.
Checkboxes are for tracking fix status as we work through this list; nothing has been fixed yet.

**Verdict key**: `CONFIRMED` = directly verified against the code (and, where relevant, against legacy
source in git history). `PLAUSIBLE` = a real, well-evidenced concern, but one where the "correct"
behavior is a genuine design question rather than a clear-cut bug — flagged for a decision, not a fix.

---

## Tier 1 — Critical correctness bugs

- [x] **1. Third-party-cookie recovery flow is completely broken (infinite redirect loop)** — **FIXED**:
  renamed `signed-state-form.html`'s hidden input from `signed_state`/`id="signed_state"` to
  `ltijs_recovered_state`/`id="ltijs_recovered_state"`, matching `LaunchService.RECOVERED_STATE_FIELD`
  exactly (the server-side constant was the one that had drifted from legacy's original naming; the
  template was an unmodified carry-over from legacy and needed to catch up, not the other way around
  — confirmed via git history that legacy's own template and server agreed on `signed_state`). Added a
  new regression test (`launch.service.test.ts`, "the recovery page actually posts the recovered state
  under the field name the server reads back") that renders the real template, extracts the actual
  posted field name via regex instead of assuming it, and drives a second request through it end to
  end — this is the test that would have caught the original bug, since the existing test fabricated
  `ltijs_recovered_state` directly in the mock body rather than exercising the template. Verified:
  `tsc`/`eslint`/`prettier` clean, `services/launch` suite 55/55 (+1 new test), full `npm run test`
  gate exits 0.
  **File**: `src/services/launch/templates/signed-state-form.html:4` (server side:
  `src/services/launch/launch.service.ts:41,321`)
  **Verdict**: CONFIRMED
  The client-side recovery template posts the recovered state under the form field name `signed_state`,
  but the server only ever reads `request.body['ltijs_recovered_state']`
  (`LaunchService.RECOVERED_STATE_FIELD`). Confirmed via grep: `signed_state` appears nowhere in `src/`
  outside this one template.
  **Failure scenario**: Any launch where the `ltijs_state` cookie is unavailable (blocked third-party
  cookies — Safari ITP, an LMS iframe, exactly the case this recovery mechanism exists for) hits
  `resolveRecoveredState`, which returns `undefined` even after the client-side JS correctly resubmits
  the form, because the posted field is never populated under the name the server checks. The server
  re-renders the identical recovery page, the client resubmits again, and the launch never
  completes — an infinite loop for every browser that needed this fallback in the first place. The unit
  suite doesn't catch this because its tests fabricate `ltijs_recovered_state` directly in the mock
  request body rather than driving the real template.

- [x] **2. `azp` check wrongly rejects valid single-element `aud` arrays** — **FIXED**: `validateAud()`
  now only enforces the `azp`-must-match check when `aud` actually names more than one audience
  (`Array.isArray(token.aud) && token.aud.length > 1`), leaving single-element arrays and bare-string
  `aud` unaffected, matching the OIDC/LTI spec. Added a test proving a single-element `aud` array with
  no `azp` now resolves. Empirically verified: temporarily reverted to the old `Array.isArray(...)`-only
  check and confirmed the new test fails with `AzpDoesNotMatchClientidError` exactly as the bug
  predicts, then restored the fix and re-confirmed green. Verified: `tsc`/`eslint`/`prettier` clean,
  `services/oidc` suite 36/36 (+1 test), full `npm run test` gate exits 0.
  **File**: `src/services/oidc/oidc.service.ts:164`
  **Verdict**: CONFIRMED
  `validateAud()` requires `azp` to match the client ID whenever `aud` is an array, but the OIDC/LTI
  spec only mandates `azp` when `aud` contains *multiple* values — not for a single-element array,
  where `azp` is legitimately optional.
  **Failure scenario**: A platform sends a spec-valid id_token with `"aud": ["<toolClientId>"]`
  (single-element array) and omits `azp`. `Array.isArray(token.aud)` is `true` and
  `undefined !== platform.clientId` is `true`, so the code throws `AzpDoesNotMatchClientidError` and
  rejects an otherwise-valid launch — a false-rejection bug affecting real platforms depending on how
  they format `aud`.

- [x] **3. `getLaunchContext()` — the documented session-resumption entry point — is unreachable from `Provider`** —
  **FIXED**: added `Provider.getLaunchContext(ltik)`, a thin forwarding method to
  `this.launchService.getLaunchContext(ltik)` — matching this port's own established pattern of
  wrapping `LaunchService` with dedicated public methods (`onResourceLink`, `onDeepLinking`, etc.)
  rather than exposing the `private` `launchService` field directly, which would have also
  redundantly re-exposed its setters and `prepareHttpRoutes()`. Added a delegation test (spying on
  `LaunchService.prototype.getLaunchContext`, since full behavioral coverage of that method already
  lives in `launch.service.test.ts`). Empirically verified: removed the method, confirmed the new
  test fails with `TypeError: provider.getLaunchContext is not a function` (proving this is exactly
  the "unreachable/dead code" gap the finding described), then restored it. Verified:
  `tsc`/`eslint`/`prettier` clean, `services/provider` suite 18/18 (+1 test), full `npm run test`
  gate exits 0.
  **File**: `src/services/provider/provider.service.ts:49`
  **Verdict**: CONFIRMED
  `LaunchService.getLaunchContext(ltik)` is public and meant to be the session-resumption entry point
  (resuming context on a follow-up request using a previously issued ltik), but `Provider.launchService`
  is `private readonly` with no method forwarding to it. Every other constructed service
  (`platformManager`, `httpHandler`, `keysetService`, `dynamicRegistrationService`, `databaseManager`)
  is exposed as a public property on `Provider` except this one.
  **Failure scenario**: A consumer using `new Provider(...)` (the only exported constructor) has no
  way to re-derive a `LaunchContext` — and therefore no `context.grading`/`context.namesAndRoles`/
  `context.deepLinking` — for any request after the initial launch (e.g. protecting a follow-up app
  route with a stored ltik, or submitting a grade from a background job). `getLaunchContext` is only
  ever called from a test that instantiates `LaunchService` directly, bypassing `Provider` — in real
  usage through the public API, the method is dead code.

- [x] **4. Token max-age hardcoded to 1 hour — legacy defaulted to 10s and let integrators configure it** —
  **FIXED**: `OidcService` now takes `tokenMaxAge: number | false` as a required constructor param
  (no default inside the class itself, consistent with this port's DI convention), and
  `validateMaxAge()` skips the check entirely when it's `false`. `ProviderOptions` gained an optional
  `tokenMaxAge?: number | false` field; `Provider` resolves `options.tokenMaxAge ?? 10` (restoring
  legacy's own default) and passes it through. Added two tests: a stricter `tokenMaxAge` rejecting a
  token the default would have accepted, and `tokenMaxAge: false` accepting a token old enough to
  fail the default. Empirically verified: reverted `OidcService` to the old hardcoded
  `TOKEN_MAX_AGE_SECONDS = 3600` field and confirmed both new tests fail meaningfully (the strict-limit
  test resolves when it should reject; the `false` test rejects when it should resolve) before
  restoring. Verified: `tsc`/`eslint`/`prettier` clean, `services/oidc` suite green (+2 tests), full
  `npm run test` gate exits 0.
  **File**: `src/services/oidc/oidc.service.ts:40`
  **Verdict**: CONFIRMED
  `TOKEN_MAX_AGE_SECONDS` is a hardcoded private field at `3600` with no way to override it. Verified
  against legacy source in git history (`src/Utils/Auth.js`): legacy defaulted `#tokenMaxAge` to 10
  seconds, configurable via `options.tokenMaxAge`, and settable to `false` to disable the check
  entirely.
  **Failure scenario**: An id_token issued up to one hour ago is now accepted where legacy would have
  rejected anything older than 10 seconds by default — a 360x relaxation of a replay-window control,
  silently applied to every integrator, with no `ProviderOptions` field to restore the old behavior or
  configure their own value.

- [x] **5. `randomJti()` uses `Math.random()` instead of a CSPRNG** — **FIXED**: swapped the per-character
  entropy source from `(Math.random() * 36) | 0` to `crypto.randomInt(36)` -- a minimal, drop-in
  change preserving the exact same output shape (25 lowercase base-36 characters) the existing test
  and any downstream consumer already expect, while making it a real CSPRNG. Added a test asserting
  `Math.random` is never called during `randomJti()` (the existing shape/uniqueness test wouldn't
  have caught a regression back to `Math.random()`, since both generators produce structurally
  identical output). Empirically verified: reverted to the `Math.random()`-based implementation and
  confirmed the new test fails, showing exactly 25 calls to `Math.random()` (one per character),
  before restoring the fix. Verified: `tsc`/`eslint`/`prettier` clean, `shared/utils/random` suite
  3/3 (+1 test, 100% coverage), full `npm run test` gate exits 0.
  **File**: `src/shared/utils/random/random.ts:8`
  **Verdict**: CONFIRMED
  `randomJti()` — used to generate the `jti` claim of the RS256 client-assertion JWT sent to platforms
  for the client-credentials grant (`access-token-manager.service.ts`) — builds its string via
  `Math.random()`, while the adjacent `randomUuid()` correctly uses `crypto.randomUUID()`.
  **Failure scenario**: `jti` exists specifically to give each signed client assertion a unique,
  unguessable identifier for platform-side replay detection. `Math.random()` is not cryptographically
  secure; a weak/predictable `jti` generator undermines that replay protection against an attacker who
  can influence or predict PRNG state.

- [x] **6. "Platform must have a private key" invariant is enforced in half the places it should be** —
  **FIXED, and the real scope was larger than originally reported**: grepping every `platform.keys.private`/
  `platform.keys.public` usage across `src/services` turned up **six** unguarded direct accesses, not
  the two the finding named — `LaunchService.buildLtik()`, `DeepLinking.createDeepLinkingMessage()`,
  and `OidcService.buildStateToken()` (private key, signing); `LaunchService.verifyLtik()` and
  `OidcService.validateStateToken()` (public key, verifying) all bypassed the check the same way.
  Extracted two shared, dependency-free pure functions, `resolvePlatformPrivateKey(platform)`/
  `resolvePlatformPublicKey(platform)`, into a new `src/services/platform-manager/platform-keys.ts` —
  deliberately *not* wired as a new `PlatformManager` constructor dependency threaded through
  `AccessTokenManager`/`DeepLinking`/`LaunchContext` (which would have cascaded into several
  constructors and test files for a check that needs no instance state at all); instead every call site
  imports the plain function directly, mirroring this codebase's own existing precedent
  (`platform.serializer.ts`'s `buildPlatform()`, a plain function operating on `Platform`-shaped data
  outside any class). `PlatformManager.getPrivateKey()`/`getPublicKey()` now delegate to these
  functions instead of duplicating the check inline; `AccessTokenManager`'s private, fully-duplicate
  `getPrivateKey()` method and its duplicate `PrivateKeyNotFoundError` class (in
  `access-token-manager/errors.ts`, now deleted) were removed outright in favor of calling the shared
  function directly. **Deliberately left `keyset.service.ts`'s `buildJwk()` unguarded** — unlike the
  other five sites (each scoped to one platform's one request), this one maps over *every* registered
  platform to build the `/lti/keys` discovery response; making it throw would let one platform with a
  corrupted key take down the whole endpoint for every other platform, a materially worse failure mode
  than what this finding is about, not something to change without being asked.
  Added 8 new tests across 6 files: the three previously-unguarded signing paths
  (`deep-linking.service.test.ts`, `oidc.service.test.ts`'s `buildStateToken`,
  `access-token-manager.service.test.ts`), a new `launch.service.test.ts` test modeling the one real
  way `buildLtik()`'s guard is reachable (a key-rotation race — valid keys at login, since
  `OidcService.buildStateToken()` now requires them too, cleared before the launch callback
  completes), a previously-entirely-missing mirror test for `PlatformManager.getPrivateKey()` (only
  its `getPublicKey()` sibling had a "throws when missing" test before), and a new
  `platform-keys.test.ts` directly covering both shared functions in isolation. Empirically verified:
  temporarily made both shared functions unconditionally return the key with no check, ran every new
  test across all 6 files, and confirmed all 8 failed (`8 failed, 153 skipped`) before restoring.
  Verified: `tsc`/`eslint`/`prettier` clean, all 6 affected suites green (161/161), full
  `npm run test` gate exits 0.

---

## Tier 2 — Needs a decision (not clear-cut bugs)

- [x] **7. ltik has no session-cookie binding, unlike legacy's default behavior** — **DECIDED: keep
  bearer-token-only, no code change.** Per direct confirmation, the RS256 signature (platform-bound,
  so a compromised key's blast radius is limited to one platform) plus the short `LTIK_TTL_SECONDS`
  expiry are the accepted security boundary here, not an additional session cookie. Adding
  cookie-binding would require changing `getLaunchContext(ltik)` to `getLaunchContext(ltik, request)`
  — a breaking change to a method consumers call directly in their own custom routes, not something
  to take on for a hypothetical. Documented the rationale directly at `getLaunchContext()` in
  `launch.service.ts` so this doesn't get rediscovered as an oversight later.

- [x] **8. `accept_multiple` drops legacy's string `"false"` handling** — **FIXED**: per direct
  confirmation, restored legacy's behavior — both boolean `false` and the string `'false'` are now
  treated as false (read through `unknown` first, since the claim arrives from an external,
  platform-controlled id_token and the declared `boolean` type isn't a runtime guarantee). Added a
  test proving a platform sending `accept_multiple: 'false'` (string) still gets only the first
  content item. Empirically verified: reverted to the boolean-only check and confirmed the new test
  fails (both items came through instead of one) before restoring. Verified:
  `tsc`/`eslint`/`prettier` clean, `services/deep-linking` suite 11/11 (+1 test), full
  `npm run test` gate exits 0.

- [x] **9. Login-route validation sits outside the route's own error-handling boundary** — **DECIDED:
  leave as-is, no code change.** Per direct instruction (reversing an earlier answer in the same
  round), validation stays outside the `try` block. No behavioral concern either way — a bare
  `ValidationError` there already gets a correct generic 400 via `ExpressHttpHandler`'s catch-all — so
  this was purely a structural/consistency question, and the call is to not touch it.

---

## Tier 3 — Correctness (smaller / edge case)

- [x] **10. `LineItemIdSchema` accepts an empty string** — **FIXED**: added `.min(1)`, applying uniformly
  across all 5 call sites that already validate through this one shared schema
  (`getLineItemById`/`updateLineItemById`/`deleteLineItemById`/`submitScore`/`getScores`). Added a
  test proving `getLineItemById('')` now throws a `ValidationError`. Empirically verified: reverted to
  bare `z.string()` and confirmed the new test fails — and fails with exactly the predicted failure
  mode, a raw `TypeError` from the downstream fetch call rather than a clean `ValidationError` — before
  restoring. Verified: `tsc`/`eslint`/`prettier` clean, `services/grading` suite 34/34 (+1 test), full
  `npm run test` gate exits 0.

---

## Tier 4 — Reuse / duplication (maintainability risk)

- [x] **11. Hand-rolled `jwt.verify()` skips the shared wrapper's `clockTimestamp` normalization** —
  **FIXED**: `validateStateToken()` now calls the shared `verifyTokenSignature()` wrapper (same as
  `validateIdToken()`), and the now-fully-unused raw `import jwt from 'jsonwebtoken'` was removed from
  the file. Added a test that spies on `verifyTokenSignature` (via a namespace import,
  `import * as cryptoJwt from '#utils/crypto/jwt'`, since it's a plain function export rather than a
  class method) and asserts it's called with the token/public-key/`['RS256']`. Empirically verified:
  reverted to the raw `jwt.verify()` call and confirmed the new test fails with `Number of calls: 0`
  before restoring. Verified: `tsc`/`eslint`/`prettier` clean, `services/oidc` suite 40/40, full
  `npm run test` gate exits 0.

- [x] **12. `PrivateKeyNotFoundError` duplicated verbatim across two services** — **ALREADY RESOLVED**,
  no new change needed: this was fixed as a side effect of Tier 1 finding #6 (all platform-key access
  routed through `resolvePlatformPrivateKey`/`resolvePlatformPublicKey` in the new
  `platform-manager/platform-keys.ts`). `src/services/access-token-manager/errors.ts` no longer exists
  (deleted during #6's fix); confirmed via `grep -rn "PrivateKeyNotFoundError" src/services/` that only
  one definition remains, in `platform-manager/errors.ts`.

- [x] **13. `MissingOrInvalidResourceLinkIdError` duplicated verbatim across two services** —
  **FIXED**: moved the single class definition into `src/shared/errors.ts` (alongside the base
  `LtijsError`), with a comment explaining it's shared because both AGS (grading) and NRPS
  (names-and-roles) resolve the same launch-layer `idToken[IdTokenClaim.ResourceLink]?.id` claim; it's
  a launch-level concept, not owned by either service. Removed both per-service duplicate class
  definitions; `grading.service.ts`/`names-and-roles.service.ts` now import the one shared class.
  Added an `instanceof`-based test to each service's suite proving they now throw the literal same
  class (`grading.service.test.ts`: "throws the shared MissingOrInvalidResourceLinkIdError -- the same
  class NamesAndRoles throws, not a duplicate"; a new equivalent coverage gap was also closed in
  `names-and-roles.service.test.ts`, which previously had no test at all for this error path).
  Empirically verified: reintroduced a local duplicate class in `grading/errors.ts` and pointed
  `grading.service.ts` back at it; confirmed the new `instanceof` test fails (structurally-identical
  but not `instanceof`-equal) before restoring. Verified: `tsc`/`eslint`/`prettier` clean,
  `services/grading` + `services/names-and-roles` suites 49/49, full `npm run test` gate exits 0.

- [x] **14. Hand-rolled `jwt.sign()` instead of the shared `signJwt()` wrapper** — **FIXED**:
  `signClientAssertion()` now calls the shared `signJwt()` wrapper (which accepts `jwt.SignOptions`
  directly, so `algorithm`/`expiresIn`/`keyid` pass through unchanged); the raw `jsonwebtoken` import
  was removed. Added a test spying on `signJwt` (same namespace-import pattern as #11) asserting the
  assertion payload, private key, and options are passed through correctly. Empirically verified:
  reverted to the raw `jwt.sign()` call and confirmed the new test fails with `Number of calls: 0`
  before restoring. Verified: `tsc`/`eslint`/`prettier` clean, `services/access-token-manager` suite
  7/7, full `npm run test` gate exits 0.

- [x] **15. Manual `Bearer` header string instead of the shared authorization-header helper** —
  **FIXED**: generalized `buildBearerAuthorization()` (`src/shared/utils/request/authorization-header.ts`)
  with an overload accepting a raw token string (`Bearer ${token}`) alongside its existing `AccessToken`
  overload, since dynamic-registration's `registrationToken` is a bare string, not an `AccessToken`
  record with a `token_type` — fabricating a fake `AccessToken` just to reuse the helper would've been
  worse than the duplication it fixes. `performRegistration()` now calls
  `buildBearerAuthorization(registrationToken)`. Added a test spying on `buildBearerAuthorization`
  asserting it's called with the raw token, plus a matching overload test in
  `authorization-header.test.ts`. Empirically verified: reverted to the hand-rolled template string and
  confirmed the new test fails before restoring. Verified: `tsc`/`eslint`/`prettier` clean,
  `dynamic-registration` + `authorization-header` suites 22/22, full `npm run test` gate exits 0.

---

## Tier 5 — Simplification (redundant logic / readability)

- [x] **16. `createDeepLinkingForm()` re-runs validation that `createDeepLinkingMessage()` repeats internally**
  — **FIXED**: extracted a private `signDeepLinkingMessage({ idToken, platform, settings, contentItems,
  options })` helper (params bundled into one object to stay under the `max-params` limit) that both
  public methods call after resolving `settings` exactly once each. Deleted `ensureServiceAvailability()`
  entirely — it was fully redundant with `resolveDeepLinkingSettings()`, which already performs and
  throws on the identical undefined check; every call site paired the two, so the first was dead weight
  even before this fix. Also cleaned up an accidental duplicated comment block in `filterContentItems()`
  left over from the Tier 2 #8 fix. Added a test that defines the `deepLinkingSettings` claim as a
  counting getter and asserts it's read exactly once per `createDeepLinkingForm()` call. Empirically
  verified: reverted `createDeepLinkingForm()` to call `createDeepLinkingMessage()` again (reintroducing
  the double resolution) and confirmed the new test fails (2 reads) before restoring. Verified:
  `tsc`/`eslint`/`prettier` clean, `services/deep-linking` suite 12/12, full `npm run test` gate exits 0.

- [x] **17. Service-availability check stated twice across two methods (NamesAndRoles)** — **FIXED**:
  same shape as #16. Deleted `ensureServiceAvailability()` entirely (redundant with
  `buildMembershipsRequest()`'s own identical check) and moved `buildMembershipsRequest()` ahead of the
  access-token fetch in `getMembers()`, preserving the original fail-fast-before-any-network-call
  ordering. Added the same counting-getter test pattern as #16, asserting the `namesRoles` claim is read
  exactly once per `getMembers()` call. Empirically verified: reintroduced the duplicate
  `ensureServiceAvailability()` check and confirmed the new test fails (2 reads) before restoring.
  Verified: `tsc`/`eslint`/`prettier` clean, `services/names-and-roles` suite 15/15, full `npm run test`
  gate exits 0.

- [x] **18. `contextId` is redundant — always equal to `rawIdToken.id`** — **FIXED**: replaced the
  separately-assigned field with a getter (`get contextId(): string { return this.rawIdToken.id }`),
  chosen over dropping the field outright since `LaunchContext` is part of this port's curated public
  type-export surface and removing it would be a breaking API change; the getter keeps the exact same
  public read shape while making drift structurally impossible (there's only one field left to edit).
  Added a test asserting `context.contextId === rawIdToken.id` (previously untested). No revert-verify
  cycle applies: since `rawIdToken` is never reassigned after construction, a getter and a
  construction-time-assigned field are behaviorally identical for the object's whole lifetime — there is
  no observable output a test could use to distinguish the two implementations, so the fix is a pure
  source-level improvement, not something a black-box test can fail against. Verified:
  `tsc`/`eslint`/`prettier` clean, `launch-context` suite 4/4, full `services/launch` suite 56/56.

- [x] **19. Filter condition duplicated as its own negation across two methods** — **FIXED**: extracted
  a `filtersByIdOrLabel(options)` private predicate that both `buildLineItemsQuery` (server-side limit,
  under `!filtersByIdOrLabel`) and `filterLineItems` (client-side slice, under `filtersByIdOrLabel`) now
  call, making the XOR relationship a single source of truth instead of two independently-written
  conditions. Added a comment on the server-side branch explaining why the two are mutually exclusive.
  Added a test covering the `id`-filter side of the pairing (only the `label` side had prior coverage).
  Empirically verified: reverted `buildLineItemsQuery`'s condition to a hand-written, deliberately
  incomplete negation (`options.id === undefined`, dropping the `label` check — a realistic drift
  scenario) and confirmed the pre-existing "re-slices to options.limit after client-side..." test fails
  before restoring. Verified: `tsc`/`eslint`/`prettier` clean, `services/grading` suite 36/36, full
  `npm run test` gate exits 0.

- [x] **20. `registerPlatform()` reads backward relative to a guard clause** — **FIXED**: flipped to
  `if (existingPlatform !== undefined) throw ...; return await this.createNewPlatform(validated)`,
  matching the guard-clause shape used elsewhere. Pure control-flow inversion with no behavioral
  difference (confirmed by all 50 pre-existing `services/platform-manager` tests passing unchanged); no
  revert-verify cycle applies for the same reason as #18. Verified: `tsc`/`eslint`/`prettier` clean,
  `services/platform-manager` suite 50/50.

**Note, out of scope for this tier**: while fixing #16/#17, the same
`ensureServiceAvailability()`-duplicates-`resolveXEndpoint()` pattern was spotted in
`src/services/grading/grading.service.ts` (lines 72/86 call `ensureServiceAvailability`, immediately
followed by a redundant `resolveLineItemsEndpoint` call doing the identical check) — a third instance of
this exact shape that wasn't in the original review's findings list. Not fixed here since it wasn't one
of the five findings asked for in this pass; flagging for a future tier/finding.

---

## Tier 6 — Convention violations

- [x] **21. HTTP verbs are bare string literals, not extracted constants** — **FIXED**: reused the
  existing `HttpMethod` enum (`http-handler.types.ts`, already `Get`/`Post`/`Put`/`Delete`/`All`, and
  already used elsewhere e.g. `dynamic-registration.service.ts`) instead of adding new local constants —
  the codebase already had exactly the right shared enum. `request()`'s `method` param is now typed
  `HttpMethod` instead of bare `string`, giving compile-time protection. Added a test asserting the
  literal method string reaches `fetch()` correctly for all four verbs (previously untested at all).
  Empirically verified: reverted `delete()` to a typo'd literal (`'Delete' as HttpMethod`, simulating
  what a hand-written constant typo would produce) and confirmed the new test fails before restoring.
  Verified: `tsc`/`eslint`/`prettier` clean, `request-handler` suite 11/11, full `npm run test` gate
  exits 0.

- [x] **22. `EncryptedPayload` interface declared inline, not in a `.types.ts` file** — **FIXED**:
  moved the interface to a new `src/shared/utils/crypto/aes-encryption.types.ts`, matching
  `crypto/jwt.ts`/`crypto/jwt.types.ts`'s exact pattern; updated the one consumer
  (`mongo-legacy-database-manager.service.ts`) to import the type from the new path directly rather than
  re-exported from the implementation file, matching how `jwt.types.ts`'s types are consumed elsewhere
  (never re-exported from `jwt.ts`). Pure organizational move, no behavioral change — no revert-verify
  cycle applies (the compiler itself would catch a broken import). Verified: `tsc`/`eslint`/`prettier`
  clean, `aes-encryption` suite 3/3, `mongo-legacy` DB suite 19/19.

- [x] **23. Inline anonymous return types instead of named types** — **FIXED**: added
  `ProcessLaunchResult`/`TargetLinkUriParts` to `launch.types.ts` (alongside the existing
  `LoginRequestResult`/`LaunchRoutes`) and `DynamicRegistrationSetup` to `provider.types.ts`, replacing
  all three inline anonymous object-literal return types with the named equivalents. Pure type-level
  change, identical compiled output — no revert-verify cycle applies. Verified: `tsc`/`eslint`/`prettier`
  clean, `services/launch` + `services/provider` suites 74/74, full `npm run test` gate exits 0.

---

## Tier 7 — Efficiency / performance

- [x] **24. JWKS fetched from the platform on every single launch** — **FIXED**: added a short-TTL
  (5 min) cache to `OidcService`, keyed by `jwks_uri` (`resolveJwks()`, extracted from
  `resolveVerificationKey()`'s `JwkSet` branch). **Design decision** (asked, see below): simple TTL-only
  cache, not event-invalidated — no coupling between `PlatformManager` and `OidcService`; a rotated
  platform key can be served stale for up to the TTL window, self-healing on the next expiry. Added
  tests: a second launch for the same `jwks_uri` doesn't re-fetch (spy call count), and the cache
  re-fetches once `Date.now()` is advanced past the TTL. Empirically verified: reverted `resolveJwks()`
  to always fetch and confirmed the "does not re-fetch" test fails before restoring. Verified:
  `tsc`/`eslint`/`prettier` clean, `services/oidc` suite 42/42, full `npm run test` gate exits 0.
  **Follow-up 1**: the caching mechanism itself was later promoted from a private in-memory `Map` field
  to a pluggable `CacheManager` interface (`src/services/cache-manager/cache-manager.types.ts`), injected
  via `ProviderOptions.cacheManager` and exposed as `Provider.cacheManager` — same pattern as
  `DatabaseManager`/`RequestHandler`/`HttpHandler`/`Logger`. `OidcService`'s constructor gained a
  `cacheManager: CacheManager` parameter (now 5 params,
  `eslint-disable-next-line @typescript-eslint/max-params`). A `MemoryCacheManager` implementation was
  built first, then **removed** once the user raised that a per-process in-memory cache can't coordinate
  across multiple ltijs instances behind a load balancer — see Follow-up 3 below for the resolution.
  **Follow-up 2**: the original TTL-only, non-event-invalidated design decision above was revised —
  `resolveJwk()` (new, wraps `resolveJwks()`) now invalidates the cached JWKS entry and retries once
  against a forced-fresh fetch whenever the cached response is missing the `kid` a token actually needs,
  rather than only self-healing once the TTL happens to expire. Bounded to exactly one retry (a
  genuinely nonexistent `kid` still fails fast as `AUTHCONFIG_NOT_FOUND`, not an infinite loop). The TTL
  itself is unchanged and still acts as a backstop. Tests: a kid-miss against a stale cache entry
  triggers exactly one invalidate-and-retry cycle that then succeeds (2 total fetches, `cacheManager`
  spy confirms `delete()` was called with the exact cache key); the already-nonexistent-kid case now
  also asserts exactly 2 fetches (bounded retry, not unbounded). Empirically verified: reverted the
  `cacheManager.delete(...)` call and confirmed the retry-success test fails (falls through to the still
  stale cached entry) before restoring.

- [x] **25. Keyset endpoint re-queries the full platform table on every request** — **FIXED**: same
  TTL-only caching decision as #24, applied to `KeysetService.buildKeyset()` (60s TTL, a single cached
  `Keyset` object rather than per-platform, since the whole endpoint's response is one JSON body).
  Added tests: a second request within the TTL doesn't re-query `platformManager.getPlatforms()`, and
  the cache re-queries once `Date.now()` is advanced past the TTL. Empirically verified: reverted
  `buildKeyset()` to always query and confirmed the "does not re-query" test fails before restoring.
  Verified: `tsc`/`eslint`/`prettier` clean, `services/keyset` suite 6/6, full `npm run test` gate
  exits 0.
  **Follow-up**: same `CacheManager` promotion as #24 — `KeysetService` now shares the *same*
  `CacheManager` instance as `OidcService` (both wired through `Provider`), with cache keys namespaced
  (`oidc:jwks:<uri>` vs `keyset:default`) to avoid collisions on the shared instance. `KeysetService`'s
  constructor gained a `cacheManager: CacheManager` parameter (stays at 4 params, no eslint-disable
  needed).
  **Follow-up 2**: raised directly by the user, tracking exactly where a `cacheManager.delete(...)` was
  still missing across the codebase. `PlatformManager` gained an optional 3rd constructor param,
  `cacheManager?: CacheManager` (optional so the ~40 existing test call sites that construct
  `PlatformManager` directly, without a cache, keep compiling unchanged — invalidation is simply skipped
  when absent, safe since nothing else references that instance's cache anyway). A new
  `invalidateKeysetCache()` private method (guarded by the `undefined` check) is called from
  `createNewPlatform()` (→ `registerPlatform()`), `deletePlatform()`, and `rotateKeys()` — the three
  mutations that change what `/lti/keys` should serve. Deliberately **not** called from `updatePlatform()`
  (never touches `keys`) or `activatePlatform()`/`deactivatePlatform()` (the keyset includes every
  platform regardless of `active` status) — confirmed by reading `buildKeyset()` and
  `buildPlatformUpdate()` directly, and locked in by a negative test asserting `updatePlatform()` never
  calls `cacheManager.delete(...)`. The literal cache key (`'keyset:default'`) was hoisted out of
  `KeysetService` into a new shared `src/services/keyset/keyset.constants.ts` (`KEYSET_CACHE_KEY`), so
  `PlatformManager` and `KeysetService` reference the same constant rather than duplicating the string.
  `PlatformManager` reaches directly into `KeysetService`'s cache key rather than taking a `KeysetService`
  dependency, since `Provider` already constructs `KeysetService` *after* `PlatformManager` (which
  `KeysetService` itself depends on) — the reverse dependency would be circular. `Provider` now passes
  its shared `this.cacheManager` into `PlatformManager`'s constructor alongside `OidcService`'s and
  `KeysetService`'s. Empirically verified: each of the three invalidation calls, and the negative
  `updatePlatform()` guard, was individually reverted/added and confirmed to flip the corresponding
  test's pass/fail state before restoring. Verified: `tsc`/`eslint`/`prettier` clean,
  `services/platform-manager` suite 100% coverage (55/55), full unit gate 358/358, full DB gate 40/40.
  **Follow-up 3**: the user pointed out that `MemoryCacheManager` (Follow-up 1) can't actually work
  safely once ltijs runs as multiple instances behind a load balancer — it's per-process, so neither its
  TTL convergence nor any `delete()`-based invalidation (this finding's whole point) is coordinated
  across nodes; a mutation on one instance leaves the others silently serving a stale answer until their
  own TTL happens to expire. Resolution: `MemoryCacheManager` was **deleted entirely**.
  `Provider`'s default became a new `MockCacheManager` (`src/services/cache-manager/mock/`) whose every
  method is an inert no-op (`get()` always misses, `set()`/`delete()` do nothing) — so out of the box,
  regardless of how many instances are running, ltijs simply never caches anything, which is always
  correct. A consumer who knows their deployment is single-instance-only, or who wants real *coordinated*
  caching in a cluster, opts in by importing and constructing `RedisCacheManager` (every instance shares
  the same backing Redis, so `delete()` genuinely propagates cluster-wide) and passing it via
  `ProviderOptions.cacheManager` — mirroring exactly how `MongoLegacyDatabaseManager` is opted into,
  never defaulted to. `ProviderOptions.cacheManager` gained a doc comment explaining the no-op default,
  since (unlike the other pluggable-service fields) this default behavior is genuinely non-obvious and
  worth calling out. The tests across `OidcService`/`KeysetService`/`PlatformManager`/`Provider` that
  need a real, working cache to exercise caching/invalidation logic now use a new test-only factory,
  `buildMockCacheManager()` (`src/shared/utils/tests/mock-cache-manager.ts`), matching the established
  `buildMockDatabaseManager()`/`buildMockHttpHandler()` convention (a real in-memory implementation for
  test purposes, not a production offering). Empirically verified: temporarily degraded the test
  double's `get()` to always report a miss and confirmed the JWKS-caching and keyset-caching tests both
  failed (proving the double is genuinely load-bearing, not incidentally passing) before restoring.
  Verified: `tsc`/`eslint`/`prettier` clean, full unit gate 352/352, full DB gate 40/40.

- [x] **26. RSA key generation blocks the event loop** — **FIXED**: swapped `generateKeyPairSync` for
  the callback-based `crypto.generateKeyPair`, wrapped with `util.promisify` (offloaded to libuv's
  threadpool instead of blocking the main thread). No behavioral/output difference (same PEM encoding
  config) — no revert-verify cycle applies, since a unit test can't observe event-loop blocking
  deterministically; correctness is instead covered by the pre-existing "returns a genuinely usable
  keypair" tests, which still pass unchanged against the async path. Verified: `tsc`/`eslint`/`prettier`
  clean, `crypto/keys` suite 6/6, `services/platform-manager` suite 50/50.

- [x] **27. State-token and id-token validation run sequentially despite being independent** —
  **FIXED**: `processLaunch()` now runs both via `Promise.all([...])` instead of two sequential
  `await`s. Added a test that wraps both `OidcService` methods with call-order tracking (start/end
  events) and asserts `validateIdToken` starts before `validateStateToken` finishes -- proving genuine
  concurrency, not just "both eventually get called." Empirically verified: reverted to two sequential
  `await`s and confirmed the new test fails before restoring. Verified: `tsc`/`eslint`/`prettier` clean,
  `services/launch` suite 57/57, full `npm run test` gate exits 0.

- [x] **28. Multi-value `aud` resolves platforms via sequential DB queries instead of one batched
  query** — **FIXED**. **Design decision** (asked, see below): extended the public `PlatformFilter`/
  `PlatformSearchInput` interfaces' `clientId` field from `string` to `string | string[]` (an additive,
  non-breaking type change), updated both backing stores' query builders to use `$in` for the array
  case, and updated the in-memory test-mock `DatabaseManager` similarly. `resolveIdTokenPlatform()` now
  issues one `getPlatforms({ url, clientId: clientIds })` call and picks the first `aud`-order candidate
  with a matching record client-side, preserving the old loop's exact semantics (first registered match
  wins, even if inactive -- never falls through to a later candidate that happens to be active).
  **Notable empirical finding during verification**: reverting the two Mongo backing stores' explicit
  `Array.isArray(...) ? { $in: ... } : ...` branch to a plain `query.clientId = filter.clientId`
  assignment and re-running the new DB-level tests against real MongoDB (via `mongodb-memory-server`)
  showed both still passed -- MongoDB's query engine already treats a plain array value against a
  scalar field as an implicit `$in` match, confirmed by a standalone script against the same in-memory
  Mongo instance. The explicit `$in` branch was restored anyway (kept for readability -- relying on
  that implicit, lesser-known MongoDB behavior would be a worse read for a future maintainer than
  spelling it out), but it is not load-bearing for the two real backing stores; it *is* load-bearing for
  the in-memory mock `DatabaseManager` (plain JS `===` never matches a string against an array), which
  is what every unit-level multi-`aud` test in `launch.service.test.ts` actually exercises -- confirmed
  by reverting the mock's `Array.isArray` branch and seeing the pre-existing multi-`aud` unit test fail.
  Added: a "single batched query, not one per candidate" test (spy call count) and a "stops at the
  first candidate with any registered platform, even if inactive" ordering-preservation test (verified
  against both the new batched implementation and, separately, the original sequential loop, confirming
  it's a faithful behavior-equivalence guard and not a coincidence) to `launch.service.test.ts`; new
  `getPlatforms({ clientId: [...] })` DB-level tests to both `mongo-database-manager.service.dbtest.ts`
  and `mongo-legacy-database-manager.service.dbtest.ts`. Empirically verified (unit level): reverted
  `resolveIdTokenPlatform()` to the original sequential loop and confirmed the new "single batched
  query" test fails (3 calls instead of 1) before restoring. Verified: `tsc`/`eslint`/`prettier` clean,
  `services/launch` suite 59/59, full unit gate 330/330, full DB gate 40/40.

**Design decisions asked before implementing #24/#25/#28** (this tier introduced real architectural
trade-offs the earlier tiers didn't): for #24/#25's caching, chose simple TTL-only over
event-invalidated (no `PlatformManager` coupling, accepts a bounded staleness window that self-heals).
For #28, chose to extend the public `PlatformFilter.clientId` type rather than leave the sequential loop
in place, accepting that a third-party `DatabaseManager` implementation ignoring the array case would
silently under-filter (a disclosed, additive-not-breaking risk).

---

## Post-Tier-7 — Additional findings raised directly by the user

- [x] **`MongoLegacyDatabaseManager` and `RedisCacheManager` were completely unreachable by any package
  consumer** — **FIXED**. Both are "opt-in, explicitly imported and constructed" implementations (never
  auto-constructed by `Provider`, unlike `MongoDatabaseManager`/`FetchRequestHandler`/`ExpressHttpHandler`/
  `MockCacheManager`), so the *only* way a consumer can ever use one is to import the class directly. But
  neither was exported from `src/index.ts`, and `package.json`'s `"exports"` field lists only `"."` →
  `dist/index.js` — under Node's package-exports semantics, that blocks *any* deep import
  (`ltijs/dist/services/...`) from outside the package entirely, and the `#services/*`/`#utils/*`/
  `#shared/*` subpath imports these files themselves use are private to the package (unresolvable by an
  external consumer regardless). So both classes were 100% dead code from any consumer's perspective —
  not a style gap, a real reachability bug. Fixed by adding real (non-type-only) exports for both classes
  plus their config types to `src/index.ts`, under a new "Opt-in, non-default implementations" section:
  `MongoLegacyDatabaseManager` + `MongoConnectionConfig` (aliased to `MongoLegacyConnectionConfig` on
  export, since mongo-legacy's own config type happens to share its name with the already-exported
  `mongo/`-folder one) and `RedisCacheManager` + `RedisConnectionConfig`. Empirically verified end-to-end
  via `npm run build` + `npm pack` + install into an isolated scratch consumer project: a TypeScript
  consumer script importing and constructing both classes through the packaged `dist/index.js` failed to
  type-check with exactly the four expected "no exported member" errors when the export lines were
  reverted, then passed cleanly (and ran successfully at runtime, constructing real instances) once
  restored. Verified: `tsc`/`eslint`/`prettier` clean, full unit gate 352/352.
