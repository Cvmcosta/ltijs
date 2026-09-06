/* eslint-disable @typescript-eslint/no-deprecated */
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { LaunchService } from '#services/launch/launch.service'
import { OidcService } from '#services/oidc/oidc.service'
import { PlatformManager } from '#services/platform-manager/platform-manager.service'
import { AccessTokenManager } from '#services/access-token-manager/access-token-manager.service'
import { FetchRequestHandler } from '#services/request-handler/fetch/fetch-request-handler.service'
import { buildMockCacheManager } from '#utils/tests/mock-cache-manager'
import { buildMockDatabaseManager } from '#utils/tests/mock-database-manager'
import { buildMockHttpHandler } from '#utils/tests/mock-http-handler'
import type { MockHttpHandler } from '#utils/tests/mock-http-handler'
import { ValidationError } from '#utils/validation/errors'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import { LTI_VERSION } from '#services/oidc/oidc.constants'
import { HttpMethod } from '#services/http-handler/http-handler.types'
import type { CookieOptions, HttpRequestParameters, HttpResponse } from '#services/http-handler/http-handler.types'
import type { DatabaseManager, PlatformAttributes } from '#services/database-manager/database-manager.types'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import type { Logger } from '#services/logger/logger.types'
import type { LaunchContext } from '#services/launch/launch-context.service'

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
})

const STATE_COOKIE_NAME = 'ltijs_state'

const buildClaims = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  [IdTokenClaim.MessageType]: LtiMessageType.ResourceLinkRequest,
  [IdTokenClaim.TargetLinkUri]: 'https://tool.example.com/launch',
  [IdTokenClaim.ResourceLink]: { id: 'resource-1' },
  [IdTokenClaim.Version]: LTI_VERSION,
  [IdTokenClaim.DeploymentId]: 'deployment-1',
  [IdTokenClaim.Roles]: ['Learner'],
  [IdTokenClaim.NamesRoleService]: { context_memberships_url: 'http://localhost/moodle/members' },
  ...overrides,
})

// The nonce must be registered via saveNonce() first, matching what
// OidcService.buildAuthenticationRequestUrl() does at real login-initiation
// time -- validateToken() now only accepts a nonce that was actually issued
// (and not yet consumed), not merely one it hasn't seen before.
const signToken = async (
  databaseManager: DatabaseManager,
  claims: Record<string, unknown>,
  options: jwt.SignOptions = {},
): Promise<string> => {
  const nonce = crypto.randomUUID()
  await databaseManager.saveNonce(nonce)
  return jwt.sign({ sub: 'user-1', nonce, ...claims }, privateKey, {
    algorithm: 'RS256',
    issuer: 'http://localhost/moodle',
    audience: 'ClientId1',
    keyid: 'kid-1',
    expiresIn: '1h',
    ...options,
  })
}

const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }
const requestHandler = new FetchRequestHandler()

const buildDatabaseManagerWithPlatform = async (
  overrides: Partial<PlatformAttributes> = {},
): Promise<{ databaseManager: DatabaseManager; platform: Platform }> => {
  const databaseManager = buildMockDatabaseManager()
  const platformManager = new PlatformManager(databaseManager, logger)
  // `savePlatform()` generates the id itself now (no more caller-supplied
  // `id`, see `MongoDatabaseManager.savePlatform()`) -- resolved back into a
  // full `Platform` here, since `OidcService.buildStateToken()`/
  // `verifyStateToken()` now both require an already-resolved `Platform`.
  const platformId = await databaseManager.savePlatform({
    url: 'http://localhost/moodle',
    clientId: 'ClientId1',
    name: 'Moodle',
    authenticationEndpoint: 'http://localhost/moodle/auth',
    accessTokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
    authorizationServer: 'http://localhost/moodle/AccessTokenUrl',
    idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: publicKey },
    active: true,
    keys: { public: publicKey, private: privateKey },
    ...overrides,
  })
  const platform = await platformManager.getPlatformById(platformId)
  if (platform === undefined) throw new Error('expected the just-registered platform to exist')
  return { databaseManager, platform }
}

