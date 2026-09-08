import type { PlatformManager } from '#services/platform-manager/platform-manager.service'
import type { RequestHandler } from '#services/request-handler/request-handler.types'
import { HttpMethod } from '#services/http-handler/http-handler.types'
import type { HttpHandler, RouteHandler } from '#services/http-handler/http-handler.types'
import type { Logger } from '#services/logger/logger.types'
import type { Platform, PlatformRegistrationInput } from '#services/platform-manager/platform-manager.types'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import { LtiMessageType } from '#services/launch/id-token.constants'
import {
  AGS_LINEITEM_READONLY_SCOPE,
  AGS_LINEITEM_SCOPE,
  AGS_RESULT_READONLY_SCOPE,
  AGS_SCORE_SCOPE,
  NRPS_CONTEXT_MEMBERSHIP_READONLY_SCOPE,
} from '#shared/lti-scopes.constants'
import { randomUuid } from '#utils/random/random'
import { validate } from '#utils/validation/validation'
import { buildBearerAuthorization } from '#utils/request/authorization-header'
import {
  OpenIDConfigurationSchema,
  RegistrationResponseSchema,
} from '#services/dynamic-registration/dynamic-registration.schemas'
import { MissingOpenIdConfigurationUrlError } from '#services/dynamic-registration/errors'
import { buildOpenIDConfiguration } from '#services/dynamic-registration/dynamic-registration.serializer'
import type {
  DynamicRegistrationMessageOptions,
  DynamicRegistrationOptions,
  DynamicRegistrationRoutes,
  OpenIDConfiguration,
  RegistrationOverrides,
  RegistrationResponse,
} from '#services/dynamic-registration/dynamic-registration.types'

export class DynamicRegistration {
  private readonly LOG_COMPONENT = 'dynamicRegistrationService'
  private readonly APPLICATION_TYPE = 'web'
  private readonly TOKEN_ENDPOINT_AUTH_METHOD = 'private_key_jwt'
  private readonly TOOL_CONFIGURATION_CLAIM = 'https://purl.imsglobal.org/spec/lti-tool-configuration'
  private readonly PLATFORM_CONFIGURATION_CLAIM = 'https://purl.imsglobal.org/spec/lti-platform-configuration'
  private readonly DEFAULT_PLATFORM_NAME = 'Platform'
  private readonly DEFAULT_DYNAMIC_REGISTRATION_ROUTE = '/lti/register'
  private readonly OPENID_CONFIGURATION_QUERY_PARAM = 'openid_configuration'
  private readonly REGISTRATION_TOKEN_QUERY_PARAM = 'registration_token'

  public readonly FINALIZE_REGISTRATION_HTML_SNIPPET =
    '<script>(window.opener || window.parent).postMessage({subject:"org.imsglobal.lti.close"}, "*");</script>'

  private readonly options: DynamicRegistrationOptions
  private readonly routes: DynamicRegistrationRoutes
  private readonly platformManager: PlatformManager
  private readonly requestHandler: RequestHandler
  private readonly httpHandler: HttpHandler
  private readonly logger: Logger

  // Mutable, not `readonly`: reassignable at any time via `setHandler()`
  // (and, in turn, via `Provider.onDynamicRegistration()`), matching the
  // same default-callback-with-override-setter pattern as `LaunchService`.
  private handler: RouteHandler = this.buildDefaultRouteHandler()

  // eslint-disable-next-line @typescript-eslint/max-params
  constructor(
    options: DynamicRegistrationOptions,
    routes: DynamicRegistrationRoutes,
    platformManager: PlatformManager,
    requestHandler: RequestHandler,
    httpHandler: HttpHandler,
    logger: Logger,
  ) {
    this.options = options
    this.routes = routes
    this.platformManager = platformManager
    this.requestHandler = requestHandler
    this.httpHandler = httpHandler
    this.logger = logger
  }

  public prepareHttpRoutes(route: string = this.DEFAULT_DYNAMIC_REGISTRATION_ROUTE): void {
    this.httpHandler.registerRoute(route, [HttpMethod.Get], async (request, response) => {
      await this.handler(request, response)
    })
  }

  public setHandler(handler: RouteHandler): void {
    this.handler = handler
  }

  private buildDefaultRouteHandler(): RouteHandler {
    return async (request, response) => {
      const html = await this.register(
        request.query[this.OPENID_CONFIGURATION_QUERY_PARAM],
        request.query[this.REGISTRATION_TOKEN_QUERY_PARAM],
      )
      response.html(html)
    }
  }

  public async getOpenIDConfiguration(url: string): Promise<OpenIDConfiguration> {
    this.logger.debug(this.LOG_COMPONENT, `Fetching OpenID configuration from ${url}`)
    const response = await this.requestHandler.get(url)
    return buildOpenIDConfiguration(validate<OpenIDConfiguration>(OpenIDConfigurationSchema, response.data))
  }

