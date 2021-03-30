// Dependencies
/* const Jwk = require('rasha')
const got = require('got') */
const jwt = require('jsonwebtoken')
const consAuthDebug = require('debug')('consumer:auth')

// Classes
/* const Database = require('../../../GlobalUtils/Database') */
const Tool = require('./Tool')
const ToolLink = require('./ToolLink')

// Helpers
const messageTypes = require('../../../GlobalUtils/Helpers/messageTypes')

/**
 * @description Authentication class manages RSA keys and validation and creation of tokens.
 */
class Auth {
  /**
     * @description Validates LTI 1.3 Login request
     * @param {Object} obj - Login request obj object.
     * @param {String} encryptionkey - Consumer encryption key.
     */
  static async validateLoginRequest (obj, encryptionkey) {
    consAuthDebug('Validating login request')
    consAuthDebug('Validating lti_message_hint claim')
    if (!obj.lti_message_hint) throw new Error('MISSING_LTI_MESSAGE_HINT_CLAIM')
    let messageHint
    try {
      messageHint = jwt.verify(obj.lti_message_hint, encryptionkey)
    } catch {
      throw new Error('INVALID_MESSAGE_HINT_CLAIM')
    }
    const loginRequest = {
      toolLink: messageHint.toolLink,
      resource: messageHint.resource,
      type: messageHint.type
    }

    consAuthDebug('Validating nonce claim')
    if (!obj.nonce) throw new Error('MISSING_NONCE_CLAIM')
    // Check nonce

    consAuthDebug('Validating scope claim')
    if (!obj.scope || obj.scope !== 'openid') throw new Error('INVALID_SCOPE_CLAIM')
    consAuthDebug('Validating response_type claim')
    if (!obj.response_type || obj.response_type !== 'id_token') throw new Error('INVALID_RESPONSE_TYPE_CLAIM')
    consAuthDebug('Validating response_mode claim')
    if (!obj.response_mode || obj.response_mode !== 'form_post') throw new Error('INVALID_RESPONSE_MODE_CLAIM')
    consAuthDebug('Validating prompt claim')
    if (!obj.prompt || obj.prompt !== 'none') throw new Error('INVALID_PROMPT_CLAIM')

    consAuthDebug('Validating client ID claim')
    if (!obj.client_id) throw new Error('MISSING_CLIENT_ID_CLAIM')
    const tool = await Tool.getTool(obj.client_id)
    if (!tool) throw new Error('INVALID_CLIENT_ID_CLAIM')
    loginRequest.clientId = obj.client_id

    consAuthDebug('Validating lti_deployment_id claim')
    if (!obj.lti_deployment_id) throw new Error('MISSING_LTI_DEPLOYMENT_ID_CLAIM')
    if ((await tool.deploymentId()) !== obj.lti_deployment_id) throw new Error('INVALID_LTI_DEPLOYMENT_ID_CLAIM')
    loginRequest.deploymentId = obj.lti_deployment_id

    consAuthDebug('Validating redirect_uri claim')
    if (!obj.redirect_uri) throw new Error('MISSING_REDIRECT_URI_CLAIM')
    if (!((await tool.redirectURIs()).includes(obj.redirect_uri))) throw new Error('INVALID_REDIRECT_URI_CLAIM')
    loginRequest.redirectUri = obj.redirect_uri

    consAuthDebug('Validating login_hint claim')
    if (!obj.login_hint) throw new Error('MISSING_LOGIN_HINT_CLAIM')
    loginRequest.user = obj.login_hint

    consAuthDebug('Retrieving state claim')
    if (obj.state) loginRequest.state = obj.state

    return loginRequest
  }

