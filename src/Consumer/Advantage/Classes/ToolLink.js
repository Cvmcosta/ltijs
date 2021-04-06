// Dependencies
const consToolDebug = require('debug')('consumer:tool')
const { v4: uuidv4 } = require('uuid')

// Classes
const Database = require('../../../GlobalUtils/Database')
const Tool = require('./Tool')

/**
 * @description Class representing a registered tool.
 */
class ToolLink {
  #id

  #clientId

  #deploymentId

  #url

  #name

  #description

  #privacy

  #customParameters = {}

  /**
   * @param {string} id - Tool Link Id.
   * @param {string} clientId - Tool Link Client Id.
   * @param {string} deploymentId - Tool Link deployment Id.
   * @param {string} url - Tool Link url.
   * @param {string} name - Tool Link name.
   * @param {string} description - Tool Link description.
   * @param {Object} privacy - Privacy configuration.
   * @param {Object} customParameters - Tool Link specific set custom parameters.
  */
  constructor (id, clientId, deploymentId, url, name, description, privacy, customParameters) {
    this.#id = id
    this.#clientId = clientId
    this.#deploymentId = deploymentId
    this.#url = url
    this.#name = name
    this.#description = description
    this.#privacy = privacy
    this.#customParameters = customParameters
  }

  // Static methods
  /**
   * @description Gets a registered Tool Link.
   * @param {String} id - Tool Link ID.
   * @returns {Promise<ToolLink | false>}
   */
  static async getToolLink (id) {
    if (!id) throw new Error('MISSING_ID_PARAMETER')
    const result = await Database.get('toollink', { id: id })
    if (!result) return false
    const _toolLink = result[0]
    const toolLink = new ToolLink(id, _toolLink.clientId, _toolLink.deploymentId, _toolLink.url, _toolLink.name, _toolLink.description, _toolLink.privacy, _toolLink.customParameters)
    return toolLink
  }

  /**
   * @description Gets all tool links for a given tool.
   * @returns {Promise<Array<ToolLink>>}
   */
  static async getAllToolLinks (clientId) {
    const result = []
    const toolLinks = await Database.get('toollink', { clientId: clientId })
    if (toolLinks) {
      for (const _toolLink of toolLinks) result.push(new ToolLink(_toolLink.id, _toolLink.clientId, _toolLink.deploymentId, _toolLink.url, _toolLink.name, _toolLink.description, _toolLink.privacy, _toolLink.customParameters))
    }
    return result
  }

  /**
   * @description Registers a toolLink.
   * @param {Tool} parentTool - Parent Tool.
   * @param {Object} toolLink - Tool Link configuration object.
   * @param {string} toolLink.name - Tool Link name.
   * @param {string} [toolLink.url] - Tool Link url.
   * @param {string} [toolLink.description] - Tool Link description.
   * @param {Object} [toolLink.privacy] - Privacy configuration.
   * @param {Object} [toolLink.customParameters] - Tool Link specific set custom parameters.
   * @returns {Promise<ToolLink>}
   */
  static async registerToolLink (parentTool, toolLink) {
    if (!parentTool) throw new Error('MISSING_PARENT_TOOL_PARAMETER')
    if (!toolLink || !toolLink.name) throw new Error('MISSING_REGISTRATION_PARAMETERS')

    const tool = await parentTool.toJSON()
    toolLink.clientId = tool.clientId
    toolLink.deploymentId = tool.deploymentId

    if (!toolLink.description) toolLink.description = ''

    if (!toolLink.customParameters) toolLink.customParameters = {}
    else if (typeof toolLink.customParameters !== 'object') throw new Error('INVALID_CUSTOM_PARAMETERS_OBJECT')

    toolLink.privacy = {
      name: (toolLink.privacy && toolLink.privacy.name !== undefined) ? toolLink.privacy.name : undefined,
      email: (toolLink.privacy && toolLink.privacy.email !== undefined) ? toolLink.privacy.email : undefined
    }

    try {
      consToolDebug('Registering new toolLink')
      consToolDebug('Parent Tool Client ID: ' + toolLink.clientId)
      // Generating ID
      toolLink.id = uuidv4()
      while (await Database.get('toollink', { id: toolLink.id })) {
        toolLink.id = uuidv4()
      }

      // Storing new toolLink
      await Database.replace('toolLink', { clientId: toolLink.clientId }, { id: toolLink.id, clientId: toolLink.clientId, deploymentId: toolLink.deploymentId, url: toolLink.url, name: toolLink.name, description: toolLink.description, privacy: toolLink.privacy, customParameters: toolLink.customParameters })

      const _toolLink = new ToolLink(toolLink.id, toolLink.clientId, toolLink.deploymentId, toolLink.url, toolLink.name, toolLink.description, toolLink.privacy, toolLink.customParameters)
      return _toolLink
    } catch (err) {
      if (toolLink.id) await Database.delete('toolLink', { id: toolLink.id })
      consToolDebug(err.message)
      throw (err)
    }
  }

  /**
   * @description Updates a tool link by the Id.
   * @param {string} id - Tool Link ID.
   * @param {object} toolLinkInfo - Tool Link Information
   * @param {string} toolLinkInfo.url - Tool Link url.
   * @param {string} toolLinkInfo.name - Tool Link name.
   * @param {string} toolLinkInfo.description - Tool Link description.
   * @param {Object} toolLinkInfo.privacy - Privacy configuration.
   * @param {Object} tool.customParameters - Tool Link specific set custom parameters.
   * @returns {Promise<ToolLink | false>}
   */
  static async updateToolLink (id, toolLinkInfo) {
    if (!id) { throw new Error('MISSING_ID_PARAMETER') }
    if (!toolLinkInfo) { throw new Error('MISSING_TOOL_LINK_INFO_PARAMETER') }

    const toolLinkObject = await ToolLink.getToolLink(id)
    if (!toolLinkObject) return false
    const toolLink = await toolLinkObject.toJSON()

    const update = {
      url: toolLinkInfo.url || toolLink.url,
      name: toolLinkInfo.name || toolLink.name,
      description: toolLinkInfo.description || toolLink.description,
      privacy: toolLinkInfo.privacy || toolLink.privacy,
      customParameters: toolLinkInfo.customParameters || toolLink.customParameters
    }

    try {
      await Database.modify('toollink', { id: id }, update)

      const _toolLink = new ToolLink(id, toolLink.clientId, toolLink.deploymentId, update.url, update.name, update.description, update.privacy, update.customParameters)
      return _toolLink
    } catch (err) {
      consToolDebug(err.message)
      throw (err)
    }
  }

  /**
   * @description Deletes a tool link.
   * @param {string} id - Tool Link Id.
   * @returns {Promise<true>}
   */
  static async deleteToolLink (id) {
    if (!id) throw new Error('MISSING_ID_PARAMETER')
    const toolLink = await ToolLink.getToolLink(id)
    if (toolLink) await toolLink.delete()
    return true
  }

  // Instance methods
  /**
   * @description Gets the parent Tool.
   * @returns {Promise<Tool>}
   */
  async parentTool () {
    return Tool.getTool(this.#clientId)
  }

  /**
   * @description Gets the tool link client id.
   */
  async clientId () {
    return this.#clientId
  }

  /**
   * @description Gets/Sets the tool link url.
   */
  async url () {
    if (this.#url) return this.#url
    else {
      const tool = await this.parentTool()
      return tool.url()
    }
  }

  /**
   * @description Sets/Gets the tool link name.
   * @param {string} [name] - Tool link name.
   */
  async name (name) {
    if (!name) return this.#name
    await Database.modify('toollink', { id: this.#id }, { name: name })
    this.#name = name
    return name
  }

  /**
   * @description Gets the tool link id.
   */
  async id () {
    return this.#id
  }

  /**
   * @description Retrieves the tool link information as a JSON object.
   */
  async toJSON () {
    const toolObject = await this.parentTool()
    const tool = await toolObject.toJSON()
    const JSON = {
      id: this.#id,
      url: this.#url || tool.url,
      clientId: this.#clientId,
      deploymentId: this.#deploymentId,
      name: this.#name,
      description: this.#description,
      privacy: {
        name: this.#privacy.name !== undefined ? this.#privacy.name : tool.privacy.name,
        email: this.#privacy.email !== undefined ? this.#privacy.email : tool.privacy.email
      },
      customParameters: { ...tool.customParameters, ...this.#customParameters }
    }
    return JSON
  }

  /**
   * @description Deletes a registered tool link.
   */
  async delete () {
    await Database.delete('toollink', { id: this.#id })
    return true
  }
}

module.exports = ToolLink
