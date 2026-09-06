import { z } from 'zod'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'

export const IdTokenValidationInputSchema = z.object({
  method: z.enum(IdTokenValidationMethod),
  key: z.string().min(1),
})

export const PlatformRegistrationInputSchema = z.object({
  url: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
  authenticationEndpoint: z.string().min(1),
  accessTokenEndpoint: z.string().min(1),
  authorizationServer: z.string().min(1).optional(),
  idTokenValidation: IdTokenValidationInputSchema,
})

export const PlatformUpdateInputSchema = PlatformRegistrationInputSchema.partial().extend({
  active: z.boolean().optional(),
  idTokenValidation: IdTokenValidationInputSchema.partial().optional(),
})

export const PlatformSearchInputSchema = z.object({
  url: z.string().optional(),
  name: z.string().optional(),
  clientId: z.union([z.string(), z.array(z.string())]).optional(),
})
