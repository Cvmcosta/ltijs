"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));

/* Provider Deep Linking Service */
const jwt = require('jsonwebtoken');

const crypto = require('crypto');

const provDeepLinkingDebug = require('debug')('provider:deepLinkingService');

class DeepLinking {
  constructor(getPlatform, ENCRYPTIONKEY, logger, Database) {
    _getPlatform.set(this, {
      writable: true,
      value: null
    });

    _ENCRYPTIONKEY.set(this, {
      writable: true,
      value: ''
    });

    _logger.set(this, {
      writable: true,
      value: void 0
    });

    _Database.set(this, {
      writable: true,
      value: void 0
    });

    (0, _classPrivateFieldSet2.default)(this, _getPlatform, getPlatform);
    (0, _classPrivateFieldSet2.default)(this, _ENCRYPTIONKEY, ENCRYPTIONKEY);
    (0, _classPrivateFieldSet2.default)(this, _logger, logger);
    (0, _classPrivateFieldSet2.default)(this, _Database, Database);
  }
  /**
   * @description Creates an auto submitting form containing the DeepLinking Message.
   * @param {Object} idtoken - Idtoken for the user
   * @param {Array} contentItems - Array of contentItems to be linked.
   * @param {Object} options - Object containing extra options that mus be sent along the content items.
   * @param {String} options.message - Message the platform may show to the end user upon return to the platform.
   * @param {String} options.errmessage - Message the platform may show to the end user upon return to the platform if some error has occurred.
   * @param {String} options.log - Message the platform may log in it's system upon return to the platform.
   * @param {String} options.errlog - Message the platform may log in it's system upon return to the platform if some error has occurred.
   */


  async createDeepLinkingForm(idtoken, contentItems, options) {
    const message = await this.createDeepLinkingMessage(idtoken, contentItems, options);
    if (!message) return false; // Creating auto submitting form

    const form = '<form id="ltijs_submit" style="display: none;" action="' + idtoken.platformContext.deepLinkingSettings.deep_link_return_url + '" method="POST">' + '<input type="hidden" name="JWT" value="' + message + '" />' + '</form>' + '<script>' + 'document.getElementById("ltijs_submit").submit()' + '</script>';
    return form;
  }
  /**
   * @description Creates a DeepLinking signed message.
   * @param {Object} idtoken - Idtoken for the user
   * @param {Array} contentItems - Array of contentItems to be linked.
   * @param {Object} options - Object containing extra options that mus be sent along the content items.
   * @param {String} options.message - Message the platform may show to the end user upon return to the platform.
   * @param {String} options.errmessage - Message the platform may show to the end user upon return to the platform if some error has occurred.
   * @param {String} options.log - Message the platform may log in it's system upon return to the platform.
   * @param {String} options.errlog - Message the platform may log in it's system upon return to the platform if some error has occurred.
   */


  async createDeepLinkingMessage(idtoken, contentItems, options) {
    provDeepLinkingDebug('Starting deep linking process');

    if (!idtoken) {
      provDeepLinkingDebug('IdToken object missing.');
      return false;
    }

    if (!idtoken.platformContext.deepLinkingSettings) {
      provDeepLinkingDebug('DeepLinkingSettings object missing.');
      return false;
    }

    if (!contentItems) {
      provDeepLinkingDebug('No content item passed.');
      return false;
    }

    try {
      // If it's not an array, turns it into an array
      if (!Array.isArray(contentItems)) contentItems = [contentItems]; // Gets platform

      const platform = await (0, _classPrivateFieldGet2.default)(this, _getPlatform).call(this, idtoken.iss, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _logger), (0, _classPrivateFieldGet2.default)(this, _Database));

      if (!platform) {
        provDeepLinkingDebug('Platform not found, returning false');
        return false;
      }

      provDeepLinkingDebug('Building basic JWT body'); // Builds basic jwt body

      const jwtBody = {
        iss: await platform.platformClientId(),
        aud: idtoken.iss,
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 60,
        nonce: crypto.randomBytes(16).toString('base64'),
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': idtoken.deploymentId,
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingResponse',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0' // Adding messaging options

      };
      if (options.message) jwtBody['https://purl.imsglobal.org/spec/lti-dl/claim/msg'] = options.message;
      if (options.errmessage) jwtBody['https://purl.imsglobal.org/spec/lti-dl/claim/errormsg '] = options.errmessage;
      if (options.log) jwtBody['https://purl.imsglobal.org/spec/lti-dl/claim/log'] = options.log;
      if (options.errlog) jwtBody['https://purl.imsglobal.org/spec/lti-dl/claim/errorlog'] = options.errlog; // Adding Data claim if it exists in initial request

      if (idtoken.platformContext.deepLinkingSettings.data) jwtBody['https://purl.imsglobal.org/spec/lti-dl/claim/data'] = idtoken.platformContext.deepLinkingSettings.data;
      provDeepLinkingDebug('Sanitizing content item array based on the platform\'s requirements:');
      const selectedContentItems = [];
      const acceptedTypes = idtoken.platformContext.deepLinkingSettings.accept_types;
      const acceptMultiple = !(idtoken.platformContext.deepLinkingSettings.accept_multiple === 'false' || idtoken.platformContext.deepLinkingSettings.accept_multiple === false);
      provDeepLinkingDebug('Accepted Types: ' + acceptedTypes);
      provDeepLinkingDebug('Accepts Mutiple: ' + acceptMultiple);
      provDeepLinkingDebug('Received content items: ');
      provDeepLinkingDebug(contentItems);

      for (const contentItem of contentItems) {
        if (!acceptedTypes.includes(contentItem.type)) continue;
        selectedContentItems.push(contentItem);
        if (!acceptMultiple) break;
      }

      provDeepLinkingDebug('Content items to be sent: ');
      provDeepLinkingDebug(selectedContentItems);
      jwtBody['https://purl.imsglobal.org/spec/lti-dl/claim/content_items'] = selectedContentItems;
      const message = jwt.sign(jwtBody, (await platform.platformPrivateKey()), {
        algorithm: 'RS256',
        keyid: await platform.platformKid()
      });
      return message;
    } catch (err) {
      provDeepLinkingDebug(err.message);
      if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
      return false;
    }
  }

}

var _getPlatform = new WeakMap();

var _ENCRYPTIONKEY = new WeakMap();

var _logger = new WeakMap();

var _Database = new WeakMap();

module.exports = DeepLinking;