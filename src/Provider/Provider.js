/* Main class for the Provider functionalities */

const Server = require('../Utils/Server')
const Request = require('../Utils/Request')
const Platform = require('../Utils/Platform')
const Auth = require('../Utils/Auth')
const Database = require('../Utils/Database')

const url = require('url')
const jwt = require('jsonwebtoken')
const got = require('got')
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
    maxAge: 1000 * 60 * 60,
    secure: false,
    httpOnly: true,
    signed: true
  }
  #dbConnection = {}

  #connectCallback = () => {}

  #sessionTimedOut = (req, res) => {
    res.status(401).send('Session timed out. Please reinitiate login.')
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
      database.connection = { useNewUrlParser: true, autoReconnect: true, keepAlive: true, keepAliveInitialDelay: 300000 }
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

    // Registers main athentication middleware
    let sessionValidator = async (req, res, next) => {
      // Ckeck if request is attempting to initiate oidc login flow
      if (req.url === this.#loginUrl || req.url === this.#sessionTimeoutUrl || req.url === this.#invalidTokenUrl) return next()

      // Check if user already has session cookie stored in its browser
      try {
        let it = req.signedCookies.it
        if (!it) {
          provMainDebug('No cookie found')
          if (req.body.id_token) {
            provMainDebug('Received request containing token. Sending for validation')
            let valid = await Auth.validateToken(req.body.id_token, this.getPlatform, this.#ENCRYPTIONKEY)

            provAuthDebug('Successfully validated token!')
            valid.exp = (Date.now() / 1000) + (this.#cookieOptions.maxAge / 1000)

            let it = jwt.sign(valid, this.#ENCRYPTIONKEY)
            res.cookie('it', it, this.#cookieOptions)
            res.locals.token = valid

            provMainDebug('Passing request to next handler')
            return next()
          } else {
            provMainDebug('Passing request to session timeout handler')
            return res.redirect(this.#sessionTimeoutUrl)
          }
        } else {
          let valid = jwt.verify(it, this.#ENCRYPTIONKEY)
          provAuthDebug('Cookie successfully validated')

          valid.exp = (Date.now() / 1000) + (this.#cookieOptions.maxAge / 1000)
          let _it = jwt.sign(valid, this.#ENCRYPTIONKEY)
          res.cookie('it', _it, this.#cookieOptions)
          res.locals.token = valid

          provMainDebug('Passing request to next handler')
          return next()
        }
      } catch (err) {
        provAuthDebug(err)
        provMainDebug('Error validating token. Passing request to invalid token handler')
        return res.redirect(this.#invalidTokenUrl)
      }
    }

    this.app.use(sessionValidator)

    this.app.post(this.#loginUrl, async (req, res) => {
      provMainDebug('Receiving a login request from: ' + req.body.iss)
      let platform = await this.getPlatform(req.body.iss)

      if (platform) {
        provMainDebug('Redirecting to platform authentication endpoint')
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
    this.app.all(this.#sessionTimeoutUrl, (req, res, next) => {
      this.#sessionTimedOut(req, res, next)
    })
    this.app.all(this.#invalidTokenUrl, (req, res, next) => {
      this.#invalidToken(req, res, next)
    })

    // Main app
    this.app.post(this.#appUrl, (req, res, next) => {
      this.#connectCallback(res.locals.token, req, res, next)
    })
  }

  /**
     * @description Starts listening to a given port for LTI requests and opens connection to the database.
     * @param {number} port - The port the Provider should listen to.
     */
  async deploy (port) {
    await mongoose.connect(this.#dbConnection.url, this.#dbConnection.options)

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
     * @param {Number} [options.maxAge = 1000 * 60 * 60] - MaxAge of the cookie in miliseconds.
     * @param {Boolean} [options.secure = false] - Secure property of the cookie.
     * @param {Function} [options.sessionTimeout] - Route function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @param {Function} [options.invalidToken] - Route function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @example .onConnect((conection, response)=>{response.send(connection)}, {secure: true})
     */
  onConnect (_connectCallback, options) {
    if (options) {
      this.#cookieOptions.maxAge = options.maxAge || 1000 * 60 * 60

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
      let lineitems = idtoken['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].lineitems

      let lineitemRes = await got.get(lineitems, { headers: { Authorization: tokenRes.token_type + ' ' + tokenRes.access_token } })
      console.log(lineitemRes.body)

      await got.post('http://localhost/moodle/mod/lti/services.php/2/lineitems/2/lineitem/scores?type_id=1', { headers: { Authorization: tokenRes.token_type + ' ' + tokenRes.access_token, 'Content-Type': 'application/vnd.ims.lis.v1.score+json' }, body: JSON.stringify(message) })

      provMainDebug('Message successfully sent')
      return true
    } catch (err) {
      provMainDebug(err)
      return false
    }
  }
}

// Create Claim helpers
Provider.ClaimCustomParameters = 'https://purl.imsglobal.org/spec/lti/claim/custom'

module.exports = Provider
