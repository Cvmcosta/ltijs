// Dependencies
const consCoreDebug = require('debug')('consumer:core')
const jwt = require('jsonwebtoken')

// Classes
const Tool = require('../Classes/Tool')
const ToolLink = require('../Classes/ToolLink')

// Helpers
const messageTypes = require('../../../GlobalUtils/Helpers/messageTypes')

/**
 * @description LTI 1.3 Core service methods.
 */
class Core {
  /**
   * @description LTI 1.3 Launch Core handler
   * @param {String} toolLinkId - Tool link Id being launched.
   * @param {String} userId - Id for current user.
   * @param {String} [resourceId] - Identifier for resource holding toolLink in Platform.
   * @param {String} consumerUrl - Consumer URL.
   * @param {String} encryptionkey - Consumer encryption key.
   */
  static async launch (toolLinkId, userId, resourceId, consumerUrl, encryptionkey) {
    if (!toolLinkId) throw new Error('MISSING_CLIENT_ID_PARAMETER')
    if (!userId) throw new Error('MISSING_USER_ID_PARAMETER')
    consCoreDebug('Generating Core launch form')
    const toolLinkObject = await ToolLink.getToolLink(toolLinkId)
    if (!toolLinkObject) throw new Error('TOOL_LINK_NOT_FOUND')
    const toolLink = await toolLinkObject.toJSON()

    const toolObject = await Tool.getTool(toolLink.clientId)
    if (!toolObject) throw new Error('TOOL_NOT_FOUND')
    const tool = await toolObject.toJSON()

    const messageHintObject = {
      toolLink: toolLinkId,
      resource: resourceId,
      type: messageTypes.CORE_LAUNCH
    }
    const messageHint = jwt.sign(messageHintObject, encryptionkey)
    const form = `<form id="ltiadv_core_launch" style="display: none;" action="${tool.loginUrl}" method="POST">
                  <input type="hidden" name="iss" value="${consumerUrl}" />
                  <input type="hidden" name="client_id" value="${tool.clientId}" />
                  <input type="hidden" name="lti_deployment_id" value="${tool.deploymentId}" />
                  <input type="hidden" name="target_link_uri" value="${toolLink.url}" />
                  <input type="hidden" name="login_hint" value="${userId}" />
                  <input type="hidden" name="lti_message_hint" value="${messageHint}" />
                </form>
                <script>
                  document.getElementById("ltiadv_core_launch").submit()
                </script>`
    return form
  }
}

module.exports = Core
