# Services

## Grading (AGS)

`context.grading`. Implements the Assignment and Grade Services spec. See [Grading](/guides/grading.md).

```ts
class Grading {
  getLineItems(options?: GetLineItemsOptions): Promise<GetLineItemsResult>
  createLineItem(lineItem: LineItem, options?: GetLineItemsOptions): Promise<LineItem>
  getLineItemById(lineItemId: string): Promise<LineItem>
  updateLineItemById(lineItemId: string, lineItem: LineItem): Promise<LineItem>
  deleteLineItemById(lineItemId: string): Promise<boolean>
  submitScore(lineItemId: string, score: Score): Promise<Score>
  getScores(lineItemId: string, options?: GetScoresOptions): Promise<GetScoresResult>
}
```

Throws `MissingLineItemsEndpointError` if called on a launch that didn't declare AGS support.

### Grading types

```ts
/** An AGS line item (a gradable column) as read from or written to the platform's Line Item service. */
interface LineItem {
  id?: string
  label: string
  scoreMaximum: number
  resourceId?: string
  resourceLinkId?: string
  tag?: string
  startDateTime?: string
  endDateTime?: string
}

/** A score submission for a single learner on a line item, posted via Grading.submitScore. */
interface Score {
  userId?: string
  scoreGiven?: number
  scoreMaximum?: number
  comment?: string
  activityProgress?: string
  gradingProgress?: string
  timestamp?: string
}

/** A previously-submitted result for a single learner, as returned by Grading.getScores. */
interface Result {
  userId?: string
  resultScore?: number
  resultMaximum?: number
  comment?: string
  scoreOf?: string
}

interface GetLineItemsOptions {
  resourceLinkId?: boolean
  resourceId?: string
  tag?: string
  limit?: number
  id?: string
  label?: string
  url?: string
}

interface GetScoresOptions {
  userId?: string
  limit?: number
  url?: string
}

/** RFC 8288 pagination links, as returned by the platform's Link response header. */
interface PaginatedLinks {
  next?: string
  prev?: string
  first?: string
  last?: string
}

type GetLineItemsResult = PaginatedLinks & { lineItems: readonly LineItem[] }
type GetScoresResult = PaginatedLinks & { scores: readonly Result[] }
```

## Deep Linking

`context.deepLinking`. See [Deep Linking](/guides/deep-linking.md).

```ts
class DeepLinking {
  createDeepLinkingMessage(contentItems: ContentItemsInput, options?: DeepLinkingOptions): Promise<string>
  createDeepLinkingForm(contentItems: ContentItemsInput, options?: DeepLinkingOptions): Promise<string>
}
```

`createDeepLinkingMessage` returns just the signed JWT; `createDeepLinkingForm` wraps it in a full
auto-submitting HTML form. Both throw `MissingDeepLinkSettingsError` if called on a non-deep-linking
launch.

### Deep Linking types

```ts
/** A single deep-linked resource (link, file, HTML fragment, LTI resource link, or image) being returned to the platform. */
type ContentItem = { type: string } & Record<string, unknown>

/** The contentItems argument to createDeepLinkingMessage/createDeepLinkingForm. */
type ContentItemsInput = ContentItem | ContentItem[]

/** Options controlling the generated deep-linking response JWT. */
interface DeepLinkingOptions {
  message?: string
  errMessage?: string
  log?: string
  errLog?: string
}
```

## Names and Roles (NRPS)

`context.namesAndRoles`. See [Names and Roles](/guides/names-and-roles.md).

```ts
class NamesAndRoles {
  getMembers(options?: GetMembersOptions): Promise<Memberships>
}
```

Throws `MissingNamesRolesServiceUrlError` if called on a launch that didn't declare NRPS support.

### Names and Roles types

```ts
interface GetMembersOptions {
  role?: string
  limit?: number
  pages?: number | false
  url?: string
  resourceLinkId?: boolean | string
}

type Member = {
  status?: string
  name?: string
  email?: string
  userId: string
  roles: string[]
  givenName?: string
  familyName?: string
  lisPersonSourcedid?: string

  /** @deprecated Use givenName field instead */
  given_name?: string
  /** @deprecated Use familyName field instead */
  family_name?: string
  /** @deprecated Use userId field instead */
  user_id: string
  /** @deprecated Use lisPersonSourcedid field instead */
  lis_person_sourcedid?: string
}

interface Memberships {
  id?: string
  context?: { id: string; label?: string; title?: string }
  members: readonly Member[]
  next?: string
  differences?: string
}
```

## Dynamic Registration

`Provider.dynamicRegistrationService`, only set when `ProviderOptions.dynamicRegistration` is provided.
See [Registering Platforms](/guides/registering-platforms.md#dynamic-registration).

```ts
interface DynamicRegistrationOptions {
  name: string
  url: string
  redirectUris?: string[]
  customParameters?: Record<string, string>
  autoActivate?: boolean
  useDeepLinking?: boolean
  logo?: string
  description?: string
  resourceLinkMessage?: DynamicRegistrationMessageOptions
  deepLinkingMessage?: DynamicRegistrationMessageOptions
  /** Overrides the auto-generated `<platform>_DynReg_<random>` name given to the newly registered platform record. */
  platformName?: string
}

interface DynamicRegistrationMessageOptions {
  targetLinkUri?: string
  label?: string
  iconUri?: string
  customParameters?: Record<string, string>
  placements?: string[]
}

/** Takes the already-constructed DynamicRegistration instance, since it doesn't exist yet when ProviderOptions is built. */
type DynamicRegistrationHandlerFactory = (service: DynamicRegistration) => RouteHandler
```

`autoActivate` defaults to `false`: newly dynamically-registered platforms start deactivated, so they can
be reviewed before `activatePlatform()`. `useDeepLinking` defaults to `true`.
