"use strict";

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
function _classPrivateFieldGet(s, a) { return s.get(_assertClassBrand(s, a)); }
function _classPrivateFieldSet(s, a, r) { return s.set(_assertClassBrand(s, a), r), r; }
function _assertClassBrand(e, t, n) { if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n; throw new TypeError("Private element is not present on this object"); }
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const crypto = require('crypto');
const provDatabaseDebug = require('debug')('provider:database');

/**
 * @description Collection of static methods to manipulate the database.
 */
var _dbUrl = /*#__PURE__*/new WeakMap();
var _dbConnection = /*#__PURE__*/new WeakMap();
var _deploy = /*#__PURE__*/new WeakMap();
class Database {
  /**
   * @description Mongodb configuration setup
   * @param {Object} database - Configuration object
   */
  constructor(database) {
    _classPrivateFieldInitSpec(this, _dbUrl, void 0);
    _classPrivateFieldInitSpec(this, _dbConnection, {
      useNewUrlParser: true,
      connectTimeoutMS: 300000,
      useUnifiedTopology: true
    });
    _classPrivateFieldInitSpec(this, _deploy, false);
    if (!database || !database.url) throw new Error('MISSING_DATABASE_CONFIG');

    // Configures database connection
    _classPrivateFieldSet(_dbUrl, this, database.url);
    if (database.debug) mongoose.set('debug', true);
    _classPrivateFieldSet(_dbConnection, this, {
      ..._classPrivateFieldGet(_dbConnection, this),
      ...database.connection
    });

    // Creating database schemas
    const idTokenSchema = new Schema({
      iss: String,
      user: String,
      userInfo: JSON,
      platformInfo: JSON,
      clientId: String,
      platformId: String,
      deploymentId: String,
      createdAt: {
        type: Date,
        expires: 3600 * 24,
        default: Date.now
      }
    });
    idTokenSchema.index({
      iss: 1,
      clientId: 1,
      deploymentId: 1,
      user: 1
    });
    const contextTokenSchema = new Schema({
      contextId: String,
      user: String,
      roles: [String],
      path: String,
      targetLinkUri: String,
      context: JSON,
      resource: JSON,
      custom: JSON,
      launchPresentation: JSON,
      messageType: String,
      version: String,
      deepLinkingSettings: JSON,
      lis: JSON,
      endpoint: JSON,
      namesRoles: JSON,
      createdAt: {
        type: Date,
        expires: 3600 * 24,
        default: Date.now
      }
    });
    contextTokenSchema.index({
      contextId: 1,
      user: 1
    });
    const platformSchema = new Schema({
      platformUrl: String,
      platformName: String,
      clientId: String,
      authEndpoint: String,
      accesstokenEndpoint: String,
      authorizationServer: String,
      kid: String,
      authConfig: {
        method: String,
        key: String
      }
    });
    platformSchema.index({
      platformUrl: 1
    });
    platformSchema.index({
      kid: 1
    }, {
      unique: true
    });
    platformSchema.index({
      platformUrl: 1,
      clientId: 1
    }, {
      unique: true
    });
    const platformStatusSchema = new Schema({
      id: String,
      active: {
        type: Boolean,
        default: false
      }
    });
    platformStatusSchema.index({
      id: 1
    }, {
      unique: true
    });
    const keySchema = new Schema({
      kid: String,
      platformUrl: String,
      clientId: String,
      iv: String,
      data: String
    });
    keySchema.index({
      kid: 1
    }, {
      unique: true
    });
    const accessTokenSchema = new Schema({
      platformUrl: String,
      clientId: String,
      scopes: String,
      iv: String,
      data: String,
      createdAt: {
        type: Date,
        expires: 3600,
        default: Date.now
      }
    });
    accessTokenSchema.index({
      platformUrl: 1,
      clientId: 1,
      scopes: 1
    }, {
      unique: true
    });
    const nonceSchema = new Schema({
      nonce: String,
      createdAt: {
        type: Date,
        expires: 10,
        default: Date.now
      }
    });
    nonceSchema.index({
      nonce: 1
    });
    const stateSchema = new Schema({
      state: String,
      query: JSON,
      createdAt: {
        type: Date,
        expires: 600,
        default: Date.now
      }
    });
    stateSchema.index({
      state: 1
    }, {
      unique: true
    });
    try {
      mongoose.model('idtoken', idTokenSchema);
      mongoose.model('contexttoken', contextTokenSchema);
      mongoose.model('platform', platformSchema);
      mongoose.model('platformStatus', platformStatusSchema);
      mongoose.model('privatekey', keySchema);
      mongoose.model('publickey', keySchema);
      mongoose.model('accesstoken', accessTokenSchema);
      mongoose.model('nonce', nonceSchema);
      mongoose.model('state', stateSchema);
    } catch (err) {
      provDatabaseDebug('Model already registered. Continuing');
    }
    this.db = mongoose.connection;
  }

  /**
   * @description Opens connection to database
   */
  async setup() {
    this.db.on('connected', async () => {
      provDatabaseDebug('Database connected');
    });
    this.db.once('open', async () => {
      provDatabaseDebug('Database connection open');
    });
    this.db.on('error', async () => {
      mongoose.disconnect();
    });
    this.db.on('reconnected', async () => {
      provDatabaseDebug('Database reconnected');
    });
    this.db.on('disconnected', async () => {
      provDatabaseDebug('Database disconnected');
      provDatabaseDebug('Attempting to reconnect');
      setTimeout(async () => {
        if (this.db.readyState === 0) {
          try {
            await mongoose.connect(_classPrivateFieldGet(_dbUrl, this), _classPrivateFieldGet(_dbConnection, this));
          } catch (err) {
            provDatabaseDebug('Error in MongoDb connection: ' + err);
          }
        }
      }, 1000);
    });
    if (this.db.readyState === 0) await mongoose.connect(_classPrivateFieldGet(_dbUrl, this), _classPrivateFieldGet(_dbConnection, this));
    _classPrivateFieldSet(_deploy, this, true);
    return true;
  }

