import type { z } from 'zod'
import type {
  PlatformRegistrationInputSchema,
  PlatformSearchInputSchema,
  PlatformUpdateInputSchema,
} from '#services/platform-manager/platform-manager.schemas'
import type { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'

export interface IdTokenValidation {
  readonly method: IdTokenValidationMethod
  readonly key: string
}

export interface PlatformKeys {
  readonly public: string
  readonly private: string
}

export interface Platform {
  readonly id: string
  readonly url: string
  readonly clientId: string
  readonly name: string
  readonly authenticationEndpoint: string
  readonly accessTokenEndpoint: string
  readonly authorizationServer: string
  readonly idTokenValidation: IdTokenValidation
  readonly active: boolean
  readonly keys: PlatformKeys
  /**
   * @deprecated Use keys.public field instead
   */
  readonly publicKey: string
  /**
   * @deprecated Use keys.private field instead
   */
  readonly privateKey: string
  /**
   * @deprecated Use idTokenValidation field instead
   */
  readonly authConfig: IdTokenValidation
  /**
   * @deprecated Use accessTokenEndpoint field instead
   */
  readonly accesstokenEndpoint: string
}

export interface GeneratedKeyPair {
  public: string
  private: string
}

export type PlatformRegistrationInput = z.infer<typeof PlatformRegistrationInputSchema>

export type PlatformUpdateInput = z.infer<typeof PlatformUpdateInputSchema>

export type PlatformSearchInput = z.infer<typeof PlatformSearchInputSchema>
