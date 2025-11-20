"use strict";

const got = require('got');
const packageJson = require('../../package.json');

/**
 * @description Configures a defaykt HTTP client User-Agent.
 */
const httpClient = got.extend({
  headers: {
    'User-Agent': `ltijs/${packageJson.version}`
  }
});
module.exports = httpClient;