  // Closes connection to the database
  async Close() {
    mongoose.connection.removeAllListeners();
    await mongoose.connection.close();
    _classPrivateFieldSet(_deploy, this, false);
    return true;
  }

  /**
     * @description Get item or entire database.
     * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} [query] - Query for the item you are looking for in the format {type: "type1"}.
     */
  async Get(ENCRYPTIONKEY, collection, query) {
    if (!_classPrivateFieldGet(_deploy, this)) throw new Error('PROVIDER_NOT_DEPLOYED');
    if (!collection) throw new Error('MISSING_COLLECTION');
    const Model = mongoose.model(collection);
    const result = await Model.find(query).select('-__v -_id');
    if (ENCRYPTIONKEY) {
      for (const i in result) {
        const temp = result[i];
        result[i] = JSON.parse(await this.Decrypt(result[i].data, result[i].iv, ENCRYPTIONKEY));
        if (temp.createdAt) {
          const createdAt = Date.parse(temp.createdAt);
          result[i].createdAt = createdAt;
        }
      }
    }
    if (result.length === 0) return false;
    return result;
  }

  /**
     * @description Insert item in database.
     * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} item - The item Object you want to insert in the database.
     * @param {Object} [index] - Key that should be used as index in case of Encrypted document.
     */
  async Insert(ENCRYPTIONKEY, collection, item, index) {
    if (!_classPrivateFieldGet(_deploy, this)) throw new Error('PROVIDER_NOT_DEPLOYED');
    if (!collection || !item || ENCRYPTIONKEY && !index) throw new Error('MISSING_PARAMS');
    const Model = mongoose.model(collection);
    let newDocData = item;
    if (ENCRYPTIONKEY) {
      const encrypted = await this.Encrypt(JSON.stringify(item), ENCRYPTIONKEY);
      newDocData = {
        ...index,
        iv: encrypted.iv,
        data: encrypted.data
      };
    }
    const newDoc = new Model(newDocData);
    await newDoc.save();
    return true;
  }

  /**
   * @description Replace item in database. Creates a new document if it does not exist.
   * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} query - Query for the item you are looking for in the format {type: "type1"}.
   * @param {Object} item - The item Object you want to insert in the database.
   * @param {Object} [index] - Key that should be used as index in case of Encrypted document.
   */
  async Replace(ENCRYPTIONKEY, collection, query, item, index) {
    if (!_classPrivateFieldGet(_deploy, this)) throw new Error('PROVIDER_NOT_DEPLOYED');
    if (!collection || !item || ENCRYPTIONKEY && !index) throw new Error('MISSING_PARAMS');
    const Model = mongoose.model(collection);
    let newDocData = item;
    if (ENCRYPTIONKEY) {
      const encrypted = await this.Encrypt(JSON.stringify(item), ENCRYPTIONKEY);
      newDocData = {
        ...index,
        iv: encrypted.iv,
        data: encrypted.data
      };
    }
    await Model.replaceOne(query, newDocData, {
      upsert: true
    });
    return true;
  }

  /**
     * @description Assign value to item in database
     * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} query - The entry you want to modify in the format {type: "type1"}.
     * @param {Object} modification - The modification you want to make in the format {type: "type2"}.
     */
  async Modify(ENCRYPTIONKEY, collection, query, modification) {
    if (!_classPrivateFieldGet(_deploy, this)) throw new Error('PROVIDER_NOT_DEPLOYED');
    if (!collection || !query || !modification) throw new Error('MISSING_PARAMS');
    const Model = mongoose.model(collection);
    let newMod = modification;
    if (ENCRYPTIONKEY) {
      let result = await Model.findOne(query);
      if (result) {
        result = JSON.parse(await this.Decrypt(result.data, result.iv, ENCRYPTIONKEY));
        result[Object.keys(modification)[0]] = Object.values(modification)[0];
        newMod = await this.Encrypt(JSON.stringify(result), ENCRYPTIONKEY);
      }
    }
    await Model.updateOne(query, newMod);
    return true;
  }

  /**
     * @description Delete item in database
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} query - The entry you want to delete in the format {type: "type1"}.
     */
  async Delete(collection, query) {
    if (!_classPrivateFieldGet(_deploy, this)) throw new Error('PROVIDER_NOT_DEPLOYED');
    if (!collection || !query) throw new Error('MISSING_PARAMS');
    const Model = mongoose.model(collection);
    await Model.deleteMany(query);
    return true;
  }

  /**
   * @description Encrypts data.
   * @param {String} data - Data to be encrypted
   * @param {String} secret - Secret used in the encryption
   */
  async Encrypt(data, secret) {
    const hash = crypto.createHash('sha256');
    hash.update(secret);
    const key = hash.digest().slice(0, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return {
      iv: iv.toString('hex'),
      data: encrypted.toString('hex')
    };
  }

  /**
   * @description Decrypts data.
   * @param {String} data - Data to be decrypted
   * @param {String} _iv - Encryption iv
   * @param {String} secret - Secret used in the encryption
   */
  async Decrypt(data, _iv, secret) {
    const hash = crypto.createHash('sha256');
    hash.update(secret);
    const key = hash.digest().slice(0, 32);
    const iv = Buffer.from(_iv, 'hex');
    const encryptedText = Buffer.from(data, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}
module.exports = Database;