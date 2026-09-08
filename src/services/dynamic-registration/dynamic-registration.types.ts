import type { z } from 'zod'
import type {
  DynamicRegistrationQuerySchema,
  RegistrationResponseSchema,
} from '#services/dynamic-registration/dynamic-registration.schemas'

// Hand-written rather than `z.infer`'d, purely so `claims_supported` can be
// typed `readonly string[]`, matching what `deepFreeze()` actually produces
// in `dynamic-registration.serializer.ts`. Deriving it via `z.infer` +
// `Omit` instead silently degrades every other property to `unknown`, since
// `OpenIDConfigurationSchema`'s `.loose()` catchall makes `keyof` resolve to
// a bare `string`, which `Omit` can't narrow back down.
export interface OpenIDConfiguration {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  registration_endpoint: string
  jwks_uri: string
  claims_supported?: readonly string[]
  authorization_server?: string
  [claim: string]: unknown
}

export type RegistrationResponse = z.infer<typeof RegistrationResponseSchema>
export type DynamicRegistrationQuery = z.infer<typeof DynamicRegistrationQuerySchema>

export interface DynamicRegistrationMessageOptions {
  targetLinkUri?: string
  label?: string
  iconUri?: string
  customParameters?: Record<string, string>
  placements?: string[]
}

export interface DynamicRegistrationOptions {
  name: string
  url: string
  redirectUris?: string[]
  customParameters?: Record<string, string>
  autoActivate?: boolean
  useDeepLinking?: boolean
  logo?: string
  description?: string
  resourceLinkMessage?: DynamicRegistrationMessageOptions
  deepLinkingMessage?: DynamicRegistrationMessageOptions
  /** Overrides the auto-generated `<platform>_DynReg_<random>` name given to the newly registered platform record. */
  platformName?: string
}

export interface DynamicRegistrationRoutes {
  appRoute: string
  loginRoute: string
  keysetRoute: string
}

export type RegistrationOverrides = Partial<DynamicRegistrationOptions>
