/* Handle Requests */
const crypto = require('crypto')

class Request {
  /**
     * @description Handles the Lti 1.3 initial login flow (OIDC protocol).
     * @param {object} request - Login request object sent by consumer.
     * @param {object} platform - Platform Object.
     */
  static async ltiAdvantageLogin (request, platform) {
    let response = {
      response_type: 'id_token',
      response_mode: 'form_post',
      id_token_signed_response_alg: 'RS256',
      scope: 'openid',
      client_id: await platform.platformClientId(),
      redirect_uri: request.target_link_uri,
      login_hint: request.login_hint,
      nonce: crypto.randomBytes(16).toString('base64')
    }
    return response
  }
}

module.exports = Request
