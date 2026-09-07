# Names and Roles (NRPS)

`context.namesAndRoles` implements the Names and Role Provisioning Service, for reading a course's roster.
It's only available if the launch declared NRPS support, so check `context.namesAndRoles.isAvailable()`
before calling `getMembers()`:

```ts
if (!context.namesAndRoles.isAvailable()) {
  response.status(400).json({ error: 'This launch does not support Names and Roles.' })
  return
}
```

`getMembers()` throws `MissingNamesRolesServiceUrlError` if called on a launch that didn't declare NRPS
support, so `isAvailable()` lets you handle that up front instead of catching it.

See the [Names and Roles API reference](../api/services.md#names-and-roles-nrps) for the full method
list, and [Names and Roles types](../api/services.md#names-and-roles-types) for the `Member`/
`Memberships` shapes.

```ts
const memberships = await context.namesAndRoles.getMembers()

for (const member of memberships.members) {
  member.userId
  member.name
  member.roles // e.g. ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner']
}
```

## Options

```ts
await context.namesAndRoles.getMembers({
  role: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor', // filter by role
  limit: 50, // page size
  resourceLinkId: true, // scope to the current resource link
  pages: 3, // follow up to 3 paginated pages and merge them (default: 1); pass `false` for "all pages"
})
```

Pass `url` to fetch a specific page directly, such as a `next`/`differences` link from a previous call.
`memberships.next` and `memberships.differences` carry those links forward when more pages remain than
`pages` requested.

Each `Member` is normalized to camelCase (`givenName`, `familyName`, `userId`, `lisPersonSourcedid`).
The platform's original snake_case fields are kept alongside them as `@deprecated` aliases for anyone
migrating from legacy ltijs.
