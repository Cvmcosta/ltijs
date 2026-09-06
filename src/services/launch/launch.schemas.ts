import { z } from 'zod'

// An OIDC login-initiation request uses the spec's own snake_case query/body
// param names -- required fields (`iss`/`login_hint`/`target_link_uri`) are
// checked directly on those raw names, then `.transform()` reshapes the
// already-valid result into `LoginRequestParams`'s camelCase fields. This is
// the one place external input for this boundary is validated, so it
// validates on the structure that input actually has, not a structure it
// doesn't (there's no reason to route a raw snake_case request through a
// schema shaped for the internal camelCase DTO).
export const LoginRequestPayloadSchema = z
  .object({
    iss: z.string().min(1),
    login_hint: z.string().min(1),
    target_link_uri: z.string().min(1),
    client_id: z.string().optional(),
    lti_message_hint: z.string().optional(),
    lti_deployment_id: z.string().optional(),
  })
  .transform(raw => ({
    iss: raw.iss,
    loginHint: raw.login_hint,
    targetLinkUri: raw.target_link_uri,
    clientId: raw.client_id,
    ltiMessageHint: raw.lti_message_hint,
    ltiDeploymentId: raw.lti_deployment_id,
  }))

// The launch callback is the platform's `response_mode=form_post` submission
// -- `id_token`/`state` are the two fields the OIDC/LTI spec itself defines
// for it, both required. Reshapes to `rawIdToken`/`state`, matching this
// port's own naming (`id_token` is reserved for the raw JWT string, `rawIdToken`
// distinguishes it from the formatted `IdToken` type elsewhere in this port).
export const LaunchCallbackPayloadSchema = z
  .object({
    id_token: z.string().min(1),
    state: z.string().min(1),
  })
  .transform(raw => ({
    rawIdToken: raw.id_token,
    stateToken: raw.state,
  }))
