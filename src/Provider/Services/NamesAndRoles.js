/* Names and Roles Provisioning Service */

const got = require('got')
const provNamesAndRolesServiceDebug = require('debug')('provider:namesAndRolesService')

class NamesAndRoles {
  #getPlatform = null

  #ENCRYPTIONKEY = ''

  #logger

  #Database

  constructor (getPlatform, ENCRYPTIONKEY, logger, Database) {
    this.#getPlatform = getPlatform
    this.#ENCRYPTIONKEY = ENCRYPTIONKEY
    this.#logger = logger
    this.#Database = Database
  }
}

module.exports = NamesAndRoles
