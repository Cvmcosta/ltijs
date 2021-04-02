// Dependencies
const consLaunchDebug = require('debug')('consumer:launch')
const jwt = require('jsonwebtoken')

// Classes
const Database = require('../../../GlobalUtils/Database')
const Tool = require('../Classes/Tool')

// Helpers
const messageTypes = require('../../../GlobalUtils/Helpers/messageTypes')

/**
 * @description LTI 1.3 Core service methods.
 */
class DeepLinking {
  /**
   * @description LTI 1.3 Launch DeepLinking handler
   * @param {String} clientId - Client Id of Tool being launched.
   * @param {String} userId - Id for current user.
   * @param {String} consumerUrl - Consumer URL.
   * @param {String} encryptionkey - Consumer encryption key.
   */
  static async launch (clientId, userId, consumerUrl, encryptionkey) {
    if (!clientId) throw new Error('MISSING_CLIENT_ID_PARAMETER')
    if (!userId) throw new Error('MISSING_USER_ID_PARAMETER')
    consLaunchDebug('Generating Deep Linking launch form')
    const toolObject = await Tool.getTool(clientId)
    if (!toolObject) throw new Error('TOOL_NOT_FOUND')
    const tool = await toolObject.toJSON()

    const messageHintObject = {
      type: messageTypes.DEEPLINKING_LAUNCH
    }
    const messageHint = jwt.sign(messageHintObject, encryptionkey)
    const form = `<form id="ltiadv_deeplinking_launch" style="display: none;" action="${tool.deepLinkingUrl}" method="POST">
                  <input type="hidden" name="iss" value="${consumerUrl}" />
                  <input type="hidden" name="client_id" value="${tool.clientId}" />
                  <input type="hidden" name="lti_deployment_id" value="${tool.deploymentId}" />
                  <input type="hidden" name="target_link_uri" value="${tool.deepLinkingUrl || tool.url}" />
                  <input type="hidden" name="login_hint" value="${userId}" />
                  <input type="hidden" name="lti_message_hint" value="${messageHint}" />
                </form>
                <script>
                  document.getElementById("ltiadv_deeplinking_launch").submit()
                </script>`
    return form
  }
}

module.exports = DeepLinking
