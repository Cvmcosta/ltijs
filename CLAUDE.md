# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ltijs is a TypeScript-first LTI® 1.3 tool-provider library (`Provider` class): OIDC login/launch, Deep
Linking, Assignment and Grade Services, Names and Role Provisioning, Dynamic Registration, and a
pluggable JWKS keyset endpoint. v7 is a full rewrite from the old CommonJS/Babel codebase; that legacy
source has been fully removed — everything under `src/` is TypeScript, and the package published from
`dist/` is 7.0.x. v7 ships its own types (`dist/index.d.ts`, wired through `package.json`'s `exports["."]
.types` condition); the old `@types/ltijs` DefinitelyTyped package is obsolete and being phased out
upstream. Never add it as a dependency, and never shape a type to match its old (pre-v7) definitions.
`TYPESCRIPT_PORT_PLAN.md` at the repo root is a detailed historical decision log for
*why* the architecture looks the way it does (every standing convention was arrived at through explicit
back-and-forth, documented round by round). Its "Standing conventions" section is still an accurate map of
the codebase's design rules; its "Current status" / "Directory structure" tables are stale (written
mid-port, before the `Provider` composition root and the `lti/` → flat `services/` layout settled) — trust
the actual source tree over those tables.

## Commands

```bash
npm run start                 # run from source (tsx, no build step) — src/index.ts
npm run check:format          # prettier --write
npm run check:lint            # eslint src
npm run check:tests:unit      # jest -c jest.config.ts (mocked HTTP, no real DB)
npm run check:tests:db        # jest -c jest.dbconfig.ts (real mongodb-memory-server, --runInBand)
npm run test                  # format + lint + unit tests + db tests, in that order
npm run build                 # clean dist/, tsc compile (tsconfig.build.json), copy html templates
```

Single test file / pattern: `npx jest -c jest.config.ts path/to/file.test.ts` (or `-t "test name"`). DB
tests follow the same shape with `jest.dbconfig.ts` and match `*.dbtest.ts` only; unit tests match
`*.test.ts` only — the two configs are deliberately kept separate rather than merged, since DB tests need
`--runInBand` and a global Mongo setup/teardown that unit tests don't.

Docs site (docsify, lives in `website/`, independent from the library's own build):
`npm run docs:install` then `npm run docs:dev`.

There is no separate `lint`/`format` auto-fix script — `check:lint`/`check:format` are the only ones, and
`lint-staged` (via Husky's pre-commit hook) already runs `eslint --fix` + `prettier --write` on staged
files on every commit.

## Releasing

Bump with `npm version X.Y.Z --no-git-tag-version` (no auto-commit/tag), run `npm run test` + `npm run
build` + `npm pack --dry-run` as a final gate, commit and push, then `git tag vX.Y.Z && git push origin
vX.Y.Z`. `npm run deploy` (test + build + `npm publish`, `deploy:beta` for the `beta` dist-tag) is the
actual publish step. Always manual, and never run it without being explicitly asked to.

## Path aliases

Imports use `#`-prefixed Node subpath imports declared once in `package.json`'s `"imports"` field (not
`tsconfig.json` `paths`, not `tsc-alias`): `#/*`, `#services/*`, `#utils/*` (→ `src/shared/utils/*`),
`#shared/*`. Each has a `development`/`default` condition pair — `development` resolves straight to
`src/**/*.ts` (used by `tsx`, `ts-jest`/Jest's `customExportConditions`, and `tsc` via
`customConditions`), `default` resolves to the compiled `dist/**/*.js` for real `node` execution with no
custom condition active. When adding a new top-level directory under `src/`, add its alias here, not to
`tsconfig.json`.

## Architecture

**`Provider` (`services/provider/provider.service.ts`) is the composition root.** Its constructor is the
one place that decides every default implementation (`MongoDatabaseManager`, `FetchRequestHandler`,
`ExpressHttpHandler`, `MockCacheManager`, `DefaultLogger`) and wires the concrete service graph together;
every other service takes its dependencies as required constructor parameters with **no default values**
— there is no shared/singleton instance of any service class exported from its module, only the class
itself. If you need to trace how a request actually flows end to end, start reading here.

The login/launch flow is deliberately stateless server-side: `state`, the recovery token, and `ltik` are
all self-verifying signed tokens checked against the shared database, never a single process's memory, so
the library works correctly under a clustered/load-balanced deployment (e.g. PM2 cluster mode) with no
sticky sessions needed. Don't introduce per-process in-memory state (a `Map`/`Set` used as a cache, dedup,
or rate limiter): it would silently break under more than one process.

**Every domain lives in its own flat folder under `services/`** (`launch/`, `oidc/`, `platform-manager/`,
`names-and-roles/`, `grading/`, `deep-linking/`, `dynamic-registration/`, `access-token-manager/`,
`database-manager/`, `request-handler/`, `http-handler/`, `cache-manager/`, `logger/`, `keyset/`,
`provider/`) — there's no `lti/` vs "infra" split despite what the port-plan doc's older rounds describe.
Within a service folder the file-suffix convention is load-bearing, not stylistic:

