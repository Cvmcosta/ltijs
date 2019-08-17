"use strict";

// Express server
const express = require('express');

const bodyParser = require('body-parser');

const https = require('https');

const helmet = require('helmet');

const cookieParser = require('cookie-parser');

const cors = require('cors');

const serverdebug = require('debug')('provider:server');

const morgan = require('morgan');

const winston = require('winston');

class Server {
  constructor(https, ssl, ENCRYPTIONKEY) {
    this.app = express();
    this.server = false;
    this.ssl = false;
    if (https) this.ssl = ssl; // Setting up Logger

    const loggerServer = winston.createLogger({
      format: winston.format.combine(winston.format.timestamp(), winston.format.prettyPrint()),
      transports: [new winston.transports.File({
        filename: 'ltijs_server.log',
        handleExceptions: true,
        json: true,
        maxsize: 5000000,
        // 5MB
        maxFiles: 2,
        colorize: false,
        tailable: true
      })],
      exitOnError: false
    });
    loggerServer.stream = {
      write: function (message, encoding) {
        loggerServer.info(message);
      }
    };
    this.app.use(morgan('combined', {
      stream: loggerServer.stream
    })); // Setting up helmet

    this.app.use(helmet({
      frameguard: false // Disabling frameguard so that LTIJS can send resources to iframes inside LMS's

    }));
    this.app.use(cors());
    this.app.use(bodyParser.urlencoded({
      extended: false
    }));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.raw());
    this.app.use(bodyParser.text());
    this.app.use(cookieParser(ENCRYPTIONKEY));
  }

  listen(port, message) {
    if (this.ssl) this.server = https.createServer(this.ssl, this.app).listen(port, () => serverdebug(message));else {
      this.server = this.app.listen(port, () => console.log('  _   _______ _____       _  _____\n' + ' | | |__   __|_   _|     | |/ ____|\n' + ' | |    | |    | |       | | (___  \n' + ' | |    | |    | |   _   | |\\___ \\ \n' + ' | |____| |   _| |_ | |__| |____) |\n' + ' |______|_|  |_____(_)____/|_____/ \n\n', message));
    }
  }

  setStaticPath(path) {
    this.app.use('/', express.static(path));
  }

  close() {
    if (this.server) this.server.close();
  }

}

module.exports = Server;