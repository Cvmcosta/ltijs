"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _classPrivateFieldLooseBase2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldLooseBase"));

var _classPrivateFieldLooseKey2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldLooseKey"));

/* eslint-disable require-atomic-updates */

/* eslint-disable no-useless-escape */

/* Main class for the Provider functionalities */
var Server = require('../Utils/Server');

var Request = require('../Utils/Request');

var Platform = require('../Utils/Platform');

var Auth = require('../Utils/Auth');

var Database = require('../Utils/Database');

var url = require('url');

var got = require('got');

var find = require('lodash.find');

var mongoose = require('mongoose');

mongoose.set('useCreateIndex', true);
var Schema = mongoose.Schema;

var provAuthDebug = require('debug')('provider:auth');

var provMainDebug = require('debug')('provider:main');
/**
 * @descripttion Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider and a "server" object to manipulate the Express instance
 */


var Provider =
/*#__PURE__*/
function () {
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
  function Provider(encryptionkey, database, options) {
    var _this = this;

    (0, _classCallCheck2["default"])(this, Provider);
    Object.defineProperty(this, _loginUrl, {
      writable: true,
      value: '/login'
    });
    Object.defineProperty(this, _appUrl, {
      writable: true,
      value: '/'
    });
    Object.defineProperty(this, _sessionTimeoutUrl, {
      writable: true,
      value: '/sessionTimeout'
    });
    Object.defineProperty(this, _invalidTokenUrl, {
      writable: true,
      value: '/invalidToken'
    });
    Object.defineProperty(this, _ENCRYPTIONKEY, {
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, _cookieOptions, {
      writable: true,
      value: {
        secure: false,
        httpOnly: true,
        signed: true
      }
    });
    Object.defineProperty(this, _dbConnection, {
      writable: true,
      value: {}
    });
    Object.defineProperty(this, _connectCallback2, {
      writable: true,
      value: function value() {}
    });
    Object.defineProperty(this, _sessionTimedOut, {
      writable: true,
      value: function value(req, res) {
        res.status(401).send('Token invalid or expired. Please reinitiate login.');
      }
    });
    Object.defineProperty(this, _invalidToken, {
      writable: true,
      value: function value(req, res) {
        res.status(401).send('Invalid token. Please reinitiate login.');
      }
    });
    Object.defineProperty(this, _server, {
      writable: true,
      value: void 0
    });
    if (options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)) throw new Error('No ssl Key  or Certificate found for local https configuration.');
    if (!encryptionkey) throw new Error('Encryptionkey parameter missing in options.');
    if (!database || !database.url) throw new Error('Missing database configurations.');
    (0, _classPrivateFieldLooseBase2["default"])(this, _ENCRYPTIONKEY)[_ENCRYPTIONKEY] = encryptionkey;
    (0, _classPrivateFieldLooseBase2["default"])(this, _server)[_server] = new Server(options.https, options.ssl, (0, _classPrivateFieldLooseBase2["default"])(this, _ENCRYPTIONKEY)[_ENCRYPTIONKEY]); // Starts database connection

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

    (0, _classPrivateFieldLooseBase2["default"])(this, _dbConnection)[_dbConnection].url = database.url;
    (0, _classPrivateFieldLooseBase2["default"])(this, _dbConnection)[_dbConnection].options = database.connection; // Creating database schemas

    var platformSchema = new Schema({
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
    var keySchema = new Schema({
      kid: String,
      iv: String,
      data: String
    });
    var accessTokenSchema = new Schema({
      platformUrl: String,
      iv: String,
      data: String,
      createdAt: {
        type: Date,
        expires: 3600,
        "default": Date.now
      }
    });
    var nonceSchema = new Schema({
      nonce: String,
      createdAt: {
        type: Date,
        expires: 10,
        "default": Date.now
      }
    });

    try {
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

    this.app = (0, _classPrivateFieldLooseBase2["default"])(this, _server)[_server].app;
    if (options.staticPath) (0, _classPrivateFieldLooseBase2["default"])(this, _server)[_server].setStaticPath(options.staticPath);
    this.app.get('/favicon.ico', function (req, res) {
      return res.status(204);
    }); // Registers main athentication and routing middleware

    var sessionValidator =
    /*#__PURE__*/
    function () {
      var _ref = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee(req, res, next) {
        var iss, it, urlArr, issuer, path, isApiRequest, cookies, decode, requestParts, _urlArr, i, _i, _i2, _Object$keys, _key, valid, platformCookie, contextCookie, _valid, isPath, _i3, _Object$keys2, key;

        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(req.url === (0, _classPrivateFieldLooseBase2["default"])(_this, _loginUrl)[_loginUrl] || req.url === (0, _classPrivateFieldLooseBase2["default"])(_this, _sessionTimeoutUrl)[_sessionTimeoutUrl] || req.url === (0, _classPrivateFieldLooseBase2["default"])(_this, _invalidTokenUrl)[_invalidTokenUrl])) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt("return", next());

              case 2:
                if (!(req.url === (0, _classPrivateFieldLooseBase2["default"])(_this, _appUrl)[_appUrl])) {
                  _context.next = 5;
                  break;
                }

                iss = 'plat' + encodeURIComponent(Buffer.from(req.get('origin')).toString('base64'));
                return _context.abrupt("return", res.redirect(307, '/' + iss));

              case 5:
                _context.prev = 5;
                it = false;
                urlArr = req.url.split('/');
                issuer = urlArr[1];
                path = '';
                isApiRequest = false;
                cookies = req.signedCookies; // Validate issuer_code to see if its a route or normal request

                if (issuer.search('plat') === -1) isApiRequest = true;

                if (!isApiRequest) {
                  try {
                    decode = Buffer.from(decodeURIComponent(issuer.split('plat')[1]), 'base64').toString('ascii');
                    if (decode.search('http') === -1) isApiRequest = true;
                  } catch (err) {
                    provMainDebug(err);
                    isApiRequest = true;
                  }
                } // Mount request path and issuer_code


                if (!isApiRequest) {
                  _context.next = 24;
                  break;
                }

                if (!req.query.context) {
                  _context.next = 19;
                  break;
                }

                requestParts = req.query.context.split('/');
                _context.next = 20;
                break;

              case 19:
                return _context.abrupt("return", res.status(400).send('Missing context parameter in request.'));

              case 20:
                issuer = encodeURIComponent(requestParts[1]);
                _urlArr = [];

                for (i in requestParts) {
                  _urlArr.push(requestParts[i]);
                }

                urlArr = _urlArr;

              case 24:
                for (_i in urlArr) {
                  if (parseInt(_i) !== 0 && parseInt(_i) !== 1) path = path + '/' + urlArr[_i];
                } // Mathes path to cookie


                _i2 = 0, _Object$keys = Object.keys(cookies);

              case 26:
                if (!(_i2 < _Object$keys.length)) {
                  _context.next = 34;
                  break;
                }

                _key = _Object$keys[_i2];

                if (!(_key === issuer)) {
                  _context.next = 31;
                  break;
                }

                it = cookies[_key];
                return _context.abrupt("break", 34);

              case 31:
                _i2++;
                _context.next = 26;
                break;

              case 34:
                if (it) {
                  _context.next = 57;
                  break;
                }

                provMainDebug('No cookie found');

                if (!req.body.id_token) {
                  _context.next = 53;
                  break;
                }

                provMainDebug('Received request containing token. Sending for validation');
                _context.next = 40;
                return Auth.validateToken(req.body.id_token, _this.getPlatform, (0, _classPrivateFieldLooseBase2["default"])(_this, _ENCRYPTIONKEY)[_ENCRYPTIONKEY]);

              case 40:
                valid = _context.sent;
                provAuthDebug('Successfully validated token!'); // Mount platform cookie

                platformCookie = {
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
                res.cookie(issuer, platformCookie, (0, _classPrivateFieldLooseBase2["default"])(_this, _cookieOptions)[_cookieOptions]); // Mount context cookie

                contextCookie = {
                  context: valid['https://purl.imsglobal.org/spec/lti/claim/context'],
                  resource: valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'],
                  custom: valid['https://purl.imsglobal.org/spec/lti/claim/custom']
                };
                res.cookie(issuer + '/', contextCookie, (0, _classPrivateFieldLooseBase2["default"])(_this, _cookieOptions)[_cookieOptions]);
                platformCookie.platformContext = contextCookie;
                res.locals.token = platformCookie;
                res.locals.login = true;
                provMainDebug('Passing request to next handler');
                return _context.abrupt("return", next());

              case 53:
                provMainDebug('Passing request to session timeout handler');
                return _context.abrupt("return", res.redirect((0, _classPrivateFieldLooseBase2["default"])(_this, _sessionTimeoutUrl)[_sessionTimeoutUrl]));

              case 55:
                _context.next = 87;
                break;

              case 57:
                provAuthDebug('Cookie found');
                _valid = it;
                res.cookie(issuer, _valid, (0, _classPrivateFieldLooseBase2["default"])(_this, _cookieOptions)[_cookieOptions]);
                isPath = false;

                if (!path) {
                  _context.next = 80;
                  break;
                }

                path = issuer + path;
                _i3 = 0, _Object$keys2 = Object.keys(cookies);

              case 64:
                if (!(_i3 < _Object$keys2.length)) {
                  _context.next = 74;
                  break;
                }

                key = _Object$keys2[_i3];

                if (!(key === issuer)) {
                  _context.next = 68;
                  break;
                }

                return _context.abrupt("continue", 71);

              case 68:
                if (!(path.search(key) !== -1)) {
                  _context.next = 71;
                  break;
                }

                isPath = cookies[key];
                return _context.abrupt("break", 74);

              case 71:
                _i3++;
                _context.next = 64;
                break;

              case 74:
                if (!isPath) {
                  _context.next = 78;
                  break;
                }

                _valid.platformContext = isPath;

                if (_valid.platformContext) {
                  _context.next = 78;
                  break;
                }

                throw new Error('No path cookie found');

              case 78:
                _context.next = 83;
                break;

              case 80:
                _valid.platformContext = cookies[issuer + '/'];

                if (_valid.platformContext) {
                  _context.next = 83;
                  break;
                }

                throw new Error('No path cookie found');

              case 83:
                res.locals.token = _valid;
                res.locals.login = false;
                provMainDebug('Passing request to next handler');
                return _context.abrupt("return", next());

              case 87:
                _context.next = 94;
                break;

              case 89:
                _context.prev = 89;
                _context.t0 = _context["catch"](5);
                provAuthDebug(_context.t0);
                provMainDebug('Error retrieving or validating token. Passing request to invalid token handler');
                return _context.abrupt("return", res.redirect((0, _classPrivateFieldLooseBase2["default"])(_this, _invalidTokenUrl)[_invalidTokenUrl]));

              case 94:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[5, 89]]);
      }));

      return function sessionValidator(_x, _x2, _x3) {
        return _ref.apply(this, arguments);
      };
    }();

    this.app.use(sessionValidator);
    this.app.post((0, _classPrivateFieldLooseBase2["default"])(this, _loginUrl)[_loginUrl],
    /*#__PURE__*/
    function () {
      var _ref2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee2(req, res) {
        var platform, cookieName;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                provMainDebug('Receiving a login request from: ' + req.body.iss);
                _context2.next = 3;
                return _this.getPlatform(req.body.iss);

              case 3:
                platform = _context2.sent;

                if (!platform) {
                  _context2.next = 21;
                  break;
                }

                cookieName = 'plat' + encodeURIComponent(Buffer.from(req.get('origin')).toString('base64'));
                provMainDebug('Redirecting to platform authentication endpoint');
                res.clearCookie(cookieName, (0, _classPrivateFieldLooseBase2["default"])(_this, _cookieOptions)[_cookieOptions]);
                _context2.t0 = res;
                _context2.t1 = url;
                _context2.next = 12;
                return platform.platformAuthEndpoint();

              case 12:
                _context2.t2 = _context2.sent;
                _context2.next = 15;
                return Request.ltiAdvantageLogin(req.body, platform);

              case 15:
                _context2.t3 = _context2.sent;
                _context2.t4 = {
                  pathname: _context2.t2,
                  query: _context2.t3
                };
                _context2.t5 = _context2.t1.format.call(_context2.t1, _context2.t4);

                _context2.t0.redirect.call(_context2.t0, _context2.t5);

                _context2.next = 23;
                break;

              case 21:
                provMainDebug('Unregistered platform attempting connection: ' + req.body.iss);
                res.status(401).send('Unregistered platform.');

              case 23:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));

      return function (_x4, _x5) {
        return _ref2.apply(this, arguments);
      };
    }()); // Session timeout and invalid token urls

    this.app.all((0, _classPrivateFieldLooseBase2["default"])(this, _sessionTimeoutUrl)[_sessionTimeoutUrl],
    /*#__PURE__*/
    function () {
      var _ref3 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee3(req, res, next) {
        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                (0, _classPrivateFieldLooseBase2["default"])(_this, _sessionTimedOut)[_sessionTimedOut](req, res, next);

              case 1:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));

      return function (_x6, _x7, _x8) {
        return _ref3.apply(this, arguments);
      };
    }());
    this.app.all((0, _classPrivateFieldLooseBase2["default"])(this, _invalidTokenUrl)[_invalidTokenUrl],
    /*#__PURE__*/
    function () {
      var _ref4 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee4(req, res, next) {
        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                (0, _classPrivateFieldLooseBase2["default"])(_this, _invalidToken)[_invalidToken](req, res, next);

              case 1:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));

      return function (_x9, _x10, _x11) {
        return _ref4.apply(this, arguments);
      };
    }()); // Main app

    this.app.post((0, _classPrivateFieldLooseBase2["default"])(this, _appUrl)[_appUrl] + ':iss',
    /*#__PURE__*/
    function () {
      var _ref5 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee5(req, res, next) {
        return _regenerator["default"].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                (0, _classPrivateFieldLooseBase2["default"])(_this, _connectCallback2)[_connectCallback2](res.locals.token, req, res, next);

              case 1:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5);
      }));

      return function (_x12, _x13, _x14) {
        return _ref5.apply(this, arguments);
      };
    }());
  }
  /**
     * @description Starts listening to a given port for LTI requests and opens connection to the database.
     * @param {number} port - The port the Provider should listen to.
     */


  (0, _createClass2["default"])(Provider, [{
    key: "deploy",
    value: function () {
      var _deploy = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee12(port) {
        var _this2 = this;

        return _regenerator["default"].wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                provMainDebug('Attempting to connect to database');
                _context12.prev = 1;
                this.db.on('connected',
                /*#__PURE__*/
                (0, _asyncToGenerator2["default"])(
                /*#__PURE__*/
                _regenerator["default"].mark(function _callee6() {
                  return _regenerator["default"].wrap(function _callee6$(_context6) {
                    while (1) {
                      switch (_context6.prev = _context6.next) {
                        case 0:
                          provMainDebug('Database connected');

                        case 1:
                        case "end":
                          return _context6.stop();
                      }
                    }
                  }, _callee6);
                })));
                this.db.once('open',
                /*#__PURE__*/
                (0, _asyncToGenerator2["default"])(
                /*#__PURE__*/
                _regenerator["default"].mark(function _callee7() {
                  return _regenerator["default"].wrap(function _callee7$(_context7) {
                    while (1) {
                      switch (_context7.prev = _context7.next) {
                        case 0:
                          provMainDebug('Database connection open');

                        case 1:
                        case "end":
                          return _context7.stop();
                      }
                    }
                  }, _callee7);
                })));

                if (!(this.db.readyState === 0)) {
                  _context12.next = 7;
                  break;
                }

                _context12.next = 7;
                return mongoose.connect((0, _classPrivateFieldLooseBase2["default"])(this, _dbConnection)[_dbConnection].url, (0, _classPrivateFieldLooseBase2["default"])(this, _dbConnection)[_dbConnection].options);

              case 7:
                this.db.on('error',
                /*#__PURE__*/
                (0, _asyncToGenerator2["default"])(
                /*#__PURE__*/
                _regenerator["default"].mark(function _callee8() {
                  return _regenerator["default"].wrap(function _callee8$(_context8) {
                    while (1) {
                      switch (_context8.prev = _context8.next) {
                        case 0:
                          mongoose.disconnect();

                        case 1:
                        case "end":
                          return _context8.stop();
                      }
                    }
                  }, _callee8);
                })));
                this.db.on('reconnected',
                /*#__PURE__*/
                (0, _asyncToGenerator2["default"])(
                /*#__PURE__*/
                _regenerator["default"].mark(function _callee9() {
                  return _regenerator["default"].wrap(function _callee9$(_context9) {
                    while (1) {
                      switch (_context9.prev = _context9.next) {
                        case 0:
                          provMainDebug('Database reconnected');

                        case 1:
                        case "end":
                          return _context9.stop();
                      }
                    }
                  }, _callee9);
                })));
                this.db.on('disconnected',
                /*#__PURE__*/
                (0, _asyncToGenerator2["default"])(
                /*#__PURE__*/
                _regenerator["default"].mark(function _callee11() {
                  return _regenerator["default"].wrap(function _callee11$(_context11) {
                    while (1) {
                      switch (_context11.prev = _context11.next) {
                        case 0:
                          provMainDebug('Database disconnected');
                          provMainDebug('Attempting to reconnect');
                          setTimeout(
                          /*#__PURE__*/
                          (0, _asyncToGenerator2["default"])(
                          /*#__PURE__*/
                          _regenerator["default"].mark(function _callee10() {
                            return _regenerator["default"].wrap(function _callee10$(_context10) {
                              while (1) {
                                switch (_context10.prev = _context10.next) {
                                  case 0:
                                    if (!(_this2.db.readyState === 0)) {
                                      _context10.next = 9;
                                      break;
                                    }

                                    _context10.prev = 1;
                                    _context10.next = 4;
                                    return mongoose.connect((0, _classPrivateFieldLooseBase2["default"])(_this2, _dbConnection)[_dbConnection].url, (0, _classPrivateFieldLooseBase2["default"])(_this2, _dbConnection)[_dbConnection].options);

                                  case 4:
                                    _context10.next = 9;
                                    break;

                                  case 6:
                                    _context10.prev = 6;
                                    _context10.t0 = _context10["catch"](1);
                                    provMainDebug('Error in MongoDb connection: ' + _context10.t0);

                                  case 9:
                                  case "end":
                                    return _context10.stop();
                                }
                              }
                            }, _callee10, null, [[1, 6]]);
                          })), 1000);

                        case 3:
                        case "end":
                          return _context11.stop();
                      }
                    }
                  }, _callee11);
                })));
                _context12.next = 16;
                break;

              case 12:
                _context12.prev = 12;
                _context12.t0 = _context12["catch"](1);
                provMainDebug('Error in MongoDb connection: ' + _context12.t0);
                throw new Error('Unable to connect to database');

              case 16:
                /* In case no port is provided uses 3000 */
                port = port || 3000; // Starts server on given port

                (0, _classPrivateFieldLooseBase2["default"])(this, _server)[_server].listen(port, 'Lti Provider tool is listening on port ' + port + '!\n\nLTI provider config: \n>Initiate login URL: ' + (0, _classPrivateFieldLooseBase2["default"])(this, _loginUrl)[_loginUrl] + '\n>App Url: ' + (0, _classPrivateFieldLooseBase2["default"])(this, _appUrl)[_appUrl] + '\n>Session Timeout Url: ' + (0, _classPrivateFieldLooseBase2["default"])(this, _sessionTimeoutUrl)[_sessionTimeoutUrl] + '\n>Invalid Token Url: ' + (0, _classPrivateFieldLooseBase2["default"])(this, _invalidTokenUrl)[_invalidTokenUrl]);

                return _context12.abrupt("return", true);

              case 19:
              case "end":
                return _context12.stop();
            }
          }
        }, _callee12, this, [[1, 12]]);
      }));

      function deploy(_x15) {
        return _deploy.apply(this, arguments);
      }

      return deploy;
    }()
    /**
       * @description Sets the callback function called whenever theres a sucessfull connection, exposing a Conection object containing the id_token decoded parameters.
       * @param {Function} _connectCallback - Function that is going to be called everytime a platform sucessfully connects to the provider.
       * @param {Object} [options] - Options configuring the usage of cookies to pass the Id Token data to the client.
       * @param {Boolean} [options.secure = false] - Secure property of the cookie.
       * @param {Function} [options.sessionTimeout] - Route function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
       * @param {Function} [options.invalidToken] - Route function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
       * @example .onConnect((conection, response)=>{response.send(connection)}, {secure: true})
       */

  }, {
    key: "onConnect",
    value: function onConnect(_connectCallback, options) {
      if (options) {
        if (options.secure === true) (0, _classPrivateFieldLooseBase2["default"])(this, _cookieOptions)[_cookieOptions].secure = options.secure;
        if (options.sessionTimeout) (0, _classPrivateFieldLooseBase2["default"])(this, _sessionTimedOut)[_sessionTimedOut] = options.sessionTimeout;
        if (options.invalidToken) (0, _classPrivateFieldLooseBase2["default"])(this, _invalidToken)[_invalidToken] = options.invalidToken;
      }

      (0, _classPrivateFieldLooseBase2["default"])(this, _connectCallback2)[_connectCallback2] = _connectCallback;
    }
    /**
       * @description Gets/Sets login Url responsible for dealing with the OIDC login flow. If no value is set "/login" is used.
       * @param {string} url - Login url.
       * @example provider.loginUrl('/login')
       */

  }, {
    key: "loginUrl",
    value: function loginUrl(url) {
      if (!url) return (0, _classPrivateFieldLooseBase2["default"])(this, _loginUrl)[_loginUrl];
      (0, _classPrivateFieldLooseBase2["default"])(this, _loginUrl)[_loginUrl] = url;
    }
    /**
       * @description Gets/Sets main application Url that will receive the final decoded Idtoken. If no value is set "/" (root) is used.
       * @param {string} url - App url.
       * @example provider.appUrl('/app')
       */

  }, {
    key: "appUrl",
    value: function appUrl(url) {
      if (!url) return (0, _classPrivateFieldLooseBase2["default"])(this, _appUrl)[_appUrl];
      (0, _classPrivateFieldLooseBase2["default"])(this, _appUrl)[_appUrl] = url;
    }
    /**
       * @description Gets/Sets session timeout Url that will be called whenever the system encounters a session timeout. If no value is set "/sessionTimeout" is used.
       * @param {string} url - Session timeout url.
       * @example provider.sessionTimeoutUrl('/sesstimeout')
       */

  }, {
    key: "sessionTimeoutUrl",
    value: function sessionTimeoutUrl(url) {
      if (!url) return (0, _classPrivateFieldLooseBase2["default"])(this, _sessionTimeoutUrl)[_sessionTimeoutUrl];
      (0, _classPrivateFieldLooseBase2["default"])(this, _sessionTimeoutUrl)[_sessionTimeoutUrl] = url;
    }
    /**
       * @description Gets/Sets invalid token Url that will be called whenever the system encounters a invalid token or cookie. If no value is set "/invalidToken" is used.
       * @param {string} url - Invalid token url.
       * @example provider.invalidTokenUrl('/invtoken')
       */

  }, {
    key: "invalidTokenUrl",
    value: function invalidTokenUrl(url) {
      if (!url) return (0, _classPrivateFieldLooseBase2["default"])(this, _invalidTokenUrl)[_invalidTokenUrl];
      (0, _classPrivateFieldLooseBase2["default"])(this, _invalidTokenUrl)[_invalidTokenUrl] = url;
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

  }, {
    key: "registerPlatform",
    value: function () {
      var _registerPlatform = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee13(url, name, clientId, authenticationEndpoint, accesstokenEndpoint, authConfig) {
        var platform, kid, plat, isregisteredPlat;
        return _regenerator["default"].wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                if (!(!name || !url || !clientId || !authenticationEndpoint || !accesstokenEndpoint || !authConfig)) {
                  _context13.next = 2;
                  break;
                }

                throw new Error('Error registering platform. Missing argument.');

              case 2:
                _context13.prev = 2;
                _context13.next = 5;
                return this.getPlatform(url);

              case 5:
                platform = _context13.sent;

                if (platform) {
                  _context13.next = 21;
                  break;
                }

                _context13.next = 9;
                return Auth.generateProviderKeyPair((0, _classPrivateFieldLooseBase2["default"])(this, _ENCRYPTIONKEY)[_ENCRYPTIONKEY]);

              case 9:
                kid = _context13.sent;
                plat = new Platform(name, url, clientId, authenticationEndpoint, accesstokenEndpoint, kid, (0, _classPrivateFieldLooseBase2["default"])(this, _ENCRYPTIONKEY)[_ENCRYPTIONKEY], authConfig); // Save platform to db

                _context13.next = 13;
                return Database.Get(false, 'platform', {
                  platformUrl: url
                });

              case 13:
                isregisteredPlat = _context13.sent;

                if (isregisteredPlat) {
                  _context13.next = 18;
                  break;
                }

                provMainDebug('Registering new platform: ' + url);
                _context13.next = 18;
                return Database.Insert(false, 'platform', {
                  platformName: name,
                  platformUrl: url,
                  clientId: clientId,
                  authEndpoint: authenticationEndpoint,
                  accesstokenEndpoint: accesstokenEndpoint,
                  kid: kid,
                  authConfig: authConfig
                });

              case 18:
                return _context13.abrupt("return", plat);

              case 21:
                return _context13.abrupt("return", platform);

              case 22:
                _context13.next = 28;
                break;

              case 24:
                _context13.prev = 24;
                _context13.t0 = _context13["catch"](2);
                provAuthDebug(_context13.t0);
                return _context13.abrupt("return", false);

              case 28:
              case "end":
                return _context13.stop();
            }
          }
        }, _callee13, this, [[2, 24]]);
      }));

      function registerPlatform(_x16, _x17, _x18, _x19, _x20, _x21) {
        return _registerPlatform.apply(this, arguments);
      }

      return registerPlatform;
    }()
    /**
       * @description Gets a platform.
       * @param {String} url - Platform url.
       * @param {String} [ENCRYPTIONKEY] - Encryption key. THIS PARAMETER IS ONLY IN A FEW SPECIFIC CALLS, DO NOT USE IN YOUR APPLICATION.
       */

  }, {
    key: "getPlatform",
    value: function () {
      var _getPlatform = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee14(url, ENCRYPTIONKEY) {
        var plat, obj, result;
        return _regenerator["default"].wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                if (url) {
                  _context14.next = 2;
                  break;
                }

                throw new Error('No url provided');

              case 2:
                _context14.prev = 2;
                _context14.next = 5;
                return Database.Get(false, 'platform', {
                  platformUrl: url
                });

              case 5:
                plat = _context14.sent;

                if (plat) {
                  _context14.next = 8;
                  break;
                }

                return _context14.abrupt("return", false);

              case 8:
                obj = plat[0];

                if (obj) {
                  _context14.next = 11;
                  break;
                }

                return _context14.abrupt("return", false);

              case 11:
                if (ENCRYPTIONKEY) {
                  result = new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, ENCRYPTIONKEY, obj.authConfig);
                } else {
                  result = new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, (0, _classPrivateFieldLooseBase2["default"])(this, _ENCRYPTIONKEY)[_ENCRYPTIONKEY], obj.authConfig);
                }

                return _context14.abrupt("return", result);

              case 15:
                _context14.prev = 15;
                _context14.t0 = _context14["catch"](2);
                provAuthDebug(_context14.t0);
                return _context14.abrupt("return", false);

              case 19:
              case "end":
                return _context14.stop();
            }
          }
        }, _callee14, this, [[2, 15]]);
      }));

      function getPlatform(_x22, _x23) {
        return _getPlatform.apply(this, arguments);
      }

      return getPlatform;
    }()
    /**
       * @description Deletes a platform.
       * @param {string} url - Platform url.
       */

  }, {
    key: "deletePlatform",
    value: function () {
      var _deletePlatform = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee15(url) {
        var platform;
        return _regenerator["default"].wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                if (url) {
                  _context15.next = 2;
                  break;
                }

                throw new Error('No url provided');

              case 2:
                _context15.next = 4;
                return this.getPlatform(url);

              case 4:
                platform = _context15.sent;

                if (!platform) {
                  _context15.next = 7;
                  break;
                }

                return _context15.abrupt("return", platform.remove());

              case 7:
                return _context15.abrupt("return", false);

              case 8:
              case "end":
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function deletePlatform(_x24) {
        return _deletePlatform.apply(this, arguments);
      }

      return deletePlatform;
    }()
    /**
       * @description Gets all platforms.
       */

  }, {
    key: "getAllPlatforms",
    value: function () {
      var _getAllPlatforms = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee16() {
        var returnArray, platforms, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, obj;

        return _regenerator["default"].wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                returnArray = [];
                _context16.prev = 1;
                _context16.next = 4;
                return Database.Get(false, 'platform');

              case 4:
                platforms = _context16.sent;

                if (!platforms) {
                  _context16.next = 26;
                  break;
                }

                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context16.prev = 9;

                for (_iterator = platforms[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                  obj = _step.value;
                  returnArray.push(new Platform(obj.platformName, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, (0, _classPrivateFieldLooseBase2["default"])(this, _ENCRYPTIONKEY)[_ENCRYPTIONKEY], obj.authConfig));
                }

                _context16.next = 17;
                break;

              case 13:
                _context16.prev = 13;
                _context16.t0 = _context16["catch"](9);
                _didIteratorError = true;
                _iteratorError = _context16.t0;

              case 17:
                _context16.prev = 17;
                _context16.prev = 18;

                if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                  _iterator["return"]();
                }

              case 20:
                _context16.prev = 20;

                if (!_didIteratorError) {
                  _context16.next = 23;
                  break;
                }

                throw _iteratorError;

              case 23:
                return _context16.finish(20);

              case 24:
                return _context16.finish(17);

              case 25:
                return _context16.abrupt("return", returnArray);

              case 26:
                return _context16.abrupt("return", []);

              case 29:
                _context16.prev = 29;
                _context16.t1 = _context16["catch"](1);
                provAuthDebug(_context16.t1);
                return _context16.abrupt("return", false);

              case 33:
              case "end":
                return _context16.stop();
            }
          }
        }, _callee16, this, [[1, 29], [9, 13, 17, 25], [18,, 20, 24]]);
      }));

      function getAllPlatforms() {
        return _getAllPlatforms.apply(this, arguments);
      }

      return getAllPlatforms;
    }()
    /**
       * @description Sends message to the platform
       * @param {Object} idtoken - Idtoken for the user
       * @param {Object} message - Message following the Lti Standard application/vnd.ims.lis.v1.score+json
       */

  }, {
    key: "messagePlatform",
    value: function () {
      var _messagePlatform = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee17(idtoken, message) {
        var platform, tokenRes, lineitemsEndpoint, lineitemRes, resourceId, lineitem, lineitemUrl, scoreUrl, query, _url;

        return _regenerator["default"].wrap(function _callee17$(_context17) {
          while (1) {
            switch (_context17.prev = _context17.next) {
              case 0:
                provMainDebug('Target platform: ' + idtoken.iss);
                _context17.next = 3;
                return this.getPlatform(idtoken.iss);

              case 3:
                platform = _context17.sent;

                if (platform) {
                  _context17.next = 7;
                  break;
                }

                provMainDebug('Platform not found, returning false');
                return _context17.abrupt("return", false);

              case 7:
                provMainDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
                _context17.prev = 8;
                _context17.next = 11;
                return platform.platformAccessToken();

              case 11:
                tokenRes = _context17.sent;
                provMainDebug('Access_token retrieved for [' + idtoken.iss + ']');
                lineitemsEndpoint = idtoken.endpoint.lineitems;
                _context17.next = 16;
                return got.get(lineitemsEndpoint, {
                  headers: {
                    Authorization: tokenRes.token_type + ' ' + tokenRes.access_token
                  }
                });

              case 16:
                lineitemRes = _context17.sent;
                resourceId = idtoken.platformContext.resource;
                lineitem = find(JSON.parse(lineitemRes.body), ['resourceLinkId', resourceId.id]);
                lineitemUrl = lineitem.id;
                scoreUrl = lineitemUrl + '/scores';

                if (lineitemUrl.split('\?') !== -1) {
                  query = lineitemUrl.split('\?')[1];
                  _url = lineitemUrl.split('\?')[0];
                  scoreUrl = _url + '/scores?' + query;
                }

                provMainDebug('Sending grade message to: ' + scoreUrl);
                message.userId = idtoken.user;
                message.timestamp = new Date(Date.now()).toISOString();
                message.scoreMaximum = lineitem.scoreMaximum;
                provMainDebug(message);
                _context17.next = 29;
                return got.post(scoreUrl, {
                  headers: {
                    Authorization: tokenRes.token_type + ' ' + tokenRes.access_token,
                    'Content-Type': 'application/vnd.ims.lis.v1.score+json'
                  },
                  body: JSON.stringify(message)
                });

              case 29:
                provMainDebug('Message successfully sent');
                return _context17.abrupt("return", true);

              case 33:
                _context17.prev = 33;
                _context17.t0 = _context17["catch"](8);
                provMainDebug(_context17.t0);
                return _context17.abrupt("return", false);

              case 37:
              case "end":
                return _context17.stop();
            }
          }
        }, _callee17, this, [[8, 33]]);
      }));

      function messagePlatform(_x25, _x26) {
        return _messagePlatform.apply(this, arguments);
      }

      return messagePlatform;
    }()
    /**
     * @description Redirect to a new location and sets it's cookie if the location represents a separate resource
     * @param {Object} res - Express response object
     * @param {String} path - Redirect path
     * @param {Boolea} [isNewResource = false] - If true creates new resource and its cookie
     * @example lti.generatePathCookie(response, '/path', true)
     */

  }, {
    key: "redirect",
    value: function () {
      var _redirect = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee18(res, path, isNewResource) {
        return _regenerator["default"].wrap(function _callee18$(_context18) {
          while (1) {
            switch (_context18.prev = _context18.next) {
              case 0:
                if (res.locals.login && isNewResource) {
                  provMainDebug('Setting up path cookie for this resource with path: ' + path);
                  res.cookie(res.locals.token.issuer_code + path, res.locals.token.platformContext, (0, _classPrivateFieldLooseBase2["default"])(this, _cookieOptions)[_cookieOptions]);
                }

                return _context18.abrupt("return", res.redirect(res.locals.token.issuer_code + path));

              case 2:
              case "end":
                return _context18.stop();
            }
          }
        }, _callee18, this);
      }));

      function redirect(_x27, _x28, _x29) {
        return _redirect.apply(this, arguments);
      }

      return redirect;
    }()
  }]);
  return Provider;
}();

var _loginUrl = (0, _classPrivateFieldLooseKey2["default"])("loginUrl");

var _appUrl = (0, _classPrivateFieldLooseKey2["default"])("appUrl");

var _sessionTimeoutUrl = (0, _classPrivateFieldLooseKey2["default"])("sessionTimeoutUrl");

var _invalidTokenUrl = (0, _classPrivateFieldLooseKey2["default"])("invalidTokenUrl");

var _ENCRYPTIONKEY = (0, _classPrivateFieldLooseKey2["default"])("ENCRYPTIONKEY");

var _cookieOptions = (0, _classPrivateFieldLooseKey2["default"])("cookieOptions");

var _dbConnection = (0, _classPrivateFieldLooseKey2["default"])("dbConnection");

var _connectCallback2 = (0, _classPrivateFieldLooseKey2["default"])("connectCallback");

var _sessionTimedOut = (0, _classPrivateFieldLooseKey2["default"])("sessionTimedOut");

var _invalidToken = (0, _classPrivateFieldLooseKey2["default"])("invalidToken");

var _server = (0, _classPrivateFieldLooseKey2["default"])("server");

module.exports = Provider;