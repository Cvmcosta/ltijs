import { deepFreeze } from '#utils/objects/freeze'
import type { PlatformRecord } from '#services/database-manager/database-manager.types'
import type { Platform } from '#services/platform-manager/platform-manager.types'

export function buildPlatform(record: PlatformRecord): Platform {
  return deepFreeze({
    id: record.id,
    url: record.url,
    clientId: record.clientId,
    name: record.name,
    authenticationEndpoint: record.authenticationEndpoint,
    accessTokenEndpoint: record.accessTokenEndpoint,
    accesstokenEndpoint: record.accessTokenEndpoint,
    authorizationServer: resolveAuthorizationServer(record.authorizationServer, record.accessTokenEndpoint),
    idTokenValidation: record.idTokenValidation,
    authConfig: record.idTokenValidation,
    active: record.active,
    keys: record.keys,
    publicKey: record.keys.public,
    privateKey: record.keys.private,
  })
}

function resolveAuthorizationServer(authorizationServer: string | undefined, accessTokenEndpoint: string): string {
  if (authorizationServer !== undefined && authorizationServer !== '') return authorizationServer
  return accessTokenEndpoint
}