// `httpHandler` is constructor-injected into `LaunchService` (not passed
// per-call to `prepareHttpRoutes()`), so it's built once here alongside the
// service and returned too, for tests that need to grab a specific route's
// handler off of it.
const buildServices = (
  databaseManager: DatabaseManager,
): { launchService: LaunchService; oidcService: OidcService; httpHandler: MockHttpHandler } => {
  const platformManager = new PlatformManager(databaseManager, logger)
  const accessTokenManager = new AccessTokenManager(databaseManager, requestHandler, logger)
  const oidcService = new OidcService(databaseManager, requestHandler, buildMockCacheManager(), logger, 10)
  const httpHandler = buildMockHttpHandler()
  const launchService = new LaunchService(
    oidcService,
    platformManager,
    accessTokenManager,
    databaseManager,
    requestHandler,
    httpHandler,
    logger,
  )
  return { launchService, oidcService, httpHandler }
}

interface FakeHttpResponse extends HttpResponse {
  statusCode?: number
  cookies: Array<{ name: string; value: string; options?: CookieOptions }>
  htmlBody?: string
  jsonBody?: unknown
  redirectUrl?: string
}

const buildFakeHttpResponse = (): FakeHttpResponse => {
  const response: FakeHttpResponse = {
    cookies: [],
    status: (code: number) => {
      response.statusCode = code
      return response
    },
    setCookie: (name: string, value: string, options?: CookieOptions) => {
      response.cookies.push({ name, value, options })
      return response
    },
    clearCookie: (name: string, options?: CookieOptions) => {
      response.cookies.push({ name, value: '', options })
      return response
    },
    redirect: (url: string) => {
      response.redirectUrl = url
    },
    html: (content: string) => {
      response.htmlBody = content
    },
    json: (body: unknown) => {
      response.jsonBody = body
    },
  }
  return response
}

const buildRequest = (overrides: Partial<HttpRequestParameters> = {}): HttpRequestParameters => ({
  method: 'GET',
  path: '/',
  query: {},
  body: {},
  cookies: {},
  headers: {},
  ...overrides,
})

// `processLoginRequest()`/`processLaunch()` are `private` -- only reachable
// through the routes `prepareHttpRoutes()` registers -- so every scenario
// that used to call them directly now drives the actual registered route
// handler instead, via the fake `HttpHandler`/`HttpResponse` pair above.

type OnLaunchMock = jest.Mock<Promise<void>, [LaunchContext, HttpRequestParameters, HttpResponse]>

// `LaunchService` now bakes in a real default for each launch handler and
// exposes them as settable instance state -- this wires jest mocks in via
// the public setters instead of building a `LaunchHandlers` bag for a
// `prepareHttpRoutes(handlers)` call that no longer accepts one.
const applyLaunchHandlers = (
  service: LaunchService,
): { onResourceLink: OnLaunchMock; onDeepLinking: OnLaunchMock; onSubmissionReview: OnLaunchMock } => {
  const onResourceLink: OnLaunchMock = jest.fn<Promise<void>, [LaunchContext, HttpRequestParameters, HttpResponse]>(
    async () => undefined,
  )
  const onDeepLinking: OnLaunchMock = jest.fn<Promise<void>, [LaunchContext, HttpRequestParameters, HttpResponse]>(
    async () => undefined,
  )
  const onSubmissionReview: OnLaunchMock = jest.fn<Promise<void>, [LaunchContext, HttpRequestParameters, HttpResponse]>(
    async () => undefined,
  )
  service.setOnResourceLinkHandler(onResourceLink)
  service.setOnDeepLinkingHandler(onDeepLinking)
  service.setOnSubmissionReviewHandler(onSubmissionReview)
  return { onResourceLink, onDeepLinking, onSubmissionReview }
}

interface LoginParams {
  iss?: string
  loginHint?: string
  targetLinkUri?: string
  clientId?: string
}

const DEFAULT_LOGIN_PARAMS: Required<Omit<LoginParams, 'clientId'>> = {
  iss: 'http://localhost/moodle',
  loginHint: 'user-1',
  targetLinkUri: 'https://tool.example.com/launch',
}

// The OIDC login-initiation request itself uses the spec's own snake_case
// query param names -- this is what a real platform request looks like.
const toLoginQuery = (params: LoginParams): Record<string, string> => {
  const query: Record<string, string> = {}
  if (params.iss !== undefined) query.iss = params.iss
  if (params.loginHint !== undefined) query.login_hint = params.loginHint
  if (params.targetLinkUri !== undefined) query.target_link_uri = params.targetLinkUri
  if (params.clientId !== undefined) query.client_id = params.clientId
  return query
}

// `LoginRedirect.html` renders `window.location.href = '{{targetUrl}}'` --
// the only way to recover the redirect URL now that `processLoginRequest()`
// no longer returns it directly to a test.
const extractRedirectUrl = (html: string | undefined): string => {
  const match = /window\.location\.href = '([^']*)'/.exec(html ?? '')
  if (match === null) throw new Error('No redirect URL found in rendered login response')
  return match[1]
}

