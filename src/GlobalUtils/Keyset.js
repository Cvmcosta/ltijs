/* Handle jwk keyset generation */

// Dependencies
const Jwk = require('rasha')
const provKeysetDebug = require('debug')('provider:keyset')

// Classes
const Database = require('./Database')

class Keyset {
  /**
     * @description Handles the creation of jwk keyset.
     */
  static async build () {
    provKeysetDebug('Generating JWK keyset')
    const keys = await Database.get('publickey') || []
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
}

module.exports = Keyset
