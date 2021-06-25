"use strict";

// Dependencies
// const consGradesDebug = require('debug')('lti:grades')

/**
 * @description LTI 1.3 NamesAndRoles service methods.
 */
class Grades {
  /**
   * @description Create and return GET memberships response
   * @param {Object} res - Express response object.
   * @param {Object} grades - Grades list.
   * @param {Object} [next] - Value used as the next parameter.
   */
  static async returnGrades(res, grades, next) {
    const payload = res.locals.payload;
    if (!payload) throw new Error('INVALID_CONTEXT');

    for (const grade of grades) {
      grade.id = payload.endpoint + '/results/' + grade.userId;
      grade.scoreOf = payload.endpoint;
    }
    /* if (payload.params.limit) {
      let nextLink = payload.endpoint + '?limit=' + payload.params.limit + '&next=' + next
      if (payload.params.role) nextLink += '&role=' + payload.params.role
      res.set('Link', '<' + nextLink + '>; rel="next"')
    } */


    return res.send(grades);
  }
  /**
   * @description Create and return GET line items response
   * @param {Object} res - Express response object.
   * @param {Object} lineItems - Line Items list.
   * @param {Object} [next] - Value used as the next parameter.
   */


  static async returnLineItems(res, lineItems, next) {
    const payload = res.locals.payload;
    if (!payload) throw new Error('INVALID_CONTEXT');

    for (const lineItem of lineItems) {
      lineItem.id = payload.endpoint + '/lineitem/' + lineItem.id;
    }
    /* if (payload.params.limit) {
      let nextLink = payload.endpoint + '?limit=' + payload.params.limit + '&next=' + next
      if (payload.params.role) nextLink += '&role=' + payload.params.role
      res.set('Link', '<' + nextLink + '>; rel="next"')
    } */


    return res.send(lineItems);
  }
  /**
   * @description Create and return Line Item response
   * @param {Object} res - Express response object.
   * @param {Object} lineItem - Line Item.
   */


  static async returnLineItem(res, lineItem) {
    const payload = res.locals.payload;
    if (!payload) throw new Error('INVALID_CONTEXT');
    let status;

    if (payload.action === 'GET') {
      status = 200;
      lineItem.id = payload.endpoint;
    } else if (payload.action === 'PUT') {
      status = 201;
      lineItem.id = payload.endpoin;
    } else if (payload.action === 'POST') {
      status = 201;
      lineItem.id = payload.endpoint + '/lineitem/' + lineItem.id;
    }

    return res.status(status).send(lineItem);
  }

}

module.exports = Grades;