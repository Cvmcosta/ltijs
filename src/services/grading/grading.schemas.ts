import { z } from 'zod'

// Field names mirror the AGS wire format verbatim -- unlike Names and Roles
// (OIDC-flavored snake_case), AGS object fields are already camelCase on the
// wire in both directions; only query-string parameter keys are snake_case.
// `.loose()` tolerates vendor-specific extra fields.
export const LineItemSchema = z
  .object({
    id: z.string().optional(),
    label: z.string(),
    scoreMaximum: z.number(),
    resourceId: z.string().optional(),
    resourceLinkId: z.string().optional(),
    tag: z.string().optional(),
    startDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
  })
  .loose()

export const ScoreSchema = z
  .object({
    userId: z.string().optional(),
    scoreGiven: z.number().optional(),
    scoreMaximum: z.number().optional(),
    comment: z.string().optional(),
    activityProgress: z.string().optional(),
    gradingProgress: z.string().optional(),
    timestamp: z.string().optional(),
  })
  .loose()

export const GetLineItemsOptionsSchema = z.object({
  resourceLinkId: z.boolean().optional(),
  resourceId: z.string().optional(),
  tag: z.string().optional(),
  limit: z.number().optional(),
  id: z.string().optional(),
  label: z.string().optional(),
  url: z.string().optional(),
})

export const GetScoresOptionsSchema = z.object({
  userId: z.string().optional(),
  limit: z.number().optional(),
  url: z.string().optional(),
})

export const ResultSchema = z
  .object({
    userId: z.string().optional(),
    resultScore: z.number().optional(),
    resultMaximum: z.number().optional(),
    comment: z.string().optional(),
    scoreOf: z.string().optional(),
  })
  .loose()

export const LineItemsListSchema = z.array(LineItemSchema)

export const ResultsListSchema = z.array(ResultSchema)

export const LineItemIdSchema = z.string().min(1)
