/* eslint-disable require-atomic-updates */
/* eslint-disable no-useless-escape */
/* Main class for the Provider functionalities */

const Server = require('../Utils/Server')
const Request = require('../Utils/Request')
const Platform = require('../Utils/Platform')
const Auth = require('../Utils/Auth')
const Database = require('../Utils/Database')

const url = require('url')
const got = require('got')
const find = require('lodash.find')
const validator = require('validator')
const mongoose = require('mongoose')
mongoose.set('useCreateIndex', true)
const Schema = mongoose.Schema

const provAuthDebug = require('debug')('provider:auth')
const provMainDebug = require('debug')('provider:main')

/**
 * @descripttion Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider and a "server" object to manipulate the Express instance
 */
class Provider {
  // Pre-initiated variables
  #loginUrl = '/login'
  #appUrl = '/'

  #sessionTimeoutUrl = '/sessionTimeout'
  #invalidTokenUrl = '/invalidToken'
  #ENCRYPTIONKEY

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
     * @param {Object} [options] - Lti Provider additional options.
     * @param {Boolean} [options.https = false] - Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https. If you set this option as true you can enable the secure flag in the cookies options of the onConnect method.
     * @param {Object} [options.ssl] - SSL certificate and key if https is enabled.
     * @param {String} [options.ssl.key] - SSL key.
     * @param {String} [options.ssl.cert] - SSL certificate.
     * @param {String} [options.staticPath] - The path for the static files your application might serve (Ex: _dirname+"/public")
     */
  constructor (encryptionkey, database, options) {
    if (options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)) throw new Error('No ssl Key  or Certificate found for local https configuration.')
    if (!encryptionkey) throw new Error('Encryptionkey parameter missing in options.')
    if (!database || !database.url) throw new Error('Missing database configurations.')

