"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

const mongoose = require('mongoose');

mongoose.set('useCreateIndex', true);
const Schema = mongoose.Schema;

const crypto = require('crypto');

const provDatabaseDebug = require('debug')('provider:database');
/**
 * @description Collection of static methods to manipulate the database.
 */


class Database {
  /**
   * @description Mongodb configuration setup
   * @param {Object} database - Configuration object
   */
  constructor(database) {
    _dbConnection.set(this, {
      writable: true,
      value: {}
    });

    if (!database.url) throw new Error('Missing database url configuration.'); // Starts database connection

    if (database.connection) {
      if (!database.connection.useNewUrlParser) database.connection.useNewUrlParser = true;
      if (!database.connection.autoReconnect) database.connection.autoReconnect = true;
      if (!database.connection.keepAlive) database.connection.keepAlive = true;
      if (!database.connection.keepAliveInitialDelay) database.connection.keepAliveInitialDelay = 300000;
    } else {
      database.connection = {
        useNewUrlParser: true,
        autoReconnect: true,
        keepAlive: true,
        keepAliveInitialDelay: 300000,
        connectTimeoutMS: 300000
      };
    }

    (0, _classPrivateFieldGet2.default)(this, _dbConnection).url = database.url;
    (0, _classPrivateFieldGet2.default)(this, _dbConnection).options = database.connection;
    (0, _classPrivateFieldGet2.default)(this, _dbConnection).options.useUnifiedTopology = true; // Creating database schemas

    const idTokenSchema = new Schema({
      iss: String,
      issuerCode: String,
      user: String,
      roles: [String],
      userInfo: JSON,
      platformInfo: JSON,
      lis: JSON,
      endpoint: JSON,
      namesRoles: JSON,
      createdAt: {
        type: Date,
        expires: 3600 * 24,
        default: Date.now
      }
    });
    const contextTokenSchema = new Schema({
      path: String,
      user: String,
      deploymentId: String,
      targetLinkUri: String,
      context: JSON,
      resource: JSON,
      custom: JSON,
      launchPresentation: JSON,
      messageType: String,
      version: String,
      deepLinkingSettings: JSON,
      createdAt: {
        type: Date,
        expires: 3600 * 24,
        default: Date.now
      }
    });
    const platformSchema = new Schema({
      platformUrl: {
        type: String,
        unique: true
      },
      platformName: String,
      clientId: String,
      authEndpoint: String,
      accesstokenEndpoint: String,
      kid: String,
      authConfig: {
        method: String,
        key: String
      }
    });
    const keySchema = new Schema({
      kid: String,
      iv: String,
      data: String
    });
    const accessTokenSchema = new Schema({
      platformUrl: String,
      iv: String,
      data: String,
      createdAt: {
        type: Date,
        expires: 3600,
        default: Date.now
      }
    });
    const nonceSchema = new Schema({
      nonce: String,
      createdAt: {
        type: Date,
        expires: 10,
        default: Date.now
      }
    });

    try {
      mongoose.model('idtoken', idTokenSchema);
      mongoose.model('contexttoken', contextTokenSchema);
      mongoose.model('platform', platformSchema);
      mongoose.model('privatekey', keySchema);
      mongoose.model('publickey', keySchema);
      mongoose.model('accesstoken', accessTokenSchema);
      mongoose.model('nonce', nonceSchema);
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
            await mongoose.connect((0, _classPrivateFieldGet2.default)(this, _dbConnection).url, (0, _classPrivateFieldGet2.default)(this, _dbConnection).options);
          } catch (err) {
            provDatabaseDebug('Error in MongoDb connection: ' + err);
          }
        }
      }, 1000);
    });
    if (this.db.readyState === 0) await mongoose.connect((0, _classPrivateFieldGet2.default)(this, _dbConnection).url, (0, _classPrivateFieldGet2.default)(this, _dbConnection).options);
    return true;
  } // Closes connection to the database


  async Close() {
    mongoose.connection.removeAllListeners();
    await mongoose.connection.close();
    return true;
  }
  /**
     * @description Get item or entire database.
     * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none
     * @param {String} collection - The collection to be accessed inside the database.
     * @param {Object} [query] - Query for the item you are looking for in the format {type: "type1"}.
     */


  async Get(ENCRYPTIONKEY, collection, query) {
    if (!collection) throw new Error('Missing collection argument.');
    const Model = mongoose.model(collection);
    const result = await Model.find(query);

    if (ENCRYPTIONKEY) {
      for (const i in result) {
        const temp = result[i];
        result[i] = JSON.parse((await this.Decrypt(result[i].data, result[i].iv, ENCRYPTIONKEY)));

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
    if (!collection || !item || ENCRYPTIONKEY && !index) throw new Error('Missing argument.');
    const Model = mongoose.model(collection);
    let newDocData = item;

    if (ENCRYPTIONKEY) {
      const encrypted = await this.Encrypt(JSON.stringify(item), ENCRYPTIONKEY);
      newDocData = {
        [Object.keys(index)[0]]: Object.values(index)[0],
        iv: encrypted.iv,
        data: encrypted.data
      };
    }

    const newDoc = new Model(newDocData);
    await newDoc.save();
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
    if (!collection || !query || !modification) throw new Error('Missing argument.');
    const Model = mongoose.model(collection);
    let newMod = modification;

    if (ENCRYPTIONKEY) {
      let result = await Model.findOne(query);

      if (result) {
        result = JSON.parse((await this.Decrypt(result.data, result.iv, ENCRYPTIONKEY)));
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
    if (!collection || !query) throw new Error('Missing argument.');
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

var _dbConnection = new WeakMap();

module.exports = Database;