// Dependencies
const consToolDebug = require('debug')('consumer:tool')
const { v4: uuidv4 } = require('uuid')

// Classes
const Database = require('../../../GlobalUtils/Database')
const Keyset = require('../../../GlobalUtils/Keyset')
const Auth = require('./Auth')

// Helpers
const validScopes = require('../../../GlobalUtils/Helpers/scopes')

/**
 * @description Class representing a registered tool.
 */
class Tool {
  
  #clientId

  #deploymentId
  
  #url
  
  #deepLinkingUrl

  #loginUrl
  
  #redirectionURIs
  
  #name
  
  #description
  
  #authConfig

  #scopes = []

  #privacy
  
  #customParameters = {}
  
  #kid

  /**
   * @param {string} clientId - Tool Client Id.
   * @param {string} deploymentId - Tool deployment Id.
   * @param {string} url - Tool url.
   * @param {string} deepLinkingUrl - Tool deep linking url.
   * @param {string} loginUrl - Tool login url.
   * @param {string} redirectionURIs - Tool redirection URIs.
   * @param {string} name - Tool name.
   * @param {string} description - Tool description.
   * @param {Object} authConfig - Authentication configurations for the tool.
   * @param {Array<String>} scopes - Scopes allowed for the tool.
   * @param {Object} privacy - Privacy configuration.
   * @param {Object} customParameters - Globally set custom parameters.
   * @param {string} kid - Key id for local keypair used to sign messages to this tool.
  */
  constructor (clientId, deploymentId, url, deepLinkingUrl, loginUrl, redirectionURIs, name, description, authConfig, scopes, privacy, customParameters, kid) {
    this.#clientId = clientId
    this.#deploymentId = deploymentId
    this.#url = url
    this.#deepLinkingUrl = deepLinkingUrl
    this.#loginUrl = loginUrl
    this.#redirectionURIs = redirectionURIs
    this.#name = name
    this.#description = description
    this.#authConfig = authConfig
    this.#scopes = scopes
    this.#privacy = privacy
    this.#customParameters = customParameters
    this.#kid = kid
  }

  // Static methods
  /**
   * @description Gets a registered Tool.
   * @param {String} clientId - Tool Client ID.
   * @returns {Promise<Tool | false>}
   */
  static async getTool (clientId) {
    if (!url) throw new Error('MISSING_CLIENT_ID_PARAMETER')
    const result = await Database.get('tool', { clientId: clientId })
    if (!result) return false
    const _tool = result[0]
    const tool = new Tool(clientId, _tool.deploymentId, _tool.url, _tool.deepLinkingUrl, _tool.loginUrl, _tool.redirectionURIs, _tool.name, _tool.description, _tool.authConfig, _tool.scopes, _tool.privacy, _tool.customParameters, _tool.kid)
    return tool
  }


  /**
   * @description Gets all tools.
   * @returns {Promise<Array<Tool>>}
   */
  static async getAllTools () {
    const result = []
    const tools = await Database.get('tool')
    if (tools) {
      for (const _tool of tools) result.push(new Tool(clientId, _tool.deploymentId, _tool.url, _tool.deepLinkingUrl, _tool.loginUrl, _tool.redirectionURIs, _tool.name, _tool.description, _tool.authConfig, _tool.scopes, _tool.privacy, _tool.customParameters, _tool.kid))
    }
    return result
  }

