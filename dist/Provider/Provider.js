"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));

/* eslint-disable require-atomic-updates */

/* eslint-disable no-useless-escape */

/* Main class for the Provider functionalities */
const Server = require('../Utils/Server');

const Request = require('../Utils/Request');

const Platform = require('../Utils/Platform');

const Auth = require('../Utils/Auth');

const Database = require('../Utils/Database');

const url = require('url');

const got = require('got');

const find = require('lodash.find');

const validator = require('validator');

const mongoose = require('mongoose');

mongoose.set('useCreateIndex', true);
const Schema = mongoose.Schema;

const provAuthDebug = require('debug')('provider:auth');

const provMainDebug = require('debug')('provider:main');
/**
 * @descripttion Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider and a "server" object to manipulate the Express instance
 */


class Provider {
  // Pre-initiated variables

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
  constructor(encryptionkey, database, options) {
    _loginUrl.set(this, {
      writable: true,
      value: '/login'
    });

    _appUrl.set(this, {
      writable: true,
      value: '/'
    });

    _sessionTimeoutUrl.set(this, {
      writable: true,
      value: '/sessionTimeout'
    });

    _invalidTokenUrl.set(this, {
      writable: true,
      value: '/invalidToken'
    });

    _ENCRYPTIONKEY.set(this, {
      writable: true,
      value: void 0
    });

    _cookieOptions.set(this, {
      writable: true,
      value: {
        secure: false,
        httpOnly: true,
        signed: true
      }
    });

    _dbConnection.set(this, {
      writable: true,
      value: {}
    });

    _connectCallback2.set(this, {
      writable: true,
      value: () => {}
    });

    _sessionTimedOut.set(this, {
      writable: true,
      value: (req, res) => {
        res.status(401).send('Token invalid or expired. Please reinitiate login.');
      }
    });

    _invalidToken.set(this, {
      writable: true,
      value: (req, res) => {
        res.status(401).send('Invalid token. Please reinitiate login.');
      }
    });

    _server.set(this, {
      writable: true,
      value: void 0
    });

    if (options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)) throw new Error('No ssl Key  or Certificate found for local https configuration.');
    if (!encryptionkey) throw new Error('Encryptionkey parameter missing in options.');
    if (!database || !database.url) throw new Error('Missing database configurations.');
    (0, _classPrivateFieldSet2.default)(this, _ENCRYPTIONKEY, encryptionkey);
    (0, _classPrivateFieldSet2.default)(this, _server, new Server(options ? options.https : false, options ? options.ssl : false, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY))); // Starts database connection

    if (database.connection) {
      if (!database.connection.useNewUrlParser) database.connection.useNewUrlParser = true;
      if (!database.connection.autoReconnect) database.connection.autoReconnect = true;
      if (!database.connection.keepAlive) database.connection.keepAlive = true;
      if (!database.connection.keepAliveInitialDelay) database.connection.keepAliveInitialDelay = 300000;
    } else {
      database.connection = {
        useNewUrlParser: true,
        autoReconnect: true,
        keepAlive: true,
        keepAliveInitialDelay: 300000,
        connectTimeoutMS: 300000
      };
    }

    (0, _classPrivateFieldGet2.default)(this, _dbConnection).url = database.url;
    (0, _classPrivateFieldGet2.default)(this, _dbConnection).options = database.connection; // Creating database schemas

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
      createdAt: {
        type: Date,
        expires: 3600 * 24,
        default: Date.now
      }
    });
    const contextTokenSchema = new Schema({
      path: String,
      user: String,
      context: {
        id: String,
        label: String,
        title: String,
        type: Array
      },
      resource: {
        title: String,
        id: String
      },
      // Activity that originated login
      custom: {
        // Custom parameter sent by the platform
        resource: String,
        // Id for a requested resource
        system_setting_url: String,
        context_setting_url: String,
        link_setting_url: String
      },
      createdAt: {
        type: Date,
        expires: 3600 * 24,
        default: Date.now
      }
    });
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
    });
    const keySchema = new Schema({
      kid: String,
      iv: String,
      data: String
    });
    const accessTokenSchema = new Schema({
      platformUrl: String,
      iv: String,
      data: String,
      createdAt: {
        type: Date,
        expires: 3600,
        default: Date.now
      }
    });
    const nonceSchema = new Schema({
      nonce: String,
      createdAt: {
        type: Date,
        expires: 10,
        default: Date.now
      }
    });

    try {
      mongoose.model('idToken', idTokenSchema);
      mongoose.model('contextToken', contextTokenSchema);
      mongoose.model('platform', platformSchema);
      mongoose.model('privatekey', keySchema);
      mongoose.model('publickey', keySchema);
      mongoose.model('accesstoken', accessTokenSchema);
      mongoose.model('nonce', nonceSchema);
    } catch (err) {
      provMainDebug('Model already registered. Continuing');
    }
    /**
     * @description Database connection object.
     */


    this.db = mongoose.connection;
    /**
     * @description Express server object.
     */

    this.app = (0, _classPrivateFieldGet2.default)(this, _server).app;
    if (options && options.staticPath) (0, _classPrivateFieldGet2.default)(this, _server).setStaticPath(options.staticPath);
    this.app.get('/favicon.ico', (req, res) => res.status(204)); // Registers main athentication and routing middleware

    let sessionValidator = async (req, res, next) => {
      // Ckeck if request is attempting to initiate oidc login flow
      if (req.url === (0, _classPrivateFieldGet2.default)(this, _loginUrl) || req.url === (0, _classPrivateFieldGet2.default)(this, _sessionTimeoutUrl) || req.url === (0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl)) return next();

      if (req.url === (0, _classPrivateFieldGet2.default)(this, _appUrl)) {
        let origin = req.get('origin');
        if (!origin || origin === 'null') origin = req.get('host');
        if (!origin) return res.redirect((0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl));
        let iss = 'plat' + encodeURIComponent(Buffer.from(origin).toString('base64'));
        return res.redirect(307, '/' + iss);
      }

      try {
        let it = false;
        let urlArr = req.url.split('/');
        let issuer = urlArr[1];
        let path = '';
        let isApiRequest = false;
        let cookies = req.signedCookies; // Validate issuer_code to see if its a route or normal request

        if (issuer.indexOf('plat') === -1) isApiRequest = true;

        if (!isApiRequest) {
          try {
            let decode = Buffer.from(decodeURIComponent(issuer.split('plat')[1]), 'base64').toString('ascii');
            if (!validator.isURL(decode) && decode.indexOf('localhost') === -1) isApiRequest = true;
          } catch (err) {
            provMainDebug(err);
            isApiRequest = true;
          }
        } // Mount request path and issuer_code


        if (isApiRequest) {
          let requestParts;

          if (req.query.context) {
            requestParts = req.query.context.split('/');
          } else {
            return res.status(400).send('Missing context parameter in request.');
          }

          issuer = encodeURIComponent(requestParts[1]);
          let _urlArr = [];

          for (let i in requestParts) _urlArr.push(requestParts[i]);

          urlArr = _urlArr; // Informs the system that is a API request

          res.locals.isApiRequest = true;
        }

        for (let i in urlArr) if (parseInt(i) !== 0 && parseInt(i) !== 1) path = path + '/' + urlArr[i]; // Mathes path to cookie


        for (let key of Object.keys(cookies)) {
          if (key === issuer) {
            it = cookies[key];
            break;
          }
        } // Check if user already has session cookie stored in its browser


        if (!it) {
          provMainDebug('No cookie found');

          if (req.body.id_token) {
            provMainDebug('Received request containing token. Sending for validation');
            let valid = await Auth.validateToken(req.body.id_token, this.getPlatform, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY));
            provAuthDebug('Successfully validated token!'); // Mount platform token

            let platformToken = {
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
            };
            res.cookie(issuer, platformToken.user, (0, _classPrivateFieldGet2.default)(this, _cookieOptions)); // Store idToken in database

            if (await Database.Delete('idToken', {
              issuer_code: issuer,
              user: valid.sub
            })) Database.Insert(false, 'idToken', platformToken); // Mount context token

            let contextToken = {
              path: issuer + '/',
              user: valid.sub,
              context: valid['https://purl.imsglobal.org/spec/lti/claim/context'],
              resource: valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'],
              custom: valid['https://purl.imsglobal.org/spec/lti/claim/custom']
            };
            res.cookie(issuer + '/', contextToken.resource.id, (0, _classPrivateFieldGet2.default)(this, _cookieOptions));
            platformToken.platformContext = contextToken; // Store contextToken in database

            if (await Database.Delete('contextToken', {
              path: issuer + '/',
              user: valid.sub
            })) Database.Insert(false, 'contextToken', contextToken);
            res.locals.token = platformToken;
            res.locals.login = true;
            provMainDebug('Passing request to next handler');
            return next();
          } else {
            provMainDebug('Passing request to session timeout handler');
            return res.redirect((0, _classPrivateFieldGet2.default)(this, _sessionTimeoutUrl));
          }
        } else {
          provAuthDebug('Cookie found');
          res.cookie(issuer, it, (0, _classPrivateFieldGet2.default)(this, _cookieOptions));
          let valid = await Database.Get(false, 'idToken', {
            issuer_code: issuer,
            user: it
          });
          if (!valid) return res.redirect((0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl));
          valid = valid[0];

          if (path) {
            path = issuer + path;

            for (let key of Object.keys(cookies).sort((a, b) => b.length - a.length)) {
              if (key === issuer) continue;

              if (path.indexOf(key) !== -1) {
                let contextToken = await Database.Get(false, 'contextToken', {
                  path: key,
                  user: it,
                  'resource.id': cookies[key]
                });
                if (!contextToken) throw new Error('No path cookie found');
                contextToken = contextToken[0];
                valid.platformContext = contextToken;
                break;
              }
            }
          } else {
            let contextToken = await Database.Get(false, 'contextToken', {
              path: issuer + '/',
              user: it,
              'resource.id': cookies[issuer + '/']
            });
            if (!contextToken) throw new Error('No path cookie found');
            contextToken = contextToken[0];
            valid.platformContext = contextToken;
          }

          res.locals.token = valid;
          res.locals.login = false;
          provMainDebug('Passing request to next handler');
          return next();
        }
      } catch (err) {
        provAuthDebug(err);
        provMainDebug('Error retrieving or validating token. Passing request to invalid token handler');
        return res.redirect((0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl));
      }
    };

    this.app.use(sessionValidator);
    this.app.post((0, _classPrivateFieldGet2.default)(this, _loginUrl), async (req, res) => {
      provMainDebug('Receiving a login request from: ' + req.body.iss);
      let platform = await this.getPlatform(req.body.iss);

      if (platform) {
        let origin = req.get('origin');
        if (!origin || origin === 'null') origin = req.get('host');
        if (!origin) return res.redirect((0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl));
        let cookieName = 'plat' + encodeURIComponent(Buffer.from(origin).toString('base64'));
        provMainDebug('Redirecting to platform authentication endpoint');
        res.clearCookie(cookieName, (0, _classPrivateFieldGet2.default)(this, _cookieOptions));
        res.redirect(url.format({
          pathname: await platform.platformAuthEndpoint(),
          query: await Request.ltiAdvantageLogin(req.body, platform)
        }));
      } else {
        provMainDebug('Unregistered platform attempting connection: ' + req.body.iss);
        res.status(401).send('Unregistered platform.');
      }
    }); // Session timeout and invalid token urls

    this.app.all((0, _classPrivateFieldGet2.default)(this, _sessionTimeoutUrl), async (req, res, next) => {
      (0, _classPrivateFieldGet2.default)(this, _sessionTimedOut).call(this, req, res, next);
    });
    this.app.all((0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl), async (req, res, next) => {
      (0, _classPrivateFieldGet2.default)(this, _invalidToken).call(this, req, res, next);
    }); // Main app

    this.app.post((0, _classPrivateFieldGet2.default)(this, _appUrl) + ':iss', async (req, res, next) => {
      if (!res.locals.isApiRequest) return (0, _classPrivateFieldGet2.default)(this, _connectCallback2).call(this, res.locals.token, req, res, next);
      return next();
    });
  }
  /**
     * @description Starts listening to a given port for LTI requests and opens connection to the database.
     * @param {number} port - The port the Provider should listen to.
     * @returns {Promise<true| false>}
     */


  async deploy(port) {
    provMainDebug('Attempting to connect to database');

    try {
      this.db.on('connected', async () => {
        provMainDebug('Database connected');
      });
      this.db.once('open', async () => {
        provMainDebug('Database connection open');
      });
      this.db.on('error', async () => {
        mongoose.disconnect();
      });
      this.db.on('reconnected', async () => {
        provMainDebug('Database reconnected');
      });
      this.db.on('disconnected', async () => {
        provMainDebug('Database disconnected');
        provMainDebug('Attempting to reconnect');
        setTimeout(async () => {
          if (this.db.readyState === 0) {
            try {
              await mongoose.connect((0, _classPrivateFieldGet2.default)(this, _dbConnection).url, (0, _classPrivateFieldGet2.default)(this, _dbConnection).options);
            } catch (err) {
              provMainDebug('Error in MongoDb connection: ' + err);
            }
          }
        }, 1000);
      });
      if (this.db.readyState === 0) await mongoose.connect((0, _classPrivateFieldGet2.default)(this, _dbConnection).url, (0, _classPrivateFieldGet2.default)(this, _dbConnection).options);
    } catch (err) {
      provMainDebug(err);
      return false;
    }
    /* In case no port is provided uses 3000 */


    port = port || 3000; // Starts server on given port

    (0, _classPrivateFieldGet2.default)(this, _server).listen(port, 'Lti Provider tool is listening on port ' + port + '!\n\nLTI provider config: \n>Initiate login URL: ' + (0, _classPrivateFieldGet2.default)(this, _loginUrl) + '\n>App Url: ' + (0, _classPrivateFieldGet2.default)(this, _appUrl) + '\n>Session Timeout Url: ' + (0, _classPrivateFieldGet2.default)(this, _sessionTimeoutUrl) + '\n>Invalid Token Url: ' + (0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl));
    return true;
  }
  /**
   * @description Closes connection to database and stops server.
   * @returns {Promise<true | false>}
   */


  async close() {
    try {
      await (0, _classPrivateFieldGet2.default)(this, _server).close();
      this.db.removeAllListeners();
      await this.db.close();
      return true;
    } catch (err) {
      return false;
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


  onConnect(_connectCallback, options) {
    if (options) {
      if (options.secure === true) (0, _classPrivateFieldGet2.default)(this, _cookieOptions).secure = options.secure;
      if (options.sessionTimeout) (0, _classPrivateFieldSet2.default)(this, _sessionTimedOut, options.sessionTimeout);
      if (options.invalidToken) (0, _classPrivateFieldSet2.default)(this, _invalidToken, options.invalidToken);
    }

    if (_connectCallback) {
      (0, _classPrivateFieldSet2.default)(this, _connectCallback2, _connectCallback);
      return true;
    }

    throw new Error('Missing callback');
  }
  /**
     * @description Gets/Sets login Url responsible for dealing with the OIDC login flow. If no value is set "/login" is used.
     * @param {string} url - Login url.
     * @example provider.loginUrl('/login')
     * @returns {String}
     */


  loginUrl(url) {
    if (!url) return (0, _classPrivateFieldGet2.default)(this, _loginUrl);
    (0, _classPrivateFieldSet2.default)(this, _loginUrl, url);
    return (0, _classPrivateFieldGet2.default)(this, _loginUrl);
  }
  /**
     * @description Gets/Sets main application Url that will receive the final decoded Idtoken. If no value is set "/" (root) is used.
     * @param {string} url - App url.
     * @example provider.appUrl('/app')
     * @returns {String}
     */


  appUrl(url) {
    if (!url) return (0, _classPrivateFieldGet2.default)(this, _appUrl);
    (0, _classPrivateFieldSet2.default)(this, _appUrl, url);
    return (0, _classPrivateFieldGet2.default)(this, _appUrl);
  }
  /**
     * @description Gets/Sets session timeout Url that will be called whenever the system encounters a session timeout. If no value is set "/sessionTimeout" is used.
     * @param {string} url - Session timeout url.
     * @example provider.sessionTimeoutUrl('/sesstimeout')
     * @returns {String}
     */


  sessionTimeoutUrl(url) {
    if (!url) return (0, _classPrivateFieldGet2.default)(this, _sessionTimeoutUrl);
    (0, _classPrivateFieldSet2.default)(this, _sessionTimeoutUrl, url);
    return (0, _classPrivateFieldGet2.default)(this, _sessionTimeoutUrl);
  }
  /**
     * @description Gets/Sets invalid token Url that will be called whenever the system encounters a invalid token or cookie. If no value is set "/invalidToken" is used.
     * @param {string} url - Invalid token url.
     * @example provider.invalidTokenUrl('/invtoken')
     * @returns {String}
     */


  invalidTokenUrl(url) {
    if (!url) return (0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl);
    (0, _classPrivateFieldSet2.default)(this, _invalidTokenUrl, url);
    return (0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl);
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
     * @returns {Promise<Platform|false>}
     */


  async registerPlatform(url, name, clientId, authenticationEndpoint, accesstokenEndpoint, authConfig) {
    if (!name || !url || !clientId || !authenticationEndpoint || !accesstokenEndpoint || !authConfig) throw new Error('Error registering platform. Missing argument.');

    try {
      let platform = await this.getPlatform(url);

      if (!platform) {
        let kid = await Auth.generateProviderKeyPair((0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY));
        let plat = new Platform(name, url, clientId, authenticationEndpoint, accesstokenEndpoint, kid, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), authConfig); // Save platform to db

        let isregisteredPlat = await Database.Get(false, 'platform', {
          platformUrl: url
        });

        if (!isregisteredPlat) {
          provMainDebug('Registering new platform: ' + url);
          await Database.Insert(false, 'platform', {
            platformName: name,
            platformUrl: url,
            clientId: clientId,
            authEndpoint: authenticationEndpoint,
            accesstokenEndpoint: accesstokenEndpoint,
            kid: kid,
            authConfig: authConfig
          });
        }

        return plat;
      } else {
        return platform;
      }
    } catch (err) {
      provAuthDebug(err);
      return false;
    }
  }
  /**
     * @description Gets a platform.
     * @param {String} url - Platform url.
     * @param {String} [ENCRYPTIONKEY] - Encryption key. THIS PARAMETER IS ONLY IN A FEW SPECIFIC CALLS, DO NOT USE IN YOUR APPLICATION.
     * @returns {Promise<Platform | false>}
     */


  async getPlatform(url, ENCRYPTIONKEY) {
    if (!url) throw new Error('No url provided');

    try {
      let plat = await Database.Get(false, 'platform', {
        platformUrl: url
      });
      if (!plat) return false;
      let obj = plat[0];
      if (!obj) return false;
      let result;

      if (ENCRYPTIONKEY) {
        result = new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, ENCRYPTIONKEY, obj.authConfig);
      } else {
        result = new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), obj.authConfig);
      }

      return result;
    } catch (err) {
      provAuthDebug(err);
      return false;
    }
  }
  /**
     * @description Deletes a platform.
     * @param {string} url - Platform url.
     * @returns {Promise<true | false>}
     */


  async deletePlatform(url) {
    if (!url) throw new Error('No url provided');
    let platform = await this.getPlatform(url);
    if (platform) return platform.remove();
    return false;
  }
  /**
     * @description Gets all platforms.
     * @returns {Promise<Array<Platform>| false>}
     */


  async getAllPlatforms() {
    let returnArray = [];

    try {
      let platforms = await Database.Get(false, 'platform');

      if (platforms) {
        for (let obj of platforms) returnArray.push(new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), obj.authConfig));

        return returnArray;
      }

      return [];
    } catch (err) {
      provAuthDebug(err);
      return false;
    }
  }
  /**
     * @description Sends message to the platform
     * @param {Object} idtoken - Idtoken for the user
     * @param {Object} message - Message following the Lti Standard application/vnd.ims.lis.v1.score+json
     */


  async messagePlatform(idtoken, message) {
    provMainDebug('Target platform: ' + idtoken.iss);
    let platform = await this.getPlatform(idtoken.iss);

    if (!platform) {
      provMainDebug('Platform not found, returning false');
      return false;
    }

    provMainDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');

    try {
      let tokenRes = await platform.platformAccessToken();
      provMainDebug('Access_token retrieved for [' + idtoken.iss + ']');
      let lineitemsEndpoint = idtoken.endpoint.lineitems;
      let lineitemRes = await got.get(lineitemsEndpoint, {
        headers: {
          Authorization: tokenRes.token_type + ' ' + tokenRes.access_token
        },
        body: JSON.stringify({
          request: 'lineitems'
        })
      });
      let resourceId = idtoken.platformContext.resource;
      let lineitem = find(JSON.parse(lineitemRes.body), ['resourceLinkId', resourceId.id]);
      let lineitemUrl = lineitem.id;
      let scoreUrl = lineitemUrl + '/scores';

      if (lineitemUrl.indexOf('?') !== -1) {
        let query = lineitemUrl.split('\?')[1];
        let url = lineitemUrl.split('\?')[0];
        scoreUrl = url + '/scores?' + query;
      }

      provMainDebug('Sending grade message to: ' + scoreUrl);
      message.userId = idtoken.user;
      message.timestamp = new Date(Date.now()).toISOString();
      message.scoreMaximum = lineitem.scoreMaximum;
      provMainDebug(message);
      let finalRes = await got.post(scoreUrl, {
        headers: {
          Authorization: tokenRes.token_type + ' ' + tokenRes.access_token,
          'Content-Type': 'application/vnd.ims.lis.v1.score+json'
        },
        body: JSON.stringify(message)
      });

      if (finalRes.statusCode === 200) {
        provMainDebug('Message successfully sent');
        return true;
      }

      return false;
    } catch (err) {
      provMainDebug(err);
      return false;
    }
  }
  /**
   * @description Redirect to a new location and sets it's cookie if the location represents a separate resource
   * @param {Object} res - Express response object
   * @param {String} path - Redirect path
   * @param {Boolean} [isNewResource = false] - If true creates new resource and its cookie
   * @param {Boolean} [ignoreRoot = false] - If true deletes de main path (/) database tokenb on redirect, this saves storage space and is recommended if you are using your main root only to redirect
   * @example lti.generatePathCookie(response, '/path', true)
   */


  async redirect(res, path, isNewResource, ignoreRoot) {
    let newPath = res.locals.token.issuer_code + path;

    if (res.locals.login && isNewResource) {
      provMainDebug('Setting up path cookie for this resource with path: ' + path);
      res.cookie(newPath, res.locals.token.platformContext.resource.id, (0, _classPrivateFieldGet2.default)(this, _cookieOptions));
      res.locals.token.platformContext.path = newPath;
      if (await Database.Delete('contextToken', {
        path: newPath,
        user: res.locals.token.user
      })) Database.Insert(false, 'contextToken', res.locals.token.platformContext);

      if (ignoreRoot) {
        Database.Delete('contextToken', {
          path: res.locals.token.issuer_code + '/',
          user: res.locals.token.user
        });
        res.clearCookie(res.locals.token.issuer_code + '/');
      }
    }

    return res.redirect(newPath);
  }

}

var _loginUrl = new WeakMap();

var _appUrl = new WeakMap();

var _sessionTimeoutUrl = new WeakMap();

var _invalidTokenUrl = new WeakMap();

var _ENCRYPTIONKEY = new WeakMap();

var _cookieOptions = new WeakMap();

var _dbConnection = new WeakMap();

var _connectCallback2 = new WeakMap();

var _sessionTimedOut = new WeakMap();

var _invalidToken = new WeakMap();

var _server = new WeakMap();

module.exports = Provider;