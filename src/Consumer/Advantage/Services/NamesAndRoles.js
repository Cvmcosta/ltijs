// Dependencies
const consMembershipsDebug = require('debug')('consumer:memberships')

// Helpers

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
  static async sendMembers (res, context, members, next) {
    consMembershipsDebug('Sending memberships object')
    const serviceAction = res.locals.serviceAction
    if (!serviceAction) throw new Error('INVALID_CONTEXT')

    const membershipsObject = {
      id: serviceAction.endpoint,
      context: context,
      members: members
    }

    if (serviceAction.params.limit) {
      let nextLink = serviceAction.endpoint + '?limit=' + serviceAction.params.limit + '&next=' + next
      if (serviceAction.params.role) nextLink += '&role=' + serviceAction.params.role
      res.set('Link', '<' + nextLink + '>; rel="next"')
    }

    return res.send(membershipsObject)
  }
}

module.exports = NamesAndRoles
