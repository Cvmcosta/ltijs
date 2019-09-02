// Express server
const express = require('express')
const bodyParser = require('body-parser')
const https = require('https')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const morgan = require('morgan')

class Server {
  constructor (https, ssl, ENCRYPTIONKEY, logger) {
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
      frameguard: false // Disabling frameguard so that LTIJS can send resources to iframes inside LMS's
    }))
    this.app.use(cors())
    this.app.use(bodyParser.urlencoded({ extended: false }))
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.raw())
    this.app.use(bodyParser.text())
    this.app.use(cookieParser(ENCRYPTIONKEY))
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
