import path from 'node:path'
import { LaunchContext } from '#services/launch/launch-context.service'
import { LoginRequestPayloadSchema, LaunchCallbackPayloadSchema } from '#services/launch/launch.schemas'
import { validate } from '#utils/validation/validation'
import { renderTemplate } from '#utils/templating/template-renderer'
import { decodeToken, signJwt, verifyTokenSignature } from '#utils/crypto/jwt'
import { RS256_ALGORITHM } from '#utils/crypto/jwt.constants'
import {
  SessionNotFoundError,
  PlatformNotFoundError,
  UnregisteredPlatformError,
  PlatformNotActivatedError,
  InvalidLtikError,
} from '#services/launch/errors'
import { InvalidStateError } from '#services/oidc/errors'
import { HttpMethod } from '#services/http-handler/http-handler.types'
import type { HttpHandler, HttpRequestParameters, HttpResponse } from '#services/http-handler/http-handler.types'
import type { DatabaseManager, IdTokenClaims, IdTokenRecord } from '#services/database-manager/database-manager.types'
import type { PlatformManager } from '#services/platform-manager/platform-manager.service'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import { resolvePlatformPrivateKey, resolvePlatformPublicKey } from '#services/platform-manager/platform-keys'
import type { AccessTokenManager } from '#services/access-token-manager/access-token-manager.service'
import type { OidcService } from '#services/oidc/oidc.service'
import type { RequestHandler } from '#services/request-handler/request-handler.types'
import type { Logger } from '#services/logger/logger.types'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import type {
  InactivePlatformHandler,
  LaunchCallbackParams,
  LaunchRoutes,
  LoginRequestParams,
  LoginRequestResult,
  OnLaunchHandler,
  ProcessLaunchResult,
  TargetLinkUriParts,
  UnregisteredPlatformHandler,
} from '#services/launch/launch.types'

import type { State } from '#services/oidc/oidc.types'

export class LaunchService {
  private readonly LOG_COMPONENT = 'launchService'
  private readonly STATE_COOKIE_NAME = 'ltijs_state'
  private readonly RECOVERED_STATE_FIELD = 'ltijs_recovered_state'
  private readonly LOCAL_STORAGE_KEY_PREFIX = 'ltijs_state_'
  private readonly DEFAULT_LOGIN_ROUTE = '/lti/login'
  private readonly DEFAULT_LAUNCH_ROUTE = '/lti/launch'
  private readonly LTIK_TTL_SECONDS = 3600 * 24
  private readonly LOGIN_REDIRECT_TEMPLATE = path.join(__dirname, 'templates', 'login-redirect.html')
  private readonly SIGNED_STATE_FORM_TEMPLATE = path.join(__dirname, 'templates', 'signed-state-form.html')
  private readonly DEFAULT_SUCCESS_BODY = 'It works!'

  private readonly databaseManager: DatabaseManager
  private readonly platformManager: PlatformManager
  private readonly accessTokenManager: AccessTokenManager
  private readonly oidcService: OidcService
  private readonly requestHandler: RequestHandler
  private readonly httpHandler: HttpHandler
  private readonly logger: Logger

  // Mutable, not `readonly` -- these are reassignable at any time via the
  // public setters below (and, in turn, via `Provider`'s `on***` methods),
  // matching legacy's own default-callback-with-override-setter pattern.
  private onResourceLinkHandler: OnLaunchHandler = this.buildDefaultLaunchHandler()
  private onDeepLinkingHandler: OnLaunchHandler = this.buildDefaultLaunchHandler()
  private onSubmissionReviewHandler: OnLaunchHandler = this.buildDefaultLaunchHandler()
  private onUnregisteredPlatformHandler: UnregisteredPlatformHandler = this.buildDefaultUnregisteredPlatformHandler()
  private onInactivePlatformHandler: InactivePlatformHandler = this.buildDefaultInactivePlatformHandler()

