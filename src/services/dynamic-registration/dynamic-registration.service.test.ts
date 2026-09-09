import * as authorizationHeader from '#utils/request/authorization-header'
import { DynamicRegistration } from '#services/dynamic-registration/dynamic-registration.service'
import { PlatformManager } from '#services/platform-manager/platform-manager.service'
import { FetchRequestHandler } from '#services/request-handler/fetch/fetch-request-handler.service'
import { buildMockDatabaseManager } from '#utils/tests/mock-database-manager'
import { buildMockFetchResponse } from '#utils/tests/mock-fetch-response'
import { buildMockHttpHandler } from '#utils/tests/mock-http-handler'
import { expectValidationErrorOnField } from '#utils/tests/expect-validation-error'
import { HttpMethod } from '#services/http-handler/http-handler.types'
import type { HttpRequestParameters, HttpResponse } from '#services/http-handler/http-handler.types'
import type { Logger } from '#services/logger/logger.types'
import type { DatabaseManager } from '#services/database-manager/database-manager.types'
import type {
  DynamicRegistrationOptions,
  OpenIDConfiguration,
} from '#services/dynamic-registration/dynamic-registration.types'

const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }
const requestHandler = new FetchRequestHandler()

afterEach(() => {
  jest.restoreAllMocks()
})

const registrationOptions: DynamicRegistrationOptions = {
  name: 'My Tool',
  url: 'https://tool.example.com',
  redirectUris: ['https://tool.example.com/extra-redirect'],
}

const routes = {
  appRoute: '/',
  loginRoute: '/login',
  keysetRoute: '/keys',
}

const openIdConfiguration: OpenIDConfiguration = {
  issuer: 'http://localhost/moodle',
  authorization_endpoint: 'http://localhost/moodle/auth',
  token_endpoint: 'http://localhost/moodle/AccessTokenUrl',
  registration_endpoint: 'http://localhost/moodle/register',
  jwks_uri: 'http://localhost/moodle/keyset',
}

const buildService = (
  databaseManager: DatabaseManager = buildMockDatabaseManager(),
  options: DynamicRegistrationOptions = registrationOptions,
  httpHandler: ReturnType<typeof buildMockHttpHandler> = buildMockHttpHandler(),
): DynamicRegistration => {
  const platformManager = new PlatformManager(databaseManager, logger)
  return new DynamicRegistration(options, routes, platformManager, requestHandler, httpHandler, logger)
}

describe('DynamicRegistration.getOpenIDConfiguration()', () => {
  it('fetches and returns the OpenID configuration from the given url, frozen', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: openIdConfiguration }))
    const service = buildService()

    const configuration = await service.getOpenIDConfiguration(
      'http://localhost/moodle/.well-known/openid-configuration',
    )

    expect(configuration).toEqual(openIdConfiguration)
    expect(Object.isFrozen(configuration)).toBe(true)
  })

  it('throws a ValidationError when the response is missing required fields', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { issuer: 'http://localhost/moodle' } }))
    const service = buildService()

    await expectValidationErrorOnField(
      service.getOpenIDConfiguration('http://localhost/moodle/.well-known/openid-configuration'),
      'authorization_endpoint',
    )
  })
})

describe('DynamicRegistration.register()', () => {
  it('throws MISSING_OPENID_CONFIGURATION_URL when no url is provided', async () => {
    const service = buildService()
    await expect(service.register(undefined)).rejects.toThrow('MISSING_OPENID_CONFIGURATION_URL')
  })

  it('fetches the configuration, performs registration, and returns the finalize snippet', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async input => {
      const url = input as string
      if (url === 'http://localhost/moodle/.well-known/openid-configuration') {
        return buildMockFetchResponse({ body: openIdConfiguration })
      }
      return buildMockFetchResponse({ body: { client_id: 'ClientId1' } })
    })
    const service = buildService()

    const result = await service.register('http://localhost/moodle/.well-known/openid-configuration')

    expect(result).toBe(service.FINALIZE_REGISTRATION_HTML_SNIPPET)
  })
})

