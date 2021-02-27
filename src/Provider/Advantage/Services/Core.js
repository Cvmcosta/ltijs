// Dependencies
const crypto = require('crypto')
const url = require('fast-url-parser')
const provLoginDebug = require('debug')('provider:login')
// const provLaunchDebug = require('debug')('provider:launch')

// Classes
const Database = require('../../../GlobalUtils/Database')

/**
 * @description LTI 1.3 Core service methods.
 */
class Core {
  /**
   * @description LTI 1.3 Login handler
   */
  static async login (platform, params) {
    provLoginDebug('Redirecting to platform authentication endpoint')
    // Create state parameter used to validade authentication response
    let state = encodeURIComponent(crypto.randomBytes(25).toString('hex'))

    provLoginDebug('Target Link URI: ', params.target_link_uri)
    /* istanbul ignore next */
    // Cleaning up target link uri and retrieving query parameters
    if (params.target_link_uri.includes('?')) {
      // Retrieve raw queries
      const rawQueries = new URLSearchParams('?' + params.target_link_uri.split('?')[1])
      // Check if state is unique
      while (await Database.get('state', { state: state })) state = encodeURIComponent(crypto.randomBytes(25).toString('hex'))
      provLoginDebug('Generated state: ', state)
      // Assemble queries object
      const queries = {}
      for (const [key, value] of rawQueries) { queries[key] = value }
      params.target_link_uri = params.target_link_uri.split('?')[0]
      provLoginDebug('Query parameters found: ', queries)
      provLoginDebug('Final Redirect URI: ', params.target_link_uri)
      // Store state and query parameters on database
      await this.Database.Insert(false, 'state', { state: state, query: queries })
    }

    // Build authentication request
    const query = {
      response_type: 'id_token',
      response_mode: 'form_post',
      id_token_signed_response_alg: 'RS256',
      scope: 'openid',
      client_id: params.client_id || await platform.platformClientId(),
      redirect_uri: params.target_link_uri,
      login_hint: params.login_hint,
      nonce: encodeURIComponent([...Array(25)].map(_ => (Math.random() * 36 | 0).toString(36)).join``),
      prompt: 'none',
      state: state
    }
    if (params.lti_message_hint) query.lti_message_hint = params.lti_message_hint
    if (params.lti_deployment_id) query.lti_deployment_id = params.lti_deployment_id
    provLoginDebug('Login request: ')
    provLoginDebug(query)
    return {
      target: url.format({
        pathname: await platform.platformAuthEndpoint(),
        query: query
      }),
      state: state
    }
  }
}

module.exports = Core
