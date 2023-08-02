"use strict";

// Express server
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const provAuthDebug = require('debug')('provider:auth');
class Server {
  constructor(https, ssl, ENCRYPTIONKEY, corsOpt, serverAddon) {
    this.app = express();
    this.server = false;
    this.ssl = false;
    if (https) this.ssl = ssl;

    // Handling URI decode vulnerability
    this.app.use(async (req, res, next) => {
      try {
        decodeURIComponent(req.path);
        return next();
      } catch (err) {
        return res.status(400).send({
          status: 400,
          error: 'Bad Request',
          details: {
            message: 'URIError: Failed to decode param'
          }
        });
      }
    });

    // Setting up helmet
    this.app.use(helmet({
      frameguard: false,
      // Disabling frameguard so that Ltijs can send resources to iframes inside LMS's
      contentSecurityPolicy: false
    }));

    // Controlling cors, having in mind that resources in another domain need to be explicitly allowed, and that ltijs controls origin blocking unregistered platforms
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
    this.app.use(async (req, res, next) => {
      // Creating Authorization schema LTIK-AUTH-V1
      if (req.headers && req.headers.authorization) {
        const headerParts = req.headers.authorization.split('LTIK-AUTH-V1 Token=');
        if (headerParts.length > 1) {
          provAuthDebug('Validating LTIK-AUTH-V1 Authorization schema');
          try {
            const tokenBody = headerParts[1];

            // Get ltik
            const tokenBodyParts = tokenBody.split(',');
            const ltik = tokenBodyParts[0];
            req.token = ltik;

            // Get additional Authorization headers
            const additional = tokenBody.split('Additional=');
            if (additional.length > 1) req.headers.authorization = additional[1];
          } catch (err) {
            provAuthDebug('Error validating LTIK-AUTH-V1 Authorization schema');
            provAuthDebug(err);
          }
        }
      }
      return next();
    });
    this.app.use(async (req, res, next) => {
      // Return if req.token is already defined
      if (req.token) return next();
      // Attempt to retrieve ltik from query parameters
      if (req.query && req.query.ltik) {
        req.token = req.query.ltik;
        return next();
      }
      // Attempt to retrieve ltik from body parameters
      if (req.body && req.body.ltik) {
        req.token = req.body.ltik;
        return next();
      }
      // Attempt to retrieve ltik from Bearer Authorization header
      if (req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          req.token = parts[1];
          return next();
        }
      }
      return next();
    });

    // Executing server addon
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