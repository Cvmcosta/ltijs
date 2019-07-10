"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

// Express server
var express = require('express');

var bodyParser = require('body-parser');

var https = require('https');

var helmet = require('helmet');

var cookieParser = require('cookie-parser');

var cors = require('cors');

var Server =
/*#__PURE__*/
function () {
  function Server(https, ssl, ENCRYPTIONKEY) {
    (0, _classCallCheck2["default"])(this, Server);
    this.app = express();
    this.ssl = false;
    if (https) this.ssl = ssl;
    this.app.use(helmet({
      frameguard: false
    }));
    this.app.use(cors());
    this.app.use(bodyParser.urlencoded({
      extended: false
    }));
    this.app.use(bodyParser.json());
    this.app.use(cookieParser(ENCRYPTIONKEY));
  }

  (0, _createClass2["default"])(Server, [{
    key: "listen",
    value: function listen(port, message) {
      if (this.ssl) https.createServer(this.ssl, this.app).listen(port, function () {
        return console.log(message);
      });else this.app.listen(port, function () {
        return console.log(message);
      });
    }
  }, {
    key: "setStaticPath",
    value: function setStaticPath(path) {
      this.app.use('/', express["static"](path));
    }
  }]);
  return Server;
}();

module.exports = Server;