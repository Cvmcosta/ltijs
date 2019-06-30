"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/* Main file for the Provider functionalities */
var Server = require('../Utils/Server');

var Request = require('../Utils/Request');

var Platform = require('../Utils/Platform');

var Auth = require('../Utils/Auth');

var Database = require('../Utils/Database');

var url = require('url');

var jwt = require('jsonwebtoken');

var got = require('got');

var provAuthDebug = require('debug')('provider:auth');

var provMainDebug = require('debug')('provider:main'); // Pre-initiated variables


var _loginUrl = '/login';
var _appUrl = '/';
var _sessionTimeoutUrl = '/sessionTimeout';
var _invalidTokenUrl = '/invalidToken';
var ENCRYPTIONKEY;
var cookieOptions = {
  maxAge: 1000 * 60 * 60,
  secure: true,
  httpOnly: true,
  signed: true
};

var connectCallback = function connectCallback() {};

var sessionTimedOut = function sessionTimedOut(req, res) {
  res.status(401).send('Session timed out. Please reinitiate login.');
};

var invalidToken = function invalidToken(req, res) {
  res.status(401).send('Invalid token. Please reinitiate login.');
};
/**
 * @descripttion Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider and a "server" object to manipulate the Express instance
 */


var Provider =
/*#__PURE__*/
function () {
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
  function Provider(encryptionkey, options) {
    var _this = this;

    _classCallCheck(this, Provider);

    if (options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)) throw new Error('No ssl Key  or Certificate found for local https configuration.');
    if (!encryptionkey) throw new Error('Encryptionkey parameter missing in options.');
    ENCRYPTIONKEY = encryptionkey;
    this.server = new Server(options.https, options.ssl, ENCRYPTIONKEY);
    this.app = this.server.app;
    if (options.staticPath) this.server.setStaticPath(options.staticPath); // Registers main athentication middleware

    var sessionValidator =
    /*#__PURE__*/
    function () {
      var _ref = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee(req, res, next) {
        var it, valid, _it2, _valid, _it;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(req.url === _loginUrl || req.url === _sessionTimeoutUrl || req.url === _invalidTokenUrl)) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt("return", next());

              case 2:
                _context.prev = 2;
                it = req.signedCookies.it;

                if (it) {
                  _context.next = 24;
                  break;
                }

                provMainDebug('No cookie found');

                if (!req.body.id_token) {
                  _context.next = 20;
                  break;
                }

                provMainDebug('Received request containing token. Sending for validation');
                _context.next = 10;
                return Auth.validateToken(req.body.id_token, _this.getPlatform);

              case 10:
                valid = _context.sent;
                provAuthDebug('Successfully validated token!');
                valid.exp = Date.now() / 1000 + cookieOptions.maxAge / 1000;
                _it2 = jwt.sign(valid, ENCRYPTIONKEY);
                res.cookie('it', _it2, cookieOptions);
                res.locals.token = valid;
                provMainDebug('Passing request to next handler');
                return _context.abrupt("return", next());

              case 20:
                provMainDebug('Passing request to session timeout handler');
                return _context.abrupt("return", res.redirect(_sessionTimeoutUrl));

              case 22:
                _context.next = 32;
                break;

              case 24:
                _valid = jwt.verify(it, ENCRYPTIONKEY);
                provAuthDebug('Cookie successfully validated');
                _valid.exp = Date.now() / 1000 + cookieOptions.maxAge / 1000;
                _it = jwt.sign(_valid, ENCRYPTIONKEY);
                res.cookie('it', _it, cookieOptions);
                res.locals.token = _valid;
                provMainDebug('Passing request to next handler');
                return _context.abrupt("return", next());

              case 32:
                _context.next = 39;
                break;

              case 34:
                _context.prev = 34;
                _context.t0 = _context["catch"](2);
                provAuthDebug(_context.t0);
                provMainDebug('Error validating token. Passing request to invalid token handler');
                return _context.abrupt("return", res.redirect(_invalidTokenUrl));

              case 39:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[2, 34]]);
      }));

      return function sessionValidator(_x, _x2, _x3) {
        return _ref.apply(this, arguments);
      };
    }();

    this.app.use(sessionValidator);
    this.app.post(_loginUrl, function (req, res) {
      provMainDebug('Receiving a login request from: ' + req.body.iss);

      var platform = _this.getPlatform(req.body.iss);

      if (platform) {
        provMainDebug('Redirecting to platform authentication endpoint');
        res.redirect(url.format({
          pathname: platform.platformAuthEndpoint(),
          query: Request.ltiAdvantageLogin(req.body, platform)
        }));
      } else {
        provMainDebug('Unregistered platform attempting connection: ' + req.body.iss);
        res.status(401).send('Unregistered platform.');
      }
    }); // Session timeout and invalid token urls

    this.app.all(_sessionTimeoutUrl, function (req, res, next) {
      sessionTimedOut(req, res, next);
    });
    this.app.all(_invalidTokenUrl, function (req, res, next) {
      invalidToken(req, res, next);
    }); // Main app

    this.app.post(_appUrl, function (req, res, next) {
      connectCallback(res.locals.token, req, res, next);
    });
  }
  /**
     * @description Starts listening to a given port for LTI requests
     * @param {number} port - The port the Provider should listen to
     */


  _createClass(Provider, [{
    key: "deploy",
    value: function deploy(port) {
      /* In case no port is provided uses 3000 */
      port = port || 3000; // Clean stored access_tokens

      provMainDebug('Cleaning previously stored access tokens');
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.getAllPlatforms()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var plat = _step.value;
          Database.Delete(ENCRYPTIONKEY, './provider_data', 'access_tokens', 'access_tokens', {
            platformUrl: plat.platformUrl()
          });
        } // Starts server on given port

      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.server.listen(port, 'Lti Provider tool is listening on port ' + port + '!\n\nLTI provider config: \n>Initiate login URL: ' + _loginUrl + '\n>App Url: ' + _appUrl + '\n>Session Timeout Url: ' + _sessionTimeoutUrl + '\n>Invalid Token Url: ' + _invalidTokenUrl);
      return this;
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

  }, {
    key: "onConnect",
    value: function onConnect(_connectCallback, options) {
      if (options) {
        cookieOptions.maxAge = options.maxAge || 1000 * 60 * 60;
        if (options.secure !== undefined) cookieOptions.secure = options.secure;else cookieOptions.secure = true;
        if (options.sessionTimeout) sessionTimedOut = options.sessionTimeout;
        if (options.invalidToken) invalidToken = options.invalidToken;
      }

      connectCallback = _connectCallback;
    }
    /**
       * @description Gets/Sets login Url responsible for dealing with the OIDC login flow. If no value is set "/login" is used.
       * @param {string} url - Login url.
       * @example provider.loginUrl('/login')
       */

  }, {
    key: "loginUrl",
    value: function loginUrl(url) {
      if (!url) return _loginUrl;
      _loginUrl = url;
    }
    /**
       * @description Gets/Sets main application Url that will receive the final decoded Idtoken. If no value is set "/" (root) is used.
       * @param {string} url - App url.
       * @example provider.appUrl('/app')
       */

  }, {
    key: "appUrl",
    value: function appUrl(url) {
      if (!url) return _appUrl;
      _appUrl = url;
    }
    /**
       * @description Gets/Sets session timeout Url that will be called whenever the system encounters a session timeout. If no value is set "/sessionTimeout" is used.
       * @param {string} url - Session timeout url.
       * @example provider.sessionTimeoutUrl('/sesstimeout')
       */

  }, {
    key: "sessionTimeoutUrl",
    value: function sessionTimeoutUrl(url) {
      if (!url) return _sessionTimeoutUrl;
      _sessionTimeoutUrl = url;
    }
    /**
       * @description Gets/Sets invalid token Url that will be called whenever the system encounters a invalid token or cookie. If no value is set "/invalidToken" is used.
       * @param {string} url - Invalid token url.
       * @example provider.invalidTokenUrl('/invtoken')
       */

  }, {
    key: "invalidTokenUrl",
    value: function invalidTokenUrl(url) {
      if (!url) return _invalidTokenUrl;
      _invalidTokenUrl = url;
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

  }, {
    key: "registerPlatform",
    value: function registerPlatform(url, name, clientId, authenticationEndpoint, accesstokenEndpoint, authConfig) {
      if (!name || !url || !clientId || !authenticationEndpoint || !accesstokenEndpoint || !authConfig) throw new Error('Error registering platform. Missing argument.');
      var platform = this.getPlatform(url);

      if (!platform) {
        var kid = Auth.generateProviderKeyPair();
        return new Platform(name, url, clientId, authenticationEndpoint, accesstokenEndpoint, kid, ENCRYPTIONKEY, authConfig);
      } else {
        return false;
      }
    }
    /**
       * @description Gets a platform.
       * @param {string} url - Platform url.
       */

  }, {
    key: "getPlatform",
    value: function getPlatform(url) {
      if (!url) throw new Error('No url provided');
      var obj = Database.Get(ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms', {
        platformUrl: url
      });
      if (!obj) return false;
      return new Platform(obj.platform_name, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, ENCRYPTIONKEY, obj.authConfig);
    }
    /**
       * @description Deletes a platform.
       * @param {string} url - Platform url.
       */

  }, {
    key: "deletePlatform",
    value: function deletePlatform(url) {
      if (!url) throw new Error('No url provided');
      var platform = this.getPlatform(url);
      if (platform) return platform.remove();
    }
    /**
       * @description Gets all platforms.
       */

  }, {
    key: "getAllPlatforms",
    value: function getAllPlatforms() {
      var returnArray = [];
      var platforms = Database.Get(ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms');

      if (platforms) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = platforms[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var obj = _step2.value;
            returnArray.push(new Platform(obj.platform_name, obj.platformUrl, obj.clientId, obj.authEndpoint, obj.accesstokenEndpoint, obj.kid, ENCRYPTIONKEY, obj.authConfig));
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
              _iterator2["return"]();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        return returnArray;
      }

      return [];
    }
    /**
       * @description Sends message to the platform
       * @param {Object} idtoken - Idtoken for the user
       */

  }, {
    key: "messagePlatform",
    value: function messagePlatform(idtoken) {
      provMainDebug('Target platform: ' + idtoken.iss);
      var platform = this.getPlatform(idtoken.iss);

      if (!platform) {
        provMainDebug('Platform not found, returning false');
        return false;
      }

      provMainDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
      platform.platformAccessToken().then(function (res) {
        provMainDebug('Access_token retrieved for [' + idtoken.iss + ']'); // let lineitems = idtoken['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].lineitems

        /* got.get(lineitems,{headers:{Authorization: res.token_type + ' ' + res.access_token}}).then(res => {
                  provMainDebug(idtoken)
                  //provMainDebug("Line Item: ")
                  provMainDebug(JSON.parse(res.body))
              }) */

        var grade = {
          timestamp: new Date(Date.now()).toISOString(),
          scoreGiven: 70,
          scoreMaximum: 100,
          comment: 'This is exceptional work.',
          activityProgress: 'Completed',
          gradingProgress: 'FullyGraded',
          userId: idtoken.sub
        };
        got.post('http://localhost/moodle/mod/lti/services.php/2/lineitems/2/lineitem/scores?type_id=1', {
          headers: {
            Authorization: res.token_type + ' ' + res.access_token,
            'Content-Type': 'application/vnd.ims.lis.v1.score+json'
          },
          body: JSON.stringify(grade)
        }).then(function () {
          provMainDebug('Message successfully sent');
        })["catch"](function (err) {
          provMainDebug('err');
          provMainDebug(err);
        });
      })["catch"](function (err) {
        provMainDebug(err);
      });
    }
  }]);

  return Provider;
}(); // Create Claim helpers


Provider.ClaimCustomParameters = 'https://purl.imsglobal.org/spec/lti/claim/custom';
module.exports = Provider;