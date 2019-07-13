"use strict";

// Express server
const express = require('express');

const bodyParser = require('body-parser');

const https = require('https');

const helmet = require('helmet');

const cookieParser = require('cookie-parser');

const cors = require('cors');

class Server {
  constructor(https, ssl, ENCRYPTIONKEY) {
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

  listen(port, message) {
    if (this.ssl) https.createServer(this.ssl, this.app).listen(port, () => console.log(message));else this.app.listen(port, () => console.log(message));
  }

  setStaticPath(path) {
    this.app.use('/', express.static(path));
  }

}

module.exports = Server;