import type { z } from 'zod'
import type {
  GetMembersOptionsSchema,
  MembershipContainerSchema,
  MembershipSchema,
} from '#services/names-and-roles/names-and-roles.schemas'

export type Membership = z.infer<typeof MembershipSchema>
export type MembershipContainer = z.infer<typeof MembershipContainerSchema>
export type GetMembersOptions = z.infer<typeof GetMembersOptionsSchema>

export type GetMembersResult = MembershipContainer & { next?: string; differences?: string }

export type Member = Omit<Membership, 'given_name' | 'family_name' | 'user_id' | 'lis_person_sourcedid'> & {
  givenName?: string
  familyName?: string
  userId: string
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

export type Memberships = Omit<GetMembersResult, 'members'> & { members: readonly Member[] }

export interface MembershipsRequest {
  pageUrl: string
  query: URLSearchParams
}

export interface MembershipsPage {
  memberships: MembershipContainer
  next: string | undefined
  differences: string | undefined
}
