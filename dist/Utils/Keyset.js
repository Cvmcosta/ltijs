"use strict";

/* Handle jwk keyset generation */
const Jwk = require('rasha');

const provKeysetDebug = require('debug')('provider:keyset');

class Keyset {
  /**
     * @description Handles the creation of jwk keyset.
     */
  static async build(Database, ENCRYPTIONKEY, logger) {
    try {
      const keys = await Database.Get(ENCRYPTIONKEY, 'publickey');
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
    } catch (err) {
      provKeysetDebug(err.message);
      if (logger) logger.log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
      return false;
    }
  }

}

module.exports = Keyset;