import type { AccessToken } from '#services/access-token-manager/access-token-manager.types'

export function buildBearerAuthorization(accessToken: AccessToken): string
export function buildBearerAuthorization(rawToken: string): string
export function buildBearerAuthorization(token: AccessToken | string): string {
  if (typeof token === 'string') return `Bearer ${token}`
  return `${token.token_type} ${token.access_token}`
}