const runLogin = async (
  service: LaunchService,
  httpHandler: MockHttpHandler,
  params: LoginParams = DEFAULT_LOGIN_PARAMS,
): Promise<{ response: FakeHttpResponse; state: string; redirectUrl: URL }> => {
  applyLaunchHandlers(service)
  service.prepareHttpRoutes()
  const loginHandler = httpHandler.getHandler('/lti/login', HttpMethod.Get)
  const response = buildFakeHttpResponse()

  await loginHandler(buildRequest({ query: toLoginQuery(params) }), response)

  const state = response.cookies.find(cookie => cookie.name === STATE_COOKIE_NAME)?.value ?? ''
  return { response, state, redirectUrl: new URL(extractRedirectUrl(response.htmlBody)) }
}

const runLaunch = async (
  service: LaunchService,
  httpHandler: MockHttpHandler,
  rawIdToken: string,
  state: string,
  overrides: Partial<HttpRequestParameters> = {},
  // eslint-disable-next-line @typescript-eslint/max-params -- test helper driving the launch route end to end
): Promise<LaunchContext> => {
  const { onResourceLink, onDeepLinking, onSubmissionReview } = applyLaunchHandlers(service)
  service.prepareHttpRoutes()
  const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)

  await launchHandler(
    buildRequest({
      body: { id_token: rawIdToken, state },
      cookies: { [STATE_COOKIE_NAME]: state },
      ...overrides,
    }),
    buildFakeHttpResponse(),
  )

  const calledMock = [onResourceLink, onDeepLinking, onSubmissionReview].find(mock => mock.mock.calls.length > 0)
  if (calledMock === undefined) throw new Error('expected one of the launch handlers to have been called')
  const [context] = calledMock.mock.calls[0]
  return context
}

describe('LaunchService.getLaunchContext()', () => {
  it('resumes a previously-processed launch by its ltik', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
    const state = oidcService.buildStateToken(platform)
    const token = await signToken(databaseManager, buildClaims())
    const original = await runLaunch(service, httpHandler, token, state)

    const resumed = await service.getLaunchContext(original.ltik)

    expect(resumed.platform.id).toBe(platform.id)
    expect(resumed.idToken.platform.url).toBe('http://localhost/moodle')
    expect(resumed.ltik).toBe(original.ltik)
  })

  it('throws INVALID_LTIK for a malformed token (no tid claim)', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const { launchService: service } = buildServices(databaseManager)
    const ltik = jwt.sign({}, platform.keys.private, { algorithm: 'RS256' })

    await expect(service.getLaunchContext(ltik)).rejects.toThrow('INVALID_LTIK')
  })

  it('throws SESSION_NOT_FOUND for a well-formed, correctly-signed ltik whose tid matches no stored record', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const { launchService: service } = buildServices(databaseManager)
    const ltik = jwt.sign({ tid: 'missing-id' }, platform.keys.private, { algorithm: 'RS256' })

    await expect(service.getLaunchContext(ltik)).rejects.toThrow('SESSION_NOT_FOUND')
  })

  it('throws PLATFORM_NOT_FOUND when the stored id token points at a platform that no longer exists', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
    const state = oidcService.buildStateToken(platform)
    const token = await signToken(databaseManager, buildClaims())
    const context = await runLaunch(service, httpHandler, token, state)
    await databaseManager.deletePlatformById(platform.id)

    await expect(service.getLaunchContext(context.ltik)).rejects.toThrow('PLATFORM_NOT_FOUND')
  })

  it('throws INVALID_LTIK for an ltik signed with a different platform key than the one that issued it', async () => {
    const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
    const otherKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    })
    const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
    const state = oidcService.buildStateToken(platform)
    const token = await signToken(databaseManager, buildClaims())
    const context = await runLaunch(service, httpHandler, token, state)
    const forgedLtik = jwt.sign({ tid: context.rawIdToken.id }, otherKeyPair.privateKey, { algorithm: 'RS256' })

    await expect(service.getLaunchContext(forgedLtik)).rejects.toThrow('INVALID_LTIK')
  })
})

describe('LaunchService.prepareHttpRoutes()', () => {
  describe('login route', () => {
    it('sets the state cookie and renders the localStorage double-submit redirect page', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, httpHandler } = buildServices(databaseManager)

      const { response, state } = await runLogin(service, httpHandler)

      expect(state).not.toBe('')
      expect(response.htmlBody).toContain('localStorage.setItem')
      expect(response.htmlBody).toContain(state)
    })

    it('redirects to the platform authentication endpoint, with redirect_uri/state query params set', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, httpHandler } = buildServices(databaseManager)

      const { state, redirectUrl } = await runLogin(service, httpHandler)

      expect(redirectUrl.origin + redirectUrl.pathname).toBe('http://localhost/moodle/auth')
      expect(redirectUrl.searchParams.get('redirect_uri')).toBe('https://tool.example.com/launch')
      expect(redirectUrl.searchParams.get('state')).toBe(state)
    })

    it('issues a state whose JWT is verifiable by OidcService', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)

      const { state } = await runLogin(service, httpHandler)

      await expect(oidcService.validateStateToken(state, platform)).resolves.toMatchObject({})
    })

    it('stashes target_link_uri query params into the state JWT, strippable from redirect_uri', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)

      const { state, redirectUrl } = await runLogin(service, httpHandler, {
        ...DEFAULT_LOGIN_PARAMS,
        targetLinkUri: 'https://tool.example.com/launch?course=1',
      })

      expect(redirectUrl.searchParams.get('redirect_uri')).toBe('https://tool.example.com/launch')
      await expect(oidcService.validateStateToken(state, platform)).resolves.toMatchObject({
        query: { course: '1' },
      })
    })

    it('throws a ValidationError when a required param is empty', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, httpHandler } = buildServices(databaseManager)

      await expect(runLogin(service, httpHandler, { ...DEFAULT_LOGIN_PARAMS, iss: '' })).rejects.toBeInstanceOf(
        ValidationError,
      )
    })

    it('throws a ValidationError when a required param is entirely omitted, not just empty', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, httpHandler } = buildServices(databaseManager)

      await expect(runLogin(service, httpHandler, { ...DEFAULT_LOGIN_PARAMS, iss: undefined })).rejects.toBeInstanceOf(
        ValidationError,
      )
    })

    it('sends the default 400 UNREGISTERED_PLATFORM response when no platform matches (no override set)', async () => {
      const databaseManager = buildMockDatabaseManager()
      const { launchService: service, httpHandler } = buildServices(databaseManager)
      applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const loginHandler = httpHandler.getHandler('/lti/login', HttpMethod.Get)
      const response = buildFakeHttpResponse()

      await loginHandler(buildRequest({ query: toLoginQuery(DEFAULT_LOGIN_PARAMS) }), response)

      expect(response.statusCode).toBe(400)
      expect(response.jsonBody).toEqual({ error: 'UnregisteredPlatformError', message: 'UNREGISTERED_PLATFORM' })
    })

    it('sends the default 401 PLATFORM_NOT_ACTIVATED response when the matching platform is inactive (no override set)', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform({ active: false })
      const { launchService: service, httpHandler } = buildServices(databaseManager)
      applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const loginHandler = httpHandler.getHandler('/lti/login', HttpMethod.Get)
      const response = buildFakeHttpResponse()

      await loginHandler(buildRequest({ query: toLoginQuery(DEFAULT_LOGIN_PARAMS) }), response)

      expect(response.statusCode).toBe(401)
      expect(response.jsonBody).toEqual({ error: 'PlatformNotActivatedError', message: 'PLATFORM_NOT_ACTIVATED' })
    })

    it('delegates to onUnregisteredPlatform instead of throwing, matching legacy: the handler fully owns the response and the login flow does not continue', async () => {
      const databaseManager = buildMockDatabaseManager()
      const { launchService: service, httpHandler } = buildServices(databaseManager)
      const onUnregisteredPlatform = jest.fn(async (request: HttpRequestParameters, response: HttpResponse) => {
        expect(request.query.iss).toBe('http://localhost/moodle')
        response.status(400).json({ error: 'UNREGISTERED_PLATFORM' })
      })
      service.setOnUnregisteredPlatformHandler(onUnregisteredPlatform)
      service.prepareHttpRoutes()
      const loginHandler = httpHandler.getHandler('/lti/login', HttpMethod.Get)
      const response = buildFakeHttpResponse()

      await loginHandler(buildRequest({ query: toLoginQuery(DEFAULT_LOGIN_PARAMS) }), response)

      expect(onUnregisteredPlatform).toHaveBeenCalledTimes(1)
      expect(response.jsonBody).toEqual({ error: 'UNREGISTERED_PLATFORM' })
      expect(response.cookies).toHaveLength(0)
      expect(response.htmlBody).toBeUndefined()
    })

    it('delegates to onInactivePlatform instead of throwing, matching legacy: the handler fully owns the response and the login flow does not continue', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform({ active: false })
      const { launchService: service, httpHandler } = buildServices(databaseManager)
      const onInactivePlatform = jest.fn(async (request: HttpRequestParameters, response: HttpResponse) => {
        expect(request.query.iss).toBe('http://localhost/moodle')
        response.status(401).json({ error: 'PLATFORM_NOT_ACTIVATED' })
      })
      service.setOnInactivePlatformHandler(onInactivePlatform)
      service.prepareHttpRoutes()
      const loginHandler = httpHandler.getHandler('/lti/login', HttpMethod.Get)
      const response = buildFakeHttpResponse()

      await loginHandler(buildRequest({ query: toLoginQuery(DEFAULT_LOGIN_PARAMS) }), response)

      expect(onInactivePlatform).toHaveBeenCalledTimes(1)
      expect(response.jsonBody).toEqual({ error: 'PLATFORM_NOT_ACTIVATED' })
      expect(response.cookies).toHaveLength(0)
      expect(response.htmlBody).toBeUndefined()
    })

    it('setOnUnregisteredPlatformHandler() called after prepareHttpRoutes() still takes effect on the next request', async () => {
      const databaseManager = buildMockDatabaseManager()
      const { launchService: service, httpHandler } = buildServices(databaseManager)
      service.prepareHttpRoutes()
      const loginHandler = httpHandler.getHandler('/lti/login', HttpMethod.Get)
      const onUnregisteredPlatform = jest.fn(async (_request: HttpRequestParameters, response: HttpResponse) => {
        response.status(400).json({ error: 'custom' })
      })
      service.setOnUnregisteredPlatformHandler(onUnregisteredPlatform)
      const response = buildFakeHttpResponse()

      await loginHandler(buildRequest({ query: toLoginQuery(DEFAULT_LOGIN_PARAMS) }), response)

      expect(onUnregisteredPlatform).toHaveBeenCalledTimes(1)
      expect(response.jsonBody).toEqual({ error: 'custom' })
    })

    it('resolves the platform when an explicit clientId is provided', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, httpHandler } = buildServices(databaseManager)

      const { redirectUrl } = await runLogin(service, httpHandler, { ...DEFAULT_LOGIN_PARAMS, clientId: 'ClientId1' })

      expect(redirectUrl.searchParams.get('client_id')).toBe(platform.clientId)
    })

    it('sends the default 400 UNREGISTERED_PLATFORM response when no platform matches the given clientId', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, httpHandler } = buildServices(databaseManager)
      applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const loginHandler = httpHandler.getHandler('/lti/login', HttpMethod.Get)
      const response = buildFakeHttpResponse()

      await loginHandler(
        buildRequest({ query: toLoginQuery({ ...DEFAULT_LOGIN_PARAMS, clientId: 'OtherClient' }) }),
        response,
      )

      expect(response.statusCode).toBe(400)
      expect(response.jsonBody).toEqual({ error: 'UnregisteredPlatformError', message: 'UNREGISTERED_PLATFORM' })
    })

    it('sends the default 401 PLATFORM_NOT_ACTIVATED response when the matching platform is inactive, with an explicit clientId', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform({ active: false })
      const { launchService: service, httpHandler } = buildServices(databaseManager)
      applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const loginHandler = httpHandler.getHandler('/lti/login', HttpMethod.Get)
      const response = buildFakeHttpResponse()

      await loginHandler(
        buildRequest({ query: toLoginQuery({ ...DEFAULT_LOGIN_PARAMS, clientId: 'ClientId1' }) }),
        response,
      )

      expect(response.statusCode).toBe(401)
      expect(response.jsonBody).toEqual({ error: 'PlatformNotActivatedError', message: 'PLATFORM_NOT_ACTIVATED' })
    })

    it('registers the login route on the configured path when a custom LaunchRoutes is given', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, httpHandler } = buildServices(databaseManager)

      service.prepareHttpRoutes({
        loginRoute: '/custom/login',
        launchRoute: '/custom/launch',
      })

      expect(() => httpHandler.getHandler('/custom/login', HttpMethod.Get)).not.toThrow()
      expect(() => httpHandler.getHandler('/lti/login', HttpMethod.Get)).toThrow()
    })
  })

  describe('launch route', () => {
    it('completes a resource-link launch and dispatches to onResourceLink only', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform, { course: '1' })
      const token = await signToken(databaseManager, buildClaims())
      const { onResourceLink, onDeepLinking, onSubmissionReview } = applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)

      await launchHandler(
        buildRequest({ body: { id_token: token, state }, cookies: { [STATE_COOKIE_NAME]: state } }),
        buildFakeHttpResponse(),
      )

      expect(onResourceLink).toHaveBeenCalledTimes(1)
      expect(onDeepLinking).not.toHaveBeenCalled()
      expect(onSubmissionReview).not.toHaveBeenCalled()
      const [context] = onResourceLink.mock.calls[0]
      expect(context.platform.id).toBe(platform.id)
      expect(context.idToken.platform.url).toBe('http://localhost/moodle')
      expect(context.legacyIdToken.iss).toBe('http://localhost/moodle')
      expect(context.rawIdToken.id).toEqual(expect.any(String))
      expect(context.ltik).toEqual(expect.any(String))
      expect(jwt.decode(context.ltik)).toMatchObject({ tid: context.rawIdToken.id })
    })

    it('runs state-token and id-token validation concurrently, not sequentially', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims())
      applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)

      const events: string[] = []
      const originalValidateStateToken = oidcService.validateStateToken.bind(oidcService)
      const originalValidateIdToken = oidcService.validateIdToken.bind(oidcService)
      jest
        .spyOn(oidcService, 'validateStateToken')
        .mockImplementation(async (...args: Parameters<typeof originalValidateStateToken>) => {
          events.push('state:start')
          const result = await originalValidateStateToken(...args)
          events.push('state:end')
          return result
        })
      jest
        .spyOn(oidcService, 'validateIdToken')
        .mockImplementation(async (...args: Parameters<typeof originalValidateIdToken>) => {
          events.push('idToken:start')
          const result = await originalValidateIdToken(...args)
          events.push('idToken:end')
          return result
        })

      await launchHandler(
        buildRequest({ body: { id_token: token, state }, cookies: { [STATE_COOKIE_NAME]: state } }),
        buildFakeHttpResponse(),
      )

      // idToken validation starts before state validation finishes -- proves they run concurrently
      // rather than one strictly waiting for the other to finish first.
      expect(events.indexOf('idToken:start')).toBeLessThan(events.indexOf('state:end'))
    })

    it('throws PRIVATE_KEY_NOT_FOUND instead of signing a ltik with an empty key when the platform has none', async () => {
      // The private key must exist at login time (OidcService.buildStateToken() requires it too), so
      // the only way a launch reaches buildLtik() with no private key is a race: valid keys at login,
      // then rotated/cleared before the launch callback completes.
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims())
      applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)
      await databaseManager.updatePlatformById(platform.id, { keys: { ...platform.keys, private: '' } })

      await expect(
        launchHandler(
          buildRequest({ body: { id_token: token, state }, cookies: { [STATE_COOKIE_NAME]: state } }),
          buildFakeHttpResponse(),
        ),
      ).rejects.toThrow('PRIVATE_KEY_NOT_FOUND')
    })

    it('sends the default 200 "It works!" response for a resource-link launch when no handler is set', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims())
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)
      const response = buildFakeHttpResponse()

      await launchHandler(
        buildRequest({ body: { id_token: token, state }, cookies: { [STATE_COOKIE_NAME]: state } }),
        response,
      )

      expect(response.statusCode).toBe(200)
      expect(response.htmlBody).toBe('It works!')
    })

    it('setOnResourceLinkHandler() called after prepareHttpRoutes() still takes effect on the next request', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims())
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)
      const { onResourceLink } = applyLaunchHandlers(service)

      await launchHandler(
        buildRequest({ body: { id_token: token, state }, cookies: { [STATE_COOKIE_NAME]: state } }),
        buildFakeHttpResponse(),
      )

      expect(onResourceLink).toHaveBeenCalledTimes(1)
    })

    it('dispatches a deep-linking launch to onDeepLinking only', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(
        databaseManager,
        buildClaims({ [IdTokenClaim.MessageType]: LtiMessageType.DeepLinkingRequest }),
      )
      const { onResourceLink, onDeepLinking, onSubmissionReview } = applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)

      await launchHandler(
        buildRequest({ body: { id_token: token, state }, cookies: { [STATE_COOKIE_NAME]: state } }),
        buildFakeHttpResponse(),
      )

      expect(onDeepLinking).toHaveBeenCalledTimes(1)
      expect(onResourceLink).not.toHaveBeenCalled()
      expect(onSubmissionReview).not.toHaveBeenCalled()
    })

    it('dispatches a submission-review launch to onSubmissionReview only', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(
        databaseManager,
        buildClaims({
          [IdTokenClaim.MessageType]: LtiMessageType.SubmissionReviewRequest,
          [IdTokenClaim.ForUser]: { user_id: 'user-2' },
          [IdTokenClaim.Endpoint]: { scope: [] },
        }),
      )
      const { onResourceLink, onDeepLinking, onSubmissionReview } = applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)

      await launchHandler(
        buildRequest({ body: { id_token: token, state }, cookies: { [STATE_COOKIE_NAME]: state } }),
        buildFakeHttpResponse(),
      )

      expect(onSubmissionReview).toHaveBeenCalledTimes(1)
      expect(onResourceLink).not.toHaveBeenCalled()
      expect(onDeepLinking).not.toHaveBeenCalled()
    })

    it('restores the login-time query params onto target_link_uri and the handler request', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform, { course: '1' })
      const token = await signToken(databaseManager, buildClaims())
      const { onResourceLink } = applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)

      await launchHandler(
        buildRequest({ body: { id_token: token, state }, cookies: { [STATE_COOKIE_NAME]: state } }),
        buildFakeHttpResponse(),
      )

      const [context, request] = onResourceLink.mock.calls[0]
      expect(context.idToken.launch.target).toBe('https://tool.example.com/launch?course=1')
      expect(request.query).toMatchObject({ course: '1' })
    })

    it('leaves target_link_uri and the handler request untouched when the login had no query to restore', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims())
      const { onResourceLink } = applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)
      const request = buildRequest({ body: { id_token: token, state }, cookies: { [STATE_COOKIE_NAME]: state } })

      await launchHandler(request, buildFakeHttpResponse())

      const [context, receivedRequest] = onResourceLink.mock.calls[0]
      expect(context.idToken.launch.target).toBe('https://tool.example.com/launch')
      expect(receivedRequest).toBe(request)
    })

    it('persists the id token, retrievable via its opaque ID', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims())

      const context = await runLaunch(service, httpHandler, token, state)

      await expect(databaseManager.getIdToken(context.rawIdToken.id)).resolves.toMatchObject({
        iss: 'http://localhost/moodle',
      })
    })

    it('wires the raw record through to both formatted representations (idToken/legacyIdToken)', async () => {
      // Detailed field-mapping coverage lives in id-token.serializer.test.ts --
      // this just confirms LaunchService actually calls the serializer and
      // threads its output through to LaunchContext, using one representative
      // field from each shape.
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(
        databaseManager,
        buildClaims({ [IdTokenClaim.Context]: { id: 'context-1' }, [IdTokenClaim.ResourceLink]: { id: 'resource-1' } }),
      )

      const context = await runLaunch(service, httpHandler, token, state)

      expect(context.idToken.launch.context).toMatchObject({ id: 'context-1' })
      expect(context.legacyIdToken.platformContext?.contextId).toBe('context-1')
    })

    it('resolves the platform from a multi-value aud id_token when the first candidate is unregistered', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims({ azp: 'ClientId1' }), {
        audience: ['UnknownClient', 'ClientId1'],
      })

      const context = await runLaunch(service, httpHandler, token, state)

      expect(context.platform.id).toBe(platform.id)
    })

    it('resolves a multi-value aud id_token with a single batched platform query, not one per candidate', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims({ azp: 'ClientId1' }), {
        audience: ['UnknownClientA', 'UnknownClientB', 'ClientId1'],
      })
      const getPlatformsSpy = jest.spyOn(databaseManager, 'getPlatforms')

      await runLaunch(service, httpHandler, token, state)

      expect(getPlatformsSpy).toHaveBeenCalledTimes(1)
    })

    it('stops at the first aud candidate with a registered platform, even if it is inactive, rather than trying later candidates', async () => {
      const { databaseManager, platform: activePlatform } = await buildDatabaseManagerWithPlatform({
        clientId: 'ActiveClient',
      })
      await databaseManager.savePlatform({
        url: activePlatform.url,
        clientId: 'InactiveClient',
        name: 'Moodle (inactive)',
        authenticationEndpoint: activePlatform.authenticationEndpoint,
        accessTokenEndpoint: activePlatform.accessTokenEndpoint,
        authorizationServer: activePlatform.authorizationServer,
        idTokenValidation: activePlatform.idTokenValidation,
        active: false,
        keys: activePlatform.keys,
      })
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(activePlatform)
      const token = await signToken(databaseManager, buildClaims({ azp: 'InactiveClient' }), {
        audience: ['InactiveClient', 'ActiveClient'],
      })

      await expect(runLaunch(service, httpHandler, token, state)).rejects.toThrow('PLATFORM_NOT_ACTIVATED')
    })

    it('propagates platform-resolution errors from an id_token pointing at an unregistered platform', async () => {
      // The state token itself is valid (built against a real, registered
      // platform) -- platform resolution now happens from the id_token
      // before the state is even checked, so an id_token whose `iss` no
      // platform matches fails with UNREGISTERED_PLATFORM regardless.
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims(), { issuer: 'http://localhost/unregistered' })

      await expect(runLaunch(service, httpHandler, token, state)).rejects.toThrow('UNREGISTERED_PLATFORM')
    })

    it('renders the localStorage recovery page when the state cookie is missing', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const { onResourceLink, onDeepLinking, onSubmissionReview } = applyLaunchHandlers(service)
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims())
      const response = buildFakeHttpResponse()

      await launchHandler(buildRequest({ body: { id_token: token, state } }), response)

      expect(response.htmlBody).toContain('localStorage.getItem')
      expect(onResourceLink).not.toHaveBeenCalled()
      expect(onDeepLinking).not.toHaveBeenCalled()
      expect(onSubmissionReview).not.toHaveBeenCalled()
    })

    it('completes the launch once the localStorage-recovered state is echoed back and matches', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims())

      const context = await runLaunch(service, httpHandler, token, state, {
        cookies: {},
        body: { id_token: token, state, ltijs_recovered_state: state },
      })

      expect(context.platform.id).toBe(platform.id)
    })

    it('the recovery page actually posts the recovered state under the field name the server reads back', async () => {
      // Regression test for a real bug: the recovery template and the server's
      // RECOVERED_STATE_FIELD drifted out of sync (template posted 'signed_state',
      // server read 'ltijs_recovered_state'), which the test above never caught
      // because it fabricates the field name directly instead of driving the real
      // template. This drives the actual rendered HTML end to end instead.
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims())

      const recoveryResponse = buildFakeHttpResponse()
      await launchHandler(buildRequest({ body: { id_token: token, state } }), recoveryResponse)

      const match = /name="([a-zA-Z0-9_]+)"\s+id="\1"\s+value=""/.exec(recoveryResponse.htmlBody ?? '')
      if (match === null) throw new Error('expected the recovery page to contain a recovered-state input field')
      const recoveredStateFieldName = match[1]

      const { onResourceLink } = applyLaunchHandlers(service)
      await launchHandler(
        buildRequest({ cookies: {}, body: { id_token: token, state, [recoveredStateFieldName]: state } }),
        buildFakeHttpResponse(),
      )

      expect(onResourceLink).toHaveBeenCalledTimes(1)
    })

    it('throws INVALID_STATE for a tampered/invalid state', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, httpHandler } = buildServices(databaseManager)
      const token = await signToken(databaseManager, buildClaims())

      await expect(runLaunch(service, httpHandler, token, 'not-a-real-state')).rejects.toThrow('INVALID_STATE')
    })

    it('surfaces a ValidationError when id_token/state are missing from the callback body', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, httpHandler } = buildServices(databaseManager)
      service.prepareHttpRoutes()
      const launchHandler = httpHandler.getHandler('/lti/launch', HttpMethod.Post)

      await expect(launchHandler(buildRequest({ body: {} }), buildFakeHttpResponse())).rejects.toBeInstanceOf(
        ValidationError,
      )
    })

    it('throws INVALID_STATE when the localStorage-recovered state does not match', async () => {
      const { databaseManager, platform } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, oidcService, httpHandler } = buildServices(databaseManager)
      const state = oidcService.buildStateToken(platform)
      const token = await signToken(databaseManager, buildClaims())

      await expect(
        runLaunch(service, httpHandler, token, state, {
          cookies: {},
          body: { id_token: token, state, ltijs_recovered_state: 'a-different-state' },
        }),
      ).rejects.toThrow('INVALID_STATE')
    })

    it('registers the launch route on the configured path when a custom LaunchRoutes is given', async () => {
      const { databaseManager } = await buildDatabaseManagerWithPlatform()
      const { launchService: service, httpHandler } = buildServices(databaseManager)

      service.prepareHttpRoutes({
        loginRoute: '/custom/login',
        launchRoute: '/custom/launch',
      })

      expect(() => httpHandler.getHandler('/custom/launch', HttpMethod.Post)).not.toThrow()
      expect(() => httpHandler.getHandler('/lti/launch', HttpMethod.Post)).toThrow()
    })
  })
})
