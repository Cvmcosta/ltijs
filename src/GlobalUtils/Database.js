// Database adapter
class Database {
  // Encryption Key
  #encryptionkey
  // Deployment flag
  #deploy = false

  /**
   * @description Database models setup
   * @param {String} encryptionkey - Secret used in case of data encryption.
   * @param {Object} connector - Database connector.
   * @param {Object} options - Options object.
   * @param {String} options.type - Server type. Can be either PROVIDER or CONSUMER.
   * @param {Boolean} options.legacy - Wheter or not the server supports legacy functionality.
   */
  setup (encryptionkey, connector, options) {
    if (!options || !(options.type === 'PROVIDER' || options.type === 'CONSUMER')) throw new Error('MISSING_DATABASE_CONFIG')
    this.#encryptionkey = encryptionkey
    this.connector = connector
    return connector.setup(options)
  }

  /**
   * @description Connect to database
   */
  async connect () {
    await this.connector.connect()
    this.#deploy = true
    return true
  }

  /**
   * @description Closes connection to the database
   */
  async close () {
    await this.connector.close()
    this.#deploy = false
    return true
  }

  /**
   * @description Get item or entire collection.
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} [query] - Query for the item you are looking for in the format {type: "type1"}.
   * @param {String} [decrypt] - Wheter or not the data should be decrypted.
   */
  async get (collection, query, decrypt) {
    if (!this.#deploy) throw new Error('PROVIDER_NOT_DEPLOYED')
    if (!collection) throw new Error('MISSING_COLLECTION')

    let encryptionkey = false
    if (decrypt) {
      encryptionkey = this.#encryptionkey
    }

    return this.connector.get(collection, query, encryptionkey)
  }

  /**
   * @description Insert item in database.
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} item - The item Object you want to insert in the database.
   * @param {String} [encrypt] - Wheter or not the data should be encrypted.
   * @param {Object} [index] - Key that should be used as index in case of Encrypted document.
   */
  async insert (collection, item, encrypt, index) {
    if (!this.#deploy) throw new Error('PROVIDER_NOT_DEPLOYED')
    if (!collection || !item || (encrypt && !index)) throw new Error('MISSING_PARAMS')

    let encryptionkey = false
    if (encrypt) {
      encryptionkey = this.#encryptionkey
    }

    return this.connector.insert(collection, item, encryptionkey, index)
  }

  /**
   * @description Replace item in database. Creates a new document if it does not exist.
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} query - Query for the item you are looking for in the format {type: "type1"}.
   * @param {Object} item - The item Object you want to insert in the database.
   * @param {String} [encrypt] - Wheter or not the data should be encrypted.
   * @param {Object} [index] - Key that should be used as index in case of Encrypted document.
   */
  async replace (collection, query, item, encrypt, index) {
    if (!this.#deploy) throw new Error('PROVIDER_NOT_DEPLOYED')
    if (!collection || !item || (encrypt && !index)) throw new Error('MISSING_PARAMS')

    let encryptionkey = false
    if (encrypt) {
      encryptionkey = this.#encryptionkey
    }

    return this.connector.replace(collection, query, item, encryptionkey, index)
  }

  /**
   * @description Assign value to item in database
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} query - The entry you want to modify in the format {type: "type1"}.
   * @param {Object} modification - The modification you want to make in the format {type: "type2"}.
   * @param {String} [encrypt] - Wheter or not the data should be encrypted.
   */
  async modify (collection, query, modification, encrypt) {
    if (!this.#deploy) throw new Error('PROVIDER_NOT_DEPLOYED')
    if (!collection || !query || !modification) throw new Error('MISSING_PARAMS')

    let encryptionkey = false
    if (encrypt) {
      encryptionkey = this.#encryptionkey
    }

    return this.connector.modify(collection, query, modification, encryptionkey)
  }

  /**
   * @description Delete item in database
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} query - The entry you want to delete in the format {type: "type1"}.
   */
  async delete (collection, query) {
    if (!this.#deploy) throw new Error('PROVIDER_NOT_DEPLOYED')
    if (!collection || !query) throw new Error('MISSING_PARAMS')
    return this.connector.delete(collection, query)
  }
}

module.exports = new Database()
