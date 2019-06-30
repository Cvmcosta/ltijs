"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/* Handle Requests */
var crypto = require('crypto');

var Request =
/*#__PURE__*/
function () {
  function Request() {
    _classCallCheck(this, Request);
  }

  _createClass(Request, null, [{
    key: "ltiAdvantageLogin",

    /**
       * @description Handles the Lti 1.3 initial login flow (OIDC protocol).
       * @param {object} request - Login request object sent by consumer.
       * @param {object} platform - Platform Object.
       */
    value: function ltiAdvantageLogin(request, platform) {
      var response = {
        response_type: 'id_token',
        response_mode: 'form_post',
        id_token_signed_response_alg: 'RS256',
        scope: 'openid',
        client_id: platform.platformClientId(),
        redirect_uri: request.target_link_uri,
        login_hint: request.login_hint,
        nonce: crypto.randomBytes(16).toString('base64')
      };
      return response;
    }
  }]);

  return Request;
}();

module.exports = Request;