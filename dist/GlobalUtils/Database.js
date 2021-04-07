"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));

var _encryptionkey = new WeakMap();

var _deploy = new WeakMap();

// Database adapter
class Database {
  constructor() {
    _encryptionkey.set(this, {
      writable: true,
      value: void 0
    });

    _deploy.set(this, {
      writable: true,
      value: false
    });
  }

  /**
   * @description Database models setup
   * @param {String} encryptionkey - Secret used in case of data encryption.
   * @param {Object} connector - Database connector.
   * @param {Object} options - Options object.
   * @param {String} options.type - Server type. Can be either PROVIDER or CONSUMER.
   * @param {Boolean} options.legacy - Wheter or not the server supports legacy functionality.
   */
  setup(encryptionkey, connector, options) {
    if (!options || !(options.type === 'PROVIDER' || options.type === 'CONSUMER')) throw new Error('MISSING_DATABASE_CONFIG');
    (0, _classPrivateFieldSet2.default)(this, _encryptionkey, encryptionkey);
    this.connector = connector;
    return connector.setup(options);
  }
  /**
   * @description Connect to database
   */


  async connect() {
    await this.connector.connect();
    (0, _classPrivateFieldSet2.default)(this, _deploy, true);
    return true;
  }
  /**
   * @description Closes connection to the database
   */


  async close() {
    await this.connector.close();
    (0, _classPrivateFieldSet2.default)(this, _deploy, false);
    return true;
  }
  /**
   * @description Get item or entire collection.
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} [query] - Query for the item you are looking for in the format {type: "type1"}.
   * @param {Boolean} [decrypt] - Wheter or not the data should be decrypted.
   */


  async get(collection, query, decrypt) {
    if (!(0, _classPrivateFieldGet2.default)(this, _deploy)) throw new Error('PROVIDER_NOT_DEPLOYED');
    if (!collection) throw new Error('MISSING_COLLECTION');
    let encryptionkey = false;

    if (decrypt) {
      encryptionkey = (0, _classPrivateFieldGet2.default)(this, _encryptionkey);
    }

    return this.connector.get(collection, query, encryptionkey);
  }
  /**
   * @description Insert item in database.
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} item - The item Object you want to insert in the database.
   * @param {Boolean} [encrypt] - Wheter or not the data should be encrypted.
   * @param {Object} [index] - Key that should be used as index in case of Encrypted document.
   */


  async insert(collection, item, encrypt, index) {
    if (!(0, _classPrivateFieldGet2.default)(this, _deploy)) throw new Error('PROVIDER_NOT_DEPLOYED');
    if (!collection || !item || encrypt && !index) throw new Error('MISSING_PARAMS');
    let encryptionkey = false;

    if (encrypt) {
      encryptionkey = (0, _classPrivateFieldGet2.default)(this, _encryptionkey);
    }

    return this.connector.insert(collection, item, encryptionkey, index);
  }
  /**
   * @description Replace item in database. Creates a new document if it does not exist.
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} query - Query for the item you are looking for in the format {type: "type1"}.
   * @param {Object} item - The item Object you want to insert in the database.
   * @param {Boolean} [encrypt] - Wheter or not the data should be encrypted.
   * @param {Object} [index] - Key that should be used as index in case of Encrypted document.
   */


  async replace(collection, query, item, encrypt, index) {
    if (!(0, _classPrivateFieldGet2.default)(this, _deploy)) throw new Error('PROVIDER_NOT_DEPLOYED');
    if (!collection || !item || encrypt && !index) throw new Error('MISSING_PARAMS');
    let encryptionkey = false;

    if (encrypt) {
      encryptionkey = (0, _classPrivateFieldGet2.default)(this, _encryptionkey);
    }

    return this.connector.replace(collection, query, item, encryptionkey, index);
  }
  /**
   * @description Assign value to item in database
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} query - The entry you want to modify in the format {type: "type1"}.
   * @param {Object} modification - The modification you want to make in the format {type: "type2"}.
   * @param {Boolean} [encrypt] - Wheter or not the data should be encrypted.
   */


  async modify(collection, query, modification, encrypt) {
    if (!(0, _classPrivateFieldGet2.default)(this, _deploy)) throw new Error('PROVIDER_NOT_DEPLOYED');
    if (!collection || !query || !modification) throw new Error('MISSING_PARAMS');
    let encryptionkey = false;

    if (encrypt) {
      encryptionkey = (0, _classPrivateFieldGet2.default)(this, _encryptionkey);
    }

    return this.connector.modify(collection, query, modification, encryptionkey);
  }
  /**
   * @description Delete item in database
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} query - The entry you want to delete in the format {type: "type1"}.
   */


  async delete(collection, query) {
    if (!(0, _classPrivateFieldGet2.default)(this, _deploy)) throw new Error('PROVIDER_NOT_DEPLOYED');
    if (!collection || !query) throw new Error('MISSING_PARAMS');
    return this.connector.delete(collection, query);
  }

}

module.exports = new Database();