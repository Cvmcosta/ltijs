// LTI 1.3 Consumer models
const mongoose = require('mongoose')
const Schema = mongoose.Schema

exports.register = () => {
  const toolSchema = new Schema({
    clientId: String,
    deploymentId: String,
    url: String,
    deepLinkingUrl: String,
    loginUrl: String,
    redirectionURIs: [String],
    name: String,
    description: String,
    authConfig: {
      method: String,
      key: String
    },
    scopes: [String],
    privacy: {
      name: Boolean,
      email: Boolean
    },
    customParameters: JSON,
    kid: String
  })
  toolSchema.index({ clientId: 1 }, { unique: true })

  const toolLinkSchema = new Schema({
    id: String,
    clientId: String,
    deploymentId: String,
    url: String,
    name: String,
    description: String,
    scopes: [String],
    privacy: {
      name: Boolean,
      email: Boolean
    },
    customParameters: JSON
  })
  toolLinkSchema.index({ id: 1 }, { unique: true })

  const keySchema = new Schema({
    kid: String,
    clientId: String,
    iv: String,
    data: String
  })
  keySchema.index({ kid: 1 }, { unique: true })

  const nonceSchema = new Schema({
    nonce: String,
    createdAt: { type: Date, expires: 10, default: Date.now }
  })
  nonceSchema.index({ nonce: 1 })

  mongoose.model('tool', toolSchema)
  mongoose.model('toollink', toolLinkSchema)
  mongoose.model('privatekey', keySchema)
  mongoose.model('publickey', keySchema)
  mongoose.model('nonce', nonceSchema)
}
