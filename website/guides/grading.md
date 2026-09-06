# Grading (AGS)

`context.grading` implements the Assignment and Grade Services spec: creating gradable columns (line
items) and submitting scores against them. It's only available if the launch declared AGS support
(`context.idToken.services.assignmentAndGrades.available`).

See the [Grading API reference](../api/services.md#grading-ags) for the full method list, and
[Grading types](../api/services.md#grading-types) for the `LineItem`/`Score`/`Result` shapes.

## Line items

```ts
const { lineItems } = await context.grading.getLineItems()

const lineItem = await context.grading.createLineItem({
  label: 'Assignment 1',
  scoreMaximum: 100,
})

await context.grading.getLineItemById(lineItem.id)
await context.grading.updateLineItemById(lineItem.id, { ...lineItem, label: 'Assignment 1 (revised)' })
await context.grading.deleteLineItemById(lineItem.id)
```

Most launches are tied to a single line item already provisioned by the platform. For a resource-link
launch, pass `resourceLinkId: true` to scope lookups and creation to it automatically:

```ts
const { lineItems } = await context.grading.getLineItems({ resourceLinkId: true })
```

`getLineItems` also accepts `id`/`label` (exact-match filters, applied client-side after fetching),
`tag`/`resourceId` (sent to the platform as query filters), and `limit`.

## Submitting scores

```ts
await context.grading.submitScore(lineItemId, {
  scoreGiven: 85,
  scoreMaximum: 100, // omit it and ltijs fetches the line item's own max for you
  activityProgress: 'Completed',
  gradingProgress: 'FullyGraded',
})
```

`userId` defaults to the current launch's user if omitted, and `timestamp` is always set to the current
time. Both can still be overridden explicitly, for example when submitting on behalf of a different user
from a background job via `getLaunchContext`.

## Reading scores

```ts
const { scores } = await context.grading.getScores(lineItemId, { limit: 50 })
```
