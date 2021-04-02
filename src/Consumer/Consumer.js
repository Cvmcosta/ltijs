/* eslint-disable require-atomic-updates */
/* eslint-disable no-useless-escape */

/* Main class for the Consumer functionalities */
// Dependencies
const provMainDebug = require('debug')('consumer:main')

// Services
const Core = require('./Advantage/Services/Core')
const DeepLinking = require('./Advantage/Services/DeepLinking')
/* const GradeService = require('./Advantage/Services/Grade')
const NamesAndRolesService = require('./Advantage/Services/NamesAndRoles') */

// Classes
const Auth = require('./Advantage/Classes/Auth')
const Tool = require('./Advantage/Classes/Tool')
const Server = require('./Advantage/Classes/Server')
const Keyset = require('../GlobalUtils/Keyset')

// Database
const Database = require('../GlobalUtils/Database')
const MongoDB = require('../GlobalUtils/MongoDB/MongoDB')

// Helpers
const messageTypes = require('../GlobalUtils/Helpers/messageTypes')
const roles = require('../GlobalUtils/Helpers/roles')
const scopes = require('../GlobalUtils/Helpers/scopes')

/**
 * @descripttion LTI Consumer Class that implements the LTI 1.3 protocol and services.
 */
class Consumer {
  // Pre-initiated variables
  #consumerUrl

  #loginRoute = '/login'

  #accesstokenRoute = '/accesstoken'

  #keysetRoute = '/keys'

  #deepLinkingResponseRoute = '/deeplinking'

  #ENCRYPTIONKEY

  #legacy = false

  #tokenMaxAge = 10

  // Setup flag
  #setup = false

