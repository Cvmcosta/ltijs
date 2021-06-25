// Dependencies
const consMembershipsDebug = require('debug')('lti:memberships')

// Helpers
const privacyLevels = require('../../../GlobalUtils/Helpers/privacy')

/**
 * @description LTI 1.3 NamesAndRoles service methods.
 */
class NamesAndRoles {
  /**
   * @description Create and send memberships response
   * @param {Object} res - Express response object.
   * @param {Object} context - Context object.
   * @param {Object} members - Memberships list.
   * @param {Object} [next] - Value used as the next parameter.
   */
  static async returnMembers (res, context, members, next) {
    consMembershipsDebug('Sending memberships object')
    const payload = res.locals.payload
    if (!payload) throw new Error('INVALID_CONTEXT')

    const membershipsObject = {
      id: payload.endpoint,
      context: context,
      members: members
    }

    for (const member of members) {
      if (payload.privacy < privacyLevels.EMAIL) member.email = undefined
      if (payload.privacy < privacyLevels.NAME) {
        member.given_name = undefined
        member.family_name = undefined
        member.middle_name = undefined
        member.name = undefined
      }
    }

    /*  if (payload.params.limit) {
    let nextLink = payload.endpoint + '?limit=' + payload.params.limit + '&next=' + next
    if (payload.params.role) nextLink += '&role=' + payload.params.role
    res.set('Link', '<' + nextLink + '>; rel="next"')
    } */

    return res.send(membershipsObject)
  }
}

module.exports = NamesAndRoles
