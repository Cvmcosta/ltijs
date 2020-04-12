"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));

var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

/* eslint-disable require-atomic-updates */

/* eslint-disable no-useless-escape */

/* Main class for the Provider functionalities */
const Server = require('../Utils/Server');

const Request = require('../Utils/Request');

const Platform = require('../Utils/Platform');

const Auth = require('../Utils/Auth');

const Mongodb = require('../Utils/Database');

const Keyset = require('../Utils/Keyset');

const GradeService = require('./Services/Grade');

const DeepLinkingService = require('./Services/DeepLinking');

const url = require('fast-url-parser');

const _path = require('path');

const jwt = require('jsonwebtoken');

const winston = require('winston');

const validUrl = require('valid-url');

const crypto = require('crypto');

const tldparser = require('tld-extract');

const provAuthDebug = require('debug')('provider:auth');

const provMainDebug = require('debug')('provider:main');
/**
 * @descripttion Exposes methods for easy manipulation of the LTI 1.3 standard as a LTI Provider and a "server" object to manipulate the Express instance
 */


class Provider {
  // Pre-initiated variables
  // Assembles and sends keyset

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
     * @param {Boolean} [options.https = false] - Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https and are planning to configure ssl locally. If you set this option as true you can enable the secure flag in the cookies options of the onConnect method.
     * @param {Object} [options.ssl] - SSL certificate and key if https is enabled.
     * @param {String} [options.ssl.key] - SSL key.
     * @param {String} [options.ssl.cert] - SSL certificate.
     * @param {String} [options.staticPath] - The path for the static files your application might serve (Ex: _dirname+"/public")
     * @param {Boolean} [options.logger = false] - If true, allows Ltijs to generate logging files for server requests and errors.
     * @param {Boolean} [options.cors = true] - If false, disables cors.
     * @param {Function} [options.serverAddon] - Allows the execution of a method inside of the server contructor. Can be used to register middlewares.
     * @param {Object} [options.cookies] - Cookie configuration. Allows you to configure, sameSite and secure parameters.
     * @param {Boolean} [options.cookies.secure = false] - Cookie secure parameter. If true, only allows cookies to be passed over https.
     * @param {String} [options.cookies.sameSite = 'Lax'] - Cookie sameSite parameter. If cookies are going to be set across domains, set this parameter to 'None'.
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

    _keysetUrl.set(this, {
      writable: true,
      value: '/keys'
    });

    _whitelistedUrls.set(this, {
      writable: true,
      value: []
    });

    _ENCRYPTIONKEY.set(this, {
      writable: true,
      value: void 0
    });

    _logger.set(this, {
      writable: true,
      value: false
    });

    _cookieOptions.set(this, {
      writable: true,
      value: {
        secure: false,
        httpOnly: true,
        signed: true
      }
    });

    _Database.set(this, {
      writable: true,
      value: void 0
    });

    _connectCallback2.set(this, {
      writable: true,
      value: (connection, req, res, next) => {
        return res.send('It works!');
      }
    });

    _deepLinkingCallback2.set(this, {
      writable: true,
      value: (connection, req, res, next) => {
        return res.send('Deep Linking works!');
      }
    });

    _sessionTimedOut.set(this, {
      writable: true,
      value: (req, res) => {
        return res.status(401).send('Token invalid or expired. Please reinitiate login.');
      }
    });

    _invalidToken.set(this, {
      writable: true,
      value: (req, res) => {
        return res.status(401).send('Invalid token. Please reinitiate login.');
      }
    });

