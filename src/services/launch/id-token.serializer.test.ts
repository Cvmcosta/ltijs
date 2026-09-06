import { buildIdToken, buildLegacyIdToken } from '#services/launch/id-token.serializer'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import { LTI_VERSION } from '#services/oidc/oidc.constants'
import type { IdTokenRecord } from '#services/database-manager/database-manager.types'

const buildRecord = (overrides: Partial<IdTokenRecord> = {}): IdTokenRecord => ({
  id: 'record-1',
  iss: 'http://localhost/moodle',
  sub: 'user-1',
  [IdTokenClaim.ClientId]: 'ClientId1',
  [IdTokenClaim.PlatformId]: 'kid-1',
  [IdTokenClaim.DeploymentId]: 'deployment-1',
  [IdTokenClaim.MessageType]: LtiMessageType.ResourceLinkRequest,
  [IdTokenClaim.Version]: LTI_VERSION,
  [IdTokenClaim.Roles]: ['Learner'],
  [IdTokenClaim.TargetLinkUri]: 'https://tool.example.com/launch',
  ...overrides,
})

describe('buildIdToken()', () => {
  it('maps iss/sub/clientId/deploymentId/version onto the top-level and platform fields', () => {
    const idToken = buildIdToken(buildRecord())

    expect(idToken.ltiVersion).toBe(LTI_VERSION)
    expect(idToken.platform).toMatchObject({
      id: 'kid-1',
      url: 'http://localhost/moodle',
      clientId: 'ClientId1',
      deploymentId: 'deployment-1',
    })
  })

  it('maps user fields, including roles and role_scope_mentor', () => {
    const idToken = buildIdToken(
      buildRecord({
        given_name: 'Jane',
        family_name: 'Doe',
        name: 'Jane Doe',
        email: 'jane@example.com',
        [IdTokenClaim.RoleScopeMentor]: ['mentee-1'],
      }),
    )

    expect(idToken.user).toEqual({
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      givenName: 'Jane',
      familyName: 'Doe',
      roles: ['Learner'],
      roleScopeMentor: ['mentee-1'],
    })
  })

  it('maps tool_platform claim fields onto platform.*', () => {
    const idToken = buildIdToken(
      buildRecord({
        [IdTokenClaim.ToolPlatform]: {
          name: 'Moodle',
          description: 'A Moodle site',
          guid: 'moodle-guid',
          contact_email: 'admin@moodle.example.com',
          version: '2023100900',
          product_family_code: 'moodle',
        },
      }),
    )

    expect(idToken.platform).toMatchObject({
      name: 'Moodle',
      description: 'A Moodle site',
      guid: 'moodle-guid',
      contactEmail: 'admin@moodle.example.com',
      version: '2023100900',
      productFamilyCode: 'moodle',
    })
  })

  it('maps lis, context, resource, and custom claims as raw passthrough', () => {
    const idToken = buildIdToken(
      buildRecord({
        [IdTokenClaim.Lis]: { person_sourcedid: 'abc' },
        [IdTokenClaim.Context]: { id: 'context-1', label: 'Course' },
        [IdTokenClaim.ResourceLink]: { id: 'resource-1', title: 'Assignment' },
        [IdTokenClaim.Custom]: { foo: 'bar' },
      }),
    )

    expect(idToken.platform.lis).toEqual({ person_sourcedid: 'abc' })
    expect(idToken.launch.context).toEqual({ id: 'context-1', label: 'Course' })
    expect(idToken.launch.resource).toEqual({ id: 'resource-1', title: 'Assignment' })
    expect(idToken.launch.custom).toEqual({ foo: 'bar' })
  })

  it('maps launch_presentation onto launch.presentation', () => {
    const idToken = buildIdToken(
      buildRecord({
        [IdTokenClaim.LaunchPresentation]: {
          document_target: 'iframe',
          width: 800,
          height: 600,
          return_url: 'https://platform.example.com/return',
          locale: 'en',
        },
      }),
    )

    expect(idToken.launch.presentation).toEqual({
      documentTarget: 'iframe',
      width: 800,
      height: 600,
      returnUrl: 'https://platform.example.com/return',
      locale: 'en',
    })
  })

  it('resolves launch.presentation as undefined when the claim is absent', () => {
    const idToken = buildIdToken(buildRecord())

    expect(idToken.launch.presentation).toBeUndefined()
  })

  it('marks services as available and maps their fields when the corresponding claims are present', () => {
    const idToken = buildIdToken(
      buildRecord({
        [IdTokenClaim.NamesRoleService]: { context_memberships_url: 'https://tool.example.com/memberships' },
        [IdTokenClaim.Endpoint]: { lineitem: 'https://tool.example.com/lineitems/1', scope: ['scope-1'] },
        [IdTokenClaim.DeepLinkingSettings]: {
          accept_types: ['ltiResourceLink'],
          accept_media_types: ['image/*'],
          accept_presentation_document_targets: ['iframe'],
          accept_multiple: true,
          auto_create: false,
          title: 'Title',
          text: 'Text',
          data: 'opaque-data',
          deep_link_return_url: 'https://platform.example.com/deep-link-return',
        },
      }),
    )

    expect(idToken.services).toEqual({
      namesAndRoles: { available: true },
      assignmentAndGrades: { available: true, lineItemId: 'https://tool.example.com/lineitems/1', scopes: ['scope-1'] },
      deepLinking: {
        available: true,
        acceptTypes: ['ltiResourceLink'],
        acceptMediaTypes: ['image/*'],
        acceptPresentationDocumentTargets: ['iframe'],
        acceptMultiple: true,
        autoCreate: false,
        title: 'Title',
        text: 'Text',
        data: 'opaque-data',
        deepLinkReturnUrl: 'https://platform.example.com/deep-link-return',
      },
    })
  })

  it('marks services as unavailable when the corresponding claims are absent', () => {
    const idToken = buildIdToken(buildRecord())

    expect(idToken.services).toEqual({
      namesAndRoles: { available: false },
      assignmentAndGrades: { available: false },
      deepLinking: { available: false },
    })
  })

  it('returns a deeply frozen object', () => {
    const idToken = buildIdToken(buildRecord({ [IdTokenClaim.RoleScopeMentor]: ['mentee-1'] }))

    expect(Object.isFrozen(idToken)).toBe(true)
    expect(Object.isFrozen(idToken.user)).toBe(true)
    expect(Object.isFrozen(idToken.user.roles)).toBe(true)
    expect(Object.isFrozen(idToken.platform)).toBe(true)
    expect(Object.isFrozen(idToken.launch)).toBe(true)
    expect(Object.isFrozen(idToken.services)).toBe(true)
  })
})