  // eslint-disable-next-line @typescript-eslint/max-params
  constructor(
    oidcService: OidcService,
    platformManager: PlatformManager,
    accessTokenManager: AccessTokenManager,
    databaseManager: DatabaseManager,
    requestHandler: RequestHandler,
    httpHandler: HttpHandler,
    logger: Logger,
  ) {
    this.databaseManager = databaseManager
    this.platformManager = platformManager
    this.accessTokenManager = accessTokenManager
    this.oidcService = oidcService
    this.requestHandler = requestHandler
    this.httpHandler = httpHandler
    this.logger = logger
  }

  public setOnResourceLinkHandler(handler: OnLaunchHandler): void {
    this.onResourceLinkHandler = handler
  }

  public setOnDeepLinkingHandler(handler: OnLaunchHandler): void {
    this.onDeepLinkingHandler = handler
  }

  public setOnSubmissionReviewHandler(handler: OnLaunchHandler): void {
    this.onSubmissionReviewHandler = handler
  }

  public setOnUnregisteredPlatformHandler(handler: UnregisteredPlatformHandler): void {
    this.onUnregisteredPlatformHandler = handler
  }

  public setOnInactivePlatformHandler(handler: InactivePlatformHandler): void {
    this.onInactivePlatformHandler = handler
  }

  private buildDefaultLaunchHandler(): OnLaunchHandler {
    return async (_context, _request, response) => {
      response.status(200).html(this.DEFAULT_SUCCESS_BODY)
    }
  }

  private buildDefaultUnregisteredPlatformHandler(): UnregisteredPlatformHandler {
    return async (_request, response) => {
      const error = new UnregisteredPlatformError()
      response.status(400).json({ error: error.name, message: error.message })
    }
  }

  private buildDefaultInactivePlatformHandler(): InactivePlatformHandler {
    return async (_request, response) => {
      const error = new PlatformNotActivatedError()
      response.status(401).json({ error: error.name, message: error.message })
    }
  }

  public async getLaunchContext(ltik: string): Promise<LaunchContext> {
    const tid = this.peekLtikTid(ltik)

    const record = await this.databaseManager.getIdToken(tid)
    if (record === undefined) throw new SessionNotFoundError()

    const platform = await this.platformManager.getPlatformById(record.platform_id)
    if (platform === undefined) throw new PlatformNotFoundError()

    this.verifyLtik(ltik, platform)
    return this.buildLaunchContext(record, platform, ltik)
  }

  public prepareHttpRoutes(
    routes: LaunchRoutes = { loginRoute: this.DEFAULT_LOGIN_ROUTE, launchRoute: this.DEFAULT_LAUNCH_ROUTE },
  ): void {
    this.httpHandler.registerRoute(routes.loginRoute, [HttpMethod.Get, HttpMethod.Post], async (request, response) => {
      await this.handleLoginRequest(request, response)
    })
    this.httpHandler.registerRoute(routes.launchRoute, [HttpMethod.Post], async (request, response) => {
      await this.handleLaunchRequest(request, response)
    })
  }

  private buildLaunchContext(record: IdTokenRecord, platform: Platform, ltik: string): LaunchContext {
    return new LaunchContext(record, platform, ltik, this.accessTokenManager, this.requestHandler, this.logger)
  }

  private buildLtik(tid: string, platform: Platform): string {
    return signJwt({ tid }, resolvePlatformPrivateKey(platform), {
      algorithm: RS256_ALGORITHM,
      expiresIn: this.LTIK_TTL_SECONDS,
    })
  }

  private peekLtikTid(ltik: string): string {
    const { payload } = decodeToken(ltik)
    const tid = payload.tid
    if (typeof tid !== 'string' || tid === '') throw new InvalidLtikError()
    return tid
  }

