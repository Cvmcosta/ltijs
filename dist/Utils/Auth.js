"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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
    _classCallCheck(this, Auth);
  }

  _createClass(Auth, null, [{
    key: "generateProviderKeyPair",

    /**
       * @description Generates a new keypairfor the platform.
       * @returns {String} kid for the keypair.
       */
    value: function generateProviderKeyPair() {
      var kid = crypto.randomBytes(16).toString('hex');

      while (Database.Get(false, './provider_data', 'publickeyset', 'keys', {
        kid: kid
      })) {
        kid = crypto.randomBytes(16).toString('hex');
      }

      var keys = crypto.generateKeyPairSync('rsa', {
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
      var publicKey = keys.publicKey,
          privateKey = keys.privateKey;
      var pubkeyobj = {
        key: publicKey,
        kid: kid
      };
      var privkeyobj = {
        key: privateKey,
        kid: kid
      };
      Database.Insert(false, './provider_data', 'publickeyset', 'keys', pubkeyobj);
      Database.Insert(false, './provider_data', 'privatekeyset', 'keys', privkeyobj);
      return kid;
    }
    /**
       * @description Resolves a promisse if the token is valid following LTI 1.3 standards.
       * @param {String} token - JWT token to be verified.
       * @param {Function} getPlatform - getPlatform function to get the platform that originated the token.
       * @returns {Promise}
       */

  }, {
    key: "validateToken",
    value: function () {
      var _validateToken = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee(token, getPlatform) {
        var decodedToken, kid, alg, platform, authConfig, keysEndpoint, res, keyset, key, verified, _key, _verified, _key2, _verified2;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                decodedToken = jwt.decode(token, {
                  complete: true
                });
                kid = decodedToken.header.kid;
                alg = decodedToken.header.alg;
                provAuthDebug('Attempting to retrieve registered platform');
                platform = getPlatform(decodedToken.payload.iss);

                if (platform) {
                  _context.next = 7;
                  break;
                }

                throw new Error('NoPlatformRegistered');

              case 7:
                authConfig = platform.platformAuthConfig();
                _context.t0 = authConfig.method;
                _context.next = _context.t0 === 'JWK_SET' ? 11 : _context.t0 === 'JWK_KEY' ? 28 : _context.t0 === 'RSA_KEY' ? 36 : 44;
                break;

              case 11:
                provAuthDebug('Retrieving key from jwk_set');

                if (kid) {
                  _context.next = 14;
                  break;
                }

                throw new Error('NoKidFoundInToken');

              case 14:
                keysEndpoint = authConfig.key;
                _context.next = 17;
                return got.get(keysEndpoint);

              case 17:
                res = _context.sent;
                keyset = JSON.parse(res.body).keys;

                if (keyset) {
                  _context.next = 21;
                  break;
                }

                throw new Error('NoKeySetFound');

              case 21:
                key = jwk.jwk2pem(find(keyset, ['kid', kid]));

                if (key) {
                  _context.next = 24;
                  break;
                }

                throw new Error('NoKeyFound');

              case 24:
                _context.next = 26;
                return this.verifyToken(token, key, alg, platform);

              case 26:
                verified = _context.sent;
                return _context.abrupt("return", verified);

              case 28:
                provAuthDebug('Retrieving key from jwk_key');

                if (authConfig.key) {
                  _context.next = 31;
                  break;
                }

                throw new Error('NoKeyFound');

              case 31:
                _key = jwk.jwk2pem(authConfig.key);
                _context.next = 34;
                return this.verifyToken(token, _key, alg, platform);

              case 34:
                _verified = _context.sent;
                return _context.abrupt("return", _verified);

              case 36:
                provAuthDebug('Retrieving key from rsa_key');
                _key2 = authConfig.key;

                if (_key2) {
                  _context.next = 40;
                  break;
                }

                throw new Error('NoKeyFound');

              case 40:
                _context.next = 42;
                return this.verifyToken(token, _key2, alg, platform);

              case 42:
                _verified2 = _context.sent;
                return _context.abrupt("return", _verified2);

              case 44:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function validateToken(_x, _x2) {
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
      var _verifyToken = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2(token, key, alg, platform) {
        var decoded;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                provAuthDebug('Attempting to verify JWT with the given key');
                decoded = jwt.verify(token, key, {
                  algorithms: [alg]
                });
                _context2.next = 4;
                return this.oidcValidationSteps(decoded, platform, alg);

              case 4:
                return _context2.abrupt("return", decoded);

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function verifyToken(_x3, _x4, _x5, _x6) {
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
      var _oidcValidationSteps = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee3(token, platform, alg) {
        var aud, _alg, iat, nonce;

        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                provAuthDebug('Token signature verified');
                provAuthDebug('Initiating OIDC aditional validation steps');
                aud = this.validateAud(token, platform);
                _alg = this.validateAlg(alg);
                iat = this.validateIat(token);
                nonce = this.validateNonce(token);
                return _context3.abrupt("return", Promise.all([aud, _alg, iat, nonce]));

              case 7:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function oidcValidationSteps(_x7, _x8, _x9) {
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
      var _validateAud = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee4(token, platform) {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                provAuthDebug("Validating if aud (Audience) claim matches the value of the tool's clientId given by the platform");
                provAuthDebug('Aud claim: ' + token.aud);
                provAuthDebug("Tool's clientId: " + platform.platformClientId());

                if (token.aud.includes(platform.platformClientId())) {
                  _context4.next = 5;
                  break;
                }

                throw new Error('AudDoesNotMatchClientId');

              case 5:
                if (!Array.isArray(token.aud)) {
                  _context4.next = 9;
                  break;
                }

                provAuthDebug('More than one aud listed, searching for azp claim');

                if (!(token.azp && token.azp !== platform.platformClientId())) {
                  _context4.next = 9;
                  break;
                }

                throw new Error('AzpClaimDoesNotMatchClientId');

              case 9:
                return _context4.abrupt("return", true);

              case 10:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));

      function validateAud(_x10, _x11) {
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
      var _validateAlg = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee5(alg) {
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                provAuthDebug('Checking alg claim. Alg: ' + alg);

                if (!(alg !== 'RS256')) {
                  _context5.next = 3;
                  break;
                }

                throw new Error('NoRSA256Alg');

              case 3:
                return _context5.abrupt("return", true);

              case 4:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5);
      }));

      function validateAlg(_x12) {
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
      var _validateIat = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee6(token) {
        var curTime, timePassed;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                provAuthDebug('Checking iat claim to prevent old tokens from being passed.');
                provAuthDebug('Iat claim: ' + token.iat);
                curTime = Date.now() / 1000;
                provAuthDebug('Current_time: ' + curTime);
                timePassed = curTime - token.iat;
                provAuthDebug('Time passed: ' + timePassed);

                if (!(timePassed > 10)) {
                  _context6.next = 8;
                  break;
                }

                throw new Error('TokenTooOld');

              case 8:
                return _context6.abrupt("return", true);

              case 9:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6);
      }));

      function validateIat(_x13) {
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
      var _validateNonce = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee7(token) {
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                provAuthDebug('Validating nonce');
                provAuthDebug('Nonce: ' + token.nonce);

                if (!Database.Get(false, './provider_data', 'nonces', 'nonces', {
                  nonce: token.nonce
                })) {
                  _context7.next = 6;
                  break;
                }

                throw new Error('NonceAlreadyStored');

              case 6:
                provAuthDebug('Storing nonce');
                Database.Insert(false, './provider_data', 'nonces', 'nonces', {
                  nonce: token.nonce
                });
                this.deleteNonce(token.nonce);

              case 9:
                return _context7.abrupt("return", true);

              case 10:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function validateNonce(_x14) {
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
      var _getAccessToken = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee8(platform, ENCRYPTIONKEY) {
        var confjwt, token, message, res, access;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.prev = 0;
                confjwt = {
                  iss: platform.platformClientId(),
                  sub: platform.platformClientId(),
                  aud: [platform.platformAccessTokenEndpoint()],
                  iat: Date.now() / 1000,
                  exp: Date.now() / 1000 + 60,
                  jti: crypto.randomBytes(16).toString('base64')
                };
                token = jwt.sign(confjwt, platform.platformPrivateKey(), {
                  algorithm: 'RS256',
                  keyid: platform.platformKid()
                });
                message = {
                  grant_type: 'client_credentials',
                  client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                  client_assertion: token,
                  scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly'
                };
                provAuthDebug('Awaiting return from the platform');
                _context8.next = 7;
                return got(platform.platformAccessTokenEndpoint(), {
                  body: message,
                  form: true
                });

              case 7:
                res = _context8.sent;
                provAuthDebug('Successfully generated new access_token');
                access = JSON.parse(res.body);
                provAuthDebug('Access token: ');
                provAuthDebug(access);
                Database.Insert(ENCRYPTIONKEY, './provider_data', 'access_tokens', 'access_tokens', {
                  platformUrl: platform.platformUrl(),
                  token: access
                });
                this.deleteAccessToken(platform.platformUrl(), access.expires_in);
                return _context8.abrupt("return", access);

              case 17:
                _context8.prev = 17;
                _context8.t0 = _context8["catch"](0);
                provAuthDebug(_context8.t0);
                throw new Error(_context8.t0);

              case 21:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this, [[0, 17]]);
      }));

      function getAccessToken(_x15, _x16) {
        return _getAccessToken.apply(this, arguments);
      }

      return getAccessToken;
    }()
    /**
       * @description Starts up timer to delete nonce.
       * @param {String} nonce - Nonce.
       */

  }, {
    key: "deleteNonce",
    value: function () {
      var _deleteNonce = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee9(nonce) {
        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                setTimeout(function () {
                  Database.Delete(false, './provider_data', 'nonces', 'nonces', {
                    nonce: nonce
                  });
                  provAuthDebug('Nonce [' + nonce + '] deleted');
                  return true;
                }, 10000);

              case 1:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9);
      }));

      function deleteNonce(_x17) {
        return _deleteNonce.apply(this, arguments);
      }

      return deleteNonce;
    }()
    /**
       * @description Starts up timer to delete access token.
       * @param {String} url - Platform url.
       */

  }, {
    key: "deleteAccessToken",
    value: function () {
      var _deleteAccessToken = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee10(url, time) {
        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                setTimeout(function () {
                  Database.Delete(false, './provider_data', 'access_tokens', 'access_tokens', {
                    platformUrl: url
                  });
                  provAuthDebug('Access token for [' + url + '] expired');
                  return true;
                }, time * 1000 - 1);

              case 1:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10);
      }));

      function deleteAccessToken(_x18, _x19) {
        return _deleteAccessToken.apply(this, arguments);
      }

      return deleteAccessToken;
    }()
  }]);

  return Auth;
}();

module.exports = Auth;