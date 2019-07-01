/* Main class for the Provider functionalities */

const Server = require('../Utils/Server')
const Request = require('../Utils/Request')
const Platform = require('../Utils/Platform')
const Auth = require('../Utils/Auth')
const Database = require('../Utils/Database')

const url = require('url')
const jwt = require('jsonwebtoken')
const got = require('got')

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
    secure: true,
    httpOnly: true,
    signed: true
  }

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
     * @param {String} encryptionkey - Secret used to sign cookies and other info.
     * @param {Object} [options] - Lti Provider options.
     * @param {Boolean} [options.https = false] - Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https. If you really dont want to use https, disable the secure flag in the cookies option, so that it can be passed via http.
     * @param {Object} [options.ssl] - SSL certificate and key if https is enabled.
     * @param {String} [options.ssl.key] - SSL key.
     * @param {String} [options.ssl.cert] - SSL certificate.
     * @param {String} [options.staticPath] - The path for the static files your application might serve (Ex: _dirname+"/public")
     */
  constructor (encryptionkey, options) {
    if (options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)) throw new Error('No ssl Key  or Certificate found for local https configuration.')
    if (!encryptionkey) throw new Error('Encryptionkey parameter missing in options.')

    this.#ENCRYPTIONKEY = encryptionkey

    this.#server = new Server(options.https, options.ssl, this.#ENCRYPTIONKEY)
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
            let valid = await Auth.validateToken(req.body.id_token, this.getPlatform)

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

    this.app.post(this.#loginUrl, (req, res) => {
      provMainDebug('Receiving a login request from: ' + req.body.iss)
      let platform = this.getPlatform(req.body.iss)

      if (platform) {
        provMainDebug('Redirecting to platform authentication endpoint')
        res.redirect(url.format({
          pathname: platform.platformAuthEndpoint(),
          query: Request.ltiAdvantageLogin(req.body, platform)
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
     * @description Starts listening to a given port for LTI requests
     * @param {number} port - The port the Provider should listen to
     */
  deploy (port) {
    /* In case no port is provided uses 3000 */
    port = port || 3000

    // Clean stored access_tokens
    provMainDebug('Cleaning previously stored access tokens')
    for (let plat of this.getAllPlatforms()) Database.Delete(this.#ENCRYPTIONKEY, './provider_data', 'access_tokens', 'access_tokens', { platformUrl: plat.platformUrl() })

    // Starts server on given port
    this.#server.listen(port, 'Lti Provider tool is listening on port ' + port + '!\n\nLTI provider config: \n>Initiate login URL: ' + this.#loginUrl + '\n>App Url: ' + this.#appUrl + '\n>Session Timeout Url: ' + this.#sessionTimeoutUrl + '\n>Invalid Token Url: ' + this.#invalidTokenUrl)

    return this
  }

  /**
     * @description Sets the callback function called whenever theres a sucessfull connection, exposing a Conection object containing the id_token decoded parameters.
     * @param {Function} _connectCallback - Function that is going to be called everytime a platform sucessfully connects to the provider.
     * @param {Object} [options] - Options configuring the usage of cookies to pass the Id Token data to the client.
     * @param {Number} [options.maxAge = 1000 * 60 * 60] - MaxAge of the cookie in miliseconds.
     * @param {Boolean} [options.secure = true] - Secure property of the cookie.
     * @param {Function} [options.sessionTmeout] - Route function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @param {Function} [options.invalidToken] - Route function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @example .onConnect((conection, response)=>{response.send(connection)}, {secure: true})
     */
  onConnect (_connectCallback, options) {
    if (options) {
      this.#cookieOptions.maxAge = options.maxAge || 1000 * 60 * 60

      if (options.secure !== undefined) this.#cookieOptions.secure = options.secure
      else this.#cookieOptions.secure = true

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
     * @param {string} Url - Platform url.
     * @param {string} name - Platform nickname.
     * @param {string} clientId - Client Id generated by the platform.
     * @param {string} authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the platform.
     * @param {object} authConfig - Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."}
     * @param {String} authConfig.method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
     * @param {String} authConfig.key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
     */
  registerPlatform (url, name, clientId, authenticationEndpoint, accesstokenEndpoint, authConfig) {
    if (!name || !url || !clientId || !authenticationEndpoint || !accesstokenEndpoint || !authConfig) throw new Error('Error registering platform. Missing argument.')

    let platform = this.getPlatform(url)
    if (!platform) {
      let kid = Auth.generateProviderKeyPair()
      return new Platform(name, url, clientId, authenticationEndpoint, accesstokenEndpoint, kid, this.#ENCRYPTIONKEY, authConfig)
    } else {
      return false
    }
  }

  /**
     * @description Gets a platform.
     * @param {string} url - Platform url.
     */
  getPlatform (url) {
    if (!url) throw new Error('No url provided')

    let obj = Database.Get(this.#ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms', { platformUrl: url })

    if (!obj) return false

    return new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, this.#ENCRYPTIONKEY, obj.authConfig)
  }

  /**
     * @description Deletes a platform.
     * @param {string} url - Platform url.
     */
  deletePlatform (url) {
    if (!url) throw new Error('No url provided')
    let platform = this.getPlatform(url)
    if (platform) return platform.remove()
  }

  /**
     * @description Gets all platforms.
     */
  getAllPlatforms () {
    let returnArray = []

    let platforms = Database.Get(this.#ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms')

    if (platforms) {
      for (let obj of platforms) returnArray.push(new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, this.#ENCRYPTIONKEY, obj.authConfig))
      return returnArray
    }
    return []
  }

  /**
     * @description Sends message to the platform
     * @param {Object} idtoken - Idtoken for the user
     * @param {Object} message - Message following the Lti Standard application/vnd.ims.lis.v1.score+json
     */
  async messagePlatform (idtoken, message) {
    provMainDebug('Target platform: ' + idtoken.iss)

    let platform = this.getPlatform(idtoken.iss)

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
    } catch (err) {
      provMainDebug(err)
    }
  }
}

// Create Claim helpers
Provider.ClaimCustomParameters = 'https://purl.imsglobal.org/spec/lti/claim/custom'

module.exports = Provider
