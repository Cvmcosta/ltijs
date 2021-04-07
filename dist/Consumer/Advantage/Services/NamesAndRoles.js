"use strict";

// Dependencies
const consMembershipsDebug = require('debug')('lti:memberships'); // Helpers

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
  static async sendMembers(res, context, members, next) {
    consMembershipsDebug('Sending memberships object');
    const payload = res.locals.payload;
    if (!payload) throw new Error('INVALID_CONTEXT');
    const membershipsObject = {
      id: payload.endpoint,
      context: context,
      members: members
    };

    if (payload.params.limit) {
      let nextLink = payload.endpoint + '?limit=' + payload.params.limit + '&next=' + next;
      if (payload.params.role) nextLink += '&role=' + payload.params.role;
      res.set('Link', '<' + nextLink + '>; rel="next"');
    }

    return res.send(membershipsObject);
  }

}

module.exports = NamesAndRoles;