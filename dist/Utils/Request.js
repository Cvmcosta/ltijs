"use strict";

/* Handle Requests */
class Request {
  /**
     * @description Handles the Lti 1.3 initial login flow (OIDC protocol).
     * @param {object} request - Login request object sent by consumer.
     * @param {object} platform - Platform Object.
     * @param {String} state - State parameter, used to validate the response.
     */
  static async ltiAdvantageLogin(request, platform, state, nonce) {
    const query = {
      response_type: 'id_token',
      response_mode: 'form_post',
      id_token_signed_response_alg: 'RS256',
      scope: 'openid',
      client_id: request.client_id || (await platform.platformClientId()),
      redirect_uri: request.target_link_uri,
      login_hint: request.login_hint,
      nonce: nonce,
      prompt: 'none',
      state
    };
    if (request.lti_message_hint) query.lti_message_hint = request.lti_message_hint;
    if (request.lti_deployment_id) query.lti_deployment_id = request.lti_deployment_id;
    return query;
  }
}
module.exports = Request;