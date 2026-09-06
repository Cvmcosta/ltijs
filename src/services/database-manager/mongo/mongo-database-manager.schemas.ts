import { z } from 'zod'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'

export const IdTokenValidationSchema = z.object({
  method: z.enum(IdTokenValidationMethod),
  key: z.string(),
})

export const PlatformKeysSchema = z.object({
  public: z.string(),
  private: z.string(),
})

export const PlatformRecordSchema = z.object({
  id: z.string(),
  url: z.string(),
  clientId: z.string(),
  name: z.string(),
  authenticationEndpoint: z.string(),
  accessTokenEndpoint: z.string(),
  authorizationServer: z.string().optional(),
  idTokenValidation: IdTokenValidationSchema,
  active: z.boolean(),
  keys: PlatformKeysSchema,
})

export const AccessTokenRecordSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.string().optional(),
  createdAt: z.number(),
})

export const IdTokenRecordSchema = z
  .object({
    id: z.string(),
    [IdTokenClaim.Iss]: z.string(),
    [IdTokenClaim.Sub]: z.string(),
    [IdTokenClaim.Aud]: z.union([z.string(), z.array(z.string())]).optional(),
    [IdTokenClaim.Azp]: z.string().optional(),
    [IdTokenClaim.Exp]: z.number().optional(),
    [IdTokenClaim.Iat]: z.number().optional(),
    [IdTokenClaim.Nonce]: z.string().optional(),
    [IdTokenClaim.GivenName]: z.string().optional(),
    [IdTokenClaim.FamilyName]: z.string().optional(),
    [IdTokenClaim.Name]: z.string().optional(),
    [IdTokenClaim.Email]: z.string().optional(),
    [IdTokenClaim.ClientId]: z.string(),
    [IdTokenClaim.PlatformId]: z.string(),
    [IdTokenClaim.DeploymentId]: z.string(),
    [IdTokenClaim.MessageType]: z.enum(LtiMessageType),
    [IdTokenClaim.Version]: z.string(),
    [IdTokenClaim.Roles]: z.array(z.string()),
    [IdTokenClaim.TargetLinkUri]: z.string().optional(),
  })
  // Platforms/tools may attach further custom claims beyond the ones validated above.
  .loose()
