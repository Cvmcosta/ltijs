// Express server
const express = require('express')
const bodyParser = require('body-parser')
const https = require('https')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const morgan = require('morgan')
const bearerToken = require('express-bearer-token')

class Server {
  constructor (https, ssl, ENCRYPTIONKEY, logger, corsOpt) {
    this.app = express()

    this.server = false

    this.ssl = false
    if (https) this.ssl = ssl

    // Setting up Logger
    if (logger) {
      this.app.use(morgan('combined', { stream: logger.stream }))
    }

    // Setting up helmet
    this.app.use(helmet({
      frameguard: false // Disabling frameguard so that Ltijs can send resources to iframes inside LMS's
    }))

    // Controlling cors, having in mind that resources in another domain need to be explicitly allowed, and that ltijs controls origin blocking unregistered platforms
    // This block of code allows cors specifying the host instead of just returnin '*'. And then ltijs blocks requests from unregistered platforms. (Except for whitelisted routes)
    if (corsOpt === undefined || corsOpt) {
      this.app.use(cors({
        origin: (origin, callback) => {
          callback(null, true)
        },
        credentials: true
      }))
      this.app.options('*', cors())
    }
    this.app.use(bodyParser.urlencoded({ extended: false }))
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.raw())
    this.app.use(bodyParser.text())
    this.app.use(cookieParser(ENCRYPTIONKEY))
    this.app.use(bearerToken({
      bodyKey: 'ltik',
      queryKey: 'ltik',
      headerKey: 'Bearer',
      reqKey: 'token',
      cookie: false
    }))
  }

  listen (conf, message) {
    if (this.ssl) {
      this.server = https.createServer(this.ssl, this.app).listen(conf.port, () => {
        if (!conf.silent) {
          console.log('  _   _______ _____       _  _____\n' +
                      ' | | |__   __|_   _|     | |/ ____|\n' +
                      ' | |    | |    | |       | | (___  \n' +
                      ' | |    | |    | |   _   | |\\___ \\ \n' +
                      ' | |____| |   _| |_ | |__| |____) |\n' +
                      ' |______|_|  |_____(_)____/|_____/ \n\n', message)
        }
      })
    } else {
      this.server = this.app.listen(conf.port, () => {
        if (!conf.silent) {
          console.log('  _   _______ _____       _  _____\n' +
                      ' | | |__   __|_   _|     | |/ ____|\n' +
                      ' | |    | |    | |       | | (___  \n' +
                      ' | |    | |    | |   _   | |\\___ \\ \n' +
                      ' | |____| |   _| |_ | |__| |____) |\n' +
                      ' |______|_|  |_____(_)____/|_____/ \n\n', message)
        }
      })
    }
  }

  setStaticPath (path) {
    this.app.use('/', express.static(path, { index: '_' }))
  }

  close () {
    if (this.server) this.server.close()
  }
}

module.exports = Server
