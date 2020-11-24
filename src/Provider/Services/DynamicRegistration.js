/* Provider Dynamic Registration Service */
const got = require('got')
const crypto = require('crypto')
const _url = require('fast-url-parser')

const provDynamicRegistrationDebug = require('debug')('provider:dynamicRegistrationService')

// Helper method to build URLs
const buildUrl = (url, path) => {
  const pathParts = _url.parse(url)
  const portMatch = pathParts.pathname.match(/:[0-9]*/)
  if (portMatch) {
    pathParts.port = portMatch[0].split(':')[1]
    pathParts.pathname = pathParts.pathname.split(portMatch[0]).join('')
  }
  const formattedUrl = _url.format({
    protocol: pathParts.protocol,
    hostname: pathParts.hostname,
    pathname: (pathParts.pathname + path).replace('//', '/'),
    port: pathParts.port,
    auth: pathParts.auth,
    hash: pathParts.hash,
    search: pathParts.search
  })
  return formattedUrl
}

// Helper method to get the url hostname
const getHostname = (url) => {
  const pathParts = _url.parse(url)
  return pathParts.hostname
}

class DynamicRegistration {
  #name

  #redirectUris

  #customParameters

  #autoActivate

  #logo

  #hostname

  #appUrl

  #loginUrl

  #keysetUrl

  #getPlatform

  #registerPlatform

  #ENCRYPTIONKEY = ''

  #Database

  constructor (options, routes, registerPlatform, getPlatform, ENCRYPTIONKEY, Database) {
    this.#name = options.name
    this.#redirectUris = options.redirectUris || []
    this.#customParameters = options.customParameters || {}
    this.#autoActivate = options.autoActivate
    this.#logo = options.logo
    this.#hostname = getHostname(options.url)
    this.#appUrl = buildUrl(options.url, routes.appRoute)
    this.#loginUrl = buildUrl(options.url, routes.loginRoute)
    this.#keysetUrl = buildUrl(options.url, routes.keysetRoute)
    this.#getPlatform = getPlatform
    this.#registerPlatform = registerPlatform

    this.#ENCRYPTIONKEY = ENCRYPTIONKEY
    this.#Database = Database
  }

  /**
   * @description Performs dynamic registration.
   */
  async register (req, res, dynamicRegistrationCallback) {
    try {
      if (!req.query.openid_configuration) return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Missing parameter: "openid_configuration".' } })
      provDynamicRegistrationDebug('Starting dynamic registration process')
      // Get Platform registration configurations
      const configuration = await got.get(req.query.openid_configuration).json()
      provDynamicRegistrationDebug('Attempting to register Platform with issuer: ', configuration.issuer)
      // Building registration object
      const registration = {
        application_type: 'web',
        response_types: ['id_token'],
        grant_types: ['implicit', 'client_credentials'],
        initiate_login_uri: this.#loginUrl,
        redirect_uris: [...this.#redirectUris, this.#appUrl],
        client_name: this.#name,
        jwks_uri: this.#keysetUrl,
        logo_uri: this.#logo,
        token_endpoint_auth_method: 'private_key_jwt',
        scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
        'https://purl.imsglobal.org/spec/lti-tool-configuration': {
          domain: this.#hostname,
          target_link_uri: this.#appUrl,
          custom_parameters: this.#customParameters,
          claims: configuration.claims_supported,
          messages: [
            { type: 'LtiDeepLinkingRequest' },
            { type: 'LtiResourceLink' }
          ]
        }
      }
      provDynamicRegistrationDebug('Tool registration request:')
      provDynamicRegistrationDebug(registration)
      provDynamicRegistrationDebug('Sending Tool registration request')
      const registrationResponse = await got.post(configuration.registration_endpoint, { json: registration, headers: req.query.registration_token ? { Authorization: 'Bearer ' + req.query.registration_token } : undefined }).json()

      // Registering Platform
      const platformName = (configuration['https://purl.imsglobal.org/spec/lti-platformconfiguration '] ? configuration['https://purl.imsglobal.org/spec/lti-platformconfiguration '].product_family_code : 'Platform') + '_DynReg_' + crypto.randomBytes(16).toString('hex')

      if (await this.#getPlatform(configuration.issuer, registrationResponse.client_id, this.#ENCRYPTIONKEY, this.#Database)) return res.status(403).send({ status: 403, error: 'Forbidden', details: { message: 'Platform already registered.' } })

      provDynamicRegistrationDebug('Registering Platform')
      const platform = {
        url: configuration.issuer,
        name: platformName,
        clientId: registrationResponse.client_id,
        authenticationEndpoint: configuration.authorization_endpoint,
        accesstokenEndpoint: configuration.token_endpoint,
        authConfig: {
          method: 'JWK_SET',
          key: configuration.jwks_uri
        }
      }
      const registered = await this.#registerPlatform(platform, this.#getPlatform, this.#ENCRYPTIONKEY, this.#Database)
      await this.#Database.Insert(false, 'platformStatus', { id: await registered.platformId(), active: this.#autoActivate })

      // Returing message indicating the end of registration flow
      res.setHeader('Content-type', 'text/html')
      return res.send(`<script>window.parent.postMessage({subject:"org.imsglobal.lti.close"}, "${configuration.issuer}");</script>`)
    } catch (err) {
      provDynamicRegistrationDebug(err)
      return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: err.message } })
    }
  }
}

module.exports = DynamicRegistration
