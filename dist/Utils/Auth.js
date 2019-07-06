"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var Database = require('./Database');

var crypto = require('crypto');

var jwk = require('pem-jwk');

var got = require('got');

var find = require('lodash.find');

var jwt = require('jsonwebtoken');

var provAuthDebug = require('debug')('provider:auth'); // const cons_authdebug = require('debug')('consumer:auth')

/**
 * @description Authentication class manages RSA keys and validation of tokens.
 */


var Auth =
/*#__PURE__*/
function () {
  function Auth() {
    (0, _classCallCheck2["default"])(this, Auth);
  }

  (0, _createClass2["default"])(Auth, null, [{
    key: "generateProviderKeyPair",

    /**
       * @description Generates a new keypairfor the platform.
       * @param {String} ENCRYPTIONKEY - Encryption key.
       * @returns {String} kid for the keypair.
       */
    value: function () {
      var _generateProviderKeyPair = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee(ENCRYPTIONKEY) {
        var kid, keys, publicKey, privateKey, pubkeyobj, privkeyobj;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                kid = crypto.randomBytes(16).toString('hex');

              case 1:
                _context.next = 3;
                return Database.Get(false, 'publickey', {
                  kid: kid
                });

              case 3:
                if (!_context.sent) {
                  _context.next = 7;
                  break;
                }

                kid = crypto.randomBytes(16).toString('hex');
                _context.next = 1;
                break;

              case 7:
                keys = crypto.generateKeyPairSync('rsa', {
                  modulusLength: 4096,
                  publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                  },
                  privateKeyEncoding: {
                    type: 'pkcs1',
                    format: 'pem'
                  }
                });
                publicKey = keys.publicKey, privateKey = keys.privateKey;
                pubkeyobj = {
                  key: publicKey
                };
                privkeyobj = {
                  key: privateKey
                };
                _context.next = 13;
                return Database.Insert(ENCRYPTIONKEY, 'publickey', pubkeyobj, {
                  kid: kid
                });

              case 13:
                _context.next = 15;
                return Database.Insert(ENCRYPTIONKEY, 'privatekey', privkeyobj, {
                  kid: kid
                });

              case 15:
                return _context.abrupt("return", kid);

              case 16:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      function generateProviderKeyPair(_x) {
        return _generateProviderKeyPair.apply(this, arguments);
      }

      return generateProviderKeyPair;
    }()
    /**
       * @description Resolves a promisse if the token is valid following LTI 1.3 standards.
       * @param {String} token - JWT token to be verified.
       * @param {Function} getPlatform - getPlatform function to get the platform that originated the token.
       * @param {String} ENCRYPTIONKEY - Encription key.
       * @returns {Promise}
       */

  }, {
    key: "validateToken",
    value: function () {
      var _validateToken = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee2(token, getPlatform, ENCRYPTIONKEY) {
        var decodedToken, kid, alg, platform, authConfig, keysEndpoint, res, keyset, key, verified, _key, _verified, _key2, _verified2;

        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                decodedToken = jwt.decode(token, {
                  complete: true
                });
                kid = decodedToken.header.kid;
                alg = decodedToken.header.alg;
                provAuthDebug('Attempting to retrieve registered platform');
                _context2.next = 6;
                return getPlatform(decodedToken.payload.iss, ENCRYPTIONKEY);

              case 6:
                platform = _context2.sent;

                if (platform) {
                  _context2.next = 9;
                  break;
                }

                throw new Error('NoPlatformRegistered');

              case 9:
                _context2.next = 11;
                return platform.platformAuthConfig();

              case 11:
                authConfig = _context2.sent;
                _context2.t0 = authConfig.method;
                _context2.next = _context2.t0 === 'JWK_SET' ? 15 : _context2.t0 === 'JWK_KEY' ? 32 : _context2.t0 === 'RSA_KEY' ? 40 : 48;
                break;

              case 15:
                provAuthDebug('Retrieving key from jwk_set');

                if (kid) {
                  _context2.next = 18;
                  break;
                }

                throw new Error('NoKidFoundInToken');

              case 18:
                keysEndpoint = authConfig.key;
                _context2.next = 21;
                return got.get(keysEndpoint);

              case 21:
                res = _context2.sent;
                keyset = JSON.parse(res.body).keys;

                if (keyset) {
                  _context2.next = 25;
                  break;
                }

                throw new Error('NoKeySetFound');

              case 25:
                key = jwk.jwk2pem(find(keyset, ['kid', kid]));

                if (key) {
                  _context2.next = 28;
                  break;
                }

                throw new Error('NoKeyFound');

              case 28:
                _context2.next = 30;
                return this.verifyToken(token, key, alg, platform);

              case 30:
                verified = _context2.sent;
                return _context2.abrupt("return", verified);

              case 32:
                provAuthDebug('Retrieving key from jwk_key');

                if (authConfig.key) {
                  _context2.next = 35;
                  break;
                }

                throw new Error('NoKeyFound');

              case 35:
                _key = jwk.jwk2pem(authConfig.key);
                _context2.next = 38;
                return this.verifyToken(token, _key, alg, platform);

              case 38:
                _verified = _context2.sent;
                return _context2.abrupt("return", _verified);

              case 40:
                provAuthDebug('Retrieving key from rsa_key');
                _key2 = authConfig.key;

                if (_key2) {
                  _context2.next = 44;
                  break;
                }

                throw new Error('NoKeyFound');

              case 44:
                _context2.next = 46;
                return this.verifyToken(token, _key2, alg, platform);

              case 46:
                _verified2 = _context2.sent;
                return _context2.abrupt("return", _verified2);

              case 48:
                provAuthDebug('No auth configuration found for platform');
                throw new Error('NoAuthConfigFound');

              case 50:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function validateToken(_x2, _x3, _x4) {
        return _validateToken.apply(this, arguments);
      }

      return validateToken;
    }()
    /**
       * @description Verifies a token.
       * @param {Object} token - Token to be verified.
       * @param {String} key - Key to verify the token.
       * @param {String} alg - Algorithm used.
       * @param {Platform} platform - Issuer platform.
       */

  }, {
    key: "verifyToken",
    value: function () {
      var _verifyToken = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee3(token, key, alg, platform) {
        var decoded;
        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                provAuthDebug('Attempting to verify JWT with the given key');
                decoded = jwt.verify(token, key, {
                  algorithms: [alg]
                });
                _context3.next = 4;
                return this.oidcValidationSteps(decoded, platform, alg);

              case 4:
                return _context3.abrupt("return", decoded);

              case 5:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function verifyToken(_x5, _x6, _x7, _x8) {
        return _verifyToken.apply(this, arguments);
      }

      return verifyToken;
    }()
    /**
       * @description Validates de token based on the OIDC specifications.
       * @param {Object} token - Id token you wish to validate.
       * @param {Platform} platform - Platform object.
       * @param {String} alg - Algorithm used.
       */

  }, {
    key: "oidcValidationSteps",
    value: function () {
      var _oidcValidationSteps = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee4(token, platform, alg) {
        var aud, _alg, iat, nonce;

        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                provAuthDebug('Token signature verified');
                provAuthDebug('Initiating OIDC aditional validation steps');
                aud = this.validateAud(token, platform);
                _alg = this.validateAlg(alg);
                iat = this.validateIat(token);
                nonce = this.validateNonce(token);
                return _context4.abrupt("return", Promise.all([aud, _alg, iat, nonce]));

              case 7:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function oidcValidationSteps(_x9, _x10, _x11) {
        return _oidcValidationSteps.apply(this, arguments);
      }

      return oidcValidationSteps;
    }()
    /**
       * @description Validates Aud.
       * @param {Object} token - Id token you wish to validate.
       * @param {Platform} platform - Platform object.
       */

  }, {
    key: "validateAud",
    value: function () {
      var _validateAud = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee5(token, platform) {
        return _regenerator["default"].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                provAuthDebug("Validating if aud (Audience) claim matches the value of the tool's clientId given by the platform");
                provAuthDebug('Aud claim: ' + token.aud);
                _context5.t0 = provAuthDebug;
                _context5.next = 5;
                return platform.platformClientId();

              case 5:
                _context5.t1 = _context5.sent;
                _context5.t2 = "Tool's clientId: " + _context5.t1;
                (0, _context5.t0)(_context5.t2);
                _context5.t3 = token.aud;
                _context5.next = 11;
                return platform.platformClientId();

              case 11:
                _context5.t4 = _context5.sent;

                if (_context5.t3.includes.call(_context5.t3, _context5.t4)) {
                  _context5.next = 14;
                  break;
                }

                throw new Error('AudDoesNotMatchClientId');

              case 14:
                if (!Array.isArray(token.aud)) {
                  _context5.next = 25;
                  break;
                }

                provAuthDebug('More than one aud listed, searching for azp claim');
                _context5.t5 = token.azp;

                if (!_context5.t5) {
                  _context5.next = 23;
                  break;
                }

                _context5.t6 = token.azp;
                _context5.next = 21;
                return platform.platformClientId();

              case 21:
                _context5.t7 = _context5.sent;
                _context5.t5 = _context5.t6 !== _context5.t7;

              case 23:
                if (!_context5.t5) {
                  _context5.next = 25;
                  break;
                }

                throw new Error('AzpClaimDoesNotMatchClientId');

              case 25:
                return _context5.abrupt("return", true);

              case 26:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5);
      }));

      function validateAud(_x12, _x13) {
        return _validateAud.apply(this, arguments);
      }

      return validateAud;
    }()
    /**
       * @description Validates Aug.
       * @param {String} alg - Algorithm used.
       */

  }, {
    key: "validateAlg",
    value: function () {
      var _validateAlg = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee6(alg) {
        return _regenerator["default"].wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                provAuthDebug('Checking alg claim. Alg: ' + alg);

                if (!(alg !== 'RS256')) {
                  _context6.next = 3;
                  break;
                }

                throw new Error('NoRSA256Alg');

              case 3:
                return _context6.abrupt("return", true);

              case 4:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6);
      }));

      function validateAlg(_x14) {
        return _validateAlg.apply(this, arguments);
      }

      return validateAlg;
    }()
    /**
       * @description Validates Iat.
       * @param {Object} token - Id token you wish to validate.
       */

  }, {
    key: "validateIat",
    value: function () {
      var _validateIat = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee7(token) {
        var curTime, timePassed;
        return _regenerator["default"].wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                provAuthDebug('Checking iat claim to prevent old tokens from being passed.');
                provAuthDebug('Iat claim: ' + token.iat);
                curTime = Date.now() / 1000;
                provAuthDebug('Current_time: ' + curTime);
                timePassed = curTime - token.iat;
                provAuthDebug('Time passed: ' + timePassed);

                if (!(timePassed > 10)) {
                  _context7.next = 8;
                  break;
                }

                throw new Error('TokenTooOld');

              case 8:
                return _context7.abrupt("return", true);

              case 9:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7);
      }));

      function validateIat(_x15) {
        return _validateIat.apply(this, arguments);
      }

      return validateIat;
    }()
    /**
       * @description Validates Nonce.
       * @param {Object} token - Id token you wish to validate.
       */

  }, {
    key: "validateNonce",
    value: function () {
      var _validateNonce = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee8(token) {
        return _regenerator["default"].wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                provAuthDebug('Validating nonce');
                provAuthDebug('Nonce: ' + token.nonce);
                _context8.next = 4;
                return Database.Get(false, 'nonce', {
                  nonce: token.nonce
                });

              case 4:
                if (!_context8.sent) {
                  _context8.next = 6;
                  break;
                }

                throw new Error('NonceAlreadyStored');

              case 6:
                provAuthDebug('Storing nonce');
                _context8.next = 9;
                return Database.Insert(false, 'nonce', {
                  nonce: token.nonce
                });

              case 9:
                return _context8.abrupt("return", true);

              case 10:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8);
      }));

      function validateNonce(_x16) {
        return _validateNonce.apply(this, arguments);
      }

      return validateNonce;
    }()
    /**
       * @description Gets a new access token from the platform.
       * @param {Platform} platform - Platform object of the platform you want to access.
       */

  }, {
    key: "getAccessToken",
    value: function () {
      var _getAccessToken = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee9(platform, ENCRYPTIONKEY) {
        var confjwt, token, message, res, access;
        return _regenerator["default"].wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _context9.next = 2;
                return platform.platformClientId();

              case 2:
                _context9.t0 = _context9.sent;
                _context9.next = 5;
                return platform.platformClientId();

              case 5:
                _context9.t1 = _context9.sent;
                _context9.next = 8;
                return platform.platformAccessTokenEndpoint();

              case 8:
                _context9.t2 = _context9.sent;
                _context9.t3 = Date.now() / 1000;
                _context9.t4 = Date.now() / 1000 + 60;
                _context9.t5 = crypto.randomBytes(16).toString('base64');
                confjwt = {
                  iss: _context9.t0,
                  sub: _context9.t1,
                  aud: _context9.t2,
                  iat: _context9.t3,
                  exp: _context9.t4,
                  jti: _context9.t5
                };
                _context9.t6 = jwt;
                _context9.t7 = confjwt;
                _context9.next = 17;
                return platform.platformPrivateKey();

              case 17:
                _context9.t8 = _context9.sent;
                _context9.next = 20;
                return platform.platformKid();

              case 20:
                _context9.t9 = _context9.sent;
                _context9.t10 = {
                  algorithm: 'RS256',
                  keyid: _context9.t9
                };
                token = _context9.t6.sign.call(_context9.t6, _context9.t7, _context9.t8, _context9.t10);
                message = {
                  grant_type: 'client_credentials',
                  client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                  client_assertion: token,
                  scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly'
                };
                provAuthDebug('Awaiting return from the platform');
                _context9.t11 = got;
                _context9.next = 28;
                return platform.platformAccessTokenEndpoint();

              case 28:
                _context9.t12 = _context9.sent;
                _context9.t13 = {
                  body: message,
                  form: true
                };
                _context9.next = 32;
                return (0, _context9.t11)(_context9.t12, _context9.t13);

              case 32:
                res = _context9.sent;
                provAuthDebug('Successfully generated new access_token');
                access = JSON.parse(res.body);
                _context9.t14 = Database;
                _context9.t15 = ENCRYPTIONKEY;
                _context9.t16 = {
                  token: access
                };
                _context9.next = 40;
                return platform.platformUrl();

              case 40:
                _context9.t17 = _context9.sent;
                _context9.t18 = {
                  platformUrl: _context9.t17
                };
                _context9.next = 44;
                return _context9.t14.Insert.call(_context9.t14, _context9.t15, 'accesstoken', _context9.t16, _context9.t18);

              case 44:
                return _context9.abrupt("return", access);

              case 45:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9);
      }));

      function getAccessToken(_x17, _x18) {
        return _getAccessToken.apply(this, arguments);
      }

      return getAccessToken;
    }()
  }]);
  return Auth;
}();

module.exports = Auth;