import type { LtiMessageType } from '#services/launch/id-token.constants'

export interface IdTokenUser {
  readonly id: string
  readonly name?: string
  readonly email?: string
  readonly givenName?: string
  readonly familyName?: string
  readonly roles: readonly string[]
  readonly roleScopeMentor?: readonly string[]
}

export interface IdTokenPlatform {
  readonly id: string
  readonly url: string
  readonly clientId: string
  readonly deploymentId: string
  readonly name?: string
  readonly description?: string
  readonly guid?: string
  readonly contactEmail?: string
  readonly version?: string
  readonly productFamilyCode?: string
  readonly lis?: Record<string, unknown>
}

export interface IdTokenLaunchPresentation {
  readonly documentTarget?: string
  readonly width?: number
  readonly height?: number
  readonly returnUrl?: string
  readonly locale?: string
}

export interface IdTokenLaunch {
  readonly type: LtiMessageType
  readonly target?: string
  readonly context?: Record<string, unknown>
  readonly resource?: Record<string, unknown>
  readonly custom?: Record<string, unknown>
  readonly presentation?: IdTokenLaunchPresentation
}

export interface IdTokenNamesAndRolesService {
  readonly available: boolean
}

export interface IdTokenAssignmentAndGradesService {
  readonly available: boolean
  readonly lineItemId?: string
  readonly scopes?: readonly string[]
}

export interface IdTokenDeepLinkingService {
  readonly available: boolean
  readonly acceptTypes?: readonly string[]
  readonly acceptMediaTypes?: readonly string[]
  readonly acceptPresentationDocumentTargets?: readonly string[]
  readonly acceptMultiple?: boolean
  readonly autoCreate?: boolean
  readonly title?: string
  readonly text?: string
  readonly data?: string
  readonly deepLinkReturnUrl?: string
}

export interface IdTokenServices {
  readonly namesAndRoles: IdTokenNamesAndRolesService
  readonly assignmentAndGrades: IdTokenAssignmentAndGradesService
  readonly deepLinking: IdTokenDeepLinkingService
}

export interface IdToken {
  readonly id: string
  readonly ltiVersion: string
  readonly user: IdTokenUser
  readonly platform: IdTokenPlatform
  readonly launch: IdTokenLaunch
  readonly services: IdTokenServices
}

export interface LegacyIdTokenResource {
  readonly id: string
  readonly title?: string
  readonly description?: string
  readonly [claim: string]: unknown
}

export interface LegacyIdTokenNamesRoles {
  readonly context_memberships_url: string
  readonly service_versions?: readonly string[]
  readonly [claim: string]: unknown
}

export interface LegacyIdTokenPlatformContext {
  readonly contextId?: string
  readonly resource?: LegacyIdTokenResource
  readonly namesRoles?: LegacyIdTokenNamesRoles
  readonly [claim: string]: unknown
}

export interface LegacyIdToken {
  readonly iss: string
  readonly user?: string
  readonly clientId: string
  readonly deploymentId?: string
  readonly platformContext?: LegacyIdTokenPlatformContext
  readonly [claim: string]: unknown
}
