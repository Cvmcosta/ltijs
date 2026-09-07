import type { JsonWebKey, KeyObject } from 'node:crypto'
import type { z } from 'zod'
import { signJwt, verifyTokenSignature } from '#utils/crypto/jwt'
import { RS256_ALGORITHM } from '#utils/crypto/jwt.constants'
import { jwkToRsa } from '#utils/crypto/keys'
import { validate } from '#utils/validation/validation'
import { randomUuid } from '#utils/random/random'
import {
  JwksResponseSchema,
  ResourceLinkRequestSchema,
  DeepLinkingRequestSchema,
  SubmissionReviewRequestSchema,
} from '#services/oidc/oidc.schemas'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import {
  AuthconfigNotFoundError,
  AzpDoesNotMatchClientidError,
  InvalidAlgError,
  InvalidMessageTypeError,
  InvalidStateError,
  InvalidNonceError,
  TokenTooOldError,
} from '#services/oidc/errors'
import type { DatabaseManager } from '#services/database-manager/database-manager.types'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import type { Platform, IdTokenValidation } from '#services/platform-manager/platform-manager.types'
import { resolvePlatformPrivateKey, resolvePlatformPublicKey } from '#services/platform-manager/platform-keys'
import type { RequestHandler } from '#services/request-handler/request-handler.types'
import type { CacheManager } from '#services/cache-manager/cache-manager.types'
import type { Logger } from '#services/logger/logger.types'
import type { DecodedToken, TokenHeader } from '#utils/crypto/jwt.types'
import type { AuthenticationRequestParams, State, StorageTarget } from '#services/oidc/oidc.types'

export class OidcService {
  private readonly LOG_COMPONENT = 'oidcService'
  private readonly STATE_TTL_SECONDS = 600
  private readonly OIDC_RESPONSE_TYPE = 'id_token'
  private readonly OIDC_RESPONSE_MODE = 'form_post'
  private readonly OIDC_SCOPE = 'openid'
  private readonly OIDC_PROMPT = 'none'
  private readonly JWKS_CACHE_TTL_MS = 5 * 60 * 1000
  private readonly JWKS_CACHE_KEY_PREFIX = 'oidc:jwks:'

  private readonly databaseManager: DatabaseManager
  private readonly requestHandler: RequestHandler
  private readonly cacheManager: CacheManager
  private readonly logger: Logger
  private readonly tokenMaxAge: number | false

  // eslint-disable-next-line @typescript-eslint/max-params
  constructor(
    databaseManager: DatabaseManager,
    requestHandler: RequestHandler,
    cacheManager: CacheManager,
    logger: Logger,
    tokenMaxAge: number | false,
  ) {
    this.databaseManager = databaseManager
    this.requestHandler = requestHandler
    this.cacheManager = cacheManager
    this.logger = logger
    this.tokenMaxAge = tokenMaxAge
  }

  public async validateIdToken(rawIdToken: string, header: TokenHeader, platform: Platform): Promise<DecodedToken> {
    const key = await this.resolveVerificationKey(platform.idTokenValidation, header.kid)
    const verifiedToken = verifyTokenSignature(rawIdToken, key, [RS256_ALGORITHM])
    const validatedToken = this.claimValidation(verifiedToken)
    await this.runAdditionalOidcValidation(validatedToken, header, platform)

    this.logger.debug(this.LOG_COMPONENT, `Token validated for [${validatedToken.iss}]`)
    return validatedToken
  }

  public buildStateToken(platform: Platform, query?: Record<string, string>, storage?: StorageTarget): string {
    return signJwt(
      { query, storageTarget: storage?.target, platformLoginOrigin: storage?.loginOrigin },
      resolvePlatformPrivateKey(platform),
      {
        algorithm: RS256_ALGORITHM,
        expiresIn: this.STATE_TTL_SECONDS,
      },
    )
  }

  public async validateStateToken(token: string, platform: Platform): Promise<State> {
    try {
      return verifyTokenSignature(token, resolvePlatformPublicKey(platform), [RS256_ALGORITHM]) as unknown as State
    } catch {
      throw new InvalidStateError()
    }
  }

  public async buildAuthenticationRequestUrl(
    platform: Platform,
    request: AuthenticationRequestParams,
  ): Promise<string> {
    const nonce = randomUuid()
    await this.databaseManager.saveNonce(nonce)
    const query = this.buildAuthenticationRequestQuery(platform, request, nonce)
    return this.buildRedirectUrl(platform.authenticationEndpoint, query)
  }