    _keyset.set(this, {
      writable: true,
      value: async (req, res) => {
        try {
          const keyset = await Keyset.build(this.Database, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _logger));
          return res.status(200).send(keyset);
        } catch (err) {
          provMainDebug(err.message);
          return res.status(500).send(err.message);
        }
      }
    });

    _server.set(this, {
      writable: true,
      value: void 0
    });

    if (options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)) throw new Error('No ssl Key  or Certificate found for local https configuration.');
    if (!encryptionkey) throw new Error('Encryptionkey parameter missing in options.');
    if (!database) throw new Error('Missing database configurations.');
    if (!database.plugin) this.Database = new Mongodb(database);else this.Database = database.plugin;
    if (options && options.appUrl) (0, _classPrivateFieldSet2.default)(this, _appUrl, options.appUrl);
    if (options && options.loginUrl) (0, _classPrivateFieldSet2.default)(this, _loginUrl, options.loginUrl);
    if (options && options.sessionTimeoutUrl) (0, _classPrivateFieldSet2.default)(this, _sessionTimeoutUrl, options.sessionTimeoutUrl);
    if (options && options.invalidTokenUrl) (0, _classPrivateFieldSet2.default)(this, _invalidTokenUrl, options.invalidTokenUrl);
    if (options && options.keysetUrl) (0, _classPrivateFieldSet2.default)(this, _keysetUrl, options.keysetUrl); // Cookie options

    if (options && options.cookies) {
      if (options.cookies.sameSite) {
        (0, _classPrivateFieldGet2.default)(this, _cookieOptions).sameSite = options.cookies.sameSite;
        if (options.cookies.sameSite.toLowerCase() === 'none') (0, _classPrivateFieldGet2.default)(this, _cookieOptions).secure = true;
      }

      if (options.cookies.secure === true) (0, _classPrivateFieldGet2.default)(this, _cookieOptions).secure = true;
    } // Setting up logger


    let loggerServer = false;

    if (options && options.logger) {
      (0, _classPrivateFieldSet2.default)(this, _logger, winston.createLogger({
        format: winston.format.combine(winston.format.timestamp(), winston.format.json(), winston.format.prettyPrint()),
        transports: [new winston.transports.File({
          filename: 'logs/ltijs_error.log',
          level: 'error',
          handleExceptions: true,
          maxsize: 250000,
          // 500kb (with two files)
          maxFiles: 1,
          colorize: false,
          tailable: true
        })],
        exitOnError: false
      })); // Server logger

      loggerServer = winston.createLogger({
        format: winston.format.combine(winston.format.timestamp(), winston.format.prettyPrint()),
        transports: [new winston.transports.File({
          filename: 'logs/ltijs_server.log',
          handleExceptions: true,
          json: true,
          maxsize: 250000,
          // 500kb (with two files)
          maxFiles: 1,
          colorize: false,
          tailable: true
        })],
        exitOnError: false
      });
      loggerServer.stream = {
        write: function (message) {
          loggerServer.info(message);
        }
      };
    }

    (0, _classPrivateFieldSet2.default)(this, _ENCRYPTIONKEY, encryptionkey);
    (0, _classPrivateFieldSet2.default)(this, _server, new Server(options ? options.https : false, options ? options.ssl : false, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), loggerServer, options ? options.cors : true, options ? options.serverAddon : false));
    /**
     * @description Express server object.
     */

    this.app = (0, _classPrivateFieldGet2.default)(this, _server).app;
    /**
     * @description Grading service.
     */

    this.Grade = new GradeService(this.getPlatform, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _logger), this.Database);
    /**
     * @description Deep Linking service.
     */

    this.DeepLinking = new DeepLinkingService(this.getPlatform, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _logger), this.Database);
    if (options && options.staticPath) (0, _classPrivateFieldGet2.default)(this, _server).setStaticPath(options.staticPath); // Registers main athentication and routing middleware

    const sessionValidator = async (req, res, next) => {
      provMainDebug('Receiving request at path: ' + req.path); // Ckeck if request is attempting to initiate oidc login flow or access reserved or whitelisted routes

      if (req.path === (0, _classPrivateFieldGet2.default)(this, _loginUrl) || req.path === (0, _classPrivateFieldGet2.default)(this, _sessionTimeoutUrl) || req.path === (0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl) || req.path === (0, _classPrivateFieldGet2.default)(this, _keysetUrl)) return next();
      provMainDebug('Path does not match reserved endpoints');

      try {
        // Retrieving LTIK token
        const ltik = req.token; // Retrieving cookies

        const cookies = req.signedCookies;
        provMainDebug('Cookies received: ');
        provMainDebug(cookies);

        if (!ltik) {
          const idtoken = req.body.id_token;

          if (req.path === (0, _classPrivateFieldGet2.default)(this, _appUrl) && idtoken) {
            // No ltik found but request contains an idtoken
            provMainDebug('Received idtoken for validation');
            const decoded = jwt.decode(idtoken, {
              complete: true
            }); // Rettrieves state

            const state = req.body.state; // Retrieving validation parameters from cookies

            let validationInfo = await this.Database.Get(false, 'validation', {
              state: state
            });
            validationInfo = validationInfo[0];
            const validationParameters = {
              state: validationInfo ? validationInfo.state : false,
              iss: validationInfo ? validationInfo.iss : false
            };
            const valid = await Auth.validateToken(idtoken, decoded, state, validationParameters, this.getPlatform, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _logger), this.Database); // Deleting validation info

            await this.Database.Delete('validation', {
              state: state
            });
            provAuthDebug('Successfully validated token!');
            const issuerCode = 'plat' + encodeURIComponent(Buffer.from(valid.iss).toString('base64'));
            const courseId = valid['https://purl.imsglobal.org/spec/lti/claim/context'] ? valid['https://purl.imsglobal.org/spec/lti/claim/context'].id : 'NF';
            const resourseId = valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'] ? valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'].id : 'NF';
            const activityId = courseId + '_' + resourseId;

            const contextPath = _path.join(issuerCode, (0, _classPrivateFieldGet2.default)(this, _appUrl), activityId); // Mount platform token


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
            }; // Store idToken in database

            if (await this.Database.Delete('idtoken', {
              issuerCode: issuerCode,
              user: platformToken.user
            })) this.Database.Insert(false, 'idtoken', platformToken); // Mount context token

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
            }; // Store contextToken in database

            if (await this.Database.Delete('contexttoken', {
              path: contextPath,
              user: contextToken.user
            })) this.Database.Insert(false, 'contexttoken', contextToken);
            res.cookie(contextPath, platformToken.user, (0, _classPrivateFieldGet2.default)(this, _cookieOptions));
            provMainDebug('Generating LTIK and redirecting to main endpoint');
            const newLtikObj = {
              issuer: issuerCode,
              path: (0, _classPrivateFieldGet2.default)(this, _appUrl),
              activityId: activityId
            }; // Signing context token

            const newLtik = jwt.sign(newLtikObj, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY));
            return res.redirect(307, req.baseUrl + (0, _classPrivateFieldGet2.default)(this, _appUrl) + '?ltik=' + newLtik);
          } else {
            if ((0, _classPrivateFieldGet2.default)(this, _whitelistedUrls).indexOf(req.path) !== -1 || (0, _classPrivateFieldGet2.default)(this, _whitelistedUrls).indexOf(req.path + '-method-' + req.method.toUpperCase()) !== -1) {
              provMainDebug('Accessing as whitelisted URL');
              return next();
            }

            provMainDebug('No LTIK found');
            provMainDebug('Request body: ', req.body);
            return res.redirect(req.baseUrl + (0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl));
          }
        }

        provMainDebug('LTIK found');
        let validLtik;

        try {
          validLtik = jwt.verify(ltik, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY));
        } catch (err) {
          if ((0, _classPrivateFieldGet2.default)(this, _whitelistedUrls).indexOf(req.path) !== -1 || (0, _classPrivateFieldGet2.default)(this, _whitelistedUrls).indexOf(req.path + '-method-' + req.method.toUpperCase()) !== -1) {
            provMainDebug('Accessing as whitelisted URL');
            return next();
          }

          throw new Error(err.message);
        }

        provMainDebug('LTIK successfully verified');
        let user = false;
        const issuerCode = validLtik.issuer;

        const contextPath = _path.join(issuerCode, validLtik.path, validLtik.activityId); // Matches path to cookie


        provMainDebug('Attempting to retrieve matching session cookie');
        let contextTokenName;

        for (const key of Object.keys(cookies).sort((a, b) => b.length - a.length)) {
          if (contextPath.indexOf(key) !== -1) {
            user = cookies[key];
            contextTokenName = key;
            break;
          }
        } // Check if user already has session cookie stored in its browser


        if (user) {
          provAuthDebug('Session cookie found'); // Gets correspondent id token from database

          let idToken = await this.Database.Get(false, 'idtoken', {
            issuerCode: issuerCode,
            user: user
          });
          if (!idToken) throw new Error('No id token found in database');
          idToken = idToken[0]; // Gets correspondent context token from database

          let contextToken = await this.Database.Get(false, 'contexttoken', {
            path: contextTokenName,
            user: user
          });
          if (!contextToken) throw new Error('No context token found in database');
          contextToken = contextToken[0];
          idToken.platformContext = contextToken; // Creating local variables

          res.locals.context = contextToken;
          res.locals.token = idToken;
          provMainDebug('Passing request to next handler');
          return next();
        } else {
          provMainDebug('No session cookie found');
          provMainDebug('Request body: ', req.body);
          if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
            level: 'error',
            message: req.body
          });
          provMainDebug('Passing request to session timeout handler');
          return res.redirect(req.baseUrl + (0, _classPrivateFieldGet2.default)(this, _sessionTimeoutUrl));
        }
      } catch (err) {
        provAuthDebug(err.message);
        if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
          level: 'error',
          message: 'Message: ' + err.message + '\nStack: ' + err.stack
        });
        provMainDebug('Passing request to invalid token handler');
        return res.redirect(req.baseUrl + (0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl));
      }
    };

    this.app.use(sessionValidator);
    this.app.all((0, _classPrivateFieldGet2.default)(this, _loginUrl), async (req, res) => {
      const params = _objectSpread({}, req.query, {}, req.body);

      try {
        const iss = params.iss;
        provMainDebug('Receiving a login request from: ' + iss);
        const platform = await this.getPlatform(iss);

        if (platform) {
          provMainDebug('Redirecting to platform authentication endpoint'); // Create state parameter used to validade authentication response

          const state = encodeURIComponent(crypto.randomBytes(16).toString('base64')); // Setting up validation info

          await this.Database.Insert(false, 'validation', {
            state: state,
            iss: iss
          }); // Redirect to authentication endpoint

          res.redirect(url.format({
            pathname: await platform.platformAuthEndpoint(),
            query: await Request.ltiAdvantageLogin(params, platform, state)
          }));
        } else {
          provMainDebug('Unregistered platform attempting connection: ' + iss);
          return res.status(401).send('Unregistered platform.');
        }
      } catch (err) {
        provAuthDebug(err);
        if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
          level: 'error',
          message: 'Message: ' + err.message + '\nStack: ' + err.stack
        });
        return res.status(400).send('Bad Request.');
      }
    }); // Session timeout, invalid token and keyset urls

    this.app.all((0, _classPrivateFieldGet2.default)(this, _sessionTimeoutUrl), async (req, res, next) => {
      (0, _classPrivateFieldGet2.default)(this, _sessionTimedOut).call(this, req, res, next);
    });
    this.app.all((0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl), async (req, res, next) => {
      (0, _classPrivateFieldGet2.default)(this, _invalidToken).call(this, req, res, next);
    });
    this.app.get((0, _classPrivateFieldGet2.default)(this, _keysetUrl), async (req, res, next) => {
      (0, _classPrivateFieldGet2.default)(this, _keyset).call(this, req, res, next);
    }); // Main app

    this.app.all((0, _classPrivateFieldGet2.default)(this, _appUrl), async (req, res, next) => {
      if (res.locals.context.messageType === 'LtiDeepLinkingRequest') return (0, _classPrivateFieldGet2.default)(this, _deepLinkingCallback2).call(this, res.locals.token, req, res, next);
      return (0, _classPrivateFieldGet2.default)(this, _connectCallback2).call(this, res.locals.token, req, res, next);
    });
  }
  /**
     * @description Starts listening to a given port for LTI requests and opens connection to the database.
     * @param {Object} [options] - Deployment options.
     * @param {Number} [options.port] - Deployment port. 3000 by default.
     * @param {Boolean} [options.silent] - If true, disables initial startup message.
     * @param {Boolean} [options.serverless] - (Experimental) If true, Ltijs does not start listening. Ignores any given 'port' parameter.
     * @returns {Promise<true| false>}
     */


  async deploy(options) {
    provMainDebug('Attempting to connect to database');

    try {
      await this.Database.setup();
      const conf = {
        port: 3000,
        silent: false
      };
      if (options && options.port) conf.port = options.port;
      if (options && options.silent) conf.silent = options.silent; // Starts server on given port

      if (options && options.serverless) console.log('Ltijs started in experimental serverless mode!');else {
        await (0, _classPrivateFieldGet2.default)(this, _server).listen(conf.port);
        provMainDebug('Ltijs started listening on port: ', conf.port); // Startup message

        const message = 'LTI Provider is listening on port ' + conf.port + '!\n\n LTI provider config: \n >App Url: ' + (0, _classPrivateFieldGet2.default)(this, _appUrl) + '\n >Initiate login URL: ' + (0, _classPrivateFieldGet2.default)(this, _loginUrl) + '\n >Keyset Url: ' + (0, _classPrivateFieldGet2.default)(this, _keysetUrl) + '\n >Session Timeout Url: ' + (0, _classPrivateFieldGet2.default)(this, _sessionTimeoutUrl) + '\n >Invalid Token Url: ' + (0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl);

        if (!conf.silent) {
          console.log('  _   _______ _____       _  _____\n' + ' | | |__   __|_   _|     | |/ ____|\n' + ' | |    | |    | |       | | (___  \n' + ' | |    | |    | |   _   | |\\___ \\ \n' + ' | |____| |   _| |_ | |__| |____) |\n' + ' |______|_|  |_____(_)____/|_____/ \n\n', message);
        }
      } // Sets up gracefull shutdown

      process.on('SIGINT', async () => {
        await this.close(options);
        process.exit();
      });
      return true;
    } catch (err) {
      console.log('Error deploying server:', err.message);
      if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
      await this.close(options);
      process.exit();
    }
  }
  /**
   * @description Closes connection to database and stops server.
   * @returns {Promise<true | false>}
   */


  async close(options) {
    try {
      if (!options || options.silent !== true) console.log('\nClosing server...');
      await (0, _classPrivateFieldGet2.default)(this, _server).close();
      if (!options || options.silent !== true) console.log('Closing connection to the database...');
      await this.Database.Close();
      if (!options || options.silent !== true) console.log('Shutdown complete.');
      return true;
    } catch (err) {
      provMainDebug(err.message);
      if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
      return false;
    }
  }
  /**
     * @description Sets the callback function called whenever theres a sucessfull connection, exposing a Conection object containing the id_token decoded parameters.
     * @param {Function} _connectCallback - Function that is going to be called everytime a platform sucessfully connects to the provider.
     * @param {Object} [options] - Options configuring the usage of cookies to pass the Id Token data to the client.
     * @param {Boolean} [options.secure = false] - Secure property of the cookie.
     * @param {String} [options.sameSite = 'Lax'] - sameSite property of the cookie.
     * @param {Function} [options.sessionTimeout] - Route function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @param {Function} [options.invalidToken] - Route function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @example .onConnect((conection, request, response)=>{response.send(connection)}, {secure: true})
     * @returns {true}
     */


  onConnect(_connectCallback, options) {
    if (options) {
      if (options.sameSite) {
        (0, _classPrivateFieldGet2.default)(this, _cookieOptions).sameSite = options.sameSite;
        if (options.sameSite.toLowerCase() === 'none') (0, _classPrivateFieldGet2.default)(this, _cookieOptions).secure = true;
      }

      if (options.secure === true) (0, _classPrivateFieldGet2.default)(this, _cookieOptions).secure = true;
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
     * @description Sets the callback function called whenever theres a sucessfull deep linking request, exposing a Conection object containing the id_token decoded parameters.
     * @param {Function} _deepLinkingCallback - Function that is going to be called everytime a platform sucessfully launches a deep linking request.
     * @param {Object} [options] - Options configuring the usage of cookies to pass the Id Token data to the client.
     * @param {Boolean} [options.secure = false] - Secure property of the cookie.
     * @param {String} [options.sameSite = 'Lax'] - sameSite property of the cookie.
     * @param {Function} [options.sessionTimeout] - Route function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @param {Function} [options.invalidToken] - Route function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @example .onDeepLinking((conection, request, response)=>{response.send(connection)}, {secure: true})
     * @returns {true}
     */


  onDeepLinking(_deepLinkingCallback, options) {
    if (options) {
      if (options.sameSite) {
        (0, _classPrivateFieldGet2.default)(this, _cookieOptions).sameSite = options.sameSite;
        if (options.sameSite.toLowerCase() === 'none') (0, _classPrivateFieldGet2.default)(this, _cookieOptions).secure = true;
      }

      if (options.secure === true) (0, _classPrivateFieldGet2.default)(this, _cookieOptions).secure = true;
      if (options.sessionTimeout) (0, _classPrivateFieldSet2.default)(this, _sessionTimedOut, options.sessionTimeout);
      if (options.invalidToken) (0, _classPrivateFieldSet2.default)(this, _invalidToken, options.invalidToken);
    }

    if (_deepLinkingCallback) {
      (0, _classPrivateFieldSet2.default)(this, _deepLinkingCallback2, _deepLinkingCallback);
      return true;
    }

    throw new Error('Missing callback');
  }
  /**
   * @description Gets the login Url responsible for dealing with the OIDC login flow.
   * @returns {String}
   */


  loginUrl() {
    return (0, _classPrivateFieldGet2.default)(this, _loginUrl);
  }
  /**
   * @description Gets the main application Url that will receive the final decoded Idtoken.
   * @returns {String}
   */


  appUrl() {
    return (0, _classPrivateFieldGet2.default)(this, _appUrl);
  }
  /**
     * @description Gets the session timeout Url that will be called whenever the system encounters a session timeout.
     * @returns {String}
     */


  sessionTimeoutUrl() {
    return (0, _classPrivateFieldGet2.default)(this, _sessionTimeoutUrl);
  }
  /**
     * @description Gets the invalid token Url that will be called whenever the system encounters a invalid token or cookie.
     * @returns {String}
     */


  invalidTokenUrl() {
    return (0, _classPrivateFieldGet2.default)(this, _invalidTokenUrl);
  }
  /**
     * @description Gets the keyset Url that will be used to retrieve a public jwk keyset.
     * @returns {String}
     */


  keysetUrl() {
    return (0, _classPrivateFieldGet2.default)(this, _keysetUrl);
  }
  /**
   * @description Whitelists Urls to bypass the lti 1.3 authentication protocol. These Url dont have access to a idtoken
   * @param {String} urls - Urls to be whitelisted
   */


  whitelist(...urls) {
    if (!urls) throw new Error('No url passed.');
    const formattedUrls = [];

    for (const url of urls) {
      const isObject = url === Object(url);

      if (isObject) {
        if (!url.route || !url.method) throw new Error('Wrong object format on route. Expects string ("/route") or object ({ route: "/route", method: "POST" })');
        formattedUrls.push(url.route + '-method-' + url.method.toUpperCase());
      } else formattedUrls.push(url);
    }

    (0, _classPrivateFieldSet2.default)(this, _whitelistedUrls, formattedUrls);
    return true;
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


  async registerPlatform(platform) {
    if (!platform || !platform.name || !platform.url || !platform.clientId || !platform.authenticationEndpoint || !platform.accesstokenEndpoint || !platform.authConfig) throw new Error('Error registering platform. Missing argument.');
    let kid;

    try {
      const _platform = await this.getPlatform(platform.url);

      if (!_platform) {
        kid = await Auth.generateProviderKeyPair((0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), this.Database);
        const plat = new Platform(platform.name, platform.url, platform.clientId, platform.authenticationEndpoint, platform.accesstokenEndpoint, kid, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), platform.authConfig, (0, _classPrivateFieldGet2.default)(this, _logger), this.Database); // Save platform to db

        provMainDebug('Registering new platform: ' + platform.url);
        await this.Database.Insert(false, 'platform', {
          platformName: platform.name,
          platformUrl: platform.url,
          clientId: platform.clientId,
          authEndpoint: platform.authenticationEndpoint,
          accesstokenEndpoint: platform.accesstokenEndpoint,
          kid: kid,
          authConfig: platform.authConfig
        });
        return plat;
      } else {
        return _platform;
      }
    } catch (err) {
      await this.Database.Delete('publickey', {
        kid: kid
      });
      await this.Database.Delete('privatekey', {
        kid: kid
      });
      await this.Database.Delete('platform', {
        platformUrl: platform.url
      });
      provAuthDebug(err.message);
      if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
      return false;
    }
  }
  /**
     * @description Gets a platform.
     * @param {String} url - Platform url.
     * @returns {Promise<Platform | false>}
     */


  async getPlatform(url, ENCRYPTIONKEY, logger, Database) {
    if (!url) throw new Error('No url provided');

    try {
      const plat = Database !== undefined ? await Database.Get(false, 'platform', {
        platformUrl: url
      }) : await this.Database.Get(false, 'platform', {
        platformUrl: url
      });
      if (!plat) return false;
      const obj = plat[0];
      if (!obj) return false;
      const result = new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, ENCRYPTIONKEY !== undefined ? ENCRYPTIONKEY : (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), obj.authConfig, logger !== undefined ? logger : (0, _classPrivateFieldGet2.default)(this, _logger), Database !== undefined ? Database : this.Database);
      return result;
    } catch (err) {
      provAuthDebug(err.message); // If logger is set (Function was called by the Auth or Grade service) and is set to true, or if the scope logger variable is true, print the log

      if (logger !== undefined && logger || (0, _classPrivateFieldGet2.default)(this, _logger)) logger !== undefined ? logger.log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      }) : (0, _classPrivateFieldGet2.default)(this, _logger).log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
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
    const platform = await this.getPlatform(url);
    if (platform) return platform.remove();
    return false;
  }
  /**
     * @description Gets all platforms.
     * @returns {Promise<Array<Platform>| false>}
     */


  async getAllPlatforms() {
    const returnArray = [];

    try {
      const platforms = await this.Database.Get(false, 'platform');

      if (platforms) {
        for (const obj of platforms) returnArray.push(new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), obj.authConfig, (0, _classPrivateFieldGet2.default)(this, _logger), this.Database));

        return returnArray;
      }

      return [];
    } catch (err) {
      provAuthDebug(err.message);
      if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
      return false;
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


  async redirect(res, path, options) {
    if ((0, _classPrivateFieldGet2.default)(this, _whitelistedUrls).indexOf(path) !== -1) return res.redirect(path);
    const code = res.locals.token.issuerCode;
    const courseId = res.locals.token.platformContext.context ? res.locals.token.platformContext.context.id : 'NF';
    const resourseId = res.locals.token.platformContext.resource ? res.locals.token.platformContext.resource.id : 'NF';
    const activityId = courseId + '_' + resourseId;
    const pathParts = url.parse(path);
    const oldpath = res.locals.token.platformContext.path; // Create new cookie name if isNewResource is set

    const cookiePath = options && options.isNewResource ? url.format({
      protocol: pathParts.protocol,
      hostname: pathParts.hostname,
      pathname: pathParts.pathname,
      port: pathParts.port,
      auth: pathParts.auth
    }) : oldpath;
    let token = {
      issuer: code,
      path: cookiePath,
      activityId: activityId
    }; // Signing context token

    token = jwt.sign(token, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY)); // Checking the type of redirect

    const externalRequest = validUrl.isWebUri(path);

    if (options && options.isNewResource || externalRequest) {
      provMainDebug('Setting up path cookie for this resource with path: ' + path);
      const cookieOptions = JSON.parse(JSON.stringify((0, _classPrivateFieldGet2.default)(this, _cookieOptions)));

      if (externalRequest) {
        try {
          const domain = tldparser(externalRequest).domain;
          cookieOptions.sameSite = 'None';
          cookieOptions.secure = true;
          cookieOptions.domain = '.' + domain;
          provMainDebug('External request found for domain: .' + domain);
        } catch (_unused) {
          provMainDebug('Could not retrieve tld for external redirect. Proceeding as regular request...');
        }
      }

      const contextPath = _path.join(code, cookiePath, activityId);

      const rootPath = _path.join(code, (0, _classPrivateFieldGet2.default)(this, _appUrl), activityId);

      res.cookie(contextPath, res.locals.token.user, cookieOptions);
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
      };
      if (await this.Database.Delete('contexttoken', {
        path: contextPath,
        user: res.locals.token.user
      })) this.Database.Insert(false, 'contexttoken', newContextToken);

      if (options && options.ignoreRoot) {
        this.Database.Delete('contexttoken', {
          path: rootPath,
          user: res.locals.token.user
        });
        res.clearCookie(rootPath, (0, _classPrivateFieldGet2.default)(this, _cookieOptions));
      }
    } // Formatting path with queries


    const params = new URLSearchParams(pathParts.search);
    const queries = {};

    for (const [key, value] of params) {
      queries[key] = value;
    } // Fixing fast-url-parser bug where port gets assigned to pathname if there's no path


    const portMatch = pathParts.pathname.match(/:[0-9]*/);

    if (portMatch) {
      pathParts.port = portMatch[0].split(':')[1];
      pathParts.pathname = pathParts.pathname.split(portMatch[0]).join('');
    }

    const formattedPath = url.format({
      protocol: pathParts.protocol,
      hostname: pathParts.hostname,
      pathname: pathParts.pathname,
      port: pathParts.port,
      auth: pathParts.auth,
      query: _objectSpread({}, queries, {
        ltik: token
      })
    }); // Sets allow credentials header and redirects to path with queries

    res.header('Access-Control-Allow-Credentials', 'true');
    return res.redirect(formattedPath);
  }

}

var _loginUrl = new WeakMap();

var _appUrl = new WeakMap();

var _sessionTimeoutUrl = new WeakMap();

var _invalidTokenUrl = new WeakMap();

var _keysetUrl = new WeakMap();

var _whitelistedUrls = new WeakMap();

var _ENCRYPTIONKEY = new WeakMap();

var _logger = new WeakMap();

var _cookieOptions = new WeakMap();

var _Database = new WeakMap();

var _connectCallback2 = new WeakMap();

var _deepLinkingCallback2 = new WeakMap();

var _sessionTimedOut = new WeakMap();

var _invalidToken = new WeakMap();

var _keyset = new WeakMap();

var _server = new WeakMap();

module.exports = Provider;