  /**
   * @description Registers a tool.
   * @param {Object} tool - Tool configuration object.
   * @param {string} tool.url - Tool url.
   * @param {string} tool.name - Tool name.
   * @param {string} tool.deepLinkingUrl - Tool deep linking url.
   * @param {string} tool.loginUrl - Tool login url.
   * @param {string} tool.redirectionURIs - Tool redirection URIs.
   * @param {Object} tool.authConfig - Authentication configurations for the tool.
   * @param {string} [tool.clientId] - Tool Client Id.
   * @param {string} [tool.description] - Tool description.
   * @param {Array<String>} [tool.scopes] - Scopes allowed for the tool.
   * @param {Object} [tool.privacy] - Privacy configuration.
   * @param {Object} [tool.customParameters] - Globally set custom parameters.
   * @returns {Promise<Tool>}
   */
  static async registerTool (tool) {
    if (!tool || !tool.url || !tool.name || !tool.deepLinkingUrl || !tool.loginUrl || !tool.redirectionURIs || !tool.authConfig) throw new Error('MISSING_REGISTRATION_PARAMETERS')

    if (tool.authConfig.method !== 'RSA_KEY' && tool.authConfig.method !== 'JWK_KEY' && tool.authConfig.method !== 'JWK_SET') throw new Error('INVALID_AUTHCONFIG_METHOD. Details: Valid methods are "RSA_KEY", "JWK_KEY", "JWK_SET".')
    if (!tool.authConfig.key) throw new Error('MISSING_AUTHCONFIG_KEY')

    let clientId = tool.clientId
    if (clientId) {
      const tool = await Tool.getTool(tool.clientId)
      if (tool) throw new Error('TOOL_ALREADY_REGISTERED')
    } else {
      clientId = uuidv4()
      while (await Database.get('tool', { clientId: clientId })) {
        clientId = uuidv4()
      }
    }
    const deploymentId = uuidv4()
    while (await Database.get('tool', { deploymentId: deploymentId })) {
      deploymentId = uuidv4()
    }

    const privacy = {
      name: (tool.privacy && tool.privacy.name === true) ? true : false,
      email: (tool.privacy && tool.privacy.email === true) ? true : false
    }
    const customParameters = tool.customParameters || {}

    let scopes
    if (tool.scopes) {
      for (const scope of tool.scopes) {
        if (!Object.keys(validScopes).includes(scope)) throw new Error('INVALID_SCOPE. Details: Invalid scope: ' + scope)
      }
      scopes = tool.scopes
    } else scopes = []

    let kid
    try {
      consToolDebug('Registering new tool')
      consToolDebug('Tool ClientId: ' + clientId)

      // Generating and storing RSA keys
      const keyPair = await Keyset.generateKeyPair()
      kid = keyPair.kid
      await Database.replace('publickey', { clientId: tool.clientId }, { key: keyPair.publicKey, kid: kid }, true, { kid: kid, clientId: tool.clientId })
      await Database.replace('privatekey', { clientId: tool.clientId }, { key: keyPair.privateKey, kid: kid }, true, { kid: kid, clientId: tool.clientId })

      // Storing new tool
      await Database.replace('tool', { toolUrl: tool.url, clientId: tool.clientId }, { toolName: tool.name, toolUrl: tool.url, clientId: tool.clientId, authEndpoint: tool.authenticationEndpoint, accesstokenEndpoint: tool.accesstokenEndpoint, kid: kid, authConfig: tool.authConfig })

      const plat = new Tool(kid, tool.name, tool.url, tool.clientId, tool.authenticationEndpoint, tool.accesstokenEndpoint, tool.authConfig)
      return plat
    } catch (err) {
      await Database.delete('publickey', { kid: kid })
      await Database.delete('privatekey', { kid: kid })
      await Database.delete('tool', { clientId: tool.clientId })
      consToolDebug(err.message)
      throw (err)
    }
  }