  #coreLaunchCallback = async (loginRequest, req, res) => {
    return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: 'MISSING_CORE_LAUNCH_CALLBACK' } })
  }

  #deepLinkingLaunchCallback = async (loginRequest, req, res) => {
    return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: 'MISSING_DEEPLINKING_LAUNCH_CALLBACK' } })
  }

  #deepLinkingResponseCallback = async (deepLinkingResponse, req, res) => {
    return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: 'MISSING_DEEPLINKING_RESPONSE_CALLBACK' } })
  }

  #invalidLoginRequestCallback = async (req, res) => {
    return res.status(401).send(res.locals.err)
  }

  #invalidDeepLinkingResponseCallback = async (req, res) => {
    return res.status(401).send(res.locals.err)
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
     * @param {Object} options - Lti Provider options.
     * @param {String} options.consumerUrl - Main Consumer URL.
     * @param {String} [options.loginRoute = '/login'] - LTI Consumer login route. If no option is set '/login' is used.
     * @param {String} [options.accesstokenRoute = '/accesstoken'] - LTI Consumer access token generation endpoint.
     * @param {String} [options.keysetRoute = '/keys'] - LTI Consumer public jwk keyset route. If no option is set '/keys' is used.
     * @param {String} [options.deepLinkingResponseRoute = '/deeplinking'] - LTI Consumer public jwk keyset route. If no option is set '/keys' is used.
     * @param {Boolean} [options.https = false] - Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https and are planning to configure ssl through Express.
     * @param {Object} [options.ssl] - SSL certificate and key if https is enabled.
     * @param {String} [options.ssl.key] - SSL key.
     * @param {String} [options.ssl.cert] - SSL certificate.
     * @param {String} [options.staticPath] - The path for the static files your application might serve (Ex: _dirname+"/public")
     * @param {Boolean} [options.cors = true] - If set to false, disables cors.
     * @param {Function} [options.serverAddon] - Allows the execution of a method inside of the server contructor. Can be used to register middlewares.
     * @param {Number} [options.tokenMaxAge = 10] - Sets the idToken max age allowed in seconds. Defaults to 10 seconds. If false, disables max age validation.
     */
  setup (encryptionkey, database, options) {
    if (this.#setup) throw new Error('PROVIDER_ALREADY_SETUP')
    if (options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)) throw new Error('MISSING_SSL_KEY_CERTIFICATE')
    if (!encryptionkey) throw new Error('MISSING_ENCRYPTION_KEY')
    if (!database) throw new Error('MISSING_DATABASE_CONFIGURATION')

    if (options && options.consumerUrl) this.#consumerUrl = options.consumerUrl
    if (options && options.loginRoute) this.#loginRoute = options.loginRoute
    if (options && options.keysetRoute) this.#keysetRoute = options.keysetRoute
    if (options && options.accesstokenRoute) this.#accesstokenRoute = options.accesstokenRoute
    if (options && options.deepLinkingResponseRoute) this.#deepLinkingResponseRoute = options.deepLinkingResponseRoute
    if (options && options.legacy === true) this.#legacy = true
    if (options && options.tokenMaxAge !== undefined) this.#tokenMaxAge = options.tokenMaxAge

    // Encryption Key
    this.#ENCRYPTIONKEY = encryptionkey

    // Setup Databse
    let connector
    if (!database.plugin) connector = new MongoDB(database)
    else connector = database.plugin
    /**
     * @description Database object.
     */
    this.Database = Database
    this.Database.setup(this.#ENCRYPTIONKEY, connector, { type: 'PROVIDER', legacy: this.#legacy })

    // Setting up Server
    this.#server = new Server(options ? options.https : false, options ? options.ssl : false, this.#ENCRYPTIONKEY, options ? options.cors : true, options ? options.serverAddon : false)
    if (options && options.staticPath) this.#server.setStaticPath(options.staticPath)

    /**
     * @description Scopes Helper
     */
    this.Scopes = scopes

    /**
     * @description Message Type Helper
     */
    this.MessageTypes = messageTypes

    /**
     * @description Roles Helper
     */
    this.Roles = roles

    /**
     * @description Express server object.
     */
    this.app = this.#server.app

    /**
     * @description Deep Linking service.
     */
    this.DeepLinking = DeepLinking

    // Authentication request route
    this.app.all(this.#loginRoute, async (req, res, next) => {
      try {
        res.locals.loginRequest = await Auth.validateLoginRequest(req.query, this.#ENCRYPTIONKEY)
        if (res.locals.loginRequest.type === messageTypes.DEEPLINKING_LAUNCH) return this.#deepLinkingLaunchCallback(res.locals.loginRequest, req, res, next)
        return this.#coreLaunchCallback(res.locals.loginRequest, req, res, next)
      } catch (err) {
        provMainDebug(err)
        res.locals.err = {
          status: 401,
          error: 'Unauthorized',
          details: {
            description: 'Error validating login request',
            message: err.message,
            bodyReceived: req.body,
            queryReceived: req.query
          }
        }
        return this.#invalidLoginRequestCallback(req, res)
      }
    })

    // Deep Linking response route
    this.app.all(this.#deepLinkingResponseRoute, async (req, res, next) => {
      try {
        // Validate response
        return this.#deepLinkingResponseCallback(res.locals.deepLinkingResponse, req, res)
      } catch (err) {
        provMainDebug(err)
        res.locals.err = {
          status: 401,
          error: 'Unauthorized',
          details: {
            description: 'Error validating deep linking response',
            message: err.message,
            bodyReceived: req.body,
            queryReceived: req.query
          }
        }
        return this.#invalidDeepLinkingResponseCallback(req, res)
      }
    })

    // Access token generation route
    this.app.all(this.#accesstokenRoute, async (req, res, next) => {
    })

    // Keyset generation route
    this.app.get(this.#keysetRoute, async (req, res, next) => {
      try {
        const keyset = await Keyset.build()
        return res.status(200).send(keyset)
      } catch (err) {
        provMainDebug(err)
        return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: err.message } })
      }
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
    if (!this.#setup) throw new Error('CONSUMER_NOT_SETUP')
    provMainDebug('Attempting to connect to database')
    try {
      await Database.connect()

      const conf = {
        port: 3000,
        silent: false
      }

      if (options && options.port) conf.port = options.port
      if (options && options.silent) conf.silent = options.silent
      // Starts server on given port

      if (options && options.serverless) console.log('Ltijs - Consumer started in serverless mode...')
      else {
        await this.#server.listen(conf.port)
        provMainDebug('Ltijs - Consumer started listening on port: ', conf.port)

        // Startup message
        const message = 'LTI Consumer is listening on port ' + conf.port + '!\n\n LTI provider config: \n >Main URL: ' + this.#consumerUrl + '\n >Login Request Route: ' + this.#loginRoute + '\n >Access Token Generation Route: ' + this.#accesstokenRoute + '\n >Deep Linking Response Route: ' + this.#deepLinkingResponseRoute + '\n >Keyset Route: ' + this.#keysetRoute

        if (!conf.silent) {
          console.log('  _   _______ _____      _  _____\n' +
                      ' | | |__   __|_   _|    | |/ ____|\n' +
                      ' | |    | |    | |      | | (___  \n' +
                      ' | |    | |    | |  _   | |\\___ \\ \n' +
                      ' | |____| |   _| |_| |__| |____) |\n' +
                      ' |______|_|  |_____|\\____/|_____/ \n\n', message)
        }
      }

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
    await Database.close()
    if (!options || options.silent !== true) console.log('Shutdown complete.')
    return true
  }

  /**
   * @description Generates Core launch self-submitting POST form
   * @param {String} toolLinkId - Tool link Id being launched.
   * @param {String} userId - Id for current user.
   * @param {String} [resourceId] - Identifier for resource holding toolLink in Platform.
   */
  async launchCore (toolLinkId, userId, resourceId) {
    return Core.launch(toolLinkId, userId, resourceId, this.#consumerUrl, this.#ENCRYPTIONKEY)
  }

  /**
   * @description Generates DeepLinking launch self-submitting POST form
   * @param {String} clientId - Client Id of Tool being launched.
   * @param {String} userId - Id for current user.
   */
  async launchDeepLinking (clientId, userId) {
    return DeepLinking.launch(clientId, userId, this.#consumerUrl, this.#ENCRYPTIONKEY)
  }

  /**
   * @description Redirects to self-submitting ID Token form.
   * @param {Object} res - Express response object.
   * @param {String} loginRequest - Valid login request object.
   * @param {String} idtoken - Information used to build the ID Token.
   */
  async sendIdToken (res, loginRequest, idtoken) {
    const consumer = {
      url: this.#consumerUrl,
      deepLinkingResponseRoute: this.#deepLinkingResponseRoute
    }
    return Auth.buildIdTokenResponse(res, loginRequest, idtoken, consumer)
  }

  /**
   * @description Generates self-submitting ID Token form.
   * @param {String} loginRequest - Valid login request object.
   * @param {String} idtoken - Information used to build the ID Token.
   */
  async buildIdTokenForm (loginRequest, idtoken) {
    const consumer = {
      url: this.#consumerUrl,
      deepLinkingResponseRoute: this.#deepLinkingResponseRoute
    }
    return Auth.buildIdTokenForm(loginRequest, idtoken, consumer)
  }

  /**
   * @description Generates ID Token.
   * @param {String} loginRequest - Valid login request object.
   * @param {String} idtoken - Information used to build the ID Token.
   */
  async buildIdToken (loginRequest, idtoken) {
    const consumer = {
      url: this.#consumerUrl,
      deepLinkingResponseRoute: this.#deepLinkingResponseRoute
    }
    return Auth.buildIdToken(loginRequest, idtoken, consumer)
  }

  /**
   * @description Sets the callback function called whenever the Consumer receives a valid LTI 1.3 Core Login Request.
   * @param {Function} onCoreLaunchCallback - Callback function called whenever the Consumer receives a valid Core LTI 1.3 Login Request.
   * @returns {true}
   */
  onCoreLaunch (coreLaunchCallback) {
    /* istanbul ignore next */
    if (!coreLaunchCallback) throw new Error('MISSING_CALLBACK')
    this.#coreLaunchCallback = coreLaunchCallback
    return true
  }

  /**
   * @description Sets the callback function called whenever the Consumer receives a valid LTI 1.3 Deep Linking Login Request.
   * @param {Function} onDeepLinkingLaunchCallback - Callback function called whenever the Consumer receives a valid Deep Linking LTI 1.3 Login Request.
   * @returns {true}
   */
  onDeepLinkingLaunch (deepLinkingLaunchCallback) {
    /* istanbul ignore next */
    if (!deepLinkingLaunchCallback) throw new Error('MISSING_CALLBACK')
    this.#deepLinkingLaunchCallback = deepLinkingLaunchCallback
    return true
  }

  /**
   * @description Sets the callback function called whenever the Consumer receives a valid LTI 1.3 Deep Linking Response Request.
   * @param {Function} onDeepLinkingResponseCallback - Callback function called whenever the Consumer receives a valid Deep Linking LTI 1.3 Response Request.
   * @returns {true}
   */
  onDeepLinkingResponse (deepLinkingResponseCallback) {
    /* istanbul ignore next */
    if (!deepLinkingResponseCallback) throw new Error('MISSING_CALLBACK')
    this.#deepLinkingResponseCallback = deepLinkingResponseCallback
    return true
  }

  /**
   * @description Sets the callback function called whenever the Consumer receives an invalid LTI 1.3 Login Request.
   * @param {Function} onInvalidLoginRequestCallback - Callback function called whenever the Consumer receives an invalid LTI 1.3 Login Request.
   * @returns {true}
   */
  onInvalidLoginRequest (onInvalidLoginRequestCallback) {
    /* istanbul ignore next */
    if (!onInvalidLoginRequestCallback) throw new Error('MISSING_CALLBACK')
    this.#invalidLoginRequestCallback = onInvalidLoginRequestCallback
    return true
  }

  /**
   * @description Sets the callback function called whenever the Consumer receives an invalid LTI 1.3 Deep Linking Response.
   * @param {Function} onInvalidLoginRequestCallback - Callback function called whenever the Consumer receives an invalid LTI 1.3 Deep Linking Response.
   * @returns {true}
   */
  onInvalidDeepLinkingResponse (onInvalidDeepLinkingResponseCallback) {
    /* istanbul ignore next */
    if (!onInvalidDeepLinkingResponseCallback) throw new Error('MISSING_CALLBACK')
    this.#invalidDeepLinkingResponseCallback = onInvalidDeepLinkingResponseCallback
    return true
  }

  /**
   * @description Gets the main application URL that will be used as issuer for tokens and basis for building other URLs.
   * @returns {String}
   */
  consumerUrl () {
    return this.#consumerUrl
  }

  /**
   * @description Gets the login route responsible for dealing with the OIDC login flow.
   * @returns {String}
   */
  loginRoute () {
    return this.#loginRoute
  }

  /**
   * @description Gets the access token route that will be used to generate access tokens.
   * @returns {String}
   */
  accesstokenRoute () {
    return this.#accesstokenRoute
  }

  /**
   * @description Gets the deep linking response route that will be used to handle deep linking responses.
   * @returns {String}
   */
  deepLinkingResponseRoute () {
    return this.#deepLinkingResponseRoute
  }

  /**
     * @description Gets the keyset route that will be used to retrieve a public jwk keyset.
     * @returns {String}
     */
  keysetRoute () {
    return this.#keysetRoute
  }

  // Tool methods
  /**
   * @description Registers a tool.
   * @param {Object} tool
   * @param {String} tool.url - Platform url.
   * @param {String} tool.name - Platform nickname.
   * @param {String} tool.clientId - Client Id generated by the platform.
   * @param {String} tool.authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the platform.
   * @param {String} tool.accesstokenEndpoint - Access token endpoint that the tool will use to get an access token for the platform.
   * @param {Object} tool.authConfig - Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."}
   * @param {String} tool.authConfig.method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
   * @param {String} tool.authConfig.key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
   * @returns {Promise<Tool>}
   */
  async registerTool (tool) {
    return Tool.registerTool(tool)
  }

  /**
   * @description Gets a platform.
   * @param {String} clientId - Tool client ID.
   * @returns {Promise<Tool | false>}
   */
  async getTool (clientId) {
    return Tool.getTool(clientId)
  }

  /**
   * @description Updates a Tool.
   * @param {String} clientId - Tool Client Id.
   * @param {Object} toolInfo - Update Information.
   * @param {String} toolInfo.url - Platform url.
   * @param {String} toolInfo.clientId - Platform clientId.
   * @param {String} toolInfo.name - Platform nickname.
   * @param {String} toolInfo.authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the platform.
   * @param {String} toolInfo.accesstokenEndpoint - Access token endpoint that the tool will use to get an access token for the platform.
   * @param {object} toolInfo.authConfig - Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."}
   * @param {String} toolInfo.authConfig.method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
   * @param {String} toolInfo.authConfig.key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
   * @returns {Promise<Tool | false>}
   */
  async updateTool (clientId, toolInfo) {
    return Tool.updateTool(clientId, toolInfo)
  }

  /**
   * @description Deletes a tool.
   * @param {String} clientId - Tool client ID.
   * @returns {Promise<true>}
   */
  async deleteTool (clientId) {
    return Tool.deleteTool(clientId)
  }

  /**
   * @description Gets all tools.
   * @returns {Promise<Array<Tool>>}
   */
  async getAllTools () {
    return Tool.getAllTools()
  }
}

module.exports = new Consumer()