  private buildAuthenticationRequestQuery(
    platform: Platform,
    request: AuthenticationRequestParams,
    nonce: string,
  ): Record<string, string> {
    const query: Record<string, string> = {
      response_type: this.OIDC_RESPONSE_TYPE,
      response_mode: this.OIDC_RESPONSE_MODE,
      id_token_signed_response_alg: RS256_ALGORITHM,
      scope: this.OIDC_SCOPE,
      client_id: platform.clientId,
      redirect_uri: request.redirectUri,
      login_hint: request.loginHint,
      nonce,
      prompt: this.OIDC_PROMPT,
      state: request.state,
    }
    if (request.ltiMessageHint !== undefined) query.lti_message_hint = request.ltiMessageHint
    if (request.ltiDeploymentId !== undefined) query.lti_deployment_id = request.ltiDeploymentId
    return query
  }

  private buildRedirectUrl(authenticationEndpoint: string, query: Record<string, string>): string {
    const url = new URL(authenticationEndpoint)
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
    return url.toString()
  }

  private claimValidation(token: DecodedToken): DecodedToken {
    const schema = this.resolveClaimSchema(token[IdTokenClaim.MessageType])
    return validate<DecodedToken>(schema, token)
  }

  private resolveClaimSchema(messageType: unknown): z.ZodType {
    switch (messageType) {
      case LtiMessageType.ResourceLinkRequest:
        return ResourceLinkRequestSchema
      case LtiMessageType.DeepLinkingRequest:
        return DeepLinkingRequestSchema
      case LtiMessageType.SubmissionReviewRequest:
        return SubmissionReviewRequestSchema
      default:
        throw new InvalidMessageTypeError()
    }
  }

  private async resolveVerificationKey(
    idTokenValidation: IdTokenValidation,
    kid: string | undefined,
  ): Promise<string | KeyObject> {
    switch (idTokenValidation.method) {
      case IdTokenValidationMethod.RsaKey:
        return idTokenValidation.key
      case IdTokenValidationMethod.JwkKey:
        return jwkToRsa(JSON.parse(idTokenValidation.key) as JsonWebKey)
      case IdTokenValidationMethod.JwkSet: {
        const jwk = await this.resolveJwk(idTokenValidation.key, kid)
        return jwkToRsa(jwk)
      }
      default:
        throw new AuthconfigNotFoundError()
    }
  }

  private async resolveJwk(jwksUri: string, kid: string | undefined): Promise<Record<string, unknown>> {
    const keys = await this.resolveJwks(jwksUri)
    const jwk = keys.find(candidate => candidate.kid === kid)
    if (jwk !== undefined) return jwk

    await this.cacheManager.delete(this.buildJwksCacheKey(jwksUri))
    const freshKeys = await this.resolveJwks(jwksUri)
    const freshJwk = freshKeys.find(candidate => candidate.kid === kid)
    if (freshJwk === undefined) throw new AuthconfigNotFoundError()
    return freshJwk
  }

  private buildJwksCacheKey(jwksUri: string): string {
    return `${this.JWKS_CACHE_KEY_PREFIX}${jwksUri}`
  }

  private async resolveJwks(jwksUri: string): Promise<Array<Record<string, unknown>>> {
    const cacheKey = this.buildJwksCacheKey(jwksUri)
    const cached = await this.cacheManager.get<Array<Record<string, unknown>>>(cacheKey)
    if (cached !== undefined) return cached

    const response = await this.requestHandler.get(jwksUri)
    const jwks = validate<{ keys: Array<Record<string, unknown>> }>(JwksResponseSchema, response.data)
    await this.cacheManager.set(cacheKey, jwks.keys, this.JWKS_CACHE_TTL_MS)
    return jwks.keys
  }

  private async runAdditionalOidcValidation(
    token: DecodedToken,
    header: TokenHeader,
    platform: Platform,
  ): Promise<void> {
    await Promise.all([
      this.validateAud(token, platform),
      this.validateMaxAge(token),
      this.validateNonce(token),
      this.validateAlg(header),
    ])
  }

  private async validateAud(token: DecodedToken, platform: Platform): Promise<void> {
    // azp is only spec-required (and only meaningfully checked) when aud actually names more than one
    // audience -- a single-element array is equivalent to a bare string aud, where a platform sending
    // no azp at all is spec-valid and must not be rejected.
    const hasMultipleAudiences = Array.isArray(token.aud) && token.aud.length > 1
    if (hasMultipleAudiences && token.azp !== platform.clientId) {
      throw new AzpDoesNotMatchClientidError()
    }
  }

  private async validateMaxAge(token: DecodedToken): Promise<void> {
    if (this.tokenMaxAge === false) return
    if (Date.now() / 1000 - token.iat > this.tokenMaxAge) throw new TokenTooOldError()
  }

  private async validateAlg(header: TokenHeader): Promise<void> {
    if (header.alg !== RS256_ALGORITHM) throw new InvalidAlgError()
  }

  private async validateNonce(token: DecodedToken): Promise<void> {
    const consumed = await this.databaseManager.consumeNonce(token.nonce)
    if (!consumed) throw new InvalidNonceError()
  }
}

export default OidcService