describe('buildLegacyIdToken()', () => {
  it('maps iss/sub/clientId/deploymentId onto the formatted LegacyIdToken', () => {
    const legacyIdToken = buildLegacyIdToken(buildRecord())

    expect(legacyIdToken).toMatchObject({
      iss: 'http://localhost/moodle',
      user: 'user-1',
      clientId: 'ClientId1',
      deploymentId: 'deployment-1',
    })
  })

  it('maps the context/resource_link/namesroleservice claims onto platformContext', () => {
    const legacyIdToken = buildLegacyIdToken(
      buildRecord({
        [IdTokenClaim.Context]: { id: 'context-1', label: 'Course' },
        [IdTokenClaim.ResourceLink]: { id: 'resource-1', title: 'Assignment' },
        [IdTokenClaim.NamesRoleService]: { context_memberships_url: 'https://tool.example.com/memberships' },
      }),
    )

    expect(legacyIdToken.platformContext).toMatchObject({
      contextId: 'context-1',
      resource: { id: 'resource-1', title: 'Assignment' },
      namesRoles: { context_memberships_url: 'https://tool.example.com/memberships' },
    })
  })

  it('resolves an undefined contextId/resource/namesRoles when the corresponding claims are absent', () => {
    const legacyIdToken = buildLegacyIdToken(buildRecord())

    expect(legacyIdToken.platformContext?.contextId).toBeUndefined()
    expect(legacyIdToken.platformContext?.resource).toBeUndefined()
    expect(legacyIdToken.platformContext?.namesRoles).toBeUndefined()
  })

  it('returns a deeply frozen object', () => {
    const legacyIdToken = buildLegacyIdToken(
      buildRecord({ [IdTokenClaim.Context]: { id: 'context-1' }, [IdTokenClaim.ResourceLink]: { id: 'resource-1' } }),
    )

    expect(Object.isFrozen(legacyIdToken)).toBe(true)
    expect(Object.isFrozen(legacyIdToken.platformContext)).toBe(true)
    expect(Object.isFrozen(legacyIdToken.platformContext?.resource)).toBe(true)
  })
})
