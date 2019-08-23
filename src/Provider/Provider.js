/* eslint-disable require-atomic-updates */
/* eslint-disable no-useless-escape */

/* Main class for the Provider functionalities */

const Server = require('../Utils/Server')
const Request = require('../Utils/Request')
const Platform = require('../Utils/Platform')
const Auth = require('../Utils/Auth')
const Database = require('../Utils/Database')

const GradeService = require('./Services/Grade')

const url = require('url')
const _path = require('path')
const jwt = require('jsonwebtoken')
const winston = require('winston')
const mongoose = require('mongoose')
mongoose.set('useCreateIndex', true)
const Schema = mongoose.Schema

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

  #whitelistedUrls = []

  #ENCRYPTIONKEY

  #logger = false

  #cookieOptions = {
    secure: false,
    httpOnly: true,
    signed: true
  }

  #dbConnection = {}

  #connectCallback = () => {}

  #sessionTimedOut = (req, res) => {
    res.status(401).send('Token invalid or expired. Please reinitiate login.')
  }

  #invalidToken = (req, res) => {
    res.status(401).send('Invalid token. Please reinitiate login.')
  }

  #server

  /**
     * @description Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider and a "server" object to manipulate the Express instance.
     * @param {String} encryptionkey - Secret used to sign cookies and encrypt other info.
     * @param {Object} database - The Database configurations to open and manage connection, uses MongoDB Driver.
     * @param {String} database.url - Database Url (Ex: mongodb://localhost/applicationdb).
     * @param {Object} [database.connection] - Database connection options (Ex: user, pass)
     * @param {String} [database.connection.user] - Database user for authentication if needed.
     * @param {String} [database.conenction.pass] - Database pass for authentication if needed.
     * @param {Object} [options] - Lti Provider additional options,.
     * @param {String} [options.appUrl = '/'] - Lti Provider main url. If no option is set '/' is used.
     * @param {String} [options.loginUrl = '/login'] - Lti Provider login url. If no option is set '/login' is used.
     * @param {String} [options.sessionTimeoutUrl = '/sessionTimeout'] - Lti Provider session timeout url. If no option is set '/sessionTimeout' is used.
     * @param {String} [options.invalidTokenUrl = '/invalidToken'] - Lti Provider invalid token url. If no option is set '/invalidToken' is used.
     * @param {Boolean} [options.https = false] - Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https. If you set this option as true you can enable the secure flag in the cookies options of the onConnect method.
     * @param {Object} [options.ssl] - SSL certificate and key if https is enabled.
     * @param {String} [options.ssl.key] - SSL key.
     * @param {String} [options.ssl.cert] - SSL certificate.
     * @param {String} [options.staticPath] - The path for the static files your application might serve (Ex: _dirname+"/public")
     * @param {Boolean} [options.logger = false] - If true, allows LTIJS to generate logging files for server requests and errors.
     */
  constructor (encryptionkey, database, options) {
    if (options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)) throw new Error('No ssl Key  or Certificate found for local https configuration.')
    if (!encryptionkey) throw new Error('Encryptionkey parameter missing in options.')
    if (!database || !database.url) throw new Error('Missing database configurations.')

    if (options && options.appUrl) this.#appUrl = options.appUrl
    if (options && options.loginUrl) this.#loginUrl = options.loginUrl
    if (options && options.sessionTimeoutUrl) this.#sessionTimeoutUrl = options.sessionTimeoutUrl
    if (options && options.invalidTokenUrl) this.#invalidTokenUrl = options.invalidTokenUrl

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
        write: function (message, encoding) {
          loggerServer.info(message)
        }
      }
    }

    this.#ENCRYPTIONKEY = encryptionkey
    this.#server = new Server(options ? options.https : false, options ? options.ssl : false, this.#ENCRYPTIONKEY, loggerServer)

    // Starts database connection
    if (database.connection) {
      if (!database.connection.useNewUrlParser) database.connection.useNewUrlParser = true
      if (!database.connection.autoReconnect) database.connection.autoReconnect = true
      if (!database.connection.keepAlive) database.connection.keepAlive = true
      if (!database.connection.keepAliveInitialDelay) database.connection.keepAliveInitialDelay = 300000
    } else {
      database.connection = { useNewUrlParser: true, autoReconnect: true, keepAlive: true, keepAliveInitialDelay: 300000, connectTimeoutMS: 300000 }
    }
    this.#dbConnection.url = database.url
    this.#dbConnection.options = database.connection

    // Creating database schemas
    const idTokenSchema = new Schema({
      iss: String,
      issuer_code: String,
      user: String,
      roles: [String],
      userInfo: {
        given_name: String,
        family_name: String,
        name: String,
        email: String
      },
      platformInfo: {
        family_code: String,
        version: String,
        name: String,
        description: String
      },
      endpoint: {
        scope: [String],
        lineitems: String,
        lineitem: String
      },
      namesRoles: {
        context_memberships_url: String,
        service_versions: [String]
      },
      createdAt: { type: Date, expires: 3600 * 24, default: Date.now }
    })
    const contextTokenSchema = new Schema({
      path: String,
      user: String,
      context: { id: String, label: String, title: String, type: Array },
      resource: { title: String, id: String }, // Activity that originated login
      custom: { // Custom parameter sent by the platform
        resource: String, // Id for a requested resource
        system_setting_url: String,
        context_setting_url: String,
        link_setting_url: String
      },
      createdAt: { type: Date, expires: 3600 * 24, default: Date.now }
    })
    const platformSchema = new Schema({
      platformName: String,
      platformUrl: String,
      clientId: String,
      authEndpoint: String,
      accesstokenEndpoint: String,
      kid: String,
      authConfig: {
        method: String,
        key: String
      }
    })
    const keySchema = new Schema({
      kid: String,
      iv: String,
      data: String
    })
    const accessTokenSchema = new Schema({
      platformUrl: String,
      iv: String,
      data: String,
      createdAt: { type: Date, expires: 3600, default: Date.now }
    })
    const nonceSchema = new Schema({
      nonce: String,
      createdAt: { type: Date, expires: 10, default: Date.now }
    })

    try {
      mongoose.model('idToken', idTokenSchema)
      mongoose.model('contextToken', contextTokenSchema)
      mongoose.model('platform', platformSchema)
      mongoose.model('privatekey', keySchema)
      mongoose.model('publickey', keySchema)
      mongoose.model('accesstoken', accessTokenSchema)
      mongoose.model('nonce', nonceSchema)
    } catch (err) {
      if (this.#logger) this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
      provMainDebug('Model already registered. Continuing')
    }

    /**
     * @description Database connection object.
     */
    this.db = mongoose.connection

    /**
     * @description Express server object.
     */
    this.app = this.#server.app

    /**
     * @description Grading service.
     */
    this.Grade = new GradeService(this.getPlatform, this.#ENCRYPTIONKEY, this.#logger)

    if (options && options.staticPath) this.#server.setStaticPath(options.staticPath)

    // Registers main athentication and routing middleware
    const sessionValidator = async (req, res, next) => {
      // Ckeck if request is attempting to initiate oidc login flow
      if (req.url === this.#loginUrl || req.url === this.#sessionTimeoutUrl || req.url === this.#invalidTokenUrl || this.#whitelistedUrls.indexOf(req.url) !== -1) return next()
      if (req.url === this.#appUrl && !req.query.ltik) {
        let origin = req.get('origin')
        if (!origin || origin === 'null') origin = req.get('host')
        if (!origin) return res.redirect(this.#invalidTokenUrl)
        const iss = 'plat' + encodeURIComponent(Buffer.from(origin).toString('base64'))

        let token = {
          issuer: iss,
          path: this.#appUrl
        }
        // Signing context token
        token = jwt.sign(token, this.#ENCRYPTIONKEY)

        return res.redirect(307, this.#appUrl + '?ltik=' + token)
      }

      try {
        if (!req.query.ltik) return res.redirect(this.#invalidTokenUrl)
        const validLtik = jwt.verify(req.query.ltik, this.#ENCRYPTIONKEY)
        let user = false

        const issuer = validLtik.issuer
        const contextPath = _path.join(issuer, validLtik.path)
        const cookies = req.signedCookies

        // Matches path to cookie
        for (const key of Object.keys(cookies)) {
          if (key === issuer) {
            user = cookies[key]
            break
          }
        }

        // Check if user already has session cookie stored in its browser
        if (!user) {
          provMainDebug('No cookie found')
          if (req.body.id_token) {
            provMainDebug('Received request containing token. Sending for validation')
            const valid = await Auth.validateToken(req.body.id_token, this.getPlatform, this.#ENCRYPTIONKEY, this.#logger)
            provAuthDebug('Successfully validated token!')

            // Mount platform token
            const platformToken = {
              iss: valid.iss,
              issuer_code: issuer,
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
              endpoint: valid['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'],
              namesRoles: valid['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice']
            }

            res.cookie(issuer, platformToken.user, this.#cookieOptions)

            // Store idToken in database
            if (await Database.Delete('idToken', { issuer_code: issuer, user: valid.sub })) Database.Insert(false, 'idToken', platformToken)

            // Mount context token
            const contextToken = {
              path: contextPath,
              user: valid.sub,
              context: valid['https://purl.imsglobal.org/spec/lti/claim/context'],
              resource: valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'],
              custom: valid['https://purl.imsglobal.org/spec/lti/claim/custom']
            }

            res.cookie(contextPath, contextToken.resource.id, this.#cookieOptions)

            platformToken.platformContext = contextToken

            // Store contextToken in database
            if (await Database.Delete('contextToken', { path: contextPath, user: valid.sub, 'resource.id': contextToken.resource.id })) Database.Insert(false, 'contextToken', contextToken)

            res.locals.contextToken = req.query.ltik
            res.locals.token = platformToken

            provMainDebug('Passing request to next handler')
            return next()
          } else {
            provMainDebug(req.body)
            if (this.#logger) this.#logger.log({ level: 'error', message: req.body })
            provMainDebug('Passing request to session timeout handler')
            return res.redirect(this.#sessionTimeoutUrl)
          }
        } else {
          provAuthDebug('Cookie found')
          // Gets correspondent id token from database
          let idToken = await Database.Get(false, 'idToken', { issuer_code: issuer, user: user })
          if (!idToken) throw new Error('No id token found')
          idToken = idToken[0]

          let contextTokenName
          // Matches path to cookie
          for (const key of Object.keys(cookies).sort((a, b) => b.length - a.length)) {
            if (contextPath.indexOf(key) !== -1) {
              contextTokenName = key
              break
            }
          }

          // Gets correspondent context token from database
          let contextToken = await Database.Get(false, 'contextToken', { path: contextTokenName, user: user, 'resource.id': cookies[contextTokenName] })
          if (!contextToken) throw new Error('No context token found')
          contextToken = contextToken[0]
          idToken.platformContext = contextToken

          res.locals.contextToken = req.query.ltik
          res.locals.token = idToken

          provMainDebug('Passing request to next handler')
          return next()
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
      provMainDebug('Receiving a login request from: ' + req.body.iss)
      try {
        const platform = await this.getPlatform(req.body.iss)
        if (platform) {
          let origin = req.get('origin')
          if (!origin || origin === 'null') origin = req.get('host')
          if (!origin) return res.redirect(this.#invalidTokenUrl)
          const cookieName = 'plat' + encodeURIComponent(Buffer.from(origin).toString('base64'))
          provMainDebug('Redirecting to platform authentication endpoint')
          res.clearCookie(cookieName, this.#cookieOptions)
          res.redirect(url.format({
            pathname: await platform.platformAuthEndpoint(),
            query: await Request.ltiAdvantageLogin(req.body, platform)
          }))
        } else {
          provMainDebug('Unregistered platform attempting connection: ' + req.body.iss)
          return res.status(401).send('Unregistered platform.')
        }
      } catch (err) {
        provAuthDebug(err.message)
        if (this.#logger) this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
        return res.status(400).send('Bad Request.')
      }
    })

    // Session timeout and invalid token urls
    this.app.all(this.#sessionTimeoutUrl, async (req, res, next) => {
      this.#sessionTimedOut(req, res, next)
    })
    this.app.all(this.#invalidTokenUrl, async (req, res, next) => {
      this.#invalidToken(req, res, next)
    })

    // Main app
    this.app.all(this.#appUrl, async (req, res, next) => {
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
      this.db.on('connected', async () => {
        provMainDebug('Database connected')
      })
      this.db.once('open', async () => {
        provMainDebug('Database connection open')
      })
      this.db.on('error', async () => {
        mongoose.disconnect()
      })
      this.db.on('reconnected', async () => {
        provMainDebug('Database reconnected')
      })
      this.db.on('disconnected', async () => {
        provMainDebug('Database disconnected')
        provMainDebug('Attempting to reconnect')
        setTimeout(async () => {
          if (this.db.readyState === 0) {
            try {
              await mongoose.connect(this.#dbConnection.url, this.#dbConnection.options)
            } catch (err) {
              provMainDebug('Error in MongoDb connection: ' + err)
              if (this.#logger) this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
            }
          }
        }, 1000)
      })

      if (this.db.readyState === 0) await mongoose.connect(this.#dbConnection.url, this.#dbConnection.options)
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

    return true
  }

  /**
   * @description Closes connection to database and stops server.
   * @returns {Promise<true | false>}
   */
  async close () {
    try {
      await this.#server.close()
      this.db.removeAllListeners()
      await this.db.close()
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
     * @example .onConnect((conection, response)=>{response.send(connection)}, {secure: true})
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
   * @description Whitelists Urls to bypass the lti 1.3 authentication protocol. These Url dont have access to a idtoken
   * @param {String} urls - Urls to be whitelisted
   */
  whitelist (...urls) {
    if (!urls) throw new Error('No url passed')
    this.#whitelistedUrls = urls
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
    try {
      const _platform = await this.getPlatform(platform.url)

      if (!_platform) {
        const kid = await Auth.generateProviderKeyPair(this.#ENCRYPTIONKEY)
        const plat = new Platform(platform.name, platform.url, platform.clientId, platform.authenticationEndpoint, platform.accesstokenEndpoint, kid, this.#ENCRYPTIONKEY, platform.authConfig, this.#logger)

        // Save platform to db
        const isregisteredPlat = await Database.Get(false, 'platform', { platformUrl: platform.url })
        if (!isregisteredPlat) {
          provMainDebug('Registering new platform: ' + platform.url)
          await Database.Insert(false, 'platform', { platformName: platform.name, platformUrl: platform.url, clientId: platform.clientId, authEndpoint: platform.authenticationEndpoint, accesstokenEndpoint: platform.accesstokenEndpoint, kid: kid, authConfig: platform.authConfig })
        }
        return plat
      } else {
        return _platform
      }
    } catch (err) {
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
  async getPlatform (url, ENCRYPTIONKEY, logger) {
    if (!url) throw new Error('No url provided')
    try {
      const plat = await Database.Get(false, 'platform', { platformUrl: url })
      if (!plat) return false
      const obj = plat[0]

      if (!obj) return false

      let result
      if (ENCRYPTIONKEY && logger !== undefined) {
        result = new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, ENCRYPTIONKEY, obj.authConfig, logger)
      } else {
        result = new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, this.#ENCRYPTIONKEY, obj.authConfig, this.#logger)
      }

      return result
    } catch (err) {
      provAuthDebug(err.message)
      if (this.#logger) this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
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
      const platforms = await Database.Get(false, 'platform')

      if (platforms) {
        for (const obj of platforms) returnArray.push(new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, this.#ENCRYPTIONKEY, obj.authConfig, this.#logger))
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
    const code = res.locals.token.issuer_code
    const newPath = _path.join(code, path)

    let token = {
      issuer: code,
      path: path
    }
    // Signing context token
    token = jwt.sign(token, this.#ENCRYPTIONKEY)

    if (options && options.isNewResource) {
      provMainDebug('Setting up path cookie for this resource with path: ' + path)
      res.cookie(newPath, res.locals.token.platformContext.resource.id, this.#cookieOptions)

      const newContextToken = {
        resource: res.locals.token.platformContext.resource,
        custom: res.locals.token.platformContext.custom,
        context: res.locals.token.platformContext.context,
        path: newPath,
        user: res.locals.token.platformContext.user
      }

      if (await Database.Delete('contextToken', { path: newPath, user: res.locals.token.user, 'resource.id': res.locals.token.platformContext.resource.id })) Database.Insert(false, 'contextToken', newContextToken)
      if (options && options.ignoreRoot) {
        Database.Delete('contextToken', { path: code + this.#appUrl, user: res.locals.token.user })
        res.clearCookie(code + this.#appUrl)
      }
    }
    return res.redirect(path + '?ltik=' + token)
  }
}

module.exports = Provider