    this.#ENCRYPTIONKEY = encryptionkey
    this.#server = new Server(options.https, options.ssl, this.#ENCRYPTIONKEY)

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
      mongoose.model('platform', platformSchema)
      mongoose.model('privatekey', keySchema)
      mongoose.model('publickey', keySchema)
      mongoose.model('accesstoken', accessTokenSchema)
      mongoose.model('nonce', nonceSchema)
    } catch (err) {
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

    if (options.staticPath) this.#server.setStaticPath(options.staticPath)
    this.app.get('/favicon.ico', (req, res) => res.status(204))

    // Registers main athentication and routing middleware
    let sessionValidator = async (req, res, next) => {
      // Ckeck if request is attempting to initiate oidc login flow
      if (req.url === this.#loginUrl || req.url === this.#sessionTimeoutUrl || req.url === this.#invalidTokenUrl) return next()

      if (req.url === this.#appUrl) {
        let origin = req.get('origin')
        if (!origin) origin = req.get('host')
        if (!origin) return res.redirect(this.#invalidTokenUrl)
        let iss = 'plat' + encodeURIComponent(Buffer.from(origin).toString('base64'))
        return res.redirect(307, '/' + iss)
      }

      try {
        let it = false
        let urlArr = req.url.split('/')
        let issuer = urlArr[1]
        let path = ''
        let isApiRequest = false
        let cookies = req.signedCookies

        // Validate issuer_code to see if its a route or normal request
        if (issuer.search('plat') === -1) isApiRequest = true
        if (!isApiRequest) {
          try {
            let decode = Buffer.from(decodeURIComponent(issuer.split('plat')[1]), 'base64').toString('ascii')
            if (!validator.isURL(decode)) isApiRequest = true
          } catch (err) {
            provMainDebug(err)
            isApiRequest = true
          }
        }

        // Mount request path and issuer_code
        if (isApiRequest) {
          let requestParts
          if (req.query.context) {
            requestParts = req.query.context.split('/')
          } else {
            return res.status(400).send('Missing context parameter in request.')
          }
          issuer = encodeURIComponent(requestParts[1])
          let _urlArr = []
          for (let i in requestParts) _urlArr.push(requestParts[i])
          urlArr = _urlArr
        }
        for (let i in urlArr) if (parseInt(i) !== 0 && parseInt(i) !== 1) path = path + '/' + urlArr[i]

        // Mathes path to cookie
        for (let key of Object.keys(cookies)) {
          if (key === issuer) {
            it = cookies[key]
            break
          }
        }

        // Check if user already has session cookie stored in its browser
        if (!it) {
          provMainDebug('No cookie found')
          if (req.body.id_token) {
            provMainDebug('Received request containing token. Sending for validation')
            let valid = await Auth.validateToken(req.body.id_token, this.getPlatform, this.#ENCRYPTIONKEY)
            provAuthDebug('Successfully validated token!')

            // Mount platform cookie
            let platformCookie = {
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

            res.cookie(issuer, platformCookie, this.#cookieOptions)

            // Mount context cookie
            let contextCookie = {
              context: valid['https://purl.imsglobal.org/spec/lti/claim/context'],
              resource: valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'],
              custom: valid['https://purl.imsglobal.org/spec/lti/claim/custom']
            }

            res.cookie(issuer + '/', contextCookie, this.#cookieOptions)

            platformCookie.platformContext = contextCookie

            res.locals.token = platformCookie
            res.locals.login = true

            provMainDebug('Passing request to next handler')
            return next()
          } else {
            provMainDebug('Passing request to session timeout handler')
            return res.redirect(this.#sessionTimeoutUrl)
          }
        } else {
          provAuthDebug('Cookie found')
          let valid = it

          res.cookie(issuer, valid, this.#cookieOptions)

          let isPath = false
          if (path) {
            path = issuer + path
            for (let key of Object.keys(cookies)) {
              if (key === issuer) continue
              if (path.search(key) !== -1) {
                isPath = cookies[key]
                break
              }
            }
            if (isPath) {
              valid.platformContext = isPath
              if (!valid.platformContext) throw new Error('No path cookie found')
            }
          } else {
            valid.platformContext = cookies[issuer + '/']
            if (!valid.platformContext) throw new Error('No path cookie found')
          }

          res.locals.token = valid
          res.locals.login = false

          provMainDebug('Passing request to next handler')
          return next()
        }
      } catch (err) {
        provAuthDebug(err)
        provMainDebug('Error retrieving or validating token. Passing request to invalid token handler')
        return res.redirect(this.#invalidTokenUrl)
      }
    }

    this.app.use(sessionValidator)

    this.app.post(this.#loginUrl, async (req, res) => {
      provMainDebug('Receiving a login request from: ' + req.body.iss)
      let platform = await this.getPlatform(req.body.iss)
      if (platform) {
        let origin = req.get('origin')
        if (!origin) origin = req.get('host')
        if (!origin) return res.redirect(this.#invalidTokenUrl)
        let cookieName = 'plat' + encodeURIComponent(Buffer.from(origin).toString('base64'))
        provMainDebug('Redirecting to platform authentication endpoint')
        res.clearCookie(cookieName, this.#cookieOptions)
        res.redirect(url.format({
          pathname: await platform.platformAuthEndpoint(),
          query: await Request.ltiAdvantageLogin(req.body, platform)
        }))
      } else {
        provMainDebug('Unregistered platform attempting connection: ' + req.body.iss)
        res.status(401).send('Unregistered platform.')
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
    this.app.post(this.#appUrl + ':iss', async (req, res, next) => {
      this.#connectCallback(res.locals.token, req, res, next)
    })
  }

  /**
     * @description Starts listening to a given port for LTI requests and opens connection to the database.
     * @param {number} port - The port the Provider should listen to.
     */
  async deploy (port) {
    provMainDebug('Attempting to connect to database')

    try {
      this.db.on('connected', async () => {
        provMainDebug('Database connected')
      })
      this.db.once('open', async () => {
        provMainDebug('Database connection open')
      })

      if (this.db.readyState === 0) await mongoose.connect(this.#dbConnection.url, this.#dbConnection.options)

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
            }
          }
        }, 1000)
      })
    } catch (err) {
      provMainDebug('Error in MongoDb connection: ' + err)
      throw new Error('Unable to connect to database')
    }

    /* In case no port is provided uses 3000 */
    port = port || 3000
    // Starts server on given port
    this.#server.listen(port, 'Lti Provider tool is listening on port ' + port + '!\n\nLTI provider config: \n>Initiate login URL: ' + this.#loginUrl + '\n>App Url: ' + this.#appUrl + '\n>Session Timeout Url: ' + this.#sessionTimeoutUrl + '\n>Invalid Token Url: ' + this.#invalidTokenUrl)

    return true
  }

  /**
     * @description Sets the callback function called whenever theres a sucessfull connection, exposing a Conection object containing the id_token decoded parameters.
     * @param {Function} _connectCallback - Function that is going to be called everytime a platform sucessfully connects to the provider.
     * @param {Object} [options] - Options configuring the usage of cookies to pass the Id Token data to the client.
     * @param {Boolean} [options.secure = false] - Secure property of the cookie.
     * @param {Function} [options.sessionTimeout] - Route function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @param {Function} [options.invalidToken] - Route function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @example .onConnect((conection, response)=>{response.send(connection)}, {secure: true})
     */
  onConnect (_connectCallback, options) {
    if (options) {
      if (options.secure === true) this.#cookieOptions.secure = options.secure
      if (options.sessionTimeout) this.#sessionTimedOut = options.sessionTimeout
      if (options.invalidToken) this.#invalidToken = options.invalidToken
    }

    this.#connectCallback = _connectCallback
  }

  /**
     * @description Gets/Sets login Url responsible for dealing with the OIDC login flow. If no value is set "/login" is used.
     * @param {string} url - Login url.
     * @example provider.loginUrl('/login')
     */
  loginUrl (url) {
    if (!url) return this.#loginUrl
    this.#loginUrl = url
  }

  /**
     * @description Gets/Sets main application Url that will receive the final decoded Idtoken. If no value is set "/" (root) is used.
     * @param {string} url - App url.
     * @example provider.appUrl('/app')
     */
  appUrl (url) {
    if (!url) return this.#appUrl
    this.#appUrl = url
  }

  /**
     * @description Gets/Sets session timeout Url that will be called whenever the system encounters a session timeout. If no value is set "/sessionTimeout" is used.
     * @param {string} url - Session timeout url.
     * @example provider.sessionTimeoutUrl('/sesstimeout')
     */
  sessionTimeoutUrl (url) {
    if (!url) return this.#sessionTimeoutUrl
    this.#sessionTimeoutUrl = url
  }

  /**
     * @description Gets/Sets invalid token Url that will be called whenever the system encounters a invalid token or cookie. If no value is set "/invalidToken" is used.
     * @param {string} url - Invalid token url.
     * @example provider.invalidTokenUrl('/invtoken')
     */
  invalidTokenUrl (url) {
    if (!url) return this.#invalidTokenUrl
    this.#invalidTokenUrl = url
  }

  /**
     * @description Registers a platform.
     * @param {string} url - Platform url.
     * @param {string} name - Platform nickname.
     * @param {string} clientId - Client Id generated by the platform.
     * @param {string} authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the platform.
     * @param {object} authConfig - Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."}
     * @param {String} authConfig.method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
     * @param {String} authConfig.key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
     */
  async registerPlatform (url, name, clientId, authenticationEndpoint, accesstokenEndpoint, authConfig) {
    if (!name || !url || !clientId || !authenticationEndpoint || !accesstokenEndpoint || !authConfig) throw new Error('Error registering platform. Missing argument.')
    try {
      let platform = await this.getPlatform(url)

      if (!platform) {
        let kid = await Auth.generateProviderKeyPair(this.#ENCRYPTIONKEY)
        let plat = new Platform(name, url, clientId, authenticationEndpoint, accesstokenEndpoint, kid, this.#ENCRYPTIONKEY, authConfig)

        // Save platform to db
        let isregisteredPlat = await Database.Get(false, 'platform', { platformUrl: url })
        if (!isregisteredPlat) {
          provMainDebug('Registering new platform: ' + url)
          await Database.Insert(false, 'platform', { platformName: name, platformUrl: url, clientId: clientId, authEndpoint: authenticationEndpoint, accesstokenEndpoint: accesstokenEndpoint, kid: kid, authConfig: authConfig })
        }
        return plat
      } else {
        return platform
      }
    } catch (err) {
      provAuthDebug(err)
      return false
    }
  }

  /**
     * @description Gets a platform.
     * @param {String} url - Platform url.
     * @param {String} [ENCRYPTIONKEY] - Encryption key. THIS PARAMETER IS ONLY IN A FEW SPECIFIC CALLS, DO NOT USE IN YOUR APPLICATION.
     */
  async getPlatform (url, ENCRYPTIONKEY) {
    if (!url) throw new Error('No url provided')
    try {
      let plat = await Database.Get(false, 'platform', { platformUrl: url })
      if (!plat) return false
      let obj = plat[0]

      if (!obj) return false

      let result
      if (ENCRYPTIONKEY) {
        result = new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, ENCRYPTIONKEY, obj.authConfig)
      } else {
        result = new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, this.#ENCRYPTIONKEY, obj.authConfig)
      }

      return result
    } catch (err) {
      provAuthDebug(err)
      return false
    }
  }

  /**
     * @description Deletes a platform.
     * @param {string} url - Platform url.
     */
  async deletePlatform (url) {
    if (!url) throw new Error('No url provided')
    let platform = await this.getPlatform(url)
    if (platform) return platform.remove()
    return false
  }

  /**
     * @description Gets all platforms.
     */
  async getAllPlatforms () {
    let returnArray = []
    try {
      let platforms = await Database.Get(false, 'platform')

      if (platforms) {
        for (let obj of platforms) returnArray.push(new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, this.#ENCRYPTIONKEY, obj.authConfig))
        return returnArray
      }
      return []
    } catch (err) {
      provAuthDebug(err)
      return false
    }
  }

  /**
     * @description Sends message to the platform
     * @param {Object} idtoken - Idtoken for the user
     * @param {Object} message - Message following the Lti Standard application/vnd.ims.lis.v1.score+json
     */
  async messagePlatform (idtoken, message) {
    provMainDebug('Target platform: ' + idtoken.iss)

    let platform = await this.getPlatform(idtoken.iss)

    if (!platform) {
      provMainDebug('Platform not found, returning false')
      return false
    }

    provMainDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')
    try {
      let tokenRes = await platform.platformAccessToken()
      provMainDebug('Access_token retrieved for [' + idtoken.iss + ']')
      let lineitemsEndpoint = idtoken.endpoint.lineitems

      let lineitemRes = await got.get(lineitemsEndpoint, { headers: { Authorization: tokenRes.token_type + ' ' + tokenRes.access_token } })

      let resourceId = idtoken.platformContext.resource

      let lineitem = find(JSON.parse(lineitemRes.body), ['resourceLinkId', resourceId.id])
      let lineitemUrl = lineitem.id
      let scoreUrl = lineitemUrl + '/scores'

      if (lineitemUrl.split('\?') !== -1) {
        let query = lineitemUrl.split('\?')[1]
        let url = lineitemUrl.split('\?')[0]
        scoreUrl = url + '/scores?' + query
      }

      provMainDebug('Sending grade message to: ' + scoreUrl)

      message.userId = idtoken.user
      message.timestamp = new Date(Date.now()).toISOString()
      message.scoreMaximum = lineitem.scoreMaximum
      provMainDebug(message)

      await got.post(scoreUrl, { headers: { Authorization: tokenRes.token_type + ' ' + tokenRes.access_token, 'Content-Type': 'application/vnd.ims.lis.v1.score+json' }, body: JSON.stringify(message) })

      provMainDebug('Message successfully sent')
      return true
    } catch (err) {
      provMainDebug(err)
      return false
    }
  }

  /**
   * @description Redirect to a new location and sets it's cookie if the location represents a separate resource
   * @param {Object} res - Express response object
   * @param {String} path - Redirect path
   * @param {Boolea} [isNewResource = false] - If true creates new resource and its cookie
   * @example lti.generatePathCookie(response, '/path', true)
   */
  async redirect (res, path, isNewResource) {
    if (res.locals.login && isNewResource) {
      provMainDebug('Setting up path cookie for this resource with path: ' + path)
      res.cookie(res.locals.token.issuer_code + path, res.locals.token.platformContext, this.#cookieOptions)
    }
    return res.redirect(res.locals.token.issuer_code + path)
  }
}

module.exports = Provider
