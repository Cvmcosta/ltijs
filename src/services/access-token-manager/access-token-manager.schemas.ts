import { z } from 'zod'

export const AccessTokenSchema = z
  .object({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.number(),
    scope: z.string().optional(),
  })
  .loose()