  private verifyLtik(ltik: string, platform: Platform): void {
    try {
      verifyTokenSignature(ltik, resolvePlatformPublicKey(platform), [RS256_ALGORITHM])
    } catch {
      throw new InvalidLtikError()
    }
  }

  private async handleLoginRequest(request: HttpRequestParameters, response: HttpResponse): Promise<void> {
    const params = validate<LoginRequestParams>(LoginRequestPayloadSchema, { ...request.query, ...request.body })

    let loginResult: LoginRequestResult
    try {
      loginResult = await this.processLogin(params)
    } catch (error) {
      // These two overrides fully own the HTTP response themselves -- the login route always returns
      // immediately after invoking one, with no continuation of the OIDC flow. A handler always exists
      // now (real defaults, see `buildDefaultXHandler()`), so dispatch is unconditional.
      if (error instanceof UnregisteredPlatformError) {
        await this.onUnregisteredPlatformHandler(request, response)
        return
      }
      if (error instanceof PlatformNotActivatedError) {
        await this.onInactivePlatformHandler(request, response)
        return
      }
      throw error
    }

    const { redirectUrl, state } = loginResult

    response.setCookie(this.STATE_COOKIE_NAME, state, { httpOnly: true, secure: true, sameSite: 'none' })

    const html = renderTemplate(this.LOGIN_REDIRECT_TEMPLATE, {
      key: this.buildLocalStorageKey(state),
      value: state,
      targetUrl: redirectUrl,
    })
    response.html(html)
  }

  private async handleLaunchRequest(request: HttpRequestParameters, response: HttpResponse): Promise<void> {
    const parameters = validate<LaunchCallbackParams>(LaunchCallbackPayloadSchema, request.body)

    const recoveredState = this.resolveRecoveredState(request)
    if (recoveredState === undefined) {
      const html = renderTemplate(this.SIGNED_STATE_FORM_TEMPLATE, {
        key: this.buildLocalStorageKey(parameters.stateToken),
        id_token: parameters.rawIdToken,
        state: parameters.stateToken,
      })
      response.html(html)
      return
    }
    if (recoveredState !== parameters.stateToken) throw new InvalidStateError()

    const { idToken, state, platform } = await this.processLaunch(parameters)
    const ltik = this.buildLtik(idToken.id, platform)
    const context = this.buildLaunchContext(idToken, platform, ltik)
    const handler = this.resolveHandler(context.idToken.launch.type)
    request.query = this.updateQueryWithState(request, state)
    await handler(context, request, response)
  }

  private updateQueryWithState(request: HttpRequestParameters, state: State): Record<string, string> {
    if (state.query === undefined) return request.query
    return { ...request.query, ...state.query }
  }

  private resolveHandler(type: LtiMessageType): OnLaunchHandler {
    switch (type) {
      case LtiMessageType.ResourceLinkRequest:
        return this.onResourceLinkHandler
      case LtiMessageType.DeepLinkingRequest:
        return this.onDeepLinkingHandler
      case LtiMessageType.SubmissionReviewRequest:
        return this.onSubmissionReviewHandler
    }
  }

  private async processLaunch(parameters: LaunchCallbackParams): Promise<ProcessLaunchResult> {
    const { stateToken, rawIdToken } = parameters
    const { header, payload } = decodeToken(rawIdToken)

    const platform = await this.resolveIdTokenPlatform(payload.iss, payload.aud)

    // Independent once `platform` is resolved -- validateIdToken is the expensive one (JWKS fetch,
    // nonce-consuming DB round-trip), so running both concurrently keeps validateStateToken's latency
    // off the critical path instead of paying for it strictly before the id-token check starts.
    const [state, idTokenClaims] = await Promise.all([
      this.oidcService.validateStateToken(stateToken, platform),
      this.oidcService.validateIdToken(rawIdToken, header, platform) as Promise<IdTokenClaims>,
    ])

    idTokenClaims[IdTokenClaim.ClientId] = platform.clientId
    idTokenClaims[IdTokenClaim.PlatformId] = platform.id
    idTokenClaims[IdTokenClaim.TargetLinkUri] = this.resolveTargetLinkUri(idTokenClaims, state)

    const id = await this.databaseManager.saveIdToken(idTokenClaims)
    const idToken: IdTokenRecord = { ...idTokenClaims, id }

    this.logger.debug(this.LOG_COMPONENT, `Launch processed for [${idToken.iss}]`)
    return { idToken, state, platform }
  }

