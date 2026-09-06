import type { z } from 'zod'
import type { AccessTokenSchema } from '#services/access-token-manager/access-token-manager.schemas'

export type AccessToken = z.infer<typeof AccessTokenSchema>
