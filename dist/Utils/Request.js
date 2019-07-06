"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

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
    value: function () {
      var _ltiAdvantageLogin = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee(request, platform) {
        var response;
        return regeneratorRuntime.wrap(function _callee$(_context) {
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