  /**
   * @description Updates a tool by the Id.
   * @param {String} toolId - Tool Id.
   * @param {Object} toolInfo - Update Information.
   * @param {String} toolInfo.url - Tool url.
   * @param {String} toolInfo.clientId - Tool clientId.
   * @param {String} toolInfo.name - Tool nickname.
   * @param {String} toolInfo.authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the tool.
   * @param {String} toolInfo.accesstokenEndpoint - Access token endpoint that the tool will use to get an access token for the tool.
   * @param {object} toolInfo.authConfig - Authentication method and key for verifying messages from the tool. {method: "RSA_KEY", key:"PUBLIC KEY..."}
   * @param {String} toolInfo.authConfig.method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
   * @param {String} toolInfo.authConfig.key - Either the RSA public key provided by the tool, or the JWK key, or the JWK keyset address.
   * @returns {Promise<Tool | false>}
   */
  static async updateToolById (toolId, toolInfo) {
    if (!toolId) { throw new Error('MISSING_PLATFORM_ID') }
    if (!toolInfo) { throw new Error('MISSING_PLATFORM_INFO') }

    const tool = await Tool.getToolById(toolId)
    if (!tool) return false

    const oldURL = await tool.toolUrl()
    const oldClientId = await tool.toolClientId()

    const update = {
      url: toolInfo.url || oldURL,
      clientId: toolInfo.clientId || oldClientId,
      name: toolInfo.name || await tool.toolName(),
      authenticationEndpoint: toolInfo.authenticationEndpoint || await tool.toolAuthenticationEndpoint(),
      accesstokenEndpoint: toolInfo.accesstokenEndpoint || await tool.toolAccessTokenEndpoint()
    }

    const authConfig = await tool.toolAuthConfig()
    update.authConfig = authConfig
    if (toolInfo.authConfig) {
      if (toolInfo.authConfig.method) update.authConfig.method = toolInfo.authConfig.method
      if (toolInfo.authConfig.key) update.authConfig.key = toolInfo.authConfig.key
    }

    let alteredUrlClientIdFlag = false
    if (toolInfo.url || toolInfo.clientId) {
      if (toolInfo.url !== oldURL || toolInfo.clientId !== oldClientId) alteredUrlClientIdFlag = true
    }

    if (alteredUrlClientIdFlag) {
      if (await Database.get('tool', { toolUrl: update.url, clientId: update.clientId })) throw new Error('URL_CLIENT_ID_COMBINATION_ALREADY_EXISTS')
    }

    try {
      if (alteredUrlClientIdFlag) {
        await Database.modify('publickey', { kid: toolId }, { toolUrl: update.url, clientId: update.clientId })
        await Database.modify('privatekey', { kid: toolId }, { toolUrl: update.url, clientId: update.clientId })
      }

      await Database.modify('tool', { kid: toolId }, { toolUrl: update.url, clientId: update.clientId, toolName: update.name, authEndpoint: update.authenticationEndpoint, accesstokenEndpoint: update.accesstokenEndpoint, authConfig: update.authConfig })

      const tool = new Tool(toolId, update.name, update.url, update.clientId, update.authenticationEndpoint, update.accesstokenEndpoint, update.authConfig)
      return tool
    } catch (err) {
      if (alteredUrlClientIdFlag) {
        await Database.modify('publickey', { kid: toolId }, { toolUrl: oldURL, clientId: oldClientId })
        await Database.modify('privatekey', { kid: toolId }, { toolUrl: oldURL, clientId: oldClientId })
      }
      consToolDebug(err.message)
      throw (err)
    }
  }

  /**
   * @description Deletes a tool.
   * @param {string} clientId - Tool Client Id.
   * @returns {Promise<true>}
   */
  static async deleteTool (clientId) {
    if (!clientId) throw new Error('MISSING_CLIENT_ID_PARAMETER')
    const tool = await Tool.getTool(clientId)
    if (tool) await tool.delete()
    return true
  }

  // Instance methods
  /**
   * @description Gets the tool url.
   */
  async toolUrl () {
    return this.#toolUrl
  }

  /**
   * @description Gets the tool client id.
   */
  async toolClientId () {
    return this.#clientId
  }