- `<domain>.service.ts` — the class itself (business logic only).
- `<domain>.types.ts` — every interface/type this module needs. **Types never live inline in a
  `.service.ts`/`.serializer.ts` file**, even a one-off type used by a single consumer.
- `<domain>.schemas.ts` — Zod schemas (PascalCase + `Schema` suffix), validated through the shared
  `validate<T>(schema, value)` helper (`shared/utils/validation/validation.ts`). External/untrusted input
  (HTTP params, a decoded id_token, a third-party API response) is always validated this way; data that
  already crossed a real trust boundary earlier in its lifecycle is just typed, not re-validated. Zod
  omits an absent optional field from its parsed output entirely, not even as `undefined`, so a validated
  update-style object is already a true partial. Don't re-implement per-field `if (x !== undefined)`
  copying on top of it.
- `<domain>.serializer.ts` — plain exported functions mapping one data shape into another (e.g. a raw
  `IdTokenRecord` → the public-facing `IdToken`). No class, no injected dependencies. A builder that
  returns a public-facing object (`IdToken`, `Platform`, …) wraps its return value in `deepFreeze()`
  (`shared/utils/objects/freeze.ts`).
- `errors.ts` — one `LtijsError` subclass per distinct error condition the module throws, each a no-arg
  constructor hardcoding its own fixed message. `shared/errors.ts` defines the base `LtijsError`.
- `<domain>.constants.ts` — string enums for protocol/business constants genuinely shared across files
  (e.g. LTI claim keys). A value used in only one class stays a `private readonly` class field instead.

**Pluggable cross-cutting concerns are an interface + a concrete implementation**, each implementation in
its own eponymous subfolder (mirrors `database-manager/mongo/` and `database-manager/mongo-legacy/`):
`DatabaseManager` (`mongo/`, `mongo-legacy/` — a from-scratch schema vs. one wire-compatible with real
pre-v7 deployments, fully independent of each other, zero shared imports), `RequestHandler` (`fetch/`),
`HttpHandler` (`express/`), `CacheManager` (`mock/`, `redis/`), `Logger` (`default/`). A consuming service
always depends on the interface type; `Provider`'s constructor is what decides the concrete instance.

**Types are pure data, never methods.** Whenever a concept needs both data and behavior (e.g. `Platform`),
it's a plain interface in `<domain>.types.ts` plus a service (`PlatformManager`) that operates on it — not
a rich object with its own methods.

**`shared/utils/` holds plain function modules only, organized into topic subfolders** (`crypto/`,
`validation/`, `request/`, `random/`, `templating/`, `objects/`, plus `tests/` for shared test doubles like
`mock-database-manager.ts`/`mock-http-handler.ts`). Any class — however small or low-level — belongs under
`services/` with a `.service.ts` suffix instead.

**Testing**: Jest, with `axios-mock-adapter`/manual mocks for HTTP in `*.test.ts` (run via
`jest.config.ts`), and real `mongodb-memory-server` integration coverage for both `DatabaseManager`
implementations in `*.dbtest.ts` (run via `jest.dbconfig.ts`) — this matters because third-party ltijs
database plugins depend on the DB layer's real runtime behavior, not just its type shape. A shared
`expectValidationErrorOnField(promise, field)` helper (`shared/utils/tests/expect-validation-error.ts`)
asserts a rejected promise threw a `ValidationError` with a given field path without triggering
`@typescript-eslint/no-unsafe-assignment` on `.rejects.toMatchObject(...)`.

## Writing style

Don't use em dashes anywhere in this repo: not the real character (—), and not a double-hyphen substitute
(` -- `) either. Both read as AI-generated writing. Use a comma, period, colon, or parenthetical instead,
in prose docs, guides, the README, and code comments alike.

Not every method needs a comment. A well-named method/variable already says what it does. Add one only
when the *why* isn't obvious from the code itself: a non-obvious constraint, a workaround for a specific
bug, a design decision someone could otherwise second-guess or "clean up" into something broken. When a
comment is warranted, keep it to a line or two. A comment that re-explains the code line by line, or reads
like a changelog entry for the change that introduced it, is a sign it shouldn't be there at all.

## TypeScript toolchain note

This repo runs TypeScript's 6.0/7.0 split side by side: the `typescript` devDependency is aliased to
`npm:@typescript/typescript6` (what `ts-jest`/`eslint-config-love`/anything needing the Compiler API
resolves), while a second devDependency, `typescript-native`, is aliased to the real `npm:typescript@^7`
package and is what `build:compile` actually invokes (`node_modules/typescript-native/bin/tsc`) for the
real build's speed. CI (`.github/workflows/ci.yml`) explicitly asserts `node_modules/typescript` resolves
to a 6.x version and `node_modules/typescript-native` to a 7.x version before running tests — don't
"simplify" this to one plain `typescript` dependency without checking whether TS 7.1 (with a public
Compiler API) has shipped yet.
