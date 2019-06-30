"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var low = require('lowdb');

var FileSync = require('lowdb/adapters/FileSync');

var Cryptr = require('cryptr');

var fs = require('fs');
/**
 * @description Set of static classes to manipulate the database
 */


var Database =
/*#__PURE__*/
function () {
  function Database() {
    _classCallCheck(this, Database);
  }

  _createClass(Database, null, [{
    key: "Get",

    /**
       * @description Get item or entire database.
       * @param {string} ENCRYPTIONKEY - Encryptionkey of the database, false if none
       * @param {String} path - Path of database to be accessed.
       * @param {String} database - Database name.
       * @param {string} set - The set to be accessed inside the database.
       * @param {object} [query] - Query for the item you are looking for in the format {type: "type1"}.
       */
    value: function Get(ENCRYPTIONKEY, path, database, set, query) {
      var cryptr;
      var adapter;
      var db;
      var result;
      if (!path || !database || !set) throw new Error('Missing argument.');
      if (!fs.existsSync(path)) fs.mkdirSync(path);

      if (ENCRYPTIONKEY) {
        cryptr = new Cryptr(ENCRYPTIONKEY);
        adapter = new FileSync(path + '/' + database + '.json', {
          serialize: function serialize(data) {
            return cryptr.encrypt(JSON.stringify(data));
          },
          deserialize: function deserialize(data) {
            return JSON.parse(cryptr.decrypt(data));
          }
        });
      } else {
        adapter = new FileSync(path + '/' + database + '.json');
      }

      db = low(adapter);
      if (!db.get(set).value()) return false;

      if (query) {
        result = db.get(set).find(query).value();
      } else {
        result = db.get(set).value();
      }

      if (result) return result;
      return false;
    }
    /**
       * @description Insert item in database.
       * @param {string} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
       * @param {string} path - Path of database to be accessed.
       * @param {string} database - Database name.
       * @param {string} set - The set to be accessed inside the database.
       * @param {object} item - The item object you want to insert in the database.
       */

  }, {
    key: "Insert",
    value: function Insert(ENCRYPTIONKEY, path, database, set, item) {
      var cryptr;
      var adapter;
      var db;
      if (!path || !database || !set || !item) throw new Error('Missing argument.');
      if (!fs.existsSync(path)) fs.mkdirSync(path);

      if (ENCRYPTIONKEY) {
        cryptr = new Cryptr(ENCRYPTIONKEY);
        adapter = new FileSync(path + '/' + database + '.json', {
          serialize: function serialize(data) {
            return cryptr.encrypt(JSON.stringify(data));
          },
          deserialize: function deserialize(data) {
            return JSON.parse(cryptr.decrypt(data));
          }
        });
      } else {
        adapter = new FileSync(path + '/' + database + '.json');
      }

      db = low(adapter);
      db.defaults(_defineProperty({}, set, [])).write();
      db.get(set).push(item).write();
      return true;
    }
    /**
       * @description Assign value to item in database
       * @param {string} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
       * @param {string} path - Path of database to be accessed.
       * @param {string} database - Database name.
       * @param {string} set - The set to be accessed inside the database.
       * @param {object} query - The entry you want to modify in the format {type: "type1"}.
       * @param {object} modification - The modification you want to make in the format {type: "type2"}.
       */

  }, {
    key: "Modify",
    value: function Modify(ENCRYPTIONKEY, path, database, set, query, modification) {
      var cryptr;
      var adapter;
      var db;
      if (!path || !database || !set || !query || !modification) throw new Error('Missing argument.');
      if (!fs.existsSync(path)) fs.mkdirSync(path);

      if (ENCRYPTIONKEY) {
        cryptr = new Cryptr(ENCRYPTIONKEY);
        adapter = new FileSync(path + '/' + database + '.json', {
          serialize: function serialize(data) {
            return cryptr.encrypt(JSON.stringify(data));
          },
          deserialize: function deserialize(data) {
            return JSON.parse(cryptr.decrypt(data));
          }
        });
      } else {
        adapter = new FileSync(path + '/' + database + '.json');
      }

      db = low(adapter);
      if (!db.get(set).value()) return false;
      db.get(set).find(query).assign(modification).write();
      return true;
    }
    /**
       * @description Delete item in database
       * @param {string} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
       * @param {string} path - Path of database to be accessed.
       * @param {string} database - Database name.
       * @param {string} set - The set to be accessed inside the database.
       * @param {object} query - The entry you want to delete in the format {type: "type1"}.
       */

  }, {
    key: "Delete",
    value: function Delete(ENCRYPTIONKEY, path, database, set, query) {
      var cryptr;
      var adapter;
      var db;
      if (!path || !database || !set || !query) throw new Error('Missing argument.');
      if (!fs.existsSync(path)) fs.mkdirSync(path);

      if (ENCRYPTIONKEY) {
        cryptr = new Cryptr(ENCRYPTIONKEY);
        adapter = new FileSync(path + '/' + database + '.json', {
          serialize: function serialize(data) {
            return cryptr.encrypt(JSON.stringify(data));
          },
          deserialize: function deserialize(data) {
            return JSON.parse(cryptr.decrypt(data));
          }
        });
      } else {
        adapter = new FileSync(path + '/' + database + '.json');
      }

      db = low(adapter);
      if (!db.get(set).value()) return false;
      db.get(set).remove(query).write();
      return true;
    }
  }]);

  return Database;
}();

module.exports = Database;