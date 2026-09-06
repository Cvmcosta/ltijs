import { z } from 'zod'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import { LTI_VERSION } from '#services/oidc/oidc.constants'

export const JwksResponseSchema = z
  .object({
    keys: z.array(z.record(z.string(), z.unknown())),
  })
  .loose()

const CommonClaims = {
  [IdTokenClaim.Version]: z.literal(LTI_VERSION),
  [IdTokenClaim.DeploymentId]: z.string(),
  [IdTokenClaim.Roles]: z.array(z.string()),
  [IdTokenClaim.Iss]: z.string().min(1),
  [IdTokenClaim.Sub]: z.string().min(1),
  [IdTokenClaim.Aud]: z.union([z.string(), z.array(z.string())]),
  [IdTokenClaim.Azp]: z.string().optional(),
  [IdTokenClaim.Iat]: z.number(),
  [IdTokenClaim.Exp]: z.number(),
  [IdTokenClaim.Nonce]: z.string().min(1),
}

export const ResourceLinkRequestSchema = z
  .object({
    ...CommonClaims,
    [IdTokenClaim.MessageType]: z.literal(LtiMessageType.ResourceLinkRequest),
    [IdTokenClaim.TargetLinkUri]: z.string(),
    [IdTokenClaim.ResourceLink]: z.object({ id: z.string() }).loose(),
  })
  .loose()

export const DeepLinkingRequestSchema = z
  .object({
    ...CommonClaims,
    [IdTokenClaim.MessageType]: z.literal(LtiMessageType.DeepLinkingRequest),
  })
  .loose()

export const SubmissionReviewRequestSchema = z
  .object({
    ...CommonClaims,
    [IdTokenClaim.MessageType]: z.literal(LtiMessageType.SubmissionReviewRequest),
    [IdTokenClaim.TargetLinkUri]: z.string(),
    [IdTokenClaim.ForUser]: z.object({ user_id: z.string() }).loose(),
    [IdTokenClaim.Endpoint]: z.unknown().refine(value => value !== undefined, { message: 'Required' }),
  })
  .loose()
