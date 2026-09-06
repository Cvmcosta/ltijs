import { deepFreeze } from '#utils/objects/freeze'
import type { GetMembersResult, Member, Membership, Memberships } from '#services/names-and-roles/names-and-roles.types'

export function buildMemberships(result: GetMembersResult): Memberships {
  return deepFreeze({
    ...result,
    members: result.members.map(buildMember),
  })
}

function buildMember(member: Membership): Member {
  return {
    ...member,
    givenName: member.given_name,
    familyName: member.family_name,
    userId: member.user_id,
    lisPersonSourcedid: member.lis_person_sourcedid,
  }
}
