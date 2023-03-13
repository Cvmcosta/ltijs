"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));
var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));
function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
/* Provider Dynamic Registration Service */
const got = require('got');
const crypto = require('crypto');
const _url = require('fast-url-parser');
const provDynamicRegistrationDebug = require('debug')('provider:dynamicRegistrationService');

// Helper method to build URLs
const buildUrl = (url, path) => {
  if (path === '/') return url;
  const pathParts = _url.parse(url);
  const portMatch = pathParts.pathname.match(/:[0-9]*/);
  if (portMatch) {
    pathParts.port = portMatch[0].split(':')[1];
    pathParts.pathname = pathParts.pathname.split(portMatch[0]).join('');
  }
  const formattedUrl = _url.format({
    protocol: pathParts.protocol,
    hostname: pathParts.hostname,
    pathname: (pathParts.pathname + path).replace('//', '/'),
    port: pathParts.port,
    auth: pathParts.auth,
    hash: pathParts.hash,
    search: pathParts.search
  });
  return formattedUrl;
};

// Helper method to get the url hostname
const getHostname = url => {
  const pathParts = _url.parse(url);
  let hostname = pathParts.hostname;
  if (pathParts.port) hostname += ':' + pathParts.port;
  return hostname;
};
var _name = /*#__PURE__*/new WeakMap();
var _redirectUris = /*#__PURE__*/new WeakMap();
var _customParameters = /*#__PURE__*/new WeakMap();
var _autoActivate = /*#__PURE__*/new WeakMap();
var _logo = /*#__PURE__*/new WeakMap();
var _description = /*#__PURE__*/new WeakMap();
var _hostname = /*#__PURE__*/new WeakMap();
var _appUrl = /*#__PURE__*/new WeakMap();
var _loginUrl = /*#__PURE__*/new WeakMap();
var _keysetUrl = /*#__PURE__*/new WeakMap();
var _getPlatform = /*#__PURE__*/new WeakMap();
var _registerPlatform = /*#__PURE__*/new WeakMap();
var _ENCRYPTIONKEY = /*#__PURE__*/new WeakMap();
var _Database = /*#__PURE__*/new WeakMap();
class DynamicRegistration {
  constructor(options, routes, registerPlatform, getPlatform, ENCRYPTIONKEY, Database) {
    _classPrivateFieldInitSpec(this, _name, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _redirectUris, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _customParameters, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _autoActivate, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _logo, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _description, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _hostname, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _appUrl, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _loginUrl, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _keysetUrl, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _getPlatform, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _registerPlatform, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldInitSpec(this, _ENCRYPTIONKEY, {
      writable: true,
      value: ''
    });
    _classPrivateFieldInitSpec(this, _Database, {
      writable: true,
      value: void 0
    });
    (0, _classPrivateFieldSet2.default)(this, _name, options.name);
    (0, _classPrivateFieldSet2.default)(this, _redirectUris, options.redirectUris || []);
    (0, _classPrivateFieldSet2.default)(this, _customParameters, options.customParameters || {});
    (0, _classPrivateFieldSet2.default)(this, _autoActivate, options.autoActivate);
    (0, _classPrivateFieldSet2.default)(this, _logo, options.logo);
    (0, _classPrivateFieldSet2.default)(this, _description, options.description);
    (0, _classPrivateFieldSet2.default)(this, _hostname, getHostname(options.url));
    (0, _classPrivateFieldSet2.default)(this, _appUrl, buildUrl(options.url, routes.appRoute));
    (0, _classPrivateFieldSet2.default)(this, _loginUrl, buildUrl(options.url, routes.loginRoute));
    (0, _classPrivateFieldSet2.default)(this, _keysetUrl, buildUrl(options.url, routes.keysetRoute));
    (0, _classPrivateFieldSet2.default)(this, _getPlatform, getPlatform);
    (0, _classPrivateFieldSet2.default)(this, _registerPlatform, registerPlatform);
    (0, _classPrivateFieldSet2.default)(this, _ENCRYPTIONKEY, ENCRYPTIONKEY);
    (0, _classPrivateFieldSet2.default)(this, _Database, Database);
  }

  /**
   * @description Performs dynamic registration flow.
   * @param {String} openidConfiguration - OpenID configuration URL. Retrieved from req.query.openid_configuration.
   * @param {String} [registrationToken] - Registration Token. Retrieved from req.query.registration_token.
   * @param {Object} [options] - Replacements or extensions to default registration options.
   */
  async register(openidConfiguration, registrationToken, options) {
    if (!openidConfiguration) throw new Error('MISSING_OPENID_CONFIGURATION');
    provDynamicRegistrationDebug('Starting dynamic registration process');
    // Get Platform registration configurations
    const configuration = await got.get(openidConfiguration).json();
    provDynamicRegistrationDebug('Attempting to register Platform with issuer: ', configuration.issuer);
    // Building registration object
    const registration = {
      application_type: 'web',
      response_types: ['id_token'],
      grant_types: ['implicit', 'client_credentials'],
      initiate_login_uri: (0, _classPrivateFieldGet2.default)(this, _loginUrl),
      redirect_uris: [...(0, _classPrivateFieldGet2.default)(this, _redirectUris), (0, _classPrivateFieldGet2.default)(this, _appUrl)],
      client_name: (0, _classPrivateFieldGet2.default)(this, _name),
      jwks_uri: (0, _classPrivateFieldGet2.default)(this, _keysetUrl),
      logo_uri: (0, _classPrivateFieldGet2.default)(this, _logo),
      token_endpoint_auth_method: 'private_key_jwt',
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
      'https://purl.imsglobal.org/spec/lti-tool-configuration': {
        domain: (0, _classPrivateFieldGet2.default)(this, _hostname),
        description: (0, _classPrivateFieldGet2.default)(this, _description),
        target_link_uri: (0, _classPrivateFieldGet2.default)(this, _appUrl),
        custom_parameters: (0, _classPrivateFieldGet2.default)(this, _customParameters),
        claims: configuration.claims_supported,
        messages: [{
          type: 'LtiDeepLinkingRequest'
        }, {
          type: 'LtiResourceLink'
        }]
      }
    };
    provDynamicRegistrationDebug('Tool registration request:');
    provDynamicRegistrationDebug(registration);
    provDynamicRegistrationDebug('Sending Tool registration request');
    const registrationResponse = await got.post(configuration.registration_endpoint, {
      json: registration,
      headers: registrationToken ? {
        Authorization: 'Bearer ' + registrationToken
      } : undefined
    }).json();

    // Registering Platform
    const platformName = (configuration['https://purl.imsglobal.org/spec/lti-platform-configuration'] ? configuration['https://purl.imsglobal.org/spec/lti-platform-configuration'].product_family_code : 'Platform') + '_DynReg_' + crypto.randomBytes(16).toString('hex');
    if (await (0, _classPrivateFieldGet2.default)(this, _getPlatform).call(this, configuration.issuer, registrationResponse.client_id, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _Database))) throw new Error('PLATFORM_ALREADY_REGISTERED');
    provDynamicRegistrationDebug('Registering Platform');
    const platform = {
      url: configuration.issuer,
      name: platformName,
      clientId: registrationResponse.client_id,
      authenticationEndpoint: configuration.authorization_endpoint,
      accesstokenEndpoint: configuration.token_endpoint,
      authorizationServer: configuration.authorization_server || configuration.token_endpoint,
      authConfig: {
        method: 'JWK_SET',
        key: configuration.jwks_uri
      }
    };
    const registered = await (0, _classPrivateFieldGet2.default)(this, _registerPlatform).call(this, platform, (0, _classPrivateFieldGet2.default)(this, _getPlatform), (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _Database));
    await (0, _classPrivateFieldGet2.default)(this, _Database).Insert(false, 'platformStatus', {
      id: await registered.platformId(),
      active: (0, _classPrivateFieldGet2.default)(this, _autoActivate)
    });

    // Returing message indicating the end of registration flow
    return '<script>(window.opener || window.parent).postMessage({subject:"org.imsglobal.lti.close"}, "*");</script>';
  }
}
module.exports = DynamicRegistration;