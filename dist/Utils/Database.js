"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var mongoose = require('mongoose');

var crypto = require('crypto');
/**
 * @description Collection of static methods to manipulate the database.
 */


var Database =
/*#__PURE__*/
function () {
  function Database() {
    (0, _classCallCheck2["default"])(this, Database);
  }

  (0, _createClass2["default"])(Database, null, [{
    key: "Get",

    /**
       * @description Get item or entire database.
       * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none
       * @param {String} collection - The collection to be accessed inside the database.
       * @param {Object} [query] - Query for the item you are looking for in the format {type: "type1"}.
       */
    value: function () {
      var _Get = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee(ENCRYPTIONKEY, collection, query) {
        var Model, result, i, temp, createdAt;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (collection) {
                  _context.next = 2;
                  break;
                }

                throw new Error('Missing collection argument.');

              case 2:
                Model = mongoose.model(collection);
                _context.next = 5;
                return Model.find(query);

              case 5:
                result = _context.sent;

                if (!ENCRYPTIONKEY) {
                  _context.next = 19;
                  break;
                }

                _context.t0 = _regenerator["default"].keys(result);

              case 8:
                if ((_context.t1 = _context.t0()).done) {
                  _context.next = 19;
                  break;
                }

                i = _context.t1.value;
                temp = result[i];
                _context.t2 = JSON;
                _context.next = 14;
                return this.Decrypt(result[i].data, result[i].iv, ENCRYPTIONKEY);

              case 14:
                _context.t3 = _context.sent;
                result[i] = _context.t2.parse.call(_context.t2, _context.t3);

                if (temp.createdAt) {
                  createdAt = Date.parse(temp.createdAt);
                  result[i].createdAt = createdAt;
                }

                _context.next = 8;
                break;

              case 19:
                if (!(result.length === 0)) {
                  _context.next = 21;
                  break;
                }

                return _context.abrupt("return", false);

              case 21:
                return _context.abrupt("return", result);

              case 22:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function Get(_x, _x2, _x3) {
        return _Get.apply(this, arguments);
      }

      return Get;
    }()
    /**
       * @description Insert item in database.
       * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
       * @param {String} collection - The collection to be accessed inside the database.
       * @param {Object} item - The item Object you want to insert in the database.
       * @param {Object} [index] - Key that should be used as index in case of Encrypted document.
       */

  }, {
    key: "Insert",
    value: function () {
      var _Insert = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee2(ENCRYPTIONKEY, collection, item, index) {
        var Model, newDocData, _newDocData, encrypted, newDoc;

        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(!collection || !item || ENCRYPTIONKEY && !index)) {
                  _context2.next = 2;
                  break;
                }

                throw new Error('Missing argument.');

              case 2:
                Model = mongoose.model(collection);
                newDocData = item;

                if (!ENCRYPTIONKEY) {
                  _context2.next = 9;
                  break;
                }

                _context2.next = 7;
                return this.Encrypt(JSON.stringify(item), ENCRYPTIONKEY);

              case 7:
                encrypted = _context2.sent;
                newDocData = (_newDocData = {}, (0, _defineProperty2["default"])(_newDocData, Object.keys(index)[0], Object.values(index)[0]), (0, _defineProperty2["default"])(_newDocData, "iv", encrypted.iv), (0, _defineProperty2["default"])(_newDocData, "data", encrypted.data), _newDocData);

              case 9:
                newDoc = new Model(newDocData);
                _context2.next = 12;
                return newDoc.save();

              case 12:
                return _context2.abrupt("return", true);

              case 13:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function Insert(_x4, _x5, _x6, _x7) {
        return _Insert.apply(this, arguments);
      }

      return Insert;
    }()
    /**
       * @description Assign value to item in database
       * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
       * @param {String} collection - The collection to be accessed inside the database.
       * @param {Object} query - The entry you want to modify in the format {type: "type1"}.
       * @param {Object} modification - The modification you want to make in the format {type: "type2"}.
       */

  }, {
    key: "Modify",
    value: function () {
      var _Modify = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee3(ENCRYPTIONKEY, collection, query, modification) {
        var Model, newMod, result;
        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!(!collection || !query || !modification)) {
                  _context3.next = 2;
                  break;
                }

                throw new Error('Missing argument.');

              case 2:
                Model = mongoose.model(collection);
                newMod = modification;

                if (!ENCRYPTIONKEY) {
                  _context3.next = 18;
                  break;
                }

                _context3.next = 7;
                return Model.findOne(query);

              case 7:
                result = _context3.sent;

                if (!result) {
                  _context3.next = 18;
                  break;
                }

                _context3.t0 = JSON;
                _context3.next = 12;
                return this.Decrypt(result.data, result.iv, ENCRYPTIONKEY);

              case 12:
                _context3.t1 = _context3.sent;
                result = _context3.t0.parse.call(_context3.t0, _context3.t1);
                result[Object.keys(modification)[0]] = Object.values(modification)[0];
                _context3.next = 17;
                return this.Encrypt(JSON.stringify(result), ENCRYPTIONKEY);

              case 17:
                newMod = _context3.sent;

              case 18:
                _context3.next = 20;
                return Model.updateOne(query, newMod);

              case 20:
                return _context3.abrupt("return", true);

              case 21:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function Modify(_x8, _x9, _x10, _x11) {
        return _Modify.apply(this, arguments);
      }

      return Modify;
    }()
    /**
       * @description Delete item in database
       * @param {String} collection - The collection to be accessed inside the database.
       * @param {Object} query - The entry you want to delete in the format {type: "type1"}.
       */

  }, {
    key: "Delete",
    value: function () {
      var _Delete = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee4(collection, query) {
        var Model;
        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (!(!collection || !query)) {
                  _context4.next = 2;
                  break;
                }

                throw new Error('Missing argument.');

              case 2:
                Model = mongoose.model(collection);
                _context4.next = 5;
                return Model.deleteMany(query);

              case 5:
                return _context4.abrupt("return", true);

              case 6:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));

      function Delete(_x12, _x13) {
        return _Delete.apply(this, arguments);
      }

      return Delete;
    }()
    /**
     * @description Encrypts data.
     * @param {String} data - Data to be encrypted
     * @param {String} secret - Secret used in the encryption
     */

  }, {
    key: "Encrypt",
    value: function () {
      var _Encrypt = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee5(data, secret) {
        var hash, key, iv, cipher, encrypted;
        return _regenerator["default"].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                hash = crypto.createHash('sha256');
                hash.update(secret);
                key = hash.digest().slice(0, 32);
                iv = crypto.randomBytes(16);
                cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
                encrypted = cipher.update(data);
                encrypted = Buffer.concat([encrypted, cipher["final"]()]);
                return _context5.abrupt("return", {
                  iv: iv.toString('hex'),
                  data: encrypted.toString('hex')
                });

              case 8:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5);
      }));

      function Encrypt(_x14, _x15) {
        return _Encrypt.apply(this, arguments);
      }

      return Encrypt;
    }()
    /**
     * @description Decrypts data.
     * @param {String} data - Data to be decrypted
     * @param {String} _iv - Encryption iv
     * @param {String} secret - Secret used in the encryption
     */

  }, {
    key: "Decrypt",
    value: function () {
      var _Decrypt = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee6(data, _iv, secret) {
        var hash, key, iv, encryptedText, decipher, decrypted;
        return _regenerator["default"].wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                hash = crypto.createHash('sha256');
                hash.update(secret);
                key = hash.digest().slice(0, 32);
                iv = Buffer.from(_iv, 'hex');
                encryptedText = Buffer.from(data, 'hex');
                decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
                decrypted = decipher.update(encryptedText);
                decrypted = Buffer.concat([decrypted, decipher["final"]()]);
                return _context6.abrupt("return", decrypted.toString());

              case 9:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6);
      }));

      function Decrypt(_x16, _x17, _x18) {
        return _Decrypt.apply(this, arguments);
      }

      return Decrypt;
    }()
  }]);
  return Database;
}();

module.exports = Database;