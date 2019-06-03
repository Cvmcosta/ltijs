/* Handle Requests */
const crypto = require('crypto');
const axios  = require('axios')


class Request{
    /**
     * @description Handles the Lti 1.3 initial login flow (OIDC protocol).
     * @param {object} request - Login request object sent by consumer.
     * @param {object} [client_id = LTITool] - Client_id of the Tool
     */
    static lti1_3Login(request, client_id){
        console.log(request)
        console.log("Lti 1.3 initial login request coming from: " + request.iss + " ...")

        let response = {
          response_type: 'id_token',
          response_mode: 'form_post',
          scope: 'openid',
          client_id: '1W8pk8LRuvB1DtO',
          redirect_uri: 'http://127.0.0.1:3000/',
          login_hint: request.login_hint,
          nonce: crypto.randomBytes(16).toString('base64')
        }
        return response
    }
}

module.exports = Request