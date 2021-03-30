/* Handle jwk keyset generation */

// Dependencies
const Jwk = require('rasha')
const crypto = require('crypto')
const provKeysetDebug = require('debug')('global:keyset')

// Classes
const Database = require('./Database')

class Keyset {
  /**
   * @description Handles the creation of jwk keyset.
   */
  static async build () {
    provKeysetDebug('Generating JWK keyset')
    const keys = await Database.get('publickey', {}, true) || []
    const keyset = { keys: [] }
    for (const key of keys) {
      const jwk = await Jwk.import({ pem: key.key })
      jwk.kid = key.kid
      jwk.alg = 'RS256'
      jwk.use = 'sig'
      keyset.keys.push(jwk)
    }
    return keyset
  }

  /**
   * @description Generates a new RSA keypair.
   */
  static async generateKeyPair () {
    let kid = crypto.randomBytes(16).toString('hex')

    while (await Database.get('publickey', { kid: kid }, false)) {
      /* istanbul ignore next */
      kid = crypto.randomBytes(16).toString('hex')
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
    })

    return {
      ...keys,
      kid: kid
    }
  }
}

module.exports = Keyset