  /**
     * @description Sets/Gets the tool name.
     * @param {string} [name] - Tool name.
     */
  async toolName (name) {
    if (!name) return this.#toolName
    await Database.modify('tool', { toolUrl: this.#toolUrl, clientId: this.#clientId }, { toolName: name })
    this.#toolName = name
    return name
  }

  /**
     * @description Gets the tool Id.
     */
  async toolId () {
    return this.#kid
  }

  /**
   * @description Gets the tool key_id.
   */
  async toolKid () {
    return this.#kid
  }

  /**
   * @description Sets/Gets the tool status.
   * @param {Boolean} [active] - Whether the Tool is active or not.
   */
  async toolActive (active) {
    if (active === undefined) {
      // Get tool status
      const toolStatus = await Database.get('toolStatus', { id: this.#kid })
      if (!toolStatus || toolStatus[0].active) return true
      else return false
    }
    await Database.replace('toolStatus', { id: this.#kid }, { id: this.#kid, active: active })
    return active
  }

  /**
     * @description Gets the RSA public key assigned to the tool.
     *
     */
  async toolPublicKey () {
    const key = await Database.get('publickey', { kid: this.#kid }, true)
    return key[0].key
  }

  /**
     * @description Gets the RSA private key assigned to the tool.
     *
     */
  async toolPrivateKey () {
    const key = await Database.get('privatekey', { kid: this.#kid }, true)
    return key[0].key
  }

  /**
     * @description Sets/Gets the tool authorization configurations used to validate it's messages.
     * @param {string} method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
     * @param {string} key - Either the RSA public key provided by the tool, or the JWK key, or the JWK keyset address.
     */
  async toolAuthConfig (method, key) {
    if (!method && !key) return this.#authConfig

    if (method && method !== 'RSA_KEY' && method !== 'JWK_KEY' && method !== 'JWK_SET') throw new Error('INVALID_METHOD. Details: Valid methods are "RSA_KEY", "JWK_KEY", "JWK_SET".')

    const authConfig = {
      method: method || this.#authConfig.method,
      key: key || this.#authConfig.key
    }

    await Database.modify('tool', { toolUrl: this.#toolUrl, clientId: this.#clientId }, { authConfig: authConfig })
    this.#authConfig = authConfig
    return authConfig
  }

  /**
   * @description Sets/Gets the tool authorization endpoint used to perform the OIDC login.
   * @param {string} [authenticationEndpoint - Tool authentication endpoint.
   */
  async toolAuthenticationEndpoint (authenticationEndpoint) {
    if (!authenticationEndpoint) return this.#authenticationEndpoint
    await Database.modify('tool', { toolUrl: this.#toolUrl, clientId: this.#clientId }, { authEndpoint: authenticationEndpoint })
    this.#authenticationEndpoint = authenticationEndpoint
    return authenticationEndpoint
  }

  /**
     * @description Sets/Gets the tool access token endpoint used to authenticate messages to the tool.
     * @param {string} [accesstokenEndpoint] - Tool access token endpoint.
     */
  async toolAccessTokenEndpoint (accesstokenEndpoint) {
    if (!accesstokenEndpoint) return this.#accesstokenEndpoint
    await Database.modify('tool', { toolUrl: this.#toolUrl, clientId: this.#clientId }, { accesstokenEndpoint: accesstokenEndpoint })
    this.#accesstokenEndpoint = accesstokenEndpoint
    return accesstokenEndpoint
  }

  /**
     * @description Gets the tool access token or attempts to generate a new one.
     * @param {String} scopes - String of scopes.
     */
  async toolAccessToken (scopes) {
    const result = await Database.get('accesstoken', { toolUrl: this.#toolUrl, clientId: this.#clientId, scopes: scopes }, true)
    let token
    if (!result || (Date.now() - result[0].createdAt) / 1000 > result[0].token.expires_in) {
      consToolDebug('Valid access_token for ' + this.#toolUrl + ' not found')
      consToolDebug('Attempting to generate new access_token for ' + this.#toolUrl)
      consToolDebug('With scopes: ' + scopes)
      token = await Auth.generateAccessToken(scopes, this)
    } else {
      consToolDebug('Access_token found')
      token = result[0].token
    }
    token.token_type = token.token_type.charAt(0).toUpperCase() + token.token_type.slice(1)
    return token
  }

  /**
   * @description Retrieves the tool information as a JSON object.
   */
  async toolJSON () {
    const toolJSON = {
      id: this.#kid,
      url: this.#url,
      clientId: this.#clientId,
      deploymentId: this.#deploymentId,
      name: this.#name,
      description: this.#description,
      authConfig: this.#authConfig,
      deepLinkingUrl: this.#deepLinkingUrl,
      loginUrl: this.#loginUrl,
      redirectionURIs: this.#redirectionURIs,
      scopes: this.#scopes,
      privacy: this.#privacy,
      customParameters: this.#customParameters,
      publicKey: await this.toolPublicKey()
    }
    return toolJSON
  }

  /**
   * @description Deletes a registered tool.
   */
  async delete () {
    await Database.delete('tool', { clientId: this.#clientId })
    await Database.delete('toollink', { clientId: this.#clientId })
    await Database.delete('publickey', { kid: this.#kid })
    await Database.delete('privatekey', { kid: this.#kid })
    return true
  }
}

module.exports = Tool
