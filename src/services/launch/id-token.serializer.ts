import { IdTokenClaim } from '#services/launch/id-token.constants'
import { deepFreeze } from '#utils/objects/freeze'
import type { IdTokenRecord } from '#services/database-manager/database-manager.types'
import type {
  IdToken,
  IdTokenLaunch,
  IdTokenPlatform,
  IdTokenServices,
  IdTokenUser,
  LegacyIdToken,
  LegacyIdTokenNamesRoles,
  LegacyIdTokenResource,
} from '#services/launch/id-token.types'

export function buildIdToken(record: IdTokenRecord): IdToken {
  return deepFreeze({
    id: record.id,
    ltiVersion: record[IdTokenClaim.Version],
    user: buildUserInfo(record),
    platform: buildPlatformInfo(record),
    launch: buildLaunchInfo(record),
    services: buildServicesInfo(record),
  })
}

export function buildLegacyIdToken(record: IdTokenRecord): LegacyIdToken {
  const resource = record[IdTokenClaim.ResourceLink] as LegacyIdTokenResource
  const namesRoles = record[IdTokenClaim.NamesRoleService] as LegacyIdTokenNamesRoles | undefined
  const contextId = record[IdTokenClaim.Context]?.id

  return deepFreeze({
    iss: record.iss,
    user: record.sub,
    clientId: record.client_id,
    deploymentId: record[IdTokenClaim.DeploymentId],
    platformContext: { contextId, resource, namesRoles },
  })
}

function buildUserInfo(record: IdTokenRecord): IdTokenUser {
  return {
    id: record.sub,
    name: record.name,
    email: record.email,
    givenName: record.given_name,
    familyName: record.family_name,
    roles: record[IdTokenClaim.Roles],
    roleScopeMentor: record[IdTokenClaim.RoleScopeMentor],
  }
}

function buildPlatformInfo(record: IdTokenRecord): IdTokenPlatform {
  const toolPlatform = record[IdTokenClaim.ToolPlatform]

  return {
    id: record.platform_id,
    url: record.iss,
    clientId: record.client_id,
    deploymentId: record[IdTokenClaim.DeploymentId],
    name: toolPlatform?.name,
    description: toolPlatform?.description,
    guid: toolPlatform?.guid,
    contactEmail: toolPlatform?.contact_email,
    version: toolPlatform?.version,
    productFamilyCode: toolPlatform?.product_family_code,
    lis: record[IdTokenClaim.Lis],
  }
}

function buildLaunchInfo(record: IdTokenRecord): IdTokenLaunch {
  const launchPresentation = record[IdTokenClaim.LaunchPresentation]

  return {
    type: record[IdTokenClaim.MessageType],
    target: record[IdTokenClaim.TargetLinkUri],
    context: record[IdTokenClaim.Context],
    resource: record[IdTokenClaim.ResourceLink],
    custom: record[IdTokenClaim.Custom],
    presentation:
      launchPresentation === undefined
        ? undefined
        : {
            documentTarget: launchPresentation.document_target,
            width: launchPresentation.width,
            height: launchPresentation.height,
            returnUrl: launchPresentation.return_url,
            locale: launchPresentation.locale,
          },
  }
}

function buildServicesInfo(record: IdTokenRecord): IdTokenServices {
  const assignmentAndGradesSettings = record[IdTokenClaim.Endpoint]
  const deepLinkingSettings = record[IdTokenClaim.DeepLinkingSettings]
  const namesAndRolesSettings = record[IdTokenClaim.NamesRoleService]

  return {
    namesAndRoles: { available: namesAndRolesSettings !== undefined },
    assignmentAndGrades:
      assignmentAndGradesSettings === undefined
        ? { available: false }
        : {
            available: true,
            lineItemId: assignmentAndGradesSettings.lineitem,
            scopes: assignmentAndGradesSettings.scope,
          },
    deepLinking:
      deepLinkingSettings === undefined
        ? { available: false }
        : {
            available: true,
            acceptTypes: deepLinkingSettings.accept_types,
            acceptMediaTypes: deepLinkingSettings.accept_media_types,
            acceptPresentationDocumentTargets: deepLinkingSettings.accept_presentation_document_targets,
            acceptMultiple: deepLinkingSettings.accept_multiple,
            autoCreate: deepLinkingSettings.auto_create,
            title: deepLinkingSettings.title,
            text: deepLinkingSettings.text,
            data: deepLinkingSettings.data,
            deepLinkReturnUrl: deepLinkingSettings.deep_link_return_url,
          },
  }
}
