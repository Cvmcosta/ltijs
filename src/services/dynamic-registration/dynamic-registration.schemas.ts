import { z } from 'zod'

export const OpenIDConfigurationSchema = z
  .object({
    issuer: z.string(),
    authorization_endpoint: z.string(),
    token_endpoint: z.string(),
    registration_endpoint: z.string(),
    jwks_uri: z.string(),
    claims_supported: z.array(z.string()).optional(),
    authorization_server: z.string().optional(),
  })
  .loose()

export const RegistrationResponseSchema = z
  .object({
    client_id: z.string(),
  })
  .loose()
