import { buildMemberships } from '#services/names-and-roles/names-and-roles.serializer'
import type { GetMembersResult, Membership } from '#services/names-and-roles/names-and-roles.types'

const buildMember = (overrides: Partial<Membership> = {}): Membership => ({
  user_id: 'user-1',
  roles: ['Learner'],
  ...overrides,
})

const buildResult = (overrides: Partial<GetMembersResult> = {}): GetMembersResult => ({
  id: 'http://localhost/moodle/members',
  context: { id: '2', label: 'course', title: 'Course' },
  members: [buildMember()],
  ...overrides,
})

describe('buildMemberships()', () => {
  it('adds camelCase fields alongside the existing deprecated snake_case ones, with matching values', () => {
    const result = buildResult({
      members: [
        buildMember({
          given_name: 'Jane',
          family_name: 'Doe',
          user_id: 'user-1',
          lis_person_sourcedid: '59254-6782-12ab',
        }),
      ],
    })

    const memberships = buildMemberships(result)

    expect(memberships.members[0]).toMatchObject({
      givenName: 'Jane',
      given_name: 'Jane',
      familyName: 'Doe',
      family_name: 'Doe',
      userId: 'user-1',
      user_id: 'user-1',
      lisPersonSourcedid: '59254-6782-12ab',
      lis_person_sourcedid: '59254-6782-12ab',
    })
  })

  it('preserves top-level fields, including next/differences', () => {
    const result = buildResult({
      next: 'http://localhost/moodle/members?page=2',
      differences: 'http://localhost/moodle/differences',
    })

    const memberships = buildMemberships(result)

    expect(memberships).toMatchObject({
      id: result.id,
      context: result.context,
      next: 'http://localhost/moodle/members?page=2',
      differences: 'http://localhost/moodle/differences',
    })
  })

  it('preserves unknown vendor-specific extra fields on a member', () => {
    const result = buildResult({ members: [buildMember({ vendor_extra_field: 'custom-value' })] })

    const memberships = buildMemberships(result)

    expect(memberships.members[0]).toMatchObject({ vendor_extra_field: 'custom-value' })
  })

  it('freezes the returned object and its nested members', () => {
    const memberships = buildMemberships(buildResult())

    expect(Object.isFrozen(memberships)).toBe(true)
    expect(Object.isFrozen(memberships.members)).toBe(true)
    expect(Object.isFrozen(memberships.members[0])).toBe(true)
  })
})
