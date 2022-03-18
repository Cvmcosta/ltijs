/* eslint-disable require-atomic-updates */
/* eslint-disable no-useless-escape */

/* Main class for the Provider functionalities */

const Server = require('../Utils/Server')
const Request = require('../Utils/Request')
const Platform = require('../Utils/Platform')
const Auth = require('../Utils/Auth')
const DB = require('../Utils/Database')
const Keyset = require('../Utils/Keyset')

const GradeService = require('./Services/Grade')
const DeepLinkingService = require('./Services/DeepLinking')
const NamesAndRolesService = require('./Services/NamesAndRoles')
const DynamicRegistration = require('./Services/DynamicRegistration')

const url = require('fast-url-parser')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const provAuthDebug = require('debug')('provider:auth')
const provMainDebug = require('debug')('provider:main')
const provDynamicRegistrationDebug = require('debug')('provider:dynamicRegistrationService')

/**
 * @descripttion LTI Provider Class that implements the LTI 1.3 protocol and services.
 */
class Provider {
  // Pre-initiated variables
  #loginRoute = '/login'

  #appRoute = '/'

  #keysetRoute = '/keys'

  #dynRegRoute = '/register'

  #whitelistedRoutes = []

  #ENCRYPTIONKEY

  #devMode = false
  #ltiaas = false

  #tokenMaxAge = 10

