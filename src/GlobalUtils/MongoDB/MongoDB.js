
// Dependencies
const mongoose = require('mongoose')
const crypto = require('crypto')
const provDatabaseDebug = require('debug')('lti:database')

// Models
const providerAdvantage = require('./Provider/Advantage')
const consumerAdvantage = require('./Consumer/Advantage')

/**
 * @description MongoDB database adapter.
 */
class MongoDB {
  #dbConnection = {
    useNewUrlParser: true,
    useCreateIndex: true,
    keepAlive: true,
    keepAliveInitialDelay: 300000,
    connectTimeoutMS: 300000,
    useUnifiedTopology: true
  }

  #dbUrl

  /**
   * @description Mongodb database setup
   * @param {Object} database - Configuration object
   */
  constructor (database) {
    if (!database || !database.url) throw new Error('MISSING_DATABASE_CONFIG')

    // Configuring database connection
    this.#dbUrl = database.url
    if (database.debug) mongoose.set('debug', true)

    this.#dbConnection = {
      ...this.#dbConnection,
      ...database.connection
    }
    this.db = mongoose.connection
  }

  /**
   * @description Mongodb models setup
   * @param {Object} options - Options object
   * @param {String} options.type - Server type. Can be either PROVIDER or CONSUMER.
   * @param {Boolean} options.legacy - Wheter or not the server supports legacy functionality.
   */
  setup (options) {
    // Registering Database models
    switch (options.type) {
      case 'PROVIDER':
        providerAdvantage.register()
        break
      case 'CONSUMER':
        consumerAdvantage.register()
        break
    }
  }

  /**
   * @description Connect to database
   */
  async connect () {
    this.db.on('connected', async () => {
      provDatabaseDebug('Database connected')
    })
    this.db.once('open', async () => {
      provDatabaseDebug('Database connection open')
    })
    this.db.on('error', async () => {
      mongoose.disconnect()
    })
    this.db.on('reconnected', async () => {
      provDatabaseDebug('Database reconnected')
    })
    this.db.on('disconnected', async () => {
      provDatabaseDebug('Database disconnected')
      provDatabaseDebug('Attempting to reconnect')
      setTimeout(async () => {
        if (this.db.readyState === 0) {
          try {
            await mongoose.connect(this.#dbUrl, this.#dbConnection)
          } catch (err) {
            provDatabaseDebug('Error in MongoDb connection: ' + err)
          }
        }
      }, 1000)
    })

    if (this.db.readyState === 0) await mongoose.connect(this.#dbUrl, this.#dbConnection)
    return true
  }

  /**
   * @description Closes connection to the database
   */
  async close () {
    mongoose.connection.removeAllListeners()
    await mongoose.connection.close()
    return true
  }

  /**
     * @description Get item or entire collection.
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} [query] - Query for the item you are looking for in the format {type: "type1"}.
     * @param {String} [encryptionkey] - Secret used in case of data encryption.
     */
  async get (collection, query, encryptionkey) {
    const Model = mongoose.model(collection)
    const result = await Model.find(query).select('-__v -_id')

    if (encryptionkey) {
      for (const i in result) {
        const temp = result[i]
        result[i] = JSON.parse(await this.decrypt(result[i].data, result[i].iv, encryptionkey))
        if (temp.createdAt) {
          const createdAt = Date.parse(temp.createdAt)
          result[i].createdAt = createdAt
        }
      }
    }

    if (result.length === 0) return false
    return result
  }

  /**
     * @description Insert item in database.
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} item - The item Object you want to insert in the database.
     * @param {String} [encryptionkey] - Secret used in case of data encryption.
     * @param {Object} [index] - Key that should be used as index in case of Encrypted document.
     */
  async insert (collection, item, encryptionkey, index) {
    const Model = mongoose.model(collection)
    let newDocData = item
    if (encryptionkey) {
      const encrypted = await this.encrypt(JSON.stringify(item), encryptionkey)
      newDocData = {
        ...index,
        iv: encrypted.iv,
        data: encrypted.data
      }
    }
    const newDoc = new Model(newDocData)
    await newDoc.save()
    return true
  }

  /**
   * @description Replace item in database. Creates a new document if it does not exist.
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} query - Query for the item you are looking for in the format {type: "type1"}.
   * @param {Object} item - The item Object you want to insert in the database.
   * @param {String} [encryptionkey] - Secret used in case of data encryption.
   * @param {Object} [index] - Key that should be used as index in case of Encrypted document.
   */
  async replace (collection, query, item, encryptionkey, index) {
    const Model = mongoose.model(collection)
    let newDocData = item
    if (encryptionkey) {
      const encrypted = await this.encrypt(JSON.stringify(item), encryptionkey)
      newDocData = {
        ...index,
        iv: encrypted.iv,
        data: encrypted.data
      }
    }

    await Model.replaceOne(query, newDocData, { upsert: true })
    return true
  }

  /**
     * @description Assign value to item in database
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} query - The entry you want to modify in the format {type: "type1"}.
     * @param {Object} modification - The modification you want to make in the format {type: "type2"}.
     * @param {String} [encryptionkey] - Secret used in case of data encryption.
     */
  async modify (collection, query, modification, encryptionkey) {
    const Model = mongoose.model(collection)

    let newMod = modification
    if (encryptionkey) {
      let result = await Model.findOne(query)
      if (result) {
        result = JSON.parse(await this.decrypt(result.data, result.iv, encryptionkey))
        result[Object.keys(modification)[0]] = Object.values(modification)[0]
        newMod = await this.encrypt(JSON.stringify(result), encryptionkey)
      }
    }

    await Model.updateOne(query, newMod)
    return true
  }

  /**
     * @description Delete item in database
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} query - The entry you want to delete in the format {type: "type1"}.
     */
  async delete (collection, query) {
    const Model = mongoose.model(collection)
    await Model.deleteMany(query)
    return true
  }

  /**
   * @description Encrypts data.
   * @param {String} data - Data to be encrypted
   * @param {String} encryptionkey - Secret used in the encryption
   */
  async encrypt (data, encryptionkey) {
    const hash = crypto.createHash('sha256')
    hash.update(encryptionkey)
    const key = hash.digest().slice(0, 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(data)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return { iv: iv.toString('hex'), data: encrypted.toString('hex') }
  }

  /**
   * @description Decrypts data.
   * @param {String} data - Data to be decrypted
   * @param {String} _iv - Encryption iv
   * @param {String} encryptionkey - Secret used in the encryption
   */
  async decrypt (data, _iv, encryptionkey) {
    const hash = crypto.createHash('sha256')
    hash.update(encryptionkey)
    const key = hash.digest().slice(0, 32)
    const iv = Buffer.from(_iv, 'hex')
    const encryptedText = Buffer.from(data, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  }
}

module.exports = MongoDB
