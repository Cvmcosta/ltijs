"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

// Express server
var express = require('express');

var bodyParser = require('body-parser');

var https = require('https');

var helmet = require('helmet');

var cookieParser = require('cookie-parser');

var Server =
/*#__PURE__*/
function () {
  function Server(https, ssl, ENCRYPTIONKEY) {
    _classCallCheck(this, Server);

    this.app = express();
    this.ssl = false;
    if (https) this.ssl = ssl;
    this.app.use(helmet({
      frameguard: false
    }));
    this.app.use(bodyParser.urlencoded({
      extended: false
    }));
    this.app.use(bodyParser.json());
    this.app.use(cookieParser(ENCRYPTIONKEY));
  }

  _createClass(Server, [{
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
      this.app.use(express["static"](path));
    }
  }]);

  return Server;
}();

module.exports = Server;