"use strict";

// LTI 1.3 models
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

exports.register = () => {
  const idTokenSchema = new Schema({
    iss: String,
    user: String,
    userInfo: JSON,
    platformInfo: JSON,
    clientId: String,
    platformId: String,
    deploymentId: String,
    createdAt: {
      type: Date,
      expires: 3600 * 24,
      default: Date.now
    }
  });
  idTokenSchema.index({
    iss: 1,
    clientId: 1,
    deploymentId: 1,
    user: 1
  });
  const contextTokenSchema = new Schema({
    contextId: String,
    user: String,
    roles: [String],
    path: String,
    targetLinkUri: String,
    context: JSON,
    resource: JSON,
    custom: JSON,
    launchPresentation: JSON,
    messageType: String,
    version: String,
    deepLinkingSettings: JSON,
    lis: JSON,
    endpoint: JSON,
    namesRoles: JSON,
    createdAt: {
      type: Date,
      expires: 3600 * 24,
      default: Date.now
    }
  });
  contextTokenSchema.index({
    contextId: 1,
    user: 1
  });
  const platformSchema = new Schema({
    platformUrl: String,
    platformName: String,
    clientId: String,
    authEndpoint: String,
    accesstokenEndpoint: String,
    kid: String,
    authConfig: {
      method: String,
      key: String
    }
  });
  platformSchema.index({
    platformUrl: 1
  });
  platformSchema.index({
    kid: 1
  }, {
    unique: true
  });
  platformSchema.index({
    platformUrl: 1,
    clientId: 1
  }, {
    unique: true
  });
  const platformStatusSchema = new Schema({
    id: String,
    active: {
      type: Boolean,
      default: false
    }
  });
  platformStatusSchema.index({
    id: 1
  }, {
    unique: true
  });
  const keySchema = new Schema({
    kid: String,
    platformUrl: String,
    clientId: String,
    iv: String,
    data: String
  });
  keySchema.index({
    kid: 1
  }, {
    unique: true
  });
  const accessTokenSchema = new Schema({
    platformUrl: String,
    clientId: String,
    scopes: String,
    iv: String,
    data: String,
    createdAt: {
      type: Date,
      expires: 3600,
      default: Date.now
    }
  });
  accessTokenSchema.index({
    platformUrl: 1,
    clientId: 1,
    scopes: 1
  }, {
    unique: true
  });
  const nonceSchema = new Schema({
    nonce: String,
    createdAt: {
      type: Date,
      expires: 10,
      default: Date.now
    }
  });
  nonceSchema.index({
    nonce: 1
  });
  const stateSchema = new Schema({
    state: String,
    query: JSON,
    createdAt: {
      type: Date,
      expires: 600,
      default: Date.now
    }
  });
  stateSchema.index({
    state: 1
  }, {
    unique: true
  });
  mongoose.model('idtoken', idTokenSchema);
  mongoose.model('contexttoken', contextTokenSchema);
  mongoose.model('platform', platformSchema);
  mongoose.model('platformStatus', platformStatusSchema);
  mongoose.model('privatekey', keySchema);
  mongoose.model('publickey', keySchema);
  mongoose.model('accesstoken', accessTokenSchema);
  mongoose.model('nonce', nonceSchema);
  mongoose.model('state', stateSchema);
};