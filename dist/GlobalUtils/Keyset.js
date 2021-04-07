"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

/* Handle jwk keyset generation */
// Dependencies
const Jwk = require('rasha');

const crypto = require('crypto');

const provKeysetDebug = require('debug')('lti:keyset'); // Classes


const Database = require('./Database');

class Keyset {
  /**
   * @description Handles the creation of jwk keyset.
   */
  static async build() {
    provKeysetDebug('Generating JWK keyset');
    const keys = (await Database.get('publickey', {}, true)) || [];
    const keyset = {
      keys: []
    };

    for (const key of keys) {
      const jwk = await Jwk.import({
        pem: key.key
      });
      jwk.kid = key.kid;
      jwk.alg = 'RS256';
      jwk.use = 'sig';
      keyset.keys.push(jwk);
    }

    return keyset;
  }
  /**
   * @description Generates a new RSA keypair.
   */


  static async generateKeyPair() {
    let kid = crypto.randomBytes(16).toString('hex');

    while (await Database.get('publickey', {
      kid: kid
    }, false)) {
      /* istanbul ignore next */
      kid = crypto.randomBytes(16).toString('hex');
    }

    const keys = crypto.generateKeyPairSync('rsa', {
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
    return _objectSpread(_objectSpread({}, keys), {}, {
      kid: kid
    });
  }

}

module.exports = Keyset;