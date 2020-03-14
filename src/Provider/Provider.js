/* eslint-disable require-atomic-updates */
/* eslint-disable no-useless-escape */

/* Main class for the Provider functionalities */

const Server = require('../Utils/Server')
const Request = require('../Utils/Request')
const Platform = require('../Utils/Platform')
const Auth = require('../Utils/Auth')
const Mongodb = require('../Utils/Database')
const Keyset = require('../Utils/Keyset')

const GradeService = require('./Services/Grade')
const DeepLinkingService = require('./Services/DeepLinking')

const url = require('fast-url-parser')
const _path = require('path')
const jwt = require('jsonwebtoken')
const winston = require('winston')
const validUrl = require('valid-url')
const crypto = require('crypto')
const tldparser = require('tld-extract')

const provAuthDebug = require('debug')('provider:auth')
const provMainDebug = require('debug')('provider:main')

/**
 * @descripttion Exposes methods for easy manipulation of the LTI 1.3 standard as a LTI Provider and a "server" object to manipulate the Express instance
 */
class Provider {
  // Pre-initiated variables
  #loginUrl = '/login'

  #appUrl = '/'

  #sessionTimeoutUrl = '/sessionTimeout'

  #invalidTokenUrl = '/invalidToken'

  #keysetUrl = '/keys'

  #whitelistedUrls = []

  #ENCRYPTIONKEY

  #logger = false