  #cookieOptions = {
    secure: false,
    httpOnly: true,
    signed: true
  }

  // Setup flag
  #setup = false

  #connectCallback = async (token, req, res, next) => { return next() }

  #deepLinkingCallback = async (token, req, res, next) => { return next() }

  #dynamicRegistrationCallback = async (req, res, next) => {
    try {
      if (!req.query.openid_configuration) return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Missing parameter: "openid_configuration".' } })
      const message = await this.DynamicRegistration.register(req.query.openid_configuration, req.query.registration_token)
      res.setHeader('Content-type', 'text/html')
      res.send(message)
    } catch (err) {
      provDynamicRegistrationDebug(err)
      if (err.message === 'PLATFORM_ALREADY_REGISTERED') return res.status(403).send({ status: 403, error: 'Forbidden', details: { message: 'Platform already registered.' } })
      return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: err.message } })
    }
  }

  #sessionTimeoutCallback = async (req, res) => {
    return res.status(401).send(res.locals.err)
  }

  #invalidTokenCallback = async (req, res) => {
    return res.status(401).send(res.locals.err)
  }

  #unregisteredPlatformCallback = async (req, res) => {
    return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'UNREGISTERED_PLATFORM' } })
  }

  #inactivePlatformCallback = async (req, res) => {
    return res.status(401).send({ status: 401, error: 'Unauthorized', details: { message: 'PLATFORM_NOT_ACTIVATED' } })
  }

  // Assembles and sends keyset
  #keyset = async (req, res) => {
    try {
      const keyset = await Keyset.build(this.Database, this.#ENCRYPTIONKEY)
      return res.status(200).send(keyset)
    } catch (err) {
      provMainDebug(err)
      return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: err.message } })
    }
  }

  #server

  /**
     * @description Provider configuration method.
     * @param {String} encryptionkey - Secret used to sign cookies and encrypt other info.
     * @param {Object} database - Database configuration.
     * @param {String} database.url - Database Url (Ex: mongodb://localhost/applicationdb).
     * @param {Object} [database.plugin] - If set, must be the Database object of the desired database plugin.
     * @param {Boolean} [database.debug] - If set to true, enables mongoose debug mode.
     * @param {Object} [database.connection] - MongoDB database connection options (Ex: user, pass)
     * @param {String} [database.connection.user] - Database user for authentication if needed.
     * @param {String} [database.conenction.pass] - Database pass for authentication if needed.
     * @param {Object} [options] - Lti Provider options.
     * @param {String} [options.appRoute = '/'] - Lti Provider main route. If no option is set '/' is used.
     * @param {String} [options.loginRoute = '/login'] - Lti Provider login route. If no option is set '/login' is used.
     * @param {String} [options.keysetRoute = '/keys'] - Lti Provider public jwk keyset route. If no option is set '/keys' is used.
     * @param {String} [options.dynRegRoute = '/register'] - Dynamic registration route.
     * @param {Boolean} [options.https = false] - Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https and are planning to configure ssl through Express.
     * @param {Object} [options.ssl] - SSL certificate and key if https is enabled.
     * @param {String} [options.ssl.key] - SSL key.
     * @param {String} [options.ssl.cert] - SSL certificate.
     * @param {String} [options.staticPath] - The path for the static files your application might serve (Ex: _dirname+"/public")
     * @param {Boolean} [options.cors = true] - If set to false, disables cors.
     * @param {Function} [options.serverAddon] - Allows the execution of a method inside of the server contructor. Can be used to register middlewares.
     * @param {Object} [options.cookies] - Cookie configuration. Allows you to configure, sameSite and secure parameters.
     * @param {Boolean} [options.cookies.secure = false] - Cookie secure parameter. If true, only allows cookies to be passed over https.
     * @param {String} [options.cookies.sameSite = 'Lax'] - Cookie sameSite parameter. If cookies are going to be set across domains, set this parameter to 'None'.
     * @param {String} [options.cookies.domain] - Cookie domain parameter. This parameter can be used to specify a domain so that the cookies set by Ltijs can be shared between subdomains.
     * @param {Boolean} [options.devMode = false] - If true, does not require state and session cookies to be present (If present, they are still validated). This allows ltijs to work on development environments where cookies cannot be set. THIS SHOULD NOT BE USED IN A PRODUCTION ENVIRONMENT.
     * @param {Number} [options.tokenMaxAge = 10] - Sets the idToken max age allowed in seconds. Defaults to 10 seconds. If false, disables max age validation.
     * @param {Object} [options.dynReg] - Setup for the Dynamic Registration Service.
     * @param {String} [options.dynReg.url] - Tool Provider main URL. (Ex: 'https://tool.example.com')
     * @param {String} [options.dynReg.name] - Tool Provider name. (Ex: 'Tool Provider')
     * @param {String} [options.dynReg.logo] - Tool Provider logo. (Ex: 'https://client.example.org/logo.png')
     * @param {String} [options.dynReg.description] - Tool Provider description. (Ex: 'Tool description')
     * @param {Array<String>} [options.dynReg.redirectUris] - Additional redirect URIs. (Ex: ['https://tool.example.com/launch'])
     * @param {Object} [options.dynReg.customParameters] - Custom parameters object. (Ex: { key: 'value' })
     * @param {Boolean} [options.dynReg.autoActivate = false] - Platform auto activation flag. If true, every Platform registered dynamically is immediately activated. Defaults to false.
     */
  setup (encryptionkey, database, options) {
    if (this.#setup) throw new Error('PROVIDER_ALREADY_SETUP')
    if (options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)) throw new Error('MISSING_SSL_KEY_CERTIFICATE')
    if (!encryptionkey) throw new Error('MISSING_ENCRYPTION_KEY')
    if (!database) throw new Error('MISSING_DATABASE_CONFIGURATION')
    if (options && options.dynReg && (!options.dynReg.url || !options.dynReg.name)) throw new Error('MISSING_DYNREG_CONFIGURATION')

    /**
     * @description Database object.
     */
    this.Database = null
    if (!database.plugin) this.Database = new DB(database)
    else this.Database = database.plugin

    if (options && (options.appRoute || options.appUrl)) this.#appRoute = options.appRoute || options.appUrl
    if (options && (options.loginRoute || options.loginUrl)) this.#loginRoute = options.loginRoute || options.loginUrl
    if (options && (options.keysetRoute || options.keysetUrl)) this.#keysetRoute = options.keysetRoute || options.keysetUrl
    if (options && options.dynRegRoute) this.#dynRegRoute = options.dynRegRoute

    if (options && options.devMode === true) this.#devMode = true
    if (options && options.ltiaas === true) this.#ltiaas = true
    if (options && options.tokenMaxAge !== undefined) this.#tokenMaxAge = options.tokenMaxAge

    // Cookie options
    if (options && options.cookies) {
      if (options.cookies.secure === true) this.#cookieOptions.secure = true
      if (options.cookies.sameSite) this.#cookieOptions.sameSite = options.cookies.sameSite
      if (options.cookies.domain) this.#cookieOptions.domain = options.cookies.domain
    }

    this.#ENCRYPTIONKEY = encryptionkey

    this.#server = new Server(options ? options.https : false, options ? options.ssl : false, this.#ENCRYPTIONKEY, options ? options.cors : true, options ? options.serverAddon : false)

    /**
     * @description Express server object.
     */
    this.app = this.#server.app

    /**
     * @description Grading service.
     */
    this.Grade = new GradeService(this.getPlatform, this.#ENCRYPTIONKEY, this.Database)

    /**
     * @description Deep Linking service.
     */
    this.DeepLinking = new DeepLinkingService(this.getPlatform, this.#ENCRYPTIONKEY, this.Database)

    /**
     * @description Names and Roles service.
     */
    this.NamesAndRoles = new NamesAndRolesService(this.getPlatform, this.#ENCRYPTIONKEY, this.Database)

    if (options && options.dynReg) {
      const routes = {
        appRoute: this.#appRoute,
        loginRoute: this.#loginRoute,
        keysetRoute: this.#keysetRoute
      }
      /**
       * @description Dynamic Registration service.
       */
      this.DynamicRegistration = new DynamicRegistration(options.dynReg, routes, this.registerPlatform, this.getPlatform, this.#ENCRYPTIONKEY, this.Database)
    }

    if (options && options.staticPath) this.#server.setStaticPath(options.staticPath)

    // Registers main athentication and routing middleware
    const sessionValidator = async (req, res, next) => {
      provMainDebug('Receiving request at path: ' + req.baseUrl + req.path)
      // Ckeck if request is attempting to initiate oidc login flow or access reserved routes
      if (req.path === this.#loginRoute || req.path === this.#keysetRoute || req.path === this.#dynRegRoute) return next()

      provMainDebug('Path does not match reserved endpoints')

      try {
        // Retrieving ltik token
        const ltik = req.token
        // Retrieving cookies
        const cookies = req.signedCookies
        provMainDebug('Cookies received: ')
        provMainDebug(cookies)

        if (!ltik) {
          const idtoken = req.body.id_token
          if (idtoken) {
            // No ltik found but request contains an idtoken
            provMainDebug('Received idtoken for validation')

            // Retrieves state
            const state = req.body.state

            // Retrieving validation parameters from cookies
            provAuthDebug('Response state: ' + state)
            const validationCookie = cookies['state' + state]

            const validationParameters = {
              iss: validationCookie,
              maxAge: this.#tokenMaxAge
            }

            const valid = await Auth.validateToken(idtoken, this.#devMode, validationParameters, this.getPlatform, this.#ENCRYPTIONKEY, this.Database)

            // Retrieve State object from Database
            const savedState = await this.Database.Get(false, 'state', { state: state })

            // Deletes state validation cookie and Database entry
            res.clearCookie('state' + state, this.#cookieOptions)
            if (savedState) this.Database.Delete('state', { state: state })

            provAuthDebug('Successfully validated token!')

            const courseId = valid['https://purl.imsglobal.org/spec/lti/claim/context'] ? valid['https://purl.imsglobal.org/spec/lti/claim/context'].id : 'NF'
            const resourceId = valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'] ? valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'].id : 'NF'

            const clientId = valid.clientId
            const deploymentId = valid['https://purl.imsglobal.org/spec/lti/claim/deployment_id']

            const contextId = encodeURIComponent(valid.iss + clientId + deploymentId + courseId + '_' + resourceId)
            const platformCode = encodeURIComponent('lti' + Buffer.from(valid.iss + clientId + deploymentId).toString('base64'))

            // Mount platform token
            const platformToken = {
              iss: valid.iss,
              user: valid.sub,
              userInfo: {
                given_name: valid.given_name,
                family_name: valid.family_name,
                name: valid.name,
                email: valid.email
              },
              platformInfo: valid['https://purl.imsglobal.org/spec/lti/claim/tool_platform'],
              clientId: valid.clientId,
              platformId: valid.platformId,
              deploymentId: valid['https://purl.imsglobal.org/spec/lti/claim/deployment_id']
            }

            // Store idToken in database
            await this.Database.Replace(false, 'idtoken', { iss: valid.iss, clientId: clientId, deploymentId: deploymentId, user: valid.sub }, platformToken)

            // Mount context token
            const contextToken = {
              contextId: contextId,
              path: req.path,
              user: valid.sub,
              roles: valid['https://purl.imsglobal.org/spec/lti/claim/roles'],
              targetLinkUri: valid['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'],
              context: valid['https://purl.imsglobal.org/spec/lti/claim/context'],
              resource: valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'],
              custom: valid['https://purl.imsglobal.org/spec/lti/claim/custom'],
              launchPresentation: valid['https://purl.imsglobal.org/spec/lti/claim/launch_presentation'],
              messageType: valid['https://purl.imsglobal.org/spec/lti/claim/message_type'],
              version: valid['https://purl.imsglobal.org/spec/lti/claim/version'],
              deepLinkingSettings: valid['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'],
              lis: valid['https://purl.imsglobal.org/spec/lti/claim/lis'],
              endpoint: valid['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'],
              namesRoles: valid['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice']
            }

            // Store contextToken in database
            await this.Database.Replace(false, 'contexttoken', { contextId: contextId, user: valid.sub }, contextToken)

            // Creates platform session cookie
            if (!this.#ltiaas) res.cookie(platformCode, valid.sub, this.#cookieOptions)

            provMainDebug('Generating ltik')
            const newLtikObj = {
              platformUrl: valid.iss,
              clientId: clientId,
              deploymentId: deploymentId,
              platformCode: platformCode,
              contextId: contextId,
              user: valid.sub,
              s: state // Added state to make unique ltiks
            }
            // Signing context token
            const newLtik = jwt.sign(newLtikObj, this.#ENCRYPTIONKEY)

            if (this.#ltiaas) {
              // Appending query parameters
              res.locals.query = {}
              if (savedState) {
                for (const [key, value] of Object.entries(savedState[0].query)) {
                  req.query[key] = value
                  res.locals.query[key] = value
                }
              }

              // Creating local variables
              res.locals.context = JSON.parse(JSON.stringify(contextToken))
              res.locals.token = JSON.parse(JSON.stringify(platformToken))
              res.locals.token.platformContext = res.locals.context
              res.locals.ltik = newLtik
              provMainDebug('Forwarding request to next handler')
              return next()
            }

            // Appending query parameters
            const query = new URLSearchParams(req.query)
            if (savedState) {
              for (const [key, value] of Object.entries(savedState[0].query)) {
                query.append(key, value)
              }
            }
            query.append('ltik', newLtik)
            const urlSearchParams = query.toString()
            provMainDebug('Redirecting to endpoint with ltik')
            return res.redirect(req.baseUrl + req.path + '?' + urlSearchParams)
          } else {
            const state = req.body.state
            if (state) {
              provMainDebug('Deleting state cookie and Database entry')
              const savedState = await this.Database.Get(false, 'state', { state: state })
              res.clearCookie('state' + state, this.#cookieOptions)
              if (savedState) this.Database.Delete('state', { state: state })
            }

            if (this.#whitelistedRoutes.find(r => {
              if ((r.route instanceof RegExp && r.route.test(req.path)) || r.route === req.path) return r.method === 'ALL' || r.method === req.method.toUpperCase()
              return false
            })) {
              provMainDebug('Accessing as whitelisted route')
              return next()
            }
            provMainDebug('No ltik found')
            provMainDebug('Request body: ', req.body)
            provMainDebug('Passing request to invalid token handler')
            res.locals.err = {
              status: 401,
              error: 'Unauthorized',
              details: {
                description: 'No Ltik or ID Token found.',
                message: 'NO_LTIK_OR_IDTOKEN_FOUND',
                bodyReceived: req.body
              }
            }
            return this.#invalidTokenCallback(req, res, next)
          }
        }

        provMainDebug('Ltik found')
        let validLtik
        try {
          validLtik = jwt.verify(ltik, this.#ENCRYPTIONKEY)
        } catch (err) {
          if (this.#whitelistedRoutes.find(r => {
            if ((r.route instanceof RegExp && r.route.test(req.path)) || r.route === req.path) return r.method === 'ALL' || r.method === req.method.toUpperCase()
            return false
          })) {
            provMainDebug('Accessing as whitelisted route')
            return next()
          }
          throw (err)
        }
        provMainDebug('Ltik successfully verified')

        const platformUrl = validLtik.platformUrl
        const platformCode = validLtik.platformCode
        const clientId = validLtik.clientId
        const deploymentId = validLtik.deploymentId
        const contextId = validLtik.contextId
        let user = validLtik.user

        if (!this.#ltiaas) {
          provMainDebug('Attempting to retrieve matching session cookie')
          const cookieUser = cookies[platformCode]
          if (!cookieUser) {
            if (!this.#devMode) user = false
            else { provMainDebug('Dev Mode enabled: Missing session cookies will be ignored') }
          } else if (user.toString() !== cookieUser.toString()) user = false
        }

        if (user) {
          provAuthDebug('Valid session found')
          // Gets corresponding id token from database
          let idTokenRes = await this.Database.Get(false, 'idtoken', { iss: platformUrl, clientId: clientId, deploymentId: deploymentId, user: user })
          if (!idTokenRes) throw new Error('IDTOKEN_NOT_FOUND_DB')
          idTokenRes = idTokenRes[0]
          const idToken = JSON.parse(JSON.stringify(idTokenRes))

          // Gets correspondent context token from database
          let contextToken = await this.Database.Get(false, 'contexttoken', { contextId: contextId, user: user })
          if (!contextToken) throw new Error('CONTEXTTOKEN_NOT_FOUND_DB')
          contextToken = contextToken[0]
          idToken.platformContext = JSON.parse(JSON.stringify(contextToken))

          // Creating local variables
          res.locals.context = idToken.platformContext
          res.locals.token = idToken
          res.locals.ltik = ltik

          provMainDebug('Passing request to next handler')
          return next()
        } else {
          provMainDebug('No session cookie found')
          provMainDebug('Request body: ', req.body)
          provMainDebug('Passing request to session timeout handler')
          res.locals.err = {
            status: 401,
            error: 'Unauthorized',
            details: {
              message: 'Session not found.'
            }
          }
          return this.#sessionTimeoutCallback(req, res, next)
        }
      } catch (err) {
        const state = req.body.state
        if (state) {
          provMainDebug('Deleting state cookie and Database entry')
          const savedState = await this.Database.Get(false, 'state', { state: state })
          res.clearCookie('state' + state, this.#cookieOptions)
          if (savedState) this.Database.Delete('state', { state: state })
        }

        provAuthDebug(err)
        provMainDebug('Passing request to invalid token handler')

        res.locals.err = {
          status: 401,
          error: 'Unauthorized',
          details: {
            description: 'Error validating ltik or IdToken',
            message: err.message
          }
        }
        return this.#invalidTokenCallback(req, res, next)
      }
    }

    this.app.use(sessionValidator)

    this.app.all(this.#loginRoute, async (req, res) => {
      const params = { ...req.query, ...req.body }
      try {
        if (!params.iss || !params.login_hint || !params.target_link_uri) return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'MISSING_LOGIN_PARAMETERS' } })
        const iss = params.iss
        const clientId = params.client_id
        provMainDebug('Receiving a login request from: ' + iss + ', clientId: ' + clientId)
        let platform
        if (clientId) platform = await this.getPlatform(iss, clientId)
        else platform = (await this.getPlatform(iss))[0]

        if (platform) {
          const platformActive = await platform.platformActive()
          if (!platformActive) return this.#inactivePlatformCallback(req, res)

          provMainDebug('Redirecting to platform authentication endpoint')
          // Create state parameter used to validade authentication response
          let state = encodeURIComponent(crypto.randomBytes(25).toString('hex'))

          provMainDebug('Target Link URI: ', params.target_link_uri)
          /* istanbul ignore next */
          // Cleaning up target link uri and retrieving query parameters
          if (params.target_link_uri.includes('?')) {
            // Retrieve raw queries
            const rawQueries = new URLSearchParams('?' + params.target_link_uri.split('?')[1])
            // Check if state is unique
            while (await this.Database.Get(false, 'state', { state: state })) state = encodeURIComponent(crypto.randomBytes(25).toString('hex'))
            provMainDebug('Generated state: ', state)
            // Assemble queries object
            const queries = {}
            for (const [key, value] of rawQueries) { queries[key] = value }
            params.target_link_uri = params.target_link_uri.split('?')[0]
            provMainDebug('Query parameters found: ', queries)
            provMainDebug('Final Redirect URI: ', params.target_link_uri)
            // Store state and query parameters on database
            await this.Database.Insert(false, 'state', { state: state, query: queries })
          }

          // Setting up validation info
          const cookieOptions = JSON.parse(JSON.stringify(this.#cookieOptions))
          cookieOptions.maxAge = 60 * 1000 // Adding max age to state cookie = 1min
          res.cookie('state' + state, iss, cookieOptions)

          // Redirect to authentication endpoint
          const query = await Request.ltiAdvantageLogin(params, platform, state)
          provMainDebug('Login request: ')
          provMainDebug(query)
          res.redirect(url.format({
            pathname: await platform.platformAuthEndpoint(),
            query: query
          }))
        } else {
          provMainDebug('Unregistered platform attempting connection: ' + iss + ', clientId: ' + clientId)
          return this.#unregisteredPlatformCallback(req, res)
        }
      } catch (err) {
        provMainDebug(err)
        return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: err.message } })
      }
    })

    this.app.get(this.#keysetRoute, async (req, res, next) => {
      return this.#keyset(req, res, next)
    })

    this.app.all(this.#dynRegRoute, async (req, res, next) => {
      if (this.DynamicRegistration) return this.#dynamicRegistrationCallback(req, res, next)
      return res.status(403).send({ status: 403, error: 'Forbidden', details: { message: 'Dynamic registration is disabled.' } })
    })

    // Main app
    this.app.all(this.#appRoute, async (req, res, next) => {
      if (res.locals.context && res.locals.context.messageType === 'LtiDeepLinkingRequest') return this.#deepLinkingCallback(res.locals.token, req, res, next)
      return this.#connectCallback(res.locals.token, req, res, next)
    })

    this.#setup = true
    return this
  }

  /**
     * @description Starts listening to a given port for LTI requests and opens connection to the database.
     * @param {Object} [options] - Deployment options.
     * @param {Number} [options.port] - Deployment port. 3000 by default.
     * @param {Boolean} [options.silent] - If true, disables initial startup message.
     * @param {Boolean} [options.serverless] - If true, Ltijs does not start an Express server instance. This allows usage as a middleware and with services like AWS. Ignores 'port' parameter.
     * @returns {Promise<true>}
     */
  async deploy (options) {
    if (!this.#setup) throw new Error('PROVIDER_NOT_SETUP')
    provMainDebug('Attempting to connect to database')
    try {
      await this.Database.setup()

      const conf = {
        port: 3000,
        silent: false
      }

      if (options && options.port) conf.port = options.port
      if (options && options.silent) conf.silent = options.silent
      // Starts server on given port

      if (options && options.serverless) {
        if (!conf.silent) {
          console.log('Ltijs started in serverless mode...')
        }
      } else {
        await this.#server.listen(conf.port)
        provMainDebug('Ltijs started listening on port: ', conf.port)

        // Startup message
        const message = 'LTI Provider is listening on port ' + conf.port + '!\n\n LTI provider config: \n >App Route: ' + this.#appRoute + '\n >Initiate Login Route: ' + this.#loginRoute + '\n >Keyset Route: ' + this.#keysetRoute + '\n >Dynamic Registration Route: ' + this.#dynRegRoute

        if (!conf.silent) {
          console.log('  _   _______ _____      _  _____\n' +
                      ' | | |__   __|_   _|    | |/ ____|\n' +
                      ' | |    | |    | |      | | (___  \n' +
                      ' | |    | |    | |  _   | |\\___ \\ \n' +
                      ' | |____| |   _| |_| |__| |____) |\n' +
                      ' |______|_|  |_____|\\____/|_____/ \n\n', message)
        }
      }
      if (this.#devMode && !conf.silent) console.log('\nStarting in Dev Mode, state validation and session cookies will not be required. THIS SHOULD NOT BE USED IN A PRODUCTION ENVIRONMENT!')

      // Sets up gracefull shutdown
      process.on('SIGINT', async () => {
        await this.close(options)
        process.exit()
      })

      return true
    } catch (err) {
      console.log('Error during deployment: ', err)
      await this.close(options)
      process.exit()
    }
  }

  /**
   * @description Closes connection to database and stops server.
   * @param {Object} [options] - Deployment options.
   * @param {Boolean} [options.silent] - If true, disables messages.
   * @returns {Promise<true>}
   */
  async close (options) {
    if (!options || options.silent !== true) console.log('\nClosing server...')
    await this.#server.close()
    if (!options || options.silent !== true) console.log('Closing connection to the database...')
    await this.Database.Close()
    if (!options || options.silent !== true) console.log('Shutdown complete.')
    return true
  }

  /**
     * @description Sets the callback function called whenever there's a sucessfull lti 1.3 launch, exposing a "token" object containing the idtoken information.
     * @param {Function} _connectCallback - Callback function called everytime a platform sucessfully launches to the provider.
     * @example .onConnect((token, request, response)=>{response.send('OK')})
     * @returns {true}
     */
  onConnect (_connectCallback, options) {
    /* istanbul ignore next */
    if (options) {
      if (options.sameSite || options.secure) console.log('Deprecation Warning: The optional parameters of the onConnect() method are now deprecated and will be removed in the 6.0 release. Cookie parameters can be found in the main Ltijs constructor options: ... { cookies: { secure: true, sameSite: \'None\' }.')

      if (options.sessionTimeout || options.invalidToken) console.log('Deprecation Warning: The optional parameters of the onConnect() method are now deprecated and will be removed in the 6.0 release. Invalid token and Session Timeout methods can now be set with the onSessionTimeout() and onInvalidToken() methods.')

      if (options.sameSite) {
        this.#cookieOptions.sameSite = options.sameSite
        if (options.sameSite.toLowerCase() === 'none') this.#cookieOptions.secure = true
      }
      if (options.secure === true) this.#cookieOptions.secure = true
      if (options.sessionTimeout) this.#sessionTimeoutCallback = options.sessionTimeout
      if (options.invalidToken) this.#invalidTokenCallback = options.invalidToken
    }

    if (_connectCallback) {
      this.#connectCallback = _connectCallback
      return true
    }
    throw new Error('MISSING_CALLBACK')
  }

  /**
   * @description Sets the callback function called whenever there's a sucessfull deep linking launch, exposing a "token" object containing the idtoken information.
   * @param {Function} _deepLinkingCallback - Callback function called everytime a platform sucessfully launches a deep linking request.
   * @example .onDeepLinking((token, request, response)=>{response.send('OK')})
   * @returns {true}
   */
  onDeepLinking (_deepLinkingCallback) {
    if (_deepLinkingCallback) {
      this.#deepLinkingCallback = _deepLinkingCallback
      return true
    }
    throw new Error('MISSING_CALLBACK')
  }

  /**
   * @description Sets the callback function called whenever there's a sucessfull dynamic registration request, allowing the registration flow to be customized.
   * @param {Function} _dynamicRegistrationCallback - Callback function called everytime the LTI Provider receives a dynamic registration request.
   */
  onDynamicRegistration (_dynamicRegistrationCallback) {
    if (_dynamicRegistrationCallback) {
      this.#dynamicRegistrationCallback = _dynamicRegistrationCallback
      return true
    }
    throw new Error('MISSING_CALLBACK')
  }

  /**
   * @description Sets the callback function called when no valid session is found during a request validation.
   * @param {Function} _sessionTimeoutCallback - Callback method.
   * @example .onSessionTimeout((request, response)=>{response.send('Session timeout')})
   * @returns {true}
   */
  onSessionTimeout (_sessionTimeoutCallback) {
    if (_sessionTimeoutCallback) {
      this.#sessionTimeoutCallback = _sessionTimeoutCallback
      return true
    }
    throw new Error('MISSING_CALLBACK')
  }

  /**
   * @description Sets the callback function called when the token received fails to be validated.
   * @param {Function} _invalidTokenCallback - Callback method.
   * @example .onInvalidToken((request, response)=>{response.send('Invalid token')})
   * @returns {true}
   */
  onInvalidToken (_invalidTokenCallback) {
    if (_invalidTokenCallback) {
      this.#invalidTokenCallback = _invalidTokenCallback
      return true
    }
    throw new Error('MISSING_CALLBACK')
  }

  /**
   * @description Sets the callback function called when the Platform attempting to login is not registered.
   * @param {Function} _unregisteredPlatformCallback - Callback method.
   * @example .onUnregisteredPlatform((request, response)=>{response.send('Unregistered Platform')})
   * @returns {true}
   */
  onUnregisteredPlatform (_unregisteredPlatformCallback) {
    if (_unregisteredPlatformCallback) {
      this.#unregisteredPlatformCallback = _unregisteredPlatformCallback
      return true
    }
    throw new Error('MISSING_CALLBACK')
  }

  /**
   * @description Sets the callback function called when the Platform attempting to login is not activated.
   * @param {Function} _inactivePlatformCallback - Callback method.
   * @example .onInactivePlatform((request, response)=>{response.send('Platform not activated')})
   * @returns {true}
   */
  onInactivePlatform (_inactivePlatformCallback) {
    if (_inactivePlatformCallback) {
      this.#inactivePlatformCallback = _inactivePlatformCallback
      return true
    }
    throw new Error('MISSING_CALLBACK')
  }

  /**
   * @description Gets the main application route that will receive the final decoded Idtoken at the end of a successful launch.
   * @returns {String}
   */
  appRoute () {
    return this.#appRoute
  }

  /**
   * @description Gets the login route responsible for dealing with the OIDC login flow.
   * @returns {String}
   */
  loginRoute () {
    return this.#loginRoute
  }

  /**
     * @description Gets the keyset route that will be used to retrieve a public jwk keyset.
     * @returns {String}
     */
  keysetRoute () {
    return this.#keysetRoute
  }

  /**
   * @description Gets the dynamic registration route that will be used to register platforms dynamically.
   * @returns {String}
   */
  dynRegRoute () {
    return this.#dynRegRoute
  }

  /**
   * @description Whitelists routes to bypass the Ltijs authentication protocol. If validation fails, these routes are still accessed but aren't given an idToken.
   * @param {String} routes - Routes to be whitelisted
   */
  whitelist (...routes) {
    if (!routes) return this.#whitelistedRoutes
    const formattedRoutes = []
    for (const route of routes) {
      const isObject = (!(route instanceof RegExp) && route === Object(route))
      if (isObject) {
        if (!route.route || !route.method) throw new Error('WRONG_FORMAT. Details: Expects string ("/route") or object ({ route: "/route", method: "POST" })')
        formattedRoutes.push({ route: route.route, method: route.method.toUpperCase() })
      } else formattedRoutes.push({ route: route, method: 'ALL' })
    }
    this.#whitelistedRoutes = [
      ...this.#whitelistedRoutes,
      ...formattedRoutes
    ]

    return this.#whitelistedRoutes
  }

  /**
     * @description Registers a platform.
     * @param {Object} platform
     * @param {String} platform.url - Platform url.
     * @param {String} platform.name - Platform nickname.
     * @param {String} platform.clientId - Client Id generated by the platform.
     * @param {String} platform.authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the platform.
     * @param {String} platform.accesstokenEndpoint - Access token endpoint that the tool will use to get an access token for the platform.
     * @param {object} platform.authConfig - Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."}
     * @param {String} platform.authConfig.method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
     * @param {String} platform.authConfig.key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
     * @param {string} [platform.authorizationServer] - Authorization server identifier to be used as the aud when requesting an access token. If not specified, the access token endpoint URL will be used.
     * @returns {Promise<Platform>}
     */
  async registerPlatform (platform, getPlatform, ENCRYPTIONKEY, Database) {
    if (!platform || !platform.url || !platform.clientId) throw new Error('MISSING_PLATFORM_URL_OR_CLIENTID')

    const _Database = Database || this.Database
    const _ENCRYPTIONKEY = ENCRYPTIONKEY || this.#ENCRYPTIONKEY
    const _getPlatform = getPlatform || this.getPlatform

    let kid
    const _platform = await _getPlatform(platform.url, platform.clientId, _ENCRYPTIONKEY, _Database)

    if (!_platform) {
      if (!platform.name || !platform.authenticationEndpoint || !platform.accesstokenEndpoint || !platform.authConfig) throw new Error('MISSING_PARAMS')
      if (platform.authConfig.method !== 'RSA_KEY' && platform.authConfig.method !== 'JWK_KEY' && platform.authConfig.method !== 'JWK_SET') throw new Error('INVALID_AUTHCONFIG_METHOD. Details: Valid methods are "RSA_KEY", "JWK_KEY", "JWK_SET".')
      if (!platform.authConfig.key) throw new Error('MISSING_AUTHCONFIG_KEY')

      try {
        kid = await Auth.generatePlatformKeyPair(_ENCRYPTIONKEY, _Database, platform.url, platform.clientId)
        const plat = new Platform(platform.name, platform.url, platform.clientId, platform.authenticationEndpoint, platform.accesstokenEndpoint, platform.authorizationServer, kid, _ENCRYPTIONKEY, platform.authConfig, this.Database)

        // Save platform to db
        provMainDebug('Registering new platform')
        provMainDebug('Platform Url: ' + platform.url)
        provMainDebug('Platform ClientId: ' + platform.clientId)
        await _Database.Replace(false, 'platform', { platformUrl: platform.url, clientId: platform.clientId }, { platformName: platform.name, platformUrl: platform.url, clientId: platform.clientId, authEndpoint: platform.authenticationEndpoint, accesstokenEndpoint: platform.accesstokenEndpoint, authorizationServer: platform.authorizationServer, kid: kid, authConfig: platform.authConfig })

        return plat
      } catch (err) {
        await _Database.Delete('publickey', { kid: kid })
        await _Database.Delete('privatekey', { kid: kid })
        await _Database.Delete('platform', { platformUrl: platform.url, clientId: platform.clientId })
        provMainDebug(err.message)
        throw (err)
      }
    } else {
      provMainDebug('Platform already registered')
      await _Database.Modify(false, 'platform', { platformUrl: platform.url, clientId: platform.clientId }, { platformName: platform.name || await _platform.platformName(), authEndpoint: platform.authenticationEndpoint || await _platform.platformAuthEndpoint(), accesstokenEndpoint: platform.accesstokenEndpoint || await _platform.platformAccessTokenEndpoint(), authorizationServer: platform.authorizationServer || await _platform.platformAuthorizationServer(), authConfig: platform.authConfig || await _platform.platformAuthConfig() })
      return _getPlatform(platform.url, platform.clientId, _ENCRYPTIONKEY, _Database)
    }
  }

  /**
     * @description Gets a platform.
     * @param {String} url - Platform url.
     * @param {String} [clientId] - Tool clientId.
     * @returns {Promise<Array<Platform>, Platform | false>}
     */
  async getPlatform (url, clientId, ENCRYPTIONKEY, Database) {
    if (!url) throw new Error('MISSING_PLATFORM_URL')

    const _Database = Database || this.Database
    const _ENCRYPTIONKEY = ENCRYPTIONKEY || this.#ENCRYPTIONKEY

    if (clientId) {
      const result = await _Database.Get(false, 'platform', { platformUrl: url, clientId: clientId })
      if (!result) return false
      const plat = result[0]
      const platform = new Platform(plat.platformName, plat.platformUrl, plat.clientId, plat.authEndpoint, plat.accesstokenEndpoint, plat.authorizationServer, plat.kid, _ENCRYPTIONKEY, plat.authConfig, _Database)
      return platform
    }

    const result = await _Database.Get(false, 'platform', { platformUrl: url })
    if (!result) return false

    const platforms = []
    for (const plat of result) {
      const platform = new Platform(plat.platformName, plat.platformUrl, plat.clientId, plat.authEndpoint, plat.accesstokenEndpoint, plat.authorizationServer, plat.kid, _ENCRYPTIONKEY, plat.authConfig, _Database)
      platforms.push(platform)
    }

    return platforms
  }

  /**
   * @description Gets a platform by the platformId.
   * @param {String} platformId - Platform Id.
   * @returns {Promise<Array<Platform>, Platform | false>}
   */
  async getPlatformById (platformId) {
    if (!platformId) throw new Error('MISSING_PLATFORM_ID')

    const result = await this.Database.Get(false, 'platform', { kid: platformId })
    if (!result) return false
    const plat = result[0]
    const platform = new Platform(plat.platformName, plat.platformUrl, plat.clientId, plat.authEndpoint, plat.accesstokenEndpoint, plat.authorizationServer, plat.kid, this.#ENCRYPTIONKEY, plat.authConfig, this.Database)
    return platform
  }

  /**
   * @description Updates a platform by the platformId.
   * @param {String} platformId - Platform Id.
   * @param {Object} platformInfo - Update Information.
   * @param {String} platformInfo.url - Platform url.
   * @param {String} platformInfo.clientId - Platform clientId.
   * @param {String} platformInfo.name - Platform nickname.
   * @param {String} platformInfo.authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the platform.
   * @param {String} platformInfo.accesstokenEndpoint - Access token endpoint that the tool will use to get an access token for the platform.
   * @param {object} platformInfo.authConfig - Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."}
   * @param {String} platformInfo.authConfig.method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
   * @param {String} platformInfo.authConfig.key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
   * @returns {Promise<Array<Platform>, Platform | false>}
   */
  async updatePlatformById (platformId, platformInfo) {
    if (!platformId) { throw new Error('MISSING_PLATFORM_ID') }
    if (!platformInfo) { throw new Error('MISSING_PLATFORM_INFO') }

    const platform = await this.getPlatformById(platformId)
    if (!platform) return false

    const oldURL = await platform.platformUrl()
    const oldClientId = await platform.platformClientId()

    const update = {
      url: platformInfo.url || oldURL,
      clientId: platformInfo.clientId || oldClientId,
      name: platformInfo.name || await platform.platformName(),
      authenticationEndpoint: platformInfo.authenticationEndpoint || await platform.platformAuthEndpoint(),
      accesstokenEndpoint: platformInfo.accesstokenEndpoint || await platform.platformAccessTokenEndpoint()
    }
    if (platformInfo.authorizationServer !== undefined) update.authorizationServer = platformInfo.authorizationServer

    const authConfig = await platform.platformAuthConfig()
    update.authConfig = authConfig
    if (platformInfo.authConfig) {
      if (platformInfo.authConfig.method) update.authConfig.method = platformInfo.authConfig.method
      if (platformInfo.authConfig.key) update.authConfig.key = platformInfo.authConfig.key
    }

    let alteredUrlClientIdFlag = false
    if (platformInfo.url || platformInfo.clientId) {
      if (platformInfo.url !== oldURL || platformInfo.clientId !== oldClientId) alteredUrlClientIdFlag = true
    }

    if (alteredUrlClientIdFlag) {
      if (await this.Database.Get(false, 'platform', { platformUrl: update.url, clientId: update.clientId })) throw new Error('URL_CLIENT_ID_COMBINATION_ALREADY_EXISTS')
    }

    try {
      if (alteredUrlClientIdFlag) {
        await this.Database.Modify(false, 'publickey', { kid: platformId }, { platformUrl: update.url, clientId: update.clientId })
        await this.Database.Modify(false, 'privatekey', { kid: platformId }, { platformUrl: update.url, clientId: update.clientId })
      }

      await this.Database.Modify(false, 'platform', { kid: platformId }, { platformUrl: update.url, clientId: update.clientId, platformName: update.name, authEndpoint: update.authenticationEndpoint, accesstokenEndpoint: update.accesstokenEndpoint, authorizationServer: update.authorizationServer, authConfig: update.authConfig })

      const platform = new Platform(update.name, update.url, update.clientId, update.authenticationEndpoint, update.accesstokenEndpoint, update.authorizationServer, platformId, this.#ENCRYPTIONKEY, update.authConfig, this.Database)
      return platform
    } catch (err) {
      if (alteredUrlClientIdFlag) {
        await this.Database.Modify(false, 'publickey', { kid: platformId }, { platformUrl: oldURL, clientId: oldClientId })
        await this.Database.Modify(false, 'privatekey', { kid: platformId }, { platformUrl: oldURL, clientId: oldClientId })
      }
      provMainDebug(err.message)
      throw (err)
    }
  }

  /**
     * @description Deletes a platform.
     * @param {string} url - Platform url.
     * @param {String} clientId - Tool clientId.
     * @returns {Promise<true>}
     */
  async deletePlatform (url, clientId) {
    if (!url || !clientId) throw new Error('MISSING_PARAM')
    const platform = await this.getPlatform(url, clientId)
    if (platform) await platform.delete()
    return true
  }

  /**
   * @description Deletes a platform by the platform Id.
   * @param {string} platformId - Platform Id.
   * @returns {Promise<true>}
   */
  async deletePlatformById (platformId) {
    if (!platformId) throw new Error('MISSING_PLATFORM_ID')
    const platform = await this.getPlatformById(platformId)
    if (platform) await platform.delete()
    return true
  }

  /**
     * @description Gets all platforms.
     * @returns {Promise<Array<Platform>>}
     */
  async getAllPlatforms () {
    const platforms = []
    const result = await this.Database.Get(false, 'platform')

    if (result) {
      for (const plat of result) platforms.push(new Platform(plat.platformName, plat.platformUrl, plat.clientId, plat.authEndpoint, plat.accesstokenEndpoint, plat.authorizationServer, plat.kid, this.#ENCRYPTIONKEY, plat.authConfig, this.Database))
      return platforms
    }
    return []
  }

  /**
   * @description Redirects to a new location. Passes Ltik if present.
   * @param {Object} res - Express response object.
   * @param {String} path - Redirect path.
   * @param {Object} [options] - Redirection options.
   * @param {Boolean} [options.newResource = false] - If true, changes the path variable on the context token.
   * @param {Object} [options.query] - Query parameters that will be added to the URL.
   * @example lti.redirect(response, '/path', { newResource: true })
   */
  async redirect (res, path, options) {
    if (!res || !path) throw new Error('MISSING_ARGUMENT')
    if (!res.locals.token) return res.redirect(path) // If no token is present, just redirects
    provMainDebug('Redirecting to: ', path)
    const token = res.locals.token
    const pathParts = url.parse(path)
    const additionalQueries = (options && options.query) ? options.query : {}

    // Updates path variable if this is a new resource
    if ((options && (options.newResource || options.isNewResource))) {
      provMainDebug('Changing context token path to: ' + path)
      await this.Database.Modify(false, 'contexttoken', { contextId: token.platformContext.contextId, user: res.locals.token.user }, { path: path })
    }

    // Formatting path with queries
    const params = new URLSearchParams(pathParts.search)
    const queries = {}
    for (const [key, value] of params) { queries[key] = value }

    // Fixing fast-url-parser bug where port gets assigned to pathname if there's no path
    const portMatch = pathParts.pathname.match(/:[0-9]*/)
    if (portMatch) {
      pathParts.port = portMatch[0].split(':')[1]
      pathParts.pathname = pathParts.pathname.split(portMatch[0]).join('')
    }
    const formattedPath = url.format({
      protocol: pathParts.protocol,
      hostname: pathParts.hostname,
      pathname: pathParts.pathname,
      port: pathParts.port,
      auth: pathParts.auth,
      hash: pathParts.hash,
      query: {
        ...queries,
        ...additionalQueries,
        ltik: res.locals.ltik
      }
    })

    // Redirects to path with queries
    return res.redirect(formattedPath)
  }

  // Deprecated methods, these methods will be removed in version 6.0

  /* istanbul ignore next */
  /**
   * @deprecated
   */
  appUrl () {
    console.log('Deprecation warning: The appUrl() method is now deprecated and will be removed in the 6.0 release. Use appRoute() instead.')
    return this.appRoute()
  }

  /* istanbul ignore next */
  /**
   * @deprecated
   */
  loginUrl () {
    console.log('Deprecation warning: The loginUrl() method is now deprecated and will be removed in the 6.0 release. Use loginRoute() instead.')
    return this.loginRoute()
  }

  /* istanbul ignore next */
  /**
   * @deprecated
   */
  keysetUrl () {
    console.log('Deprecation warning: The keysetUrl() method is now deprecated and will be removed in the 6.0 release. Use keysetRoute() instead.')
    return this.keysetRoute()
  }
}

module.exports = new Provider()
