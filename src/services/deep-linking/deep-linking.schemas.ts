import { z } from 'zod'

export const ContentItemSchema = z
  .object({
    type: z.string(),
  })
  .loose()

export const DeepLinkingOptionsSchema = z.object({
  message: z.string().optional(),
  errMessage: z.string().optional(),
  errmessage: z.string().optional(),
  log: z.string().optional(),
  errLog: z.string().optional(),
  errlog: z.string().optional(),
})

// Accepts a single content item or an array of them (matching legacy's
// caller-facing flexibility) and normalizes to an array -- rejects
// `undefined`/malformed input the same way any other `validate()` call does,
// replacing both the old missing-content-items guard and manual array
// normalization in one step.
export const ContentItemsInputSchema = z
  .union([ContentItemSchema, z.array(ContentItemSchema)])
  .transform(value => (Array.isArray(value) ? value : [value]))