  private resolveTargetLinkUri(token: IdTokenClaims, state: State): string | undefined {
    const targetLinkUri = token[IdTokenClaim.TargetLinkUri]
    if (targetLinkUri === undefined) return undefined
    if (state.query === undefined) return targetLinkUri
    const url = new URL(targetLinkUri)
    for (const [key, value] of Object.entries(state.query)) url.searchParams.set(key, value)
    return url.toString()
  }

  private async processLogin(params: LoginRequestParams): Promise<LoginRequestResult> {
    const platform = await this.resolvePlatform(params.iss, params.clientId)
    const { targetLinkUri, query } = this.splitTargetLinkUri(params.targetLinkUri)
    const state = this.oidcService.buildStateToken(platform, query)

    const redirectUrl = await this.oidcService.buildAuthenticationRequestUrl(platform, {
      loginHint: params.loginHint,
      redirectUri: targetLinkUri,
      state,
      ltiMessageHint: params.ltiMessageHint,
      ltiDeploymentId: params.ltiDeploymentId,
    })

    this.logger.debug(this.LOG_COMPONENT, `Login request processed for [${params.iss}]`)
    return { redirectUrl, state }
  }

  private async resolvePlatform(url: string, clientId?: string): Promise<Platform> {
    const platforms = await this.platformManager.getPlatforms({ url, clientId })
    if (platforms.length === 0) throw new UnregisteredPlatformError()
    const platform = platforms[0]
    if (!platform.active) throw new PlatformNotActivatedError()
    return platform
  }

  private async resolveIdTokenPlatform(iss: string, aud: string | string[]): Promise<Platform> {
    // A spec-permitted multi-value `aud` is resolved in one batched query (an `$in`-style clientId
    // match) instead of one sequential DB round-trip per candidate. The first candidate (in `aud`
    // order) with a matching platform record wins -- same as the old loop, which stopped at the first
    // registered match and never looked past it even if that match turned out to be inactive.
    const clientIds = Array.isArray(aud) ? aud : [aud]
    const platforms = await this.platformManager.getPlatforms({ url: iss, clientId: clientIds })
    const platform = clientIds.map(clientId => platforms.find(p => p.clientId === clientId)).find(p => p !== undefined)
    if (platform === undefined) throw new UnregisteredPlatformError()
    if (!platform.active) throw new PlatformNotActivatedError()
    return platform
  }

  private resolveRecoveredState(request: HttpRequestParameters): string | undefined {
    const cookieState = request.cookies[this.STATE_COOKIE_NAME]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (cookieState !== undefined) return cookieState
    const bodyState = request.body[this.RECOVERED_STATE_FIELD]
    return typeof bodyState === 'string' ? bodyState : undefined
  }

  private buildLocalStorageKey(state: string): string {
    return `${this.LOCAL_STORAGE_KEY_PREFIX}${state}`
  }

  private splitTargetLinkUri(targetLinkUri: string): TargetLinkUriParts {
    const queryIndex = targetLinkUri.indexOf('?')
    if (queryIndex === -1) return { targetLinkUri }

    const uri = targetLinkUri.slice(0, queryIndex)
    const rawQuery = targetLinkUri.slice(queryIndex + 1)
    const query: Record<string, string> = {}
    for (const [key, value] of new URLSearchParams(rawQuery)) query[key] = value
    return { targetLinkUri: uri, query }
  }
}

export default LaunchService
