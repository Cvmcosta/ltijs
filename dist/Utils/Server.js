"use strict";

// Express server
const express = require('express');

const bodyParser = require('body-parser');

const https = require('https');

const helmet = require('helmet');

const cookieParser = require('cookie-parser');

const cors = require('cors');

const bearerToken = require('express-bearer-token');

class Server {
  constructor(https, ssl, ENCRYPTIONKEY, corsOpt, serverAddon) {
    this.app = express();
    this.server = false;
    this.ssl = false;
    if (https) this.ssl = ssl; // Setting up helmet

    this.app.use(helmet({
      frameguard: false,
      // Disabling frameguard so that Ltijs can send resources to iframes inside LMS's
      contentSecurityPolicy: false
    })); // Controlling cors, having in mind that resources in another domain need to be explicitly allowed, and that ltijs controls origin blocking unregistered platforms
    // This block of code allows cors specifying the host instead of just returnin '*'. And then ltijs blocks requests from unregistered platforms. (Except for whitelisted routes)

    if (corsOpt === undefined || corsOpt) {
      this.app.use(cors({
        origin: (origin, callback) => {
          callback(null, true);
        },
        credentials: true
      }));
      this.app.options('*', cors());
    }

    this.app.use(bodyParser.urlencoded({
      extended: false
    }));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.raw());
    this.app.use(bodyParser.text());
    this.app.use(cookieParser(ENCRYPTIONKEY));
    this.app.use(bearerToken({
      bodyKey: 'ltik',
      queryKey: 'ltik',
      headerKey: 'Bearer',
      reqKey: 'token',
      cookie: false
    })); // Executing server addon

    if (serverAddon) serverAddon(this.app);
  }

  listen(port) {
    return new Promise((resolve, reject) => {
      if (this.ssl) {
        this.server = https.createServer(this.ssl, this.app).listen(port);
      } else {
        this.server = this.app.listen(port);
      }

      this.server.on('listening', () => {
        resolve(true);
      });
      this.server.on('error', err => {
        reject(err);
      });
    });
  }

  setStaticPath(path) {
    this.app.use('/', express.static(path, {
      index: '_'
    }));
  }

  close() {
    if (this.server) this.server.close();
  }

}

module.exports = Server;