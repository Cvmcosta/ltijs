import request from 'supertest'
import { Provider } from '#services/provider/provider.service'
import { MongoDatabaseManager } from '#services/database-manager/mongo/mongo-database-manager.service'
import { FetchRequestHandler } from '#services/request-handler/fetch/fetch-request-handler.service'
import { ExpressHttpHandler } from '#services/http-handler/express/express-http-handler.service'
import { MockCacheManager } from '#services/cache-manager/mock/mock-cache-manager.service'
import { PlatformManager } from '#services/platform-manager/platform-manager.service'
import { KeysetService } from '#services/keyset/keyset.service'
import { DynamicRegistration } from '#services/dynamic-registration/dynamic-registration.service'
import { DynamicRegistrationNotConfiguredError } from '#services/provider/errors'
import { LaunchService } from '#services/launch/launch.service'
import { HttpMethod } from '#services/http-handler/http-handler.types'
import { buildMockDatabaseManager } from '#utils/tests/mock-database-manager'
import { buildMockHttpHandler } from '#utils/tests/mock-http-handler'
import { buildMockCacheManager } from '#utils/tests/mock-cache-manager'
import type { HttpRequestParameters, HttpResponse } from '#services/http-handler/http-handler.types'
import type { Logger } from '#services/logger/logger.types'
import type { LaunchHandlers } from '#services/launch/launch.types'
import type { LaunchContext } from '#services/launch/launch-context.service'
import type { ProviderOptions } from '#services/provider/provider.types'

const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }

const handlers: LaunchHandlers = {
  onResourceLink: async () => undefined,
  onDeepLinking: async () => undefined,
  onSubmissionReview: async () => undefined,
}

const dynamicRegistrationOptions = {
  name: 'My Tool',
  url: 'https://tool.example.com',
}

const buildOptions = (overrides: Partial<ProviderOptions> = {}): ProviderOptions => ({
  handlers,
  databaseManager: buildMockDatabaseManager(),
  httpHandler: buildMockHttpHandler(),
  requestHandler: new FetchRequestHandler(),
  logger,
  ...overrides,
})

const buildFakeResponse = (): HttpResponse => {
  const response: HttpResponse = {
    status: () => response,
    setCookie: () => response,
    clearCookie: () => response,
    redirect: () => undefined,
    html: () => undefined,
    json: () => undefined,
  }
  return response
}

const buildFakeLoginRequest = (): HttpRequestParameters => ({
  method: 'GET',
  path: '/lti/login',
  query: { iss: 'http://localhost/moodle', login_hint: 'user-1', target_link_uri: 'https://tool.example.com' },
  body: {},
  cookies: {},
  headers: {},
})

afterEach(() => {
  jest.restoreAllMocks()
  process.removeAllListeners('SIGINT')
})

describe('Provider constructor', () => {
  it('builds every collaborator from defaults when only handlers + database are given', () => {
    const provider = new Provider({ handlers, database: { url: 'mongodb://localhost/ltijs-test' } })

    expect(provider.databaseManager).toBeInstanceOf(MongoDatabaseManager)
    expect(provider.httpHandler).toBeInstanceOf(ExpressHttpHandler)
    expect(provider.platformManager).toBeInstanceOf(PlatformManager)
    expect(provider.keysetService).toBeInstanceOf(KeysetService)
    expect(provider.cacheManager).toBeInstanceOf(MockCacheManager)
    expect(provider.dynamicRegistrationService).toBeUndefined()
  })

  it('threads ProviderOptions.server.cors into the default ExpressHttpHandler', async () => {
    const provider = new Provider({
      handlers,
      database: { url: 'mongodb://localhost/ltijs-test' },
      server: { cors: { origin: ['https://allowed.example.com'] } },
    })

    const app = (provider.httpHandler as ExpressHttpHandler).app
    const allowed = await request(app).get('/lti/keys').set('Origin', 'https://allowed.example.com')
    const blocked = await request(app).get('/lti/keys').set('Origin', 'https://blocked.example.com')

    expect(allowed.headers['access-control-allow-origin']).toBe('https://allowed.example.com')
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('uses explicitly provided collaborators instead of constructing defaults', () => {
    const databaseManager = buildMockDatabaseManager()
    const httpHandler = buildMockHttpHandler()
    const requestHandler = new FetchRequestHandler()
    const cacheManager = buildMockCacheManager()

    const provider = new Provider({ handlers, databaseManager, httpHandler, requestHandler, cacheManager, logger })

    expect(provider.databaseManager).toBe(databaseManager)
    expect(provider.httpHandler).toBe(httpHandler)
    expect(provider.cacheManager).toBe(cacheManager)
  })

  it('registers login/launch/keys at their default routes, and not the register route when dynamicRegistration is omitted', () => {
    const options = buildOptions()
    const provider = new Provider(options)
    const httpHandler = options.httpHandler as ReturnType<typeof buildMockHttpHandler>
    expect(provider).toBeInstanceOf(Provider)

    expect(() => httpHandler.getHandler('/lti/login', HttpMethod.Get)).not.toThrow()
    expect(() => httpHandler.getHandler('/lti/launch', HttpMethod.Post)).not.toThrow()
    expect(() => httpHandler.getHandler('/lti/keys', HttpMethod.Get)).not.toThrow()
    expect(() => httpHandler.getHandler('/lti/register', HttpMethod.Get)).toThrow()
  })

  it('registers the register route and builds dynamicRegistrationService when dynamicRegistration is given', () => {
    const options = buildOptions({ dynamicRegistration: dynamicRegistrationOptions })
    const provider = new Provider(options)
    const httpHandler = options.httpHandler as ReturnType<typeof buildMockHttpHandler>

    expect(provider.dynamicRegistrationService).toBeInstanceOf(DynamicRegistration)
    expect(() => httpHandler.getHandler('/lti/register', HttpMethod.Get)).not.toThrow()
  })

  it('applies custom route overrides', () => {
    const options = buildOptions({
      dynamicRegistration: dynamicRegistrationOptions,
      routes: {
        loginRoute: '/custom/login',
        launchRoute: '/custom/launch',
        keysetRoute: '/custom/keys',
        dynamicRegistrationRoute: '/custom/register',
      },
    })
    const provider = new Provider(options)
    const httpHandler = options.httpHandler as ReturnType<typeof buildMockHttpHandler>
    expect(provider).toBeInstanceOf(Provider)

    expect(() => httpHandler.getHandler('/custom/login', HttpMethod.Get)).not.toThrow()
    expect(() => httpHandler.getHandler('/custom/launch', HttpMethod.Post)).not.toThrow()
    expect(() => httpHandler.getHandler('/custom/keys', HttpMethod.Get)).not.toThrow()
    expect(() => httpHandler.getHandler('/custom/register', HttpMethod.Get)).not.toThrow()
  })

  it('registers a custom onDynamicRegistration handler instead of the default one, with the built service passed to the factory', () => {
    const onDynamicRegistration = jest.fn((service: DynamicRegistration) => {
      expect(service).toBeInstanceOf(DynamicRegistration)
      return async (_request: unknown, response: { html: (content: string) => void }) => {
        response.html('<p>custom</p>')
      }
    })
    const options = buildOptions({ dynamicRegistration: dynamicRegistrationOptions, onDynamicRegistration })

    const provider = new Provider(options)

    expect(provider).toBeInstanceOf(Provider)
    expect(onDynamicRegistration).toHaveBeenCalledTimes(1)
  })

  // Full behavioral coverage (handler fully owns the response, no OIDC-flow
  // continuation) already lives in `launch.service.test.ts` -- this only
  // proves Provider threads `options.onUnregisteredPlatform` through to the
  // login route unmodified. `onInactivePlatform` is wired via the exact same
  // object literal in `provider.service.ts`, so a second full end-to-end
  // test here would just be duplicate coverage of the same plumbing.
  it('passes onUnregisteredPlatform through to the login route unmodified', async () => {
    const httpHandler = buildMockHttpHandler()
    const onUnregisteredPlatform = jest.fn(async () => undefined)
    const options = buildOptions({ httpHandler, onUnregisteredPlatform })

    const provider = new Provider(options)

    expect(provider).toBeInstanceOf(Provider)
    const loginHandler = httpHandler.getHandler('/lti/login', HttpMethod.Get)
    await loginHandler(buildFakeLoginRequest(), buildFakeResponse())

    expect(onUnregisteredPlatform).toHaveBeenCalledTimes(1)
  })

  it('constructor-time options.handlers.onResourceLink is wired through the same public onResourceLink() method', () => {
    const onResourceLinkSpy = jest.spyOn(Provider.prototype, 'onResourceLink')

    const provider = new Provider(buildOptions())

    expect(provider).toBeInstanceOf(Provider)
    expect(onResourceLinkSpy).toHaveBeenCalledWith(handlers.onResourceLink)
  })

  it('onConnect() is an alias of onResourceLink(), delegating to the exact same method', () => {
    const provider = new Provider(buildOptions())
    const onResourceLinkSpy = jest.spyOn(provider, 'onResourceLink')
    const handler = handlers.onResourceLink

    provider.onConnect(handler)

    expect(onResourceLinkSpy).toHaveBeenCalledWith(handler)
  })

  it('onDynamicRegistration() throws DynamicRegistrationNotConfiguredError when dynamicRegistration was not configured', () => {
    const provider = new Provider(buildOptions())

    expect(() => {
      provider.onDynamicRegistration(async () => undefined)
    }).toThrow(DynamicRegistrationNotConfiguredError)
  })

  it('onDynamicRegistration() swaps the registration route handler when dynamicRegistration was configured', async () => {
    const httpHandler = buildMockHttpHandler()
    const provider = new Provider(buildOptions({ httpHandler, dynamicRegistration: dynamicRegistrationOptions }))
    const response = buildFakeResponse() as HttpResponse & { htmlBody?: string }
    response.html = (content: string) => {
      response.htmlBody = content
    }
    const customHandler = jest.fn(async (_request: HttpRequestParameters, res: HttpResponse) => {
      res.html('<p>post-construction custom</p>')
    })

    provider.onDynamicRegistration(customHandler)

    const handler = httpHandler.getHandler('/lti/register', HttpMethod.Get)
    await handler(buildFakeLoginRequest(), response)

    expect(customHandler).toHaveBeenCalledTimes(1)
    expect(response.htmlBody).toBe('<p>post-construction custom</p>')
  })

  // Full behavioral coverage of LaunchService.getLaunchContext() itself (INVALID_LTIK,
  // SESSION_NOT_FOUND, PLATFORM_NOT_FOUND, real resumption) already lives in
  // launch.service.test.ts -- this only proves it's actually reachable through Provider's public API
  // and forwards its argument/return value correctly, closing the gap where the method existed but
  // nothing on Provider ever called it.
  it('getLaunchContext() delegates to the internal LaunchService', async () => {
    const fakeContext = { platform: { id: 'platform-1' } } as unknown as LaunchContext
    const getLaunchContextSpy = jest.spyOn(LaunchService.prototype, 'getLaunchContext').mockResolvedValue(fakeContext)
    const provider = new Provider(buildOptions())

    const context = await provider.getLaunchContext('some-ltik')

    expect(getLaunchContextSpy).toHaveBeenCalledWith('some-ltik')
    expect(context).toBe(fakeContext)
  })
})

describe('Provider.deploy() / Provider.close()', () => {
  it('sets up the database and starts the http handler on the default port', async () => {
    const databaseManager = buildMockDatabaseManager()
    const httpHandler = buildMockHttpHandler()
    const setupSpy = jest.spyOn(databaseManager, 'setup')
    const listenSpy = jest.spyOn(httpHandler, 'listen')
    const provider = new Provider(buildOptions({ databaseManager, httpHandler, dynamicRegistration: undefined }))

    await provider.deploy({ silent: true })

    expect(setupSpy).toHaveBeenCalled()
    expect(listenSpy).toHaveBeenCalledWith(3000, undefined)
  })

  it('starts the http handler on a custom port when given via ProviderOptions.server', async () => {
    const httpHandler = buildMockHttpHandler()
    const listenSpy = jest.spyOn(httpHandler, 'listen')
    const provider = new Provider(buildOptions({ httpHandler, server: { port: 4321 } }))

    await provider.deploy({ silent: true })

    expect(listenSpy).toHaveBeenCalledWith(4321, undefined)
  })

  it('passes ssl options through to the http handler when given via ProviderOptions.server', async () => {
    const httpHandler = buildMockHttpHandler()
    const listenSpy = jest.spyOn(httpHandler, 'listen')
    const ssl = { key: 'fake-key', cert: 'fake-cert' }
    const provider = new Provider(buildOptions({ httpHandler, server: { port: 4321, ssl } }))

    await provider.deploy({ silent: true })

    expect(listenSpy).toHaveBeenCalledWith(4321, ssl)
  })

  it('prints the startup banner unless silent is true', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const provider = new Provider(buildOptions())

    await provider.deploy()

    expect(consoleSpy).toHaveBeenCalled()
  })

  it('does not print the startup banner when silent is true', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const provider = new Provider(buildOptions())

    await provider.deploy({ silent: true })

    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('sets up the cache manager on deploy() and closes it on close()', async () => {
    const cacheManager = buildMockCacheManager()
    const setupSpy = jest.spyOn(cacheManager, 'setup')
    const closeSpy = jest.spyOn(cacheManager, 'close')
    const provider = new Provider(buildOptions({ cacheManager, dynamicRegistration: undefined }))

    await provider.deploy({ silent: true })
    expect(setupSpy).toHaveBeenCalled()

    await provider.close()
    expect(closeSpy).toHaveBeenCalled()
  })

  it('close() closes the http handler and the database manager', async () => {
    const databaseManager = buildMockDatabaseManager()
    const httpHandler = buildMockHttpHandler()
    const closeDbSpy = jest.spyOn(databaseManager, 'close')
    const closeHttpSpy = jest.spyOn(httpHandler, 'close')
    const provider = new Provider(buildOptions({ databaseManager, httpHandler }))

    await provider.close()

    expect(closeHttpSpy).toHaveBeenCalled()
    expect(closeDbSpy).toHaveBeenCalled()
  })

  it('installs a SIGINT handler that closes the provider and exits the process', async () => {
    const databaseManager = buildMockDatabaseManager()
    const httpHandler = buildMockHttpHandler()
    const closeDbSpy = jest.spyOn(databaseManager, 'close')
    const closeHttpSpy = jest.spyOn(httpHandler, 'close')
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const provider = new Provider(buildOptions({ databaseManager, httpHandler }))

    await provider.deploy({ silent: true })
    process.emit('SIGINT')
    await new Promise(resolve => setImmediate(resolve))

    expect(closeHttpSpy).toHaveBeenCalled()
    expect(closeDbSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalled()
  })
})