describe('DynamicRegistration.performRegistration()', () => {
  it('throws PLATFORM_ALREADY_REGISTERED when a platform with the same issuer/clientId already exists', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const databaseManager = buildMockDatabaseManager()
    const service = buildService(databaseManager)
    await service.performRegistration(openIdConfiguration)

    await expect(service.performRegistration(openIdConfiguration)).rejects.toThrow('PLATFORM_ALREADY_REGISTERED')
  })

  it('throws a ValidationError when the registration response is missing client_id', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: {} }))
    const service = buildService()

    await expectValidationErrorOnField(service.performRegistration(openIdConfiguration), 'client_id')
  })

  it('posts a registration request built from the tool options and OpenID configuration', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService()

    await service.performRegistration(openIdConfiguration)

    const [, calledInit] = fetchSpy.mock.calls[0]
    const body = JSON.parse(calledInit?.body as string) as Record<string, unknown>
    expect(body.client_name).toBe('My Tool')
    expect(body.jwks_uri).toContain('/keys')
    expect(body.initiate_login_uri).toContain('/login')
    expect(body.application_type).toBe('web')
    expect(body.token_endpoint_auth_method).toBe('private_key_jwt')
    expect(body.scope).toBe(
      [
        'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
        'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
        'https://purl.imsglobal.org/spec/lti-ags/scope/score',
        'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
        'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
      ].join(' '),
    )
  })

  // Regression test for a real bug: `new URL(path, baseUrl)` treats a leading-slash path as an
  // absolute-path reference, which replaces the base URL's entire path rather than appending to it, so
  // a tool deployed behind a reverse proxy or subpath (e.g. mounted at /mytool) had its own path
  // prefix silently dropped from every URL sent to the platform. Every other test in this suite uses a
  // root-domain `url` (no path prefix), which is exactly why this went uncaught.
  it("preserves the tool's own URL path prefix when building initiate_login_uri/jwks_uri/redirect_uris", async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService(buildMockDatabaseManager(), {
      ...registrationOptions,
      url: 'https://school.example.com/mytool',
    })

    await service.performRegistration(openIdConfiguration)

    const [, calledInit] = fetchSpy.mock.calls[0]
    const body = JSON.parse(calledInit?.body as string) as Record<string, unknown>
    expect(body.initiate_login_uri).toBe('https://school.example.com/mytool/login')
    expect(body.jwks_uri).toBe('https://school.example.com/mytool/keys')
    expect(body.redirect_uris).toContain('https://school.example.com/mytool/')
  })

  it('includes an Authorization header when a registrationToken is provided', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService()

    await service.performRegistration(openIdConfiguration, 'reg-token')

    const [, calledInit] = fetchSpy.mock.calls[0]
    expect((calledInit?.headers as Record<string, string>).Authorization).toBe('Bearer reg-token')
  })

  it('builds the Authorization header via the shared buildBearerAuthorization() helper, not a hand-rolled string', async () => {
    const buildBearerAuthorizationSpy = jest.spyOn(authorizationHeader, 'buildBearerAuthorization')
    jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService()

    await service.performRegistration(openIdConfiguration, 'reg-token')

    expect(buildBearerAuthorizationSpy).toHaveBeenCalledWith('reg-token')
  })

  it('registers the platform inactive by default', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService()

    const result = await service.performRegistration(openIdConfiguration)

    expect(result.active).toBe(false)
  })

  it('registers the platform active when options.autoActivate is true', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService(buildMockDatabaseManager(), { ...registrationOptions, autoActivate: true })

    const result = await service.performRegistration(openIdConfiguration)

    expect(result.active).toBe(true)
  })

  it('builds the platform with a JWK_SET idTokenValidation pointing at the configuration jwks_uri', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService()

    const result = await service.performRegistration(openIdConfiguration)

    expect(result.idTokenValidation).toEqual({ method: 'JWK_SET', key: openIdConfiguration.jwks_uri })
    expect(result.url).toBe(openIdConfiguration.issuer)
    expect(result.clientId).toBe('ClientId1')
  })

  it('includes LtiResourceLinkRequest and LtiDeepLinkingRequest messages by default', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService()

    await service.performRegistration(openIdConfiguration)

    const [, calledInit] = fetchSpy.mock.calls[0]
    const body = JSON.parse(calledInit?.body as string) as Record<string, Record<string, unknown>>
    const messages = body['https://purl.imsglobal.org/spec/lti-tool-configuration'].messages as Array<
      Record<string, unknown>
    >
    expect(messages.map(message => message.type)).toEqual(['LtiResourceLinkRequest', 'LtiDeepLinkingRequest'])
  })

  it('omits the LtiDeepLinkingRequest message when useDeepLinking is false', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService(buildMockDatabaseManager(), { ...registrationOptions, useDeepLinking: false })

    await service.performRegistration(openIdConfiguration)

    const [, calledInit] = fetchSpy.mock.calls[0]
    const body = JSON.parse(calledInit?.body as string) as Record<string, Record<string, unknown>>
    const messages = body['https://purl.imsglobal.org/spec/lti-tool-configuration'].messages as Array<
      Record<string, unknown>
    >
    expect(messages.map(message => message.type)).toEqual(['LtiResourceLinkRequest'])
  })

  it('applies resourceLinkMessage/deepLinkingMessage overrides to the matching message', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService(buildMockDatabaseManager(), {
      ...registrationOptions,
      resourceLinkMessage: { label: 'Launch' },
      deepLinkingMessage: {
        targetLinkUri: 'https://tool.example.com/select',
        placements: ['ContentArea'],
        customParameters: { mode: 'select' },
      },
    })

    await service.performRegistration(openIdConfiguration)

    const [, calledInit] = fetchSpy.mock.calls[0]
    const body = JSON.parse(calledInit?.body as string) as Record<string, Record<string, unknown>>
    const messages = body['https://purl.imsglobal.org/spec/lti-tool-configuration'].messages as Array<
      Record<string, unknown>
    >
    expect(messages[0]).toMatchObject({ type: 'LtiResourceLinkRequest', label: 'Launch' })
    expect(messages[1]).toMatchObject({
      type: 'LtiDeepLinkingRequest',
      target_link_uri: 'https://tool.example.com/select',
      placements: ['ContentArea'],
      custom_parameters: { mode: 'select' },
    })
  })

  it('overrides replaces a top-level field of the constructed registration body', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService()

    await service.performRegistration(openIdConfiguration, undefined, {
      token_endpoint_auth_method: 'client_secret_post',
    })

    const [, calledInit] = fetchSpy.mock.calls[0]
    const body = JSON.parse(calledInit?.body as string) as Record<string, unknown>
    expect(body.token_endpoint_auth_method).toBe('client_secret_post')
  })

  it('overrides deep-merges into a nested claim without dropping its other fields', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ body: { client_id: 'ClientId1' } }))
    const service = buildService()

    await service.performRegistration(openIdConfiguration, undefined, {
      'https://purl.imsglobal.org/spec/lti-tool-configuration': { vendor_specific: 'value' },
    })

    const [, calledInit] = fetchSpy.mock.calls[0]
    const body = JSON.parse(calledInit?.body as string) as Record<string, Record<string, unknown>>
    const toolConfiguration = body['https://purl.imsglobal.org/spec/lti-tool-configuration']
    expect(toolConfiguration.vendor_specific).toBe('value')
    expect(toolConfiguration.domain).toBe('tool.example.com')
  })
})