  /**
   * @description Creates a signed ID Token JWT.
   * @param {Object} loginRequest - Valid login request object.
   * @param {Object} _idtoken - Information used to build the ID Token.
   * @param {Object} consumer - Consumer configurations.
   */
  static async buildIdToken (loginRequest, _idtoken, consumer) {
    if (!loginRequest) throw new Error('MISSING_LOGIN_REQUEST_PARAMETER')
    if (!_idtoken) throw new Error('MISSING_IDTOKEN_PARAMETER')

    consAuthDebug('Building ID Token')
    const toolObject = await Tool.getTool(loginRequest.clientId)
    if (!toolObject) throw new Error('INVALID_CLIENT_ID_CLAIM')
    const tool = await toolObject.toolJSON()
    const idtoken = {
      iss: consumer.url,
      aud: loginRequest.clientId,
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id': loginRequest.deploymentId,
      sub: loginRequest.user,
      given_name: _idtoken.user.givenName,
      family_name: _idtoken.user.familyName,
      name: _idtoken.user.name,
      email: _idtoken.user.email,
      'https://purl.imsglobal.org/spec/lti/claim/roles': _idtoken.user.roles,
      'https://purl.imsglobal.org/spec/lti/claim/context': {
        id: _idtoken.launch.context.id,
        label: _idtoken.launch.context.label,
        title: _idtoken.launch.context.title,
        type: _idtoken.launch.context.type
      },
      'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
      nonce: encodeURIComponent([...Array(25)].map(_ => (Math.random() * 36 | 0).toString(36)).join``)
    }

    idtoken['https://purl.imsglobal.org/spec/lti/claim/message_type'] = loginRequest.type
    if (loginRequest.type === messageTypes.DEEPLINKING_LAUNCH) {
      idtoken['https://purl.imsglobal.org/spec/lti/claim/custom'] = { ...tool.customParameters }
      idtoken['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'] = {
        deep_link_return_url: consumer.url + consumer.deepLinkingResponseRoute,
        accept_types: ['ltiResourceLink'],
        accept_presentation_document_targets: ['iframe', 'window'],
        accept_multiple: false,
        auto_create: false,
        title: tool.name
      }
    } else {
      const toolLinkObject = await ToolLink.getToolLink(loginRequest.toolLink)
      if (!toolLinkObject) throw new Error('INVALID_TOOL_LINK_ID')
      const toolLink = await toolLinkObject.toolLinkJSON()
      idtoken['https://purl.imsglobal.org/spec/lti/claim/custom'] = { ...tool.customParameters, ...toolLink.customParameters }
      idtoken['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'] = toolLink.url || tool.url
      idtoken['https://purl.imsglobal.org/spec/lti/claim/resource_link'] = _idtoken.launch.resource
    }
    // Signing ID Token
    consAuthDebug('Signing ID Token')
    const token = jwt.sign(idtoken, await tool.privateKey, { algorithm: 'RS256', expiresIn: '1h', keyid: await tool.kid })
    return token
  }

  /**
   * @description Creates self-submitting form containing signed ID Token.
   * @param {Object} loginRequest - Valid login request object.
   * @param {Object} _idtoken - Information used to build the ID Token.
   * @param {Object} consumer - Consumer configurations.
   */
  static async buildIdTokenForm (loginRequest, _idtoken, consumer) {
    const idtoken = await Auth.buildIdToken(loginRequest, _idtoken, consumer)
    let form = `<form id="ltiadv_authenticate" style="display: none;" action="${loginRequest.redirectUri}" method="POST">`
    if (loginRequest.state) form += `<input type="hidden" name="state" value="${loginRequest.state}"/>`
    form += `<input type="hidden" name="id_token" value="${idtoken}"/></form><script>document.getElementById("ltiadv_authenticate").submit()</script>`
    return form
  }

  /**
   * @description Creates self-submitting form containing signed ID Token.
   * @param {Object} res - Express response object.
   * @param {Object} loginRequest - Valid login request object.
   * @param {Object} _idtoken - Information used to build the ID Token.
   * @param {Object} consumer - Consumer configurations.
   */
  static async buildIdTokenResponse (res, loginRequest, _idtoken, consumer) {
    const idtokenForm = await Auth.buildIdTokenForm(loginRequest, _idtoken, consumer)
    res.setHeader('Content-type', 'text/html')
    return res.send(idtokenForm)
  }

  /**
   * @description Generates a new access token for a Tool.
   * @param {Object} body - Access token request body.
   */
  static async generateAccessToken (body) {
  }

  /**
   * @description Generates a new access token for a given Platform.
   * @param {String} token - Access token.
   * @param {String} scope - Requested scope.
   */
  static async validateAccessToken (token, scope) {
  }
}

module.exports = Auth
