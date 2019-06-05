/* Handle Requests */
const crypto = require('crypto');



class Request{
    /**
     * @description Handles the Lti 1.3 initial login flow (OIDC protocol).
     * @param {object} request - Login request object sent by consumer.
     * @param {object} platform - Platform Object.
     */
    static lti1_3Login(request, platform){
        console.log("Lti 1.3 initial login request coming from: " + request.iss + " ...")

        let response = {
          response_type: 'id_token',
          response_mode: 'form_post',
          scope: 'openid',
          client_id: platform.platformClientId(),
          redirect_uri: request.target_link_uri,
          login_hint: request.login_hint,
          nonce: crypto.randomBytes(16).toString('base64')
        }
        return response
    }
}

module.exports = Request