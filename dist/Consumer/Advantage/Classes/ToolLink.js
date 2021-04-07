"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));

// Dependencies
const consToolDebug = require('debug')('consumer:tool');

const {
  v4: uuidv4
} = require('uuid'); // Classes


const Database = require('../../../GlobalUtils/Database'); // Helpers


const privacyLevels = require('../../../GlobalUtils/Helpers/privacy');
/**
 * @description Class representing a registered tool.
 */


var _id = new WeakMap();

var _clientId = new WeakMap();

var _deploymentId = new WeakMap();

var _url = new WeakMap();

var _name = new WeakMap();

var _description = new WeakMap();

var _privacy = new WeakMap();

var _customParameters = new WeakMap();

class ToolLink {
  /**
   * @param {string} id - Tool Link Id.
   * @param {string} clientId - Tool Link Client Id.
   * @param {string} deploymentId - Tool Link deployment Id.
   * @param {string} url - Tool Link url.
   * @param {string} name - Tool Link name.
   * @param {string} description - Tool Link description.
   * @param {number} privacy - Privacy level.
   * @param {Object} customParameters - Tool Link specific set custom parameters.
  */
  constructor(id, clientId, deploymentId, url, name, description, privacy, customParameters) {
    _id.set(this, {
      writable: true,
      value: void 0
    });

    _clientId.set(this, {
      writable: true,
      value: void 0
    });

    _deploymentId.set(this, {
      writable: true,
      value: void 0
    });

    _url.set(this, {
      writable: true,
      value: void 0
    });

    _name.set(this, {
      writable: true,
      value: void 0
    });

    _description.set(this, {
      writable: true,
      value: void 0
    });

    _privacy.set(this, {
      writable: true,
      value: void 0
    });

    _customParameters.set(this, {
      writable: true,
      value: {}
    });

    (0, _classPrivateFieldSet2.default)(this, _id, id);
    (0, _classPrivateFieldSet2.default)(this, _clientId, clientId);
    (0, _classPrivateFieldSet2.default)(this, _deploymentId, deploymentId);
    (0, _classPrivateFieldSet2.default)(this, _url, url);
    (0, _classPrivateFieldSet2.default)(this, _name, name);
    (0, _classPrivateFieldSet2.default)(this, _description, description);
    (0, _classPrivateFieldSet2.default)(this, _privacy, privacy);
    (0, _classPrivateFieldSet2.default)(this, _customParameters, customParameters);
  } // Static methods

  /**
   * @description Gets a registered Tool Link.
   * @param {String} id - Tool Link ID.
   * @returns {Promise<ToolLink | false>}
   */


  static async getToolLink(id) {
    if (!id) throw new Error('MISSING_ID_PARAMETER');
    const result = await Database.get('toollink', {
      id: id
    });
    if (!result) return false;
    const _toolLink = result[0];
    const toolLink = new ToolLink(id, _toolLink.clientId, _toolLink.deploymentId, _toolLink.url, _toolLink.name, _toolLink.description, _toolLink.privacy, _toolLink.customParameters);
    return toolLink;
  }
  /**
   * @description Gets all tool links for a given tool.
   * @returns {Promise<Array<ToolLink>>}
   */


  static async getAllToolLinks(clientId) {
    const result = [];
    const toolLinks = await Database.get('toollink', {
      clientId: clientId
    });

    if (toolLinks) {
      for (const _toolLink of toolLinks) result.push(new ToolLink(_toolLink.id, _toolLink.clientId, _toolLink.deploymentId, _toolLink.url, _toolLink.name, _toolLink.description, _toolLink.privacy, _toolLink.customParameters));
    }

    return result;
  }
  /**
   * @description Registers a toolLink.
   * @param {Tool} parentTool - Parent Tool.
   * @param {Object} toolLink - Tool Link configuration object.
   * @param {string} toolLink.name - Tool Link name.
   * @param {string} [toolLink.url] - Tool Link url.
   * @param {string} [toolLink.description] - Tool Link description.
   * @param {number} [toolLink.privacy] - Privacy level.
   * @param {Object} [toolLink.customParameters] - Tool Link specific set custom parameters.
   * @returns {Promise<ToolLink>}
   */


  static async registerToolLink(parentTool, toolLink) {
    if (!parentTool) throw new Error('MISSING_PARENT_TOOL_PARAMETER');
    if (!toolLink || !toolLink.name) throw new Error('MISSING_REGISTRATION_PARAMETERS');
    const tool = await parentTool.toJSON();
    toolLink.clientId = tool.clientId;
    toolLink.deploymentId = tool.deploymentId;
    if (!toolLink.description) toolLink.description = '';
    if (!toolLink.customParameters) toolLink.customParameters = {};else if (typeof toolLink.customParameters !== 'object') throw new Error('INVALID_CUSTOM_PARAMETERS_OBJECT');
    toolLink.privacy = toolLink.privacy || privacyLevels.INHERIT;

    try {
      consToolDebug('Registering new toolLink');
      consToolDebug('Parent Tool Client ID: ' + toolLink.clientId); // Generating ID

      toolLink.id = uuidv4();

      while (await Database.get('toollink', {
        id: toolLink.id
      })) {
        toolLink.id = uuidv4();
      } // Storing new toolLink


      await Database.replace('toollink', {
        clientId: toolLink.clientId
      }, {
        id: toolLink.id,
        clientId: toolLink.clientId,
        deploymentId: toolLink.deploymentId,
        url: toolLink.url,
        name: toolLink.name,
        description: toolLink.description,
        privacy: toolLink.privacy,
        customParameters: toolLink.customParameters
      });

      const _toolLink = new ToolLink(toolLink.id, toolLink.clientId, toolLink.deploymentId, toolLink.url, toolLink.name, toolLink.description, toolLink.privacy, toolLink.customParameters);

      return _toolLink;
    } catch (err) {
      if (toolLink.id) await Database.delete('toollink', {
        id: toolLink.id
      });
      consToolDebug(err.message);
      throw err;
    }
  }
  /**
   * @description Updates a tool link by the Id.
   * @param {string} id - Tool Link ID.
   * @param {object} toolLinkInfo - Tool Link Information
   * @param {string} toolLinkInfo.url - Tool Link url.
   * @param {string} toolLinkInfo.name - Tool Link name.
   * @param {string} toolLinkInfo.description - Tool Link description.
   * @param {number} toolLinkInfo.privacy - Privacy level.
   * @param {Object} tool.customParameters - Tool Link specific set custom parameters.
   * @returns {Promise<ToolLink | false>}
   */


  static async updateToolLink(id, toolLinkInfo) {
    if (!id) {
      throw new Error('MISSING_ID_PARAMETER');
    }

    if (!toolLinkInfo) {
      throw new Error('MISSING_TOOL_LINK_INFO_PARAMETER');
    }

    const toolLinkObject = await ToolLink.getToolLink(id);
    if (!toolLinkObject) return false;
    const toolLink = await toolLinkObject.toJSON();
    const update = {
      url: toolLinkInfo.url || toolLink.url,
      name: toolLinkInfo.name || toolLink.name,
      description: toolLinkInfo.description || toolLink.description,
      privacy: toolLinkInfo.privacy || toolLink.privacy,
      customParameters: toolLinkInfo.customParameters || toolLink.customParameters
    };

    try {
      await Database.modify('toollink', {
        id: id
      }, update);

      const _toolLink = new ToolLink(id, toolLink.clientId, toolLink.deploymentId, update.url, update.name, update.description, update.privacy, update.customParameters);

      return _toolLink;
    } catch (err) {
      consToolDebug(err.message);
      throw err;
    }
  }
  /**
   * @description Deletes a tool link.
   * @param {string} id - Tool Link Id.
   * @returns {Promise<true>}
   */


  static async deleteToolLink(id) {
    if (!id) throw new Error('MISSING_ID_PARAMETER');
    const toolLink = await ToolLink.getToolLink(id);
    if (toolLink) await toolLink.delete();
    return true;
  } // Instance methods

  /**
   * @description Gets the tool link client id.
   */


  async clientId() {
    return (0, _classPrivateFieldGet2.default)(this, _clientId);
  }
  /**
   * @description Gets/Sets the tool link url.
   */


  async url() {
    if ((0, _classPrivateFieldGet2.default)(this, _url)) return (0, _classPrivateFieldGet2.default)(this, _url);else {
      const result = await Database.get('tool', {
        clientId: (0, _classPrivateFieldGet2.default)(this, _clientId)
      });
      const tool = result[0];
      return tool.url;
    }
  }
  /**
   * @description Sets/Gets the tool link name.
   * @param {string} [name] - Tool link name.
   */


  async name(name) {
    if (!name) return (0, _classPrivateFieldGet2.default)(this, _name);
    await Database.modify('toollink', {
      id: (0, _classPrivateFieldGet2.default)(this, _id)
    }, {
      name: name
    });
    (0, _classPrivateFieldSet2.default)(this, _name, name);
    return name;
  }
  /**
   * @description Gets the tool link id.
   */


  async id() {
    return (0, _classPrivateFieldGet2.default)(this, _id);
  }
  /**
   * @description Retrieves the tool link information as a JSON object.
   */


  async toJSON() {
    const JSON = {
      id: (0, _classPrivateFieldGet2.default)(this, _id),
      url: await this.url(),
      clientId: (0, _classPrivateFieldGet2.default)(this, _clientId),
      deploymentId: (0, _classPrivateFieldGet2.default)(this, _deploymentId),
      name: (0, _classPrivateFieldGet2.default)(this, _name),
      description: (0, _classPrivateFieldGet2.default)(this, _description),
      privacy: (0, _classPrivateFieldGet2.default)(this, _privacy),
      customParameters: (0, _classPrivateFieldGet2.default)(this, _customParameters)
    };
    return JSON;
  }
  /**
   * @description Deletes a registered tool link.
   */


  async delete() {
    await Database.delete('toollink', {
      id: (0, _classPrivateFieldGet2.default)(this, _id)
    });
    return true;
  }

}

module.exports = ToolLink;