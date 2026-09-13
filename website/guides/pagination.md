# Pagination

Grading and Names and Roles can both return more results than fit in a single response. A platform
signals this the same way for both: an HTTP `Link` header on its response, which ltijs parses into plain
URL fields on the result you get back, rather than an opaque cursor or page number. Continuing means
handing that URL back to the same method, nothing more.

## Fetching the next page yourself

`getLineItems`/`getScores` (Grading) and `getMembers` (Names and Roles, when not using `pages`, see below)
all follow the same shape: the result carries a `next` field when more pages exist.

```ts
let page = await context.grading.getLineItems({ limit: 50 })
const lineItems = [...page.lineItems]

while (page.next !== undefined) {
  page = await context.grading.getLineItems({ url: page.next })
  lineItems.push(...page.lineItems)
}
```

Once you have a `next` URL, pass it as `url` and nothing else, any other option (`limit`, `resourceLinkId`,
filters) is ignored when `url` is set, since the platform's own URL already encodes the page you asked for.
The same pattern applies to `getScores`:

```ts
let page = await context.grading.getScores(lineItemId, { limit: 50 })
const scores = [...page.scores]

while (page.next !== undefined) {
  page = await context.grading.getScores(lineItemId, { url: page.next })
  scores.push(...page.scores)
}
```

Grading's line-item results can also carry `prev`, `first`, and `last`, the same way, for a platform that
supports jumping around rather than only stepping forward.

## Letting Names and Roles fetch multiple pages for you

`getMembers` has a shortcut the other services don't: pass `pages` and it follows `next` internally,
merging every page into one `members` array before returning.

```ts
// Follow up to 3 pages and merge them
const { members } = await context.namesAndRoles.getMembers({ pages: 3 })

// Follow every page there is
const { members } = await context.namesAndRoles.getMembers({ pages: false })
```

If you bound it with a number and more pages remain beyond what you asked for, the result still carries
`next`, so you can keep going manually from there with `{ url: members.next }`, the same as any other
paginated call.

## Names and Roles' `differences` field

`getMembers`'s result can also carry a `differences` link, a separate concept from pagination: it's a URL
the platform gives you for fetching only roster *changes* since your last call, not another page of the
same roster. Pass it as `url` the same way (`getMembers({ url: memberships.differences })`) when you want
an incremental update instead of the full membership list again. See
[Names and Roles](names-and-roles.md) for the full option list.

## Which pattern to reach for

Loop manually when you want to process pages as they arrive, streaming results to a client, stopping
early once you've found what you need, or keeping memory bounded. Reach for `getMembers`'s `pages` option
when you just want the whole roster in one call and don't mind waiting for every page up front.

See [Grading](grading.md) and [Names and Roles](names-and-roles.md) for each service's full method list,
and the [Services API reference](../api/services.md) for the exact `PaginatedLinks`/result shapes.