  public async performRegistration(
    configuration: OpenIDConfiguration,
    registrationToken?: string,
    overrides: RegistrationOverrides = {},
  ): Promise<Platform> {
    const options: DynamicRegistrationOptions = { ...this.options, ...overrides }
    const appUrl = this.buildUrl(options.url, this.routes.appRoute)
    const body = this.buildRegistrationRequestBody(configuration, options, appUrl)

    this.logger.debug(this.LOG_COMPONENT, `Registering with platform at ${configuration.registration_endpoint}`)
    const response = await this.requestHandler.post(configuration.registration_endpoint, body, {
      headers:
        registrationToken !== undefined ? { authorization: buildBearerAuthorization(registrationToken) } : undefined,
    })
    const registration = validate<RegistrationResponse>(RegistrationResponseSchema, response.data)

    const input: PlatformRegistrationInput = {
      url: configuration.issuer,
      clientId: registration.client_id,
      name: this.resolvePlatformName(configuration, options),
      authenticationEndpoint: configuration.authorization_endpoint,
      accessTokenEndpoint: configuration.token_endpoint,
      authorizationServer: configuration.authorization_server ?? configuration.token_endpoint,
      idTokenValidation: { method: IdTokenValidationMethod.JwkSet, key: configuration.jwks_uri },
    }

    let platform = await this.platformManager.registerPlatform(input)
    if (options.autoActivate !== true) platform = await this.platformManager.deactivatePlatform(platform)

    this.logger.debug(this.LOG_COMPONENT, `Platform registered: ${platform.id}`)
    return platform
  }

  public async register(
    openidConfigurationUrl: string | undefined,
    registrationToken?: string,
    overrides?: RegistrationOverrides,
  ): Promise<string> {
    if (openidConfigurationUrl === undefined) throw new MissingOpenIdConfigurationUrlError()

    const configuration = await this.getOpenIDConfiguration(openidConfigurationUrl)
    await this.performRegistration(configuration, registrationToken, overrides)

    return this.FINALIZE_REGISTRATION_HTML_SNIPPET
  }

  private resolvePlatformName(configuration: OpenIDConfiguration, options: DynamicRegistrationOptions): string {
    if (options.platformName !== undefined) return options.platformName
    const platformConfiguration = configuration[this.PLATFORM_CONFIGURATION_CLAIM] as
      { product_family_code?: string } | undefined
    const productFamilyCode = platformConfiguration?.product_family_code ?? this.DEFAULT_PLATFORM_NAME
    return `${productFamilyCode}_DynReg_${randomUuid()}`
  }

  private buildRegistrationRequestBody(
    configuration: OpenIDConfiguration,
    options: DynamicRegistrationOptions,
    appUrl: string,
  ): Record<string, unknown> {
    const messages: Array<Record<string, unknown>> = [
      this.buildMessage(LtiMessageType.ResourceLinkRequest, options.resourceLinkMessage),
    ]
    if (options.useDeepLinking !== false) {
      messages.push(this.buildMessage(LtiMessageType.DeepLinkingRequest, options.deepLinkingMessage))
    }

    return {
      application_type: this.APPLICATION_TYPE,
      response_types: ['id_token'],
      grant_types: ['implicit', 'client_credentials'],
      initiate_login_uri: this.buildUrl(options.url, this.routes.loginRoute),
      redirect_uris: [...(options.redirectUris ?? []), appUrl],
      client_name: options.name,
      jwks_uri: this.buildUrl(options.url, this.routes.keysetRoute),
      logo_uri: options.logo,
      token_endpoint_auth_method: this.TOKEN_ENDPOINT_AUTH_METHOD,
      scope: [
        AGS_LINEITEM_READONLY_SCOPE,
        AGS_LINEITEM_SCOPE,
        AGS_SCORE_SCOPE,
        AGS_RESULT_READONLY_SCOPE,
        NRPS_CONTEXT_MEMBERSHIP_READONLY_SCOPE,
      ].join(' '),
      [this.TOOL_CONFIGURATION_CLAIM]: {
        domain: this.getHostname(options.url),
        description: options.description,
        target_link_uri: appUrl,
        custom_parameters: options.customParameters,
        claims: configuration.claims_supported,
        messages,
      },
    }
  }

  private buildMessage(type: LtiMessageType, override?: DynamicRegistrationMessageOptions): Record<string, unknown> {
    return {
      type,
      ...(override?.targetLinkUri !== undefined && { target_link_uri: override.targetLinkUri }),
      ...(override?.label !== undefined && { label: override.label }),
      ...(override?.iconUri !== undefined && { icon_uri: override.iconUri }),
      ...(override?.customParameters !== undefined && { custom_parameters: override.customParameters }),
      ...(override?.placements !== undefined && { placements: override.placements }),
    }
  }

  // `new URL(path, baseUrl)` would treat a leading-slash `path` as an absolute-path reference, replacing
  // the base's entire path instead of appending to it, silently dropping any path prefix a tool
  // deployed behind a reverse proxy or subpath is configured with. Parsing baseUrl and concatenating the
  // pathname manually preserves that prefix, matching legacy's own approach.
  private buildUrl(baseUrl: string, path: string): string {
    const url = new URL(baseUrl)
    url.pathname = url.pathname.replace(/\/$/, '') + path
    return url.toString()
  }

  private getHostname(url: string): string {
    return new URL(url).host
  }
}

export default DynamicRegistration
