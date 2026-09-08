import { validate } from '#utils/validation/validation'
import { randomJti } from '#utils/random/random'
import { signJwt } from '#utils/crypto/jwt'
import { RS256_ALGORITHM } from '#utils/crypto/jwt.constants'
import type { Logger } from '#services/logger/logger.types'
import type { RequestHandler } from '#services/request-handler/request-handler.types'
import type { DatabaseManager } from '#services/database-manager/database-manager.types'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import { AccessTokenSchema } from '#services/access-token-manager/access-token-manager.schemas'
import { resolvePlatformPrivateKey } from '#services/platform-manager/platform-keys'
import type { AccessToken } from '#services/access-token-manager/access-token-manager.types'

export class AccessTokenManager {
  private readonly LOG_COMPONENT = 'accessTokenManager'
  private readonly CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
  private readonly GRANT_TYPE = 'client_credentials'
  private readonly ACCEPT = 'application/json'
  private readonly EXPIRY_SAFETY_MARGIN_SECONDS = 60

  private readonly databaseManager: DatabaseManager
  private readonly requestHandler: RequestHandler
  private readonly logger: Logger

  constructor(databaseManager: DatabaseManager, requestHandler: RequestHandler, logger: Logger) {
    this.databaseManager = databaseManager
    this.requestHandler = requestHandler
    this.logger = logger
  }

  public async getAccessToken(platform: Platform, scopes: string): Promise<AccessToken> {
    this.logger.debug(
      this.LOG_COMPONENT,
      `Attempting to retrieve access token for ${platform.url} with scopes: ${scopes}`,
    )
    const cached = await this.getCachedToken(platform, scopes)
    const token = cached ?? (await this.requestAndCacheNewToken(platform, scopes))
    return this.normalizeTokenType(token)
  }

  private async getCachedToken(platform: Platform, scopes: string): Promise<AccessToken | undefined> {
    const record = await this.databaseManager.getAccessToken(platform.url, platform.clientId, scopes)
    const isExpired =
      record !== undefined &&
      (Date.now() - record.createdAt) / 1000 > record.expires_in - this.EXPIRY_SAFETY_MARGIN_SECONDS
    if (record === undefined || isExpired) return undefined
    this.logger.debug(this.LOG_COMPONENT, `Cached access token found for ${platform.url}`)
    const { createdAt: _createdAt, ...token } = record
    return token
  }

  private async requestAndCacheNewToken(platform: Platform, scopes: string): Promise<AccessToken> {
    const token = await this.requestNewToken(platform, scopes)
    await this.cacheToken(platform, scopes, token)
    this.logger.debug(
      this.LOG_COMPONENT,
      `Successfully generated new access token for ${platform.url} with scopes: ${scopes}`,
    )
    return token
  }

  private async requestNewToken(platform: Platform, scopes: string): Promise<AccessToken> {
    const clientAssertion = await this.signClientAssertion(platform)

    const body = new URLSearchParams({
      grant_type: this.GRANT_TYPE,
      client_assertion_type: this.CLIENT_ASSERTION_TYPE,
      client_assertion: clientAssertion,
      scope: scopes,
    })

    const response = await this.requestHandler.post(platform.accessTokenEndpoint, body, {
      headers: { accept: this.ACCEPT },
    })
    return validate<AccessToken>(AccessTokenSchema, response.data)
  }

  private async signClientAssertion(platform: Platform): Promise<string> {
    const assertion = {
      sub: platform.clientId,
      iss: platform.clientId,
      aud: platform.authorizationServer,
      jti: randomJti(),
    }

    return signJwt(assertion, resolvePlatformPrivateKey(platform), {
      algorithm: RS256_ALGORITHM,
      expiresIn: 60,
      keyid: platform.id,
    })
  }

  private async cacheToken(platform: Platform, scopes: string, token: AccessToken): Promise<void> {
    await this.databaseManager.saveAccessToken(platform.url, platform.clientId, scopes, {
      ...token,
      createdAt: Date.now(),
    })
  }

  private normalizeTokenType(token: AccessToken): AccessToken {
    return { ...token, token_type: token.token_type.charAt(0).toUpperCase() + token.token_type.slice(1) }
  }
}

export default AccessTokenManager
