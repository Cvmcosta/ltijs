"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

/* Handle Requests */
var crypto = require('crypto');

var Request =
/*#__PURE__*/
function () {
  function Request() {
    (0, _classCallCheck2["default"])(this, Request);
  }

  (0, _createClass2["default"])(Request, null, [{
    key: "ltiAdvantageLogin",

    /**
       * @description Handles the Lti 1.3 initial login flow (OIDC protocol).
       * @param {object} request - Login request object sent by consumer.
       * @param {object} platform - Platform Object.
       */
    value: function () {
      var _ltiAdvantageLogin = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee(request, platform) {
        var response;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return platform.platformClientId();

              case 2:
                _context.t0 = _context.sent;
                _context.t1 = request.target_link_uri;
                _context.t2 = request.login_hint;
                _context.t3 = crypto.randomBytes(16).toString('base64');
                response = {
                  response_type: 'id_token',
                  response_mode: 'form_post',
                  id_token_signed_response_alg: 'RS256',
                  scope: 'openid',
                  client_id: _context.t0,
                  redirect_uri: _context.t1,
                  login_hint: _context.t2,
                  nonce: _context.t3
                };
                return _context.abrupt("return", response);

              case 8:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      function ltiAdvantageLogin(_x, _x2) {
        return _ltiAdvantageLogin.apply(this, arguments);
      }

      return ltiAdvantageLogin;
    }()
  }]);
  return Request;
}();

module.exports = Request;