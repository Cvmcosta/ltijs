const mongoose = require('mongoose')
const crypto = require('crypto')

/**
 * @description Collection of static methods to manipulate the database.
 */
class Database {
  /**
     * @description Get item or entire database.
     * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} [query] - Query for the item you are looking for in the format {type: "type1"}.
     */
  static async Get (ENCRYPTIONKEY, collection, query) {
    if (!collection) throw new Error('Missing collection argument.')

    let Model = mongoose.model(collection)
    let result = await Model.find(query)

    if (ENCRYPTIONKEY) {
      for (let i in result) {
        let temp = result[i]
        result[i] = JSON.parse(await this.Decrypt(result[i].data, result[i].iv, ENCRYPTIONKEY))
        if (temp.createdAt) {
          let createdAt = Date.parse(temp.createdAt)
          result[i].createdAt = createdAt
        }
      }
    }

    if (result.length === 0) return false
    return result
  }

  /**
     * @description Insert item in database.
     * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} item - The item Object you want to insert in the database.
     * @param {Object} [index] - Key that should be used as index in case of Encrypted document.
     */
  static async Insert (ENCRYPTIONKEY, collection, item, index) {
    if (!collection || !item || (ENCRYPTIONKEY && !index)) throw new Error('Missing argument.')

    let Model = mongoose.model(collection)
    let newDocData = item
    if (ENCRYPTIONKEY) {
      let encrypted = await this.Encrypt(JSON.stringify(item), ENCRYPTIONKEY)
      newDocData = {
        [Object.keys(index)[0]]: Object.values(index)[0],
        iv: encrypted.iv,
        data: encrypted.data
      }
    }
    let newDoc = new Model(newDocData)
    newDoc.save()
  }

  /**
     * @description Assign value to item in database
     * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} query - The entry you want to modify in the format {type: "type1"}.
     * @param {Object} modification - The modification you want to make in the format {type: "type2"}.
     */
  static async Modify (ENCRYPTIONKEY, collection, query, modification) {
    if (!collection || !query || !modification) throw new Error('Missing argument.')

    let Model = mongoose.model(collection)

    let newMod = modification
    if (ENCRYPTIONKEY) {
      let result = await Model.findOne(query)
      if (result) {
        result = JSON.parse(await this.Decrypt(result.data, result.iv, ENCRYPTIONKEY))
        result[Object.keys(modification)[0]] = Object.values(modification)[0]
        newMod = await this.Encrypt(JSON.stringify(result), ENCRYPTIONKEY)
      }
    }

    await Model.updateOne(query, newMod)
  }

  /**
     * @description Delete item in database
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} query - The entry you want to delete in the format {type: "type1"}.
     */
  static async Delete (collection, query) {
    if (!collection || !query) throw new Error('Missing argument.')
    let Model = mongoose.model(collection)
    await Model.deleteMany(query)
  }

  /**
   * @description Encrypts data.
   * @param {String} data - Data to be encrypted
   * @param {String} secret - Secret used in the encryption
   */
  static async Encrypt (data, secret) {
    const hash = crypto.createHash('sha256')
    hash.update(secret)
    let key = hash.digest().slice(0, 32)
    let iv = crypto.randomBytes(16)
    let cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(data)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return { iv: iv.toString('hex'), data: encrypted.toString('hex') }
  }

  /**
   * @description Decrypts data.
   * @param {String} data - Data to be decrypted
   * @param {String} _iv - Encryption iv
   * @param {String} secret - Secret used in the encryption
   */
  static async Decrypt (data, _iv, secret) {
    const hash = crypto.createHash('sha256')
    hash.update(secret)
    let key = hash.digest().slice(0, 32)
    let iv = Buffer.from(_iv, 'hex')
    let encryptedText = Buffer.from(data, 'hex')
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  }
}

module.exports = Database