  #cookieOptions = {
    secure: false,
    httpOnly: true,
    signed: true,
    sameSite: 'None'
  }

  #Database

  #connectCallback = (connection, req, res, next) => { return res.send('It works!') }

  #deepLinkingCallback = (connection, req, res, next) => { return res.send('Deep Linking works!') }

  #sessionTimedOut = (req, res) => {
    return res.status(401).send('Token invalid or expired. Please reinitiate login.')
  }

  #invalidToken = (req, res) => {
    return res.status(401).send('Invalid token. Please reinitiate login.')
  }

  // Assembles and sends keyset
  #keyset = async (req, res) => {
    try {
      const keyset = await Keyset.build(this.#Database, this.#ENCRYPTIONKEY, this.#logger)
      return res.status(200).send(keyset)
    } catch (err) {
      provMainDebug(err.message)
      return res.status(500).send(err.message)
    }
  }

  #server

  /**
     * @description Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider and a "server" object to manipulate the Express instance.
     * @param {String} encryptionkey - Secret used to sign cookies and encrypt other info.
     * @param {Object} database - The Database configurations to open and manage connection, uses MongoDB Driver.
     * @param {String} [database.url] - Database Url (Ex: mongodb://localhost/applicationdb).
     * @param {Object} [database.plugin] - If set, must be the Database object of the desired database plugin.
     * @param {Object} [database.connection] - Database connection options (Ex: user, pass)
     * @param {String} [database.connection.user] - Database user for authentication if needed.
     * @param {String} [database.conenction.pass] - Database pass for authentication if needed.
     * @param {Object} [options] - Lti Provider additional options,.
     * @param {String} [options.appUrl = '/'] - Lti Provider main url. If no option is set '/' is used.
     * @param {String} [options.loginUrl = '/login'] - Lti Provider login url. If no option is set '/login' is used.
     * @param {String} [options.sessionTimeoutUrl = '/sessionTimeout'] - Lti Provider session timeout url. If no option is set '/sessionTimeout' is used.
     * @param {String} [options.invalidTokenUrl = '/invalidToken'] - Lti Provider invalid token url. If no option is set '/invalidToken' is used.
     * @param {String} [options.keysetUrl = '/keys'] - Lti Provider public jwk keyset url. If no option is set '/keys' is used.
     * @param {Boolean} [options.https = false] - Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https. If you set this option as true you can enable the secure flag in the cookies options of the onConnect method.
     * @param {Object} [options.ssl] - SSL certificate and key if https is enabled.
     * @param {String} [options.ssl.key] - SSL key.
     * @param {String} [options.ssl.cert] - SSL certificate.
     * @param {String} [options.staticPath] - The path for the static files your application might serve (Ex: _dirname+"/public")
     * @param {Boolean} [options.logger = false] - If true, allows Ltijs to generate logging files for server requests and errors.
     * @param {Boolean} [options.cors = true] - If false, disables cors.
     */
  constructor (encryptionkey, database, options) {
    if (options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)) throw new Error('No ssl Key  or Certificate found for local https configuration.')
    if (!encryptionkey) throw new Error('Encryptionkey parameter missing in options.')
    if (!database) throw new Error('Missing database configurations.')

    if (!database.plugin) this.#Database = new Mongodb(database)
    else this.#Database = database.plugin

    if (options && options.appUrl) this.#appUrl = options.appUrl
    if (options && options.loginUrl) this.#loginUrl = options.loginUrl
    if (options && options.sessionTimeoutUrl) this.#sessionTimeoutUrl = options.sessionTimeoutUrl
    if (options && options.invalidTokenUrl) this.#invalidTokenUrl = options.invalidTokenUrl
    if (options && options.keysetUrl) this.#keysetUrl = options.keysetUrl

    // Setting up logger
    let loggerServer = false
    if (options && options.logger) {
      this.#logger = winston.createLogger({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format.prettyPrint()
        ),
        transports: [
          new winston.transports.File({
            filename: 'logs/ltijs_error.log',
            level: 'error',
            handleExceptions: true,
            maxsize: 250000, // 500kb (with two files)
            maxFiles: 1,
            colorize: false,
            tailable: true
          })
        ],
        exitOnError: false
      })

      // Server logger
      loggerServer = winston.createLogger({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.prettyPrint()
        ),
        transports: [
          new winston.transports.File({
            filename: 'logs/ltijs_server.log',
            handleExceptions: true,
            json: true,
            maxsize: 250000, // 500kb (with two files)
            maxFiles: 1,
            colorize: false,
            tailable: true
          })
        ],
        exitOnError: false
      })

      loggerServer.stream = {
        write: function (message) {
          loggerServer.info(message)
        }
      }
    }

    this.#ENCRYPTIONKEY = encryptionkey

    this.#server = new Server(options ? options.https : false, options ? options.ssl : false, this.#ENCRYPTIONKEY, loggerServer, options ? options.cors : true)

    /**
     * @description Express server object.
     */
    this.app = this.#server.app

    /**
     * @description Grading service.
     */
    this.Grade = new GradeService(this.getPlatform, this.#ENCRYPTIONKEY, this.#logger, this.#Database)

    /**
     * @description Deep Linking service.
     */
    this.DeepLinking = new DeepLinkingService(this.getPlatform, this.#ENCRYPTIONKEY, this.#logger, this.#Database)

    if (options && options.staticPath) this.#server.setStaticPath(options.staticPath)

    // Registers main athentication and routing middleware
    const sessionValidator = async (req, res, next) => {
      provMainDebug('Receiving request at path: ' + req.path)
      // Ckeck if request is attempting to initiate oidc login flow or access reserved or whitelisted routes
      if (req.path === this.#loginUrl || req.path === this.#sessionTimeoutUrl || req.path === this.#invalidTokenUrl || req.path === this.#keysetUrl) return next()

      provMainDebug('Path does not match reserved endpoints')

      try {
        // Retrieving LTIK token
        const ltik = req.token
        // Retrieving cookies
        const cookies = req.signedCookies
        provMainDebug('Cookies received: ')
        provMainDebug(cookies)

        if (!ltik) {
          const idtoken = req.body.id_token
          if (req.path === this.#appUrl && idtoken) {
            // No ltik found but request contains an idtoken
            provMainDebug('Received idtoken for validation')
            const decoded = jwt.decode(idtoken, { complete: true })

            const iss = decoded.payload.iss
            const state = req.body.state

            // Retrieving validation parameters from cookies
            const validationCookies = {
              state: cookies[state + '-state'],
              iss: cookies[state + '-iss']
            }

            const valid = await Auth.validateToken(idtoken, decoded, state, validationCookies, this.getPlatform, this.#ENCRYPTIONKEY, this.#logger, this.#Database)

            // Deleting validation cookies
            res.clearCookie(state + '-state', this.#cookieOptions)
            res.clearCookie(state + '-iss', this.#cookieOptions)

            provAuthDebug('Successfully validated token!')

            const issuerCode = 'plat' + encodeURIComponent(Buffer.from(iss).toString('base64'))

            const courseId = valid['https://purl.imsglobal.org/spec/lti/claim/context'] ? valid['https://purl.imsglobal.org/spec/lti/claim/context'].id : 'NF'
            const resourseId = valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'] ? valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'].id : 'NF'
            const activityId = courseId + '_' + resourseId

            const contextPath = _path.join(issuerCode, this.#appUrl, activityId)

            // Mount platform token
            const platformToken = {
              iss: valid.iss,
              issuerCode: issuerCode,
              user: valid.sub,
              roles: valid['https://purl.imsglobal.org/spec/lti/claim/roles'],
              userInfo: {
                given_name: valid.given_name,
                family_name: valid.family_name,
                name: valid.name,
                email: valid.email
              },
              platformInfo: {
                family_code: valid['https://purl.imsglobal.org/spec/lti/claim/tool_platform'].family_code,
                version: valid['https://purl.imsglobal.org/spec/lti/claim/tool_platform'].version,
                name: valid['https://purl.imsglobal.org/spec/lti/claim/tool_platform'].name,
                description: valid['https://purl.imsglobal.org/spec/lti/claim/tool_platform'].description
              },
              lis: valid['https://purl.imsglobal.org/spec/lti/claim/lis'],
              endpoint: valid['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'],
              namesRoles: valid['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice']
            }

            // Store idToken in database
            if (await this.#Database.Delete('idtoken', { issuerCode: issuerCode, user: platformToken.user })) this.#Database.Insert(false, 'idtoken', platformToken)

            // Mount context token
            const contextToken = {
              path: contextPath,
              user: valid.sub,
              deploymentId: valid['https://purl.imsglobal.org/spec/lti/claim/deployment_id'],
              targetLinkUri: valid['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'],
              context: valid['https://purl.imsglobal.org/spec/lti/claim/context'],
              resource: valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'],
              custom: valid['https://purl.imsglobal.org/spec/lti/claim/custom'],
              launchPresentation: valid['https://purl.imsglobal.org/spec/lti/claim/launch_presentation'],
              messageType: valid['https://purl.imsglobal.org/spec/lti/claim/message_type'],
              version: valid['https://purl.imsglobal.org/spec/lti/claim/version'],
              deepLinkingSettings: valid['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings']
            }

            // Store contextToken in database
            if (await this.#Database.Delete('contexttoken', { path: contextPath, user: contextToken.user })) this.#Database.Insert(false, 'contexttoken', contextToken)

            res.cookie(contextPath, platformToken.user, this.#cookieOptions)

            provMainDebug('Generating LTIK and redirecting to main endpoint')
            const newLtikObj = {
              issuer: issuerCode,
              path: this.#appUrl,
              activityId: activityId
            }
            // Signing context token
            const newLtik = jwt.sign(newLtikObj, this.#ENCRYPTIONKEY)

            return res.redirect(307, this.#appUrl + '?ltik=' + newLtik)
          } else {
            if (this.#whitelistedUrls.indexOf(req.path) !== -1 || this.#whitelistedUrls.indexOf(req.path + '-method-' + req.method.toUpperCase()) !== -1) {
              provMainDebug('Accessing as whitelisted URL')
              return next()
            }
            provMainDebug('No LTIK found')
            return res.redirect(this.#invalidTokenUrl)
          }
        }

        provMainDebug('LTIK found')
        let validLtik
        try {
          validLtik = jwt.verify(ltik, this.#ENCRYPTIONKEY)
        } catch (err) {
          if (this.#whitelistedUrls.indexOf(req.path) !== -1 || this.#whitelistedUrls.indexOf(req.path + '-method-' + req.method.toUpperCase()) !== -1) {
            provMainDebug('Accessing as whitelisted URL')
            return next()
          }
          throw new Error(err.message)
        }
        provMainDebug('LTIK successfully verified')

        let user = false

        const issuerCode = validLtik.issuer
        const contextPath = _path.join(issuerCode, validLtik.path, validLtik.activityId)

        // Matches path to cookie
        provMainDebug('Attempting to retrieve matching session cookie')
        let contextTokenName
        for (const key of Object.keys(cookies).sort((a, b) => b.length - a.length)) {
          if (contextPath.indexOf(key) !== -1) {
            user = cookies[key]
            contextTokenName = key
            break
          }
        }

        // Check if user already has session cookie stored in its browser
        if (user) {
          provAuthDebug('Session cookie found')
          // Gets correspondent id token from database
          let idToken = await this.#Database.Get(false, 'idtoken', { issuerCode: issuerCode, user: user })
          if (!idToken) throw new Error('No id token found in database')
          idToken = idToken[0]

          // Gets correspondent context token from database
          let contextToken = await this.#Database.Get(false, 'contexttoken', { path: contextTokenName, user: user })
          if (!contextToken) throw new Error('No context token found in database')
          contextToken = contextToken[0]
          idToken.platformContext = contextToken

          // Creating local variables
          res.locals.context = contextToken
          res.locals.token = idToken

          provMainDebug('Passing request to next handler')
          return next()
        } else {
          provMainDebug('No session cookie found')
          provMainDebug(req.body)
          if (this.#logger) this.#logger.log({ level: 'error', message: req.body })
          provMainDebug('Passing request to session timeout handler')
          return res.redirect(this.#sessionTimeoutUrl)
        }
      } catch (err) {
        provAuthDebug(err.message)
        if (this.#logger) this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
        provMainDebug('Passing request to invalid token handler')
        return res.redirect(this.#invalidTokenUrl)
      }
    }

    this.app.use(sessionValidator)

    this.app.all(this.#loginUrl, async (req, res) => {
      const params = { ...req.query, ...req.body }
      try {
        const iss = params.iss
        provMainDebug('Receiving a login request from: ' + iss)
        const platform = await this.getPlatform(iss)
        if (platform) {
          provMainDebug('Redirecting to platform authentication endpoint')

          // Create state parameter used to validade authentication response
          const state = encodeURIComponent(crypto.randomBytes(16).toString('base64'))

          // Setting up validation cookies
          res.cookie(state + '-state', state, this.#cookieOptions)
          res.cookie(state + '-iss', iss, this.#cookieOptions)

          // Redirect to authentication endpoint
          res.redirect(url.format({
            pathname: await platform.platformAuthEndpoint(),
            query: await Request.ltiAdvantageLogin(params, platform, state)
          }))
        } else {
          provMainDebug('Unregistered platform attempting connection: ' + iss)
          return res.status(401).send('Unregistered platform.')
        }
      } catch (err) {
        provAuthDebug(err)
        if (this.#logger) this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
        return res.status(400).send('Bad Request.')
      }
    })

    // Session timeout, invalid token and keyset urls
    this.app.all(this.#sessionTimeoutUrl, async (req, res, next) => {
      this.#sessionTimedOut(req, res, next)
    })
    this.app.all(this.#invalidTokenUrl, async (req, res, next) => {
      this.#invalidToken(req, res, next)
    })
    this.app.get(this.#keysetUrl, async (req, res, next) => {
      this.#keyset(req, res, next)
    })

    // Main app
    this.app.all(this.#appUrl, async (req, res, next) => {
      if (res.locals.context.messageType === 'LtiDeepLinkingRequest') return this.#deepLinkingCallback(res.locals.token, req, res, next)
      return this.#connectCallback(res.locals.token, req, res, next)
    })
  }

  /**
     * @description Starts listening to a given port for LTI requests and opens connection to the database.
     * @param {Object} [options] - Deployment options.
     * @param {Number} [options.port] - Deployment port. 3000 by default.
     * @param {Boolean} [options.silent] - If true, disables initial startup message.
     * @returns {Promise<true| false>}
     */
  async deploy (options) {
    provMainDebug('Attempting to connect to database')
    try {
      await this.#Database.setup()
    } catch (err) {
      provMainDebug(err.message)
      if (this.#logger) this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
      return false
    }
    const conf = {
      port: 3000,
      silent: false
    }

    if (options && options.port) conf.port = options.port
    if (options && options.silent) conf.silent = options.silent
    // Starts server on given port
    this.#server.listen(conf, 'LTI Provider is listening on port ' + conf.port + '!\n\n LTI provider config: \n >Initiate login URL: ' + this.#loginUrl + '\n >App Url: ' + this.#appUrl + '\n >Session Timeout Url: ' + this.#sessionTimeoutUrl + '\n >Invalid Token Url: ' + this.#invalidTokenUrl)

    // Sets up gracefull shutdown
    process.on('SIGINT', async () => {
      await this.close(options)
      process.exit()
    })

    return true
  }

  /**
   * @description Closes connection to database and stops server.
   * @returns {Promise<true | false>}
   */
  async close (options) {
    try {
      if (!options || options.silent !== true) console.log('Closing server...')
      await this.#server.close()
      if (!options || options.silent !== true) console.log('Closing connection to the database...')
      await this.#Database.Close()
      if (!options || options.silent !== true) console.log('All done')
      return true
    } catch (err) {
      provMainDebug(err.message)
      if (this.#logger) this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
      return false
    }
  }

  /**
     * @description Sets the callback function called whenever theres a sucessfull connection, exposing a Conection object containing the id_token decoded parameters.
     * @param {Function} _connectCallback - Function that is going to be called everytime a platform sucessfully connects to the provider.
     * @param {Object} [options] - Options configuring the usage of cookies to pass the Id Token data to the client.
     * @param {Boolean} [options.secure = false] - Secure property of the cookie.
     * @param {Function} [options.sessionTimeout] - Route function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @param {Function} [options.invalidToken] - Route function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @example .onConnect((conection, request, response)=>{response.send(connection)}, {secure: true})
     * @returns {true}
     */
  onConnect (_connectCallback, options) {
    if (options) {
      if (options.secure === true) this.#cookieOptions.secure = options.secure
      if (options.sessionTimeout) this.#sessionTimedOut = options.sessionTimeout
      if (options.invalidToken) this.#invalidToken = options.invalidToken
    }

    if (_connectCallback) {
      this.#connectCallback = _connectCallback
      return true
    }
    throw new Error('Missing callback')
  }

  /**
     * @description Sets the callback function called whenever theres a sucessfull deep linking request, exposing a Conection object containing the id_token decoded parameters.
     * @param {Function} _deepLinkingCallback - Function that is going to be called everytime a platform sucessfully launches a deep linking request.
     * @param {Object} [options] - Options configuring the usage of cookies to pass the Id Token data to the client.
     * @param {Boolean} [options.secure = false] - Secure property of the cookie.
     * @param {Function} [options.sessionTimeout] - Route function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @param {Function} [options.invalidToken] - Route function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @example .onDeepLinking((conection, request, response)=>{response.send(connection)}, {secure: true})
     * @returns {true}
     */
  onDeepLinking (_deepLinkingCallback, options) {
    if (options) {
      if (options.secure === true) this.#cookieOptions.secure = options.secure
      if (options.sessionTimeout) this.#sessionTimedOut = options.sessionTimeout
      if (options.invalidToken) this.#invalidToken = options.invalidToken
    }

    if (_deepLinkingCallback) {
      this.#deepLinkingCallback = _deepLinkingCallback
      return true
    }
    throw new Error('Missing callback')
  }

  /**
   * @description Gets the login Url responsible for dealing with the OIDC login flow.
   * @returns {String}
   */
  loginUrl () {
    return this.#loginUrl
  }

  /**
   * @description Gets the main application Url that will receive the final decoded Idtoken.
   * @returns {String}
   */
  appUrl () {
    return this.#appUrl
  }

  /**
     * @description Gets the session timeout Url that will be called whenever the system encounters a session timeout.
     * @returns {String}
     */
  sessionTimeoutUrl () {
    return this.#sessionTimeoutUrl
  }

  /**
     * @description Gets the invalid token Url that will be called whenever the system encounters a invalid token or cookie.
     * @returns {String}
     */
  invalidTokenUrl () {
    return this.#invalidTokenUrl
  }

  /**
     * @description Gets the keyset Url that will be used to retrieve a public jwk keyset.
     * @returns {String}
     */
  keysetUrl () {
    return this.#keysetUrl
  }

  /**
   * @description Whitelists Urls to bypass the lti 1.3 authentication protocol. These Url dont have access to a idtoken
   * @param {String} urls - Urls to be whitelisted
   */
  whitelist (...urls) {
    if (!urls) throw new Error('No url passed.')
    const formattedUrls = []
    for (const url of urls) {
      const isObject = url === Object(url)
      if (isObject) {
        if (!url.route || !url.method) throw new Error('Wrong object format on route. Expects string ("/route") or object ({ route: "/route", method: "POST" })')
        formattedUrls.push(url.route + '-method-' + url.method.toUpperCase())
      } else formattedUrls.push(url)
    }
    this.#whitelistedUrls = formattedUrls
    return true
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
     * @returns {Promise<Platform|false>}
     */
  async registerPlatform (platform) {
    if (!platform || !platform.name || !platform.url || !platform.clientId || !platform.authenticationEndpoint || !platform.accesstokenEndpoint || !platform.authConfig) throw new Error('Error registering platform. Missing argument.')
    let kid
    try {
      const _platform = await this.getPlatform(platform.url)

      if (!_platform) {
        kid = await Auth.generateProviderKeyPair(this.#ENCRYPTIONKEY, this.#Database)
        const plat = new Platform(platform.name, platform.url, platform.clientId, platform.authenticationEndpoint, platform.accesstokenEndpoint, kid, this.#ENCRYPTIONKEY, platform.authConfig, this.#logger, this.#Database)

        // Save platform to db
        provMainDebug('Registering new platform: ' + platform.url)
        await this.#Database.Insert(false, 'platform', { platformName: platform.name, platformUrl: platform.url, clientId: platform.clientId, authEndpoint: platform.authenticationEndpoint, accesstokenEndpoint: platform.accesstokenEndpoint, kid: kid, authConfig: platform.authConfig })

        return plat
      } else {
        return _platform
      }
    } catch (err) {
      await this.#Database.Delete('publickey', { kid: kid })
      await this.#Database.Delete('privatekey', { kid: kid })
      await this.#Database.Delete('platform', { platformUrl: platform.url })
      provAuthDebug(err.message)
      if (this.#logger) this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
      return false
    }
  }

  /**
     * @description Gets a platform.
     * @param {String} url - Platform url.
     * @returns {Promise<Platform | false>}
     */
  async getPlatform (url, ENCRYPTIONKEY, logger, Database) {
    if (!url) throw new Error('No url provided')
    try {
      const plat = Database !== undefined ? await Database.Get(false, 'platform', { platformUrl: url }) : await this.#Database.Get(false, 'platform', { platformUrl: url })

      if (!plat) return false
      const obj = plat[0]

      if (!obj) return false
      const result = new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, ENCRYPTIONKEY !== undefined ? ENCRYPTIONKEY : this.#ENCRYPTIONKEY, obj.authConfig, logger !== undefined ? logger : this.#logger, Database !== undefined ? Database : this.#Database)

      return result
    } catch (err) {
      provAuthDebug(err.message)
      // If logger is set (Function was called by the Auth or Grade service) and is set to true, or if the scope logger variable is true, print the log
      if ((logger !== undefined && logger) || this.#logger) logger !== undefined ? logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack }) : this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
      return false
    }
  }

  /**
     * @description Deletes a platform.
     * @param {string} url - Platform url.
     * @returns {Promise<true | false>}
     */
  async deletePlatform (url) {
    if (!url) throw new Error('No url provided')
    const platform = await this.getPlatform(url)
    if (platform) return platform.remove()
    return false
  }

  /**
     * @description Gets all platforms.
     * @returns {Promise<Array<Platform>| false>}
     */
  async getAllPlatforms () {
    const returnArray = []
    try {
      const platforms = await this.#Database.Get(false, 'platform')

      if (platforms) {
        for (const obj of platforms) returnArray.push(new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, this.#ENCRYPTIONKEY, obj.authConfig, this.#logger, this.#Database))
        return returnArray
      }
      return []
    } catch (err) {
      provAuthDebug(err.message)
      if (this.#logger) this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
      return false
    }
  }

  /**
   * @description Redirect to a new location and sets it's cookie if the location represents a separate resource
   * @param {Object} res - Express response object
   * @param {String} path - Redirect path
   * @param {Object} [options] - Redirection options
   * @param {Boolean} [options.isNewResource = false] - If true creates new resource and its cookie
   * @param {Boolean} [options.ignoreRoot = false] - If true deletes de main path (/) database tokenb on redirect, this saves storage space and is recommended if you are using your main root only to redirect
   * @example lti.generatePathCookie(response, '/path', { isNewResource: true })
   */
  async redirect (res, path, options) {
    if (this.#whitelistedUrls.indexOf(path) !== -1) return res.redirect(path)
    const code = res.locals.token.issuerCode
    const courseId = res.locals.token.platformContext.context ? res.locals.token.platformContext.context.id : 'NF'
    const resourseId = res.locals.token.platformContext.resource ? res.locals.token.platformContext.resource.id : 'NF'
    const activityId = courseId + '_' + resourseId
    const pathParts = url.parse(path)

    // Create cookie name
    const cookiePath = url.format({
      protocol: pathParts.protocol,
      hostname: pathParts.hostname,
      pathname: pathParts.pathname,
      port: pathParts.port,
      auth: pathParts.auth
    })
    const contextPath = _path.join(code, cookiePath, activityId)

    let token = {
      issuer: code,
      path: cookiePath,
      activityId: activityId
    }
    // Signing context token
    token = jwt.sign(token, this.#ENCRYPTIONKEY)

    // Checking the type of redirect
    const externalRequest = validUrl.isWebUri(path)

    if ((options && options.isNewResource) || externalRequest) {
      provMainDebug('Setting up path cookie for this resource with path: ' + path)
      const cookieOptions = JSON.parse(JSON.stringify(this.#cookieOptions))
      if (externalRequest) {
        const domain = tldparser(externalRequest).domain
        cookieOptions.domain = '.' + domain
        provMainDebug('External request found for domain: .' + domain)
      }

      res.cookie(contextPath, res.locals.token.user, cookieOptions)

      const oldpath = res.locals.token.platformContext.path

      const newContextToken = {
        resource: res.locals.token.platformContext.resource,
        custom: res.locals.token.platformContext.custom,
        context: res.locals.token.platformContext.context,
        path: contextPath,
        user: res.locals.token.platformContext.user,
        deploymentId: res.locals.token.platformContext.deploymentId,
        targetLinkUri: res.locals.token.platformContext.targetLinkUri,
        launchPresentation: res.locals.token.platformContext.launchPresentation,
        messageType: res.locals.token.platformContext.messageType,
        version: res.locals.token.platformContext.version,
        deepLinkingSettings: res.locals.token.platformContext.deepLinkingSettings
      }

      if (await this.#Database.Delete('contexttoken', { path: contextPath, user: res.locals.token.user })) this.#Database.Insert(false, 'contexttoken', newContextToken)
      if (options && options.ignoreRoot) {
        this.#Database.Delete('contexttoken', { path: oldpath, user: res.locals.token.user })
        res.clearCookie(oldpath, this.#cookieOptions)
      }
    }

    // Formatting path with queries
    const params = new URLSearchParams(pathParts.search)
    const queries = {}
    for (const [key, value] of params) { queries[key] = value }

    const formattedPath = url.format({
      protocol: pathParts.protocol,
      hostname: pathParts.hostname,
      pathname: pathParts.pathname,
      port: pathParts.port,
      auth: pathParts.auth,
      query: {
        ...queries,
        ltik: token
      }
    })

    // Sets allow credentials header and redirects to path with queries
    res.header('Access-Control-Allow-Credentials', 'true')
    return res.redirect(formattedPath)
  }
}

module.exports = Provider
