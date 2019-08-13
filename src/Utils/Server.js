// Express server
const express = require('express')
const bodyParser = require('body-parser')
const https = require('https')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const serverdebug = require('debug')('provider:server')

class Server {
  constructor (https, ssl, ENCRYPTIONKEY) {
    this.app = express()

    this.server = false

    this.ssl = false
    if (https) this.ssl = ssl

    this.app.use(helmet({
      frameguard: false
    }))
    this.app.use(cors())
    this.app.use(bodyParser.urlencoded({ extended: false }))
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.raw())
    this.app.use(bodyParser.text())
    this.app.use(cookieParser(ENCRYPTIONKEY))
  }

  listen (port, message) {
    if (this.ssl) this.server = https.createServer(this.ssl, this.app).listen(port, () => serverdebug(message))
    else {
      this.server = this.app.listen(port, () => console.log('  _   _______ _____       _  _____\n' +
                                                            ' | | |__   __|_   _|     | |/ ____|\n' +
                                                            ' | |    | |    | |       | | (___  \n' +
                                                            ' | |    | |    | |   _   | |\\___ \\ \n' +
                                                            ' | |____| |   _| |_ | |__| |____) |\n' +
                                                            ' |______|_|  |_____(_)____/|_____/ \n\n', message))
    }
  }

  setStaticPath (path) {
    this.app.use('/', express.static(path))
  }

  close () {
    if (this.server) this.server.close()
  }
}

module.exports = Server