const buildRequest = (query: Record<string, string | string[]> = {}): HttpRequestParameters => ({
  method: 'GET',
  path: '/lti/register',
  query,
  body: {},
  headers: {},
})

interface FakeHttpResponse extends HttpResponse {
  htmlBody?: string
}

const buildFakeHttpResponse = (): FakeHttpResponse => {
  const response: FakeHttpResponse = {
    status: () => response,
    redirect: () => undefined,
    json: () => undefined,
    html: content => {
      response.htmlBody = content
    },
  }
  return response
}

describe('DynamicRegistration.prepareHttpRoutes()', () => {
  it('registers a GET route at /lti/register that performs registration and responds with the finalize snippet', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async input => {
      const url = input as string
      if (url === 'http://localhost/moodle/.well-known/openid-configuration') {
        return buildMockFetchResponse({ body: openIdConfiguration })
      }
      return buildMockFetchResponse({ body: { client_id: 'ClientId1' } })
    })
    const httpHandler = buildMockHttpHandler()
    const service = buildService(buildMockDatabaseManager(), registrationOptions, httpHandler)
    service.prepareHttpRoutes()

    const handler = httpHandler.getHandler('/lti/register', HttpMethod.Get)
    const response = buildFakeHttpResponse()
    await handler(
      buildRequest({ openid_configuration: 'http://localhost/moodle/.well-known/openid-configuration' }),
      response,
    )

    expect(response.htmlBody).toBe(service.FINALIZE_REGISTRATION_HTML_SNIPPET)
  })

  it('throws a ValidationError when openid_configuration is missing from the query', async () => {
    const httpHandler = buildMockHttpHandler()
    const service = buildService(buildMockDatabaseManager(), registrationOptions, httpHandler)
    service.prepareHttpRoutes()
    const handler = httpHandler.getHandler('/lti/register', HttpMethod.Get)

    await expectValidationErrorOnField(handler(buildRequest(), buildFakeHttpResponse()), 'openid_configuration')
  })

  // Regression test for a real gap: Express produces an array, not a string, for a repeated query key
  // (?openid_configuration=a&openid_configuration=b). Reaching register() with an array used to crash
  // with a confusing "Failed to parse URL" 500 instead of a clean validation error, since the only check
  // in register() itself was `=== undefined`, which an array doesn't satisfy either way.
  it('throws a ValidationError when openid_configuration is an array (a repeated query key)', async () => {
    const httpHandler = buildMockHttpHandler()
    const service = buildService(buildMockDatabaseManager(), registrationOptions, httpHandler)
    service.prepareHttpRoutes()
    const handler = httpHandler.getHandler('/lti/register', HttpMethod.Get)

    await expectValidationErrorOnField(
      handler(buildRequest({ openid_configuration: ['a', 'b'] }), buildFakeHttpResponse()),
      'openid_configuration',
    )
  })

  it('registers the route on a custom path when one is given', () => {
    const httpHandler = buildMockHttpHandler()
    const service = buildService(buildMockDatabaseManager(), registrationOptions, httpHandler)

    service.prepareHttpRoutes('/custom/register')

    expect(() => httpHandler.getHandler('/custom/register', HttpMethod.Get)).not.toThrow()
    expect(() => httpHandler.getHandler('/lti/register', HttpMethod.Get)).toThrow()
  })

  it('registers a custom handler instead of the default one when given', async () => {
    const httpHandler = buildMockHttpHandler()
    const service = buildService(buildMockDatabaseManager(), registrationOptions, httpHandler)
    const customHandler = jest.fn(async (_request, response: HttpResponse) => {
      response.html('<p>custom</p>')
    })
    service.setHandler(customHandler)

    service.prepareHttpRoutes('/lti/register')

    const handler = httpHandler.getHandler('/lti/register', HttpMethod.Get)
    const response = buildFakeHttpResponse()
    await handler(buildRequest(), response)

    expect(customHandler).toHaveBeenCalled()
    expect(response.htmlBody).toBe('<p>custom</p>')
  })

  it('setHandler() called after prepareHttpRoutes() still takes effect on the next request', async () => {
    const httpHandler = buildMockHttpHandler()
    const service = buildService(buildMockDatabaseManager(), registrationOptions, httpHandler)
    service.prepareHttpRoutes('/lti/register')
    const handler = httpHandler.getHandler('/lti/register', HttpMethod.Get)
    const customHandler = jest.fn(async (_request, response: HttpResponse) => {
      response.html('<p>custom</p>')
    })
    service.setHandler(customHandler)

    const response = buildFakeHttpResponse()
    await handler(buildRequest(), response)

    expect(customHandler).toHaveBeenCalled()
    expect(response.htmlBody).toBe('<p>custom</p>')
  })
})
