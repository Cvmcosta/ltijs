"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));
var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));
function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
/* Provider Deep Linking Service */

const jwt = require('jsonwebtoken');
const provDeepLinkingDebug = require('debug')('provider:deepLinkingService');
var _getPlatform = /*#__PURE__*/new WeakMap();
var _ENCRYPTIONKEY = /*#__PURE__*/new WeakMap();
var _Database = /*#__PURE__*/new WeakMap();
class DeepLinking {
  constructor(getPlatform, ENCRYPTIONKEY, Database) {
    _classPrivateFieldInitSpec(this, _getPlatform, {
      writable: true,
      value: null
    });
    _classPrivateFieldInitSpec(this, _ENCRYPTIONKEY, {
      writable: true,
      value: ''
    });
    _classPrivateFieldInitSpec(this, _Database, {
      writable: true,
      value: void 0
    });
    (0, _classPrivateFieldSet2.default)(this, _getPlatform, getPlatform);
    (0, _classPrivateFieldSet2.default)(this, _ENCRYPTIONKEY, ENCRYPTIONKEY);
    (0, _classPrivateFieldSet2.default)(this, _Database, Database);
  }

  /**
   * @description Creates an auto submitting form containing the DeepLinking Message.
   * @param {Object} idtoken - Idtoken for the user.
   * @param {Array} contentItems - Array of contentItems to be linked.
   * @param {Object} options - Object containing extra options that mus be sent along the content items.
   * @param {String} options.message - Message the platform may show to the end user upon return to the platform.
   * @param {String} options.errMessage - Message the platform may show to the end user upon return to the platform if some error has occurred.
   * @param {String} options.log - Message the platform may log in it's system upon return to the platform.
   * @param {String} options.errLog - Message the platform may log in it's system upon return to the platform if some error has occurred.
   */
  async createDeepLinkingForm(idtoken, contentItems, options) {
    const message = await this.createDeepLinkingMessage(idtoken, contentItems, options);

    // Creating auto submitting form
    const form = '<form id="ltijs_submit" style="display: none;" action="' + idtoken.platformContext.deepLinkingSettings.deep_link_return_url + '" method="POST">' + '<input type="hidden" name="JWT" value="' + message + '" />' + '</form>' + '<script>' + 'document.getElementById("ltijs_submit").submit()' + '</script>';
    return form;
  }

  /**
   * @description Creates a DeepLinking signed message.
   * @param {Object} idtoken - Idtoken for the user.
   * @param {Array} contentItems - Array of contentItems to be linked.
   * @param {Object} options - Object containing extra options that mus be sent along the content items.
   * @param {String} options.message - Message the platform may show to the end user upon return to the platform.
   * @param {String} options.errMessage - Message the platform may show to the end user upon return to the platform if some error has occurred.
   * @param {String} options.log - Message the platform may log in it's system upon return to the platform.
   * @param {String} options.errLog - Message the platform may log in it's system upon return to the platform if some error has occurred.
   */
  async createDeepLinkingMessage(idtoken, contentItems, options) {
    provDeepLinkingDebug('Starting deep linking process');
    if (!idtoken) {
      provDeepLinkingDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    if (!idtoken.platformContext.deepLinkingSettings) {
      provDeepLinkingDebug('DeepLinkingSettings object missing.');
      throw new Error('MISSING_DEEP_LINK_SETTINGS');
    }
    if (!contentItems) {
      provDeepLinkingDebug('No content item passed.');
      throw new Error('MISSING_CONTENT_ITEMS');
    }

    // If it's not an array, turns it into an array
    if (!Array.isArray(contentItems)) contentItems = [contentItems];

    // Gets platform
    const platform = await (0, _classPrivateFieldGet2.default)(this, _getPlatform).call(this, idtoken.iss, idtoken.clientId, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _Database));
    if (!platform) {
      provDeepLinkingDebug('Platform not found');
      throw new Error('PLATFORM_NOT_FOUND');
    }
    const platformActive = await platform.platformActive();
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
    provDeepLinkingDebug('Building basic JWT body');
    // Builds basic jwt body
    const jwtBody = {
      iss: await platform.platformClientId(),
      aud: idtoken.iss,
      nonce: encodeURIComponent([...Array(25)].map(_ => (Math.random() * 36 | 0).toString(36)).join``),
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id': idtoken.deploymentId,
      'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingResponse',
      'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0'
    };

    // Adding messaging options
    if (options) {
      if (options.message) jwtBody['https://purl.imsglobal.org/spec/lti-dl/claim/msg'] = options.message;
      if (options.errMessage || options.errmessage) jwtBody['https://purl.imsglobal.org/spec/lti-dl/claim/errormsg '] = options.errMessage || options.errmessage;
      if (options.log) jwtBody['https://purl.imsglobal.org/spec/lti-dl/claim/log'] = options.log;
      if (options.errLog || options.errlog) jwtBody['https://purl.imsglobal.org/spec/lti-dl/claim/errorlog'] = options.errLog || options.errlog;
    }

    // Adding Data claim if it exists in initial request
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
    const message = jwt.sign(jwtBody, await platform.platformPrivateKey(), {
      algorithm: 'RS256',
      expiresIn: 60,
      keyid: await platform.platformKid()
    });
    return message;
  }
}
module.exports = DeepLinking;