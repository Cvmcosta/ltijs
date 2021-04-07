// Dependencies
const consCoreDebug = require('debug')('consumer:core')
const jwt = require('jsonwebtoken')

// Classes
const ToolLink = require('../Classes/ToolLink')
const Tool = require('../Classes/Tool')

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
    const toolLink = await ToolLink.getToolLink(toolLinkId)
    if (!toolLink) throw new Error('TOOL_LINK_NOT_FOUND')
    const tool = await Tool.getTool(await toolLink.clientId())
    if (!tool) throw new Error('TOOL_NOT_FOUND')

    const messageHintObject = {
      toolLink: toolLinkId,
      resource: resourceId,
      type: messageTypes.CORE_LAUNCH
    }
    const messageHint = jwt.sign(messageHintObject, encryptionkey, { expiresIn: 60 })
    const form = `<form id="ltiadv_core_launch" style="display: none;" action="${await tool.loginUrl()}" method="POST">
                  <input type="hidden" name="iss" value="${consumerUrl}" />
                  <input type="hidden" name="client_id" value="${await tool.clientId()}" />
                  <input type="hidden" name="lti_deployment_id" value="${await tool.deploymentId()}" />
                  <input type="hidden" name="target_link_uri" value="${await toolLink.url()}" />
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
