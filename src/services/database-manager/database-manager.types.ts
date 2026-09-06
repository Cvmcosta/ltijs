import type { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import type { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'

// Platform
export interface IdTokenValidation {
  method: IdTokenValidationMethod
  key: string
}

export interface PlatformKeys {
  public: string
  private: string
}

/** The persisted fields for a platform, excluding its `id` (assigned by `savePlatform`). */
export interface PlatformAttributes {
  url: string
  clientId: string
  name: string
  authenticationEndpoint: string
  accessTokenEndpoint: string
  authorizationServer?: string
  idTokenValidation: IdTokenValidation
  active: boolean
  keys: PlatformKeys
}

/** A stored platform as returned by `DatabaseManager`'s read methods -- `PlatformAttributes` plus its assigned `id`. */
export interface PlatformRecord extends PlatformAttributes {
  id: string
}

export interface PlatformFilter {
  url?: string
  name?: string
  // Array-valued for spec-permitted multi-value `aud` id_token claims -- lets a caller resolve every
  // candidate clientId in one query (an `$in`-style match) instead of one query per candidate.
  clientId?: string | string[]
}

// Access Token
/** A cached platform-issued OAuth2 access token (client-credentials grant), keyed by `platformUrl`+`clientId`+`scopes`. */
export interface AccessTokenRecord {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
  createdAt: number
}

// ID Token
export interface ToolPlatformClaim {
  name?: string
  description?: string
  guid?: string
  contact_email?: string
  version?: string
  product_family_code?: string
  [claim: string]: unknown
}

export interface LaunchPresentationClaim {
  document_target?: string
  width?: number
  height?: number
  return_url?: string
  locale?: string
  [claim: string]: unknown
}

export interface DeepLinkingSettingsClaim {
  accept_types?: string[]
  accept_media_types?: string[]
  accept_presentation_document_targets?: string[]
  accept_multiple?: boolean
  auto_create?: boolean
  title?: string
  text?: string
  data?: string
  deep_link_return_url?: string
  [claim: string]: unknown
}

export interface AssignmentAndGradesClaim {
  scope?: string[]
  lineitem?: string
  lineitems?: string
  [claim: string]: unknown
}

export interface ContextClaim {
  id?: string
  label?: string
  title?: string
  type?: string[]
  [claim: string]: unknown
}

export interface ResourceLinkClaim {
  id?: string
  title?: string
  description?: string
  [claim: string]: unknown
}

export interface NamesRoleServiceClaim {
  context_memberships_url?: string
  service_versions?: string[]
  [claim: string]: unknown
}

export interface ForUserClaim {
  user_id?: string
  [claim: string]: unknown
}

/** The raw, validated claims of an LTI 1.3 id_token, keyed by their spec-defined claim URIs/names (see `IdTokenClaim`). */
export interface IdTokenClaims {
  [IdTokenClaim.Iss]: string
  [IdTokenClaim.Sub]: string
  [IdTokenClaim.Aud]?: string | string[]
  [IdTokenClaim.Azp]?: string
  [IdTokenClaim.Exp]?: number
  [IdTokenClaim.Iat]?: number
  [IdTokenClaim.Nonce]?: string
  [IdTokenClaim.GivenName]?: string
  [IdTokenClaim.FamilyName]?: string
  [IdTokenClaim.Name]?: string
  [IdTokenClaim.Email]?: string
  [IdTokenClaim.ClientId]: string
  [IdTokenClaim.PlatformId]: string
  [IdTokenClaim.DeploymentId]: string
  [IdTokenClaim.MessageType]: LtiMessageType
  [IdTokenClaim.Version]: string
  [IdTokenClaim.Roles]: string[]
  [IdTokenClaim.RoleScopeMentor]?: string[]
  [IdTokenClaim.TargetLinkUri]?: string
  [IdTokenClaim.ToolPlatform]?: ToolPlatformClaim
  [IdTokenClaim.Context]?: ContextClaim
  [IdTokenClaim.ResourceLink]?: ResourceLinkClaim
  [IdTokenClaim.LaunchPresentation]?: LaunchPresentationClaim
  [IdTokenClaim.Custom]?: Record<string, unknown>
  [IdTokenClaim.Lis]?: Record<string, unknown>
  [IdTokenClaim.ForUser]?: ForUserClaim
  [IdTokenClaim.Endpoint]?: AssignmentAndGradesClaim
  [IdTokenClaim.NamesRoleService]?: NamesRoleServiceClaim
  [IdTokenClaim.DeepLinkingSettings]?: DeepLinkingSettingsClaim
  [claim: string]: unknown
}

/** A stored id_token as returned by `getIdToken` -- `IdTokenClaims` plus the record's own `id`. */
export interface IdTokenRecord extends IdTokenClaims {
  id: string
}

/**
 * The pluggable storage contract `Provider` reads/writes platforms, access tokens, id tokens, and OIDC
 * nonces through. The default implementation is `MongoDatabaseManager`; implement this interface directly
 * to back ltijs with anything else (a different database, an ORM, a remote service), and pass it via
 * `ProviderOptions.databaseManager`.
 */
export interface DatabaseManager {
  setup: () => Promise<void>
  close: () => Promise<void>

  // Platform
  getPlatforms: (filter?: PlatformFilter) => Promise<PlatformRecord[]>
  getPlatformById: (id: string) => Promise<PlatformRecord | undefined>
  getPlatformByUrlAndClientId: (url: string, clientId: string) => Promise<PlatformRecord | undefined>
  savePlatform: (platform: PlatformAttributes) => Promise<string>
  updatePlatformById: (id: string, fields: Partial<PlatformAttributes>) => Promise<void>
  deletePlatformById: (id: string) => Promise<void>

  // Access token
  getAccessToken: (platformUrl: string, clientId: string, scopes: string) => Promise<AccessTokenRecord | undefined>
  saveAccessToken: (platformUrl: string, clientId: string, scopes: string, token: AccessTokenRecord) => Promise<string>

  // ID Token
  getIdToken: (id: string) => Promise<IdTokenRecord | undefined>
  saveIdToken: (token: IdTokenClaims) => Promise<string>

  // Nonce -- OIDC replay protection: saveNonce persists a freshly-issued nonce, consumeNonce atomically
  // checks-and-deletes it (returning false if it was already consumed or never existed).
  saveNonce: (nonce: string) => Promise<string>
  consumeNonce: (nonce: string) => Promise<boolean>
}
