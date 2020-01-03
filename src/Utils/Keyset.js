/* Handle jwk keyset generation */
const jose = require('node-jose')
const provKeysetDebug = require('debug')('provider:keyset')

class Keyset {
  /**
     * @description Handles the creation of jwk keyset.
     */
  static async build (Database, ENCRYPTIONKEY, logger) {
    try {
      const keys = await Database.Get(ENCRYPTIONKEY, 'publickey')
      const keystore = jose.JWK.createKeyStore()
      const kids = []
      for (const key of keys) {
        await keystore.add(key.key, 'pem')
        kids.push(key.kid)
      }
      const jwks = keystore.toJSON(false)
      for (const i in jwks.keys) {
        jwks.keys[i].kid = kids[i]
        jwks.keys[i].alg = 'RS256'
        jwks.keys[i].use = 'sig'
      }
      return jwks
    } catch (err) {
      provKeysetDebug(err.message)
      if (logger) logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
      return false
    }
  }
}

module.exports = Keyset
