// Express server
const express = require('express')
const https = require('https')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const cors = require('cors')

class Server {
  constructor (https, ssl, ENCRYPTIONKEY, corsOpt, serverAddon) {
    this.app = express()

    this.server = false

    this.ssl = false
    if (https) this.ssl = ssl

    // Handling URI decode vulnerability
    this.app.use(async (req, res, next) => {
      try {
        decodeURIComponent(req.path)
        return next()
      } catch (err) {
        return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'URIError: Failed to decode param' } })
      }
    })

    // Setting up helmet
    this.app.use(helmet({
      frameguard: false, // Disabling frameguard so that Ltijs can send resources to iframes inside LMS's
      contentSecurityPolicy: false
    }))

    // Controlling cors, having in mind that resources in another domain need to be explicitly allowed, and that ltijs controls origin blocking unregistered platforms
    // This block of code allows cors specifying the host instead of just returnin '*'. And then ltijs blocks requests from unregistered platforms. (Except for whitelisted routes)
    // Check back on CORS
    if (corsOpt === undefined || corsOpt) {
      this.app.use(cors({
        origin: (origin, callback) => {
          callback(null, true)
        },
        credentials: true
      }))
      this.app.options('*', cors())
    }
    this.app.use(express.urlencoded({ extended: false }))
    this.app.use(express.json({ type: 'application/*' }))
    this.app.use(express.raw())
    this.app.use(express.text())
    this.app.use(cookieParser(ENCRYPTIONKEY))
    // Executing server addon
    if (serverAddon) serverAddon(this.app)
  }

  listen (port) {
    return new Promise((resolve, reject) => {
      if (this.ssl) {
        this.server = https.createServer(this.ssl, this.app).listen(port)
      } else {
        this.server = this.app.listen(port)
      }
      this.server.on('listening', () => {
        resolve(true)
      })
      this.server.on('error', (err) => {
        reject(err)
      })
    })
  }

  setStaticPath (path) {
    this.app.use('/', express.static(path, { index: '_' }))
  }

  close () {
    if (this.server) this.server.close()
  }
}

module.exports = Server
