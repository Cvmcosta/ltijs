"use strict";

function _classPrivateMethodInitSpec(obj, privateSet) { _checkPrivateRedeclaration(obj, privateSet); privateSet.add(obj); }
function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
function _classPrivateFieldGet(s, a) { return s.get(_assertClassBrand(s, a)); }
function _classPrivateFieldSet(s, a, r) { return s.set(_assertClassBrand(s, a), r), r; }
function _assertClassBrand(e, t, n) { if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n; throw new TypeError("Private element is not present on this object"); }
/* Provider Dynamic Registration Service */
const got = require('got');
const crypto = require('crypto');
const _url = require('fast-url-parser');
const provDynamicRegistrationDebug = require('debug')('provider:dynamicRegistrationService');
const Objects = require('../../Utils/Objects');
var _name = /*#__PURE__*/new WeakMap();
var _redirectUris = /*#__PURE__*/new WeakMap();
var _customParameters = /*#__PURE__*/new WeakMap();
var _autoActivate = /*#__PURE__*/new WeakMap();
var _useDeepLinking = /*#__PURE__*/new WeakMap();
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
var _DynamicRegistration_brand = /*#__PURE__*/new WeakSet();
class DynamicRegistration {
  constructor(options, routes, registerPlatform, getPlatform, ENCRYPTIONKEY, Database) {
    // Helper method to build URLs
    _classPrivateMethodInitSpec(this, _DynamicRegistration_brand);
    _classPrivateFieldInitSpec(this, _name, void 0);
    _classPrivateFieldInitSpec(this, _redirectUris, void 0);
    _classPrivateFieldInitSpec(this, _customParameters, void 0);
    _classPrivateFieldInitSpec(this, _autoActivate, void 0);
    _classPrivateFieldInitSpec(this, _useDeepLinking, void 0);
    _classPrivateFieldInitSpec(this, _logo, void 0);
    _classPrivateFieldInitSpec(this, _description, void 0);
    _classPrivateFieldInitSpec(this, _hostname, void 0);
    _classPrivateFieldInitSpec(this, _appUrl, void 0);
    _classPrivateFieldInitSpec(this, _loginUrl, void 0);
    _classPrivateFieldInitSpec(this, _keysetUrl, void 0);
    _classPrivateFieldInitSpec(this, _getPlatform, void 0);
    _classPrivateFieldInitSpec(this, _registerPlatform, void 0);
    _classPrivateFieldInitSpec(this, _ENCRYPTIONKEY, '');
    _classPrivateFieldInitSpec(this, _Database, void 0);
    _classPrivateFieldSet(_name, this, options.name);
    _classPrivateFieldSet(_redirectUris, this, options.redirectUris || []);
    _classPrivateFieldSet(_customParameters, this, options.customParameters || {});
    _classPrivateFieldSet(_autoActivate, this, options.autoActivate);
    _classPrivateFieldSet(_useDeepLinking, this, options.useDeepLinking === undefined ? true : options.useDeepLinking);
    _classPrivateFieldSet(_logo, this, options.logo);
    _classPrivateFieldSet(_description, this, options.description);
    _classPrivateFieldSet(_hostname, this, _assertClassBrand(_DynamicRegistration_brand, this, _getHostname).call(this, options.url));
    _classPrivateFieldSet(_appUrl, this, _assertClassBrand(_DynamicRegistration_brand, this, _buildUrl).call(this, options.url, routes.appRoute));
    _classPrivateFieldSet(_loginUrl, this, _assertClassBrand(_DynamicRegistration_brand, this, _buildUrl).call(this, options.url, routes.loginRoute));
    _classPrivateFieldSet(_keysetUrl, this, _assertClassBrand(_DynamicRegistration_brand, this, _buildUrl).call(this, options.url, routes.keysetRoute));
    _classPrivateFieldSet(_getPlatform, this, getPlatform);
    _classPrivateFieldSet(_registerPlatform, this, registerPlatform);
    _classPrivateFieldSet(_ENCRYPTIONKEY, this, ENCRYPTIONKEY);
    _classPrivateFieldSet(_Database, this, Database);
  }
  /**
   * @description Performs dynamic registration flow.
   * @param {String} openidConfiguration - OpenID configuration URL. Retrieved from req.query.openid_configuration.
   * @param {String} [registrationToken] - Registration Token. Retrieved from req.query.registration_token.
   * @param {Object} [options] - Replacements or extensions to default registration options.
   */
  async register(openidConfiguration, registrationToken, options = {}) {
    if (!openidConfiguration) throw new Error('MISSING_OPENID_CONFIGURATION');
    provDynamicRegistrationDebug('Starting dynamic registration process');
    // Get Platform registration configurations
    const configuration = await got.get(openidConfiguration).json();
    provDynamicRegistrationDebug('Attempting to register Platform with issuer: ', configuration.issuer);
    // Building registration object
    const messages = [{
      type: 'LtiResourceLinkRequest'
    }];
    if (_classPrivateFieldGet(_useDeepLinking, this)) messages.push({
      type: 'LtiDeepLinkingRequest'
    });
    const registration = Objects.deepMergeObjects({
      application_type: 'web',
      response_types: ['id_token'],
      grant_types: ['implicit', 'client_credentials'],
      initiate_login_uri: _classPrivateFieldGet(_loginUrl, this),
      redirect_uris: [..._classPrivateFieldGet(_redirectUris, this), _classPrivateFieldGet(_appUrl, this)],
      client_name: _classPrivateFieldGet(_name, this),
      jwks_uri: _classPrivateFieldGet(_keysetUrl, this),
      logo_uri: _classPrivateFieldGet(_logo, this),
      token_endpoint_auth_method: 'private_key_jwt',
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
      'https://purl.imsglobal.org/spec/lti-tool-configuration': {
        domain: _classPrivateFieldGet(_hostname, this),
        description: _classPrivateFieldGet(_description, this),
        target_link_uri: _classPrivateFieldGet(_appUrl, this),
        custom_parameters: _classPrivateFieldGet(_customParameters, this),
        claims: configuration.claims_supported,
        messages
      }
    }, options);
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
    if (await _classPrivateFieldGet(_getPlatform, this).call(this, configuration.issuer, registrationResponse.client_id, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this))) throw new Error('PLATFORM_ALREADY_REGISTERED');
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
    const registered = await _classPrivateFieldGet(_registerPlatform, this).call(this, platform, _classPrivateFieldGet(_getPlatform, this), _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this));
    await _classPrivateFieldGet(_Database, this).Insert(false, 'platformStatus', {
      id: await registered.platformId(),
      active: _classPrivateFieldGet(_autoActivate, this)
    });

    // Returing message indicating the end of registration flow
    return '<script>(window.opener || window.parent).postMessage({subject:"org.imsglobal.lti.close"}, "*");</script>';
  }
}
function _buildUrl(url, path) {
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
}
// Helper method to get the url hostname
function _getHostname(url) {
  const pathParts = _url.parse(url);
  let hostname = pathParts.hostname;
  if (pathParts.port) hostname += ':' + pathParts.port;
  return hostname;
}
module.exports = DynamicRegistration;