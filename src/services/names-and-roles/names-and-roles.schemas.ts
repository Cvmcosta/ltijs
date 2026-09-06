import { z } from 'zod'

// Field names mirror the raw NRPS wire format (snake_case) verbatim rather than
// normalizing to camelCase, since ltijs passes platform responses through to
// consumers largely unmodified. `.loose()` tolerates vendor-specific extra
// fields real-world platforms (Moodle/Canvas/Brightspace/...) routinely send.
export const MembershipSchema = z
  .object({
    status: z.string().optional(),
    name: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    email: z.string().optional(),
    user_id: z.string(),
    roles: z.array(z.string()),
    lis_person_sourcedid: z.string().optional(),
  })
  .loose()

export const MembershipContainerSchema = z
  .object({
    id: z.string().optional(),
    context: z
      .object({
        id: z.string(),
        label: z.string().optional(),
        title: z.string().optional(),
      })
      .optional(),
    members: z.array(MembershipSchema),
  })
  .loose()

export const GetMembersOptionsSchema = z
  .object({
    role: z.string().optional(),
    limit: z.number().optional(),
    pages: z.union([z.number(), z.literal(false)]).optional(),
    url: z.string().optional(),
    resourceLinkId: z.union([z.boolean(), z.string()]).optional(),
  })
  .optional()
