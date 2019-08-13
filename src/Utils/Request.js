/* Handle Requests */
const crypto = require('crypto')

class Request {
  /**
     * @description Handles the Lti 1.3 initial login flow (OIDC protocol).
     * @param {object} request - Login request object sent by consumer.
     * @param {object} platform - Platform Object.
     */
  static async ltiAdvantageLogin (request, platform) {
    const response = {
      response_type: 'id_token',
      response_mode: 'form_post',
      id_token_signed_response_alg: 'RS256',
      scope: 'openid',
      client_id: await platform.platformClientId(),
      redirect_uri: request.target_link_uri,
      login_hint: request.login_hint,
      nonce: crypto.randomBytes(16).toString('base64'),
      prompt: 'none'
    }
    if (request.lti_message_hint) response.lti_message_hint = request.lti_message_hint
    if (request.lti_deployment_id) response.lti_deployment_id = request.lti_deployment_id

    return response
  }
}

module.exports = Request
