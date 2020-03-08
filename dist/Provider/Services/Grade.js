"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));

/* eslint-disable require-atomic-updates */

/* eslint-disable no-useless-escape */

/* Provider Assignment and Grade Service */
const got = require('got');

const provGradeServiceDebug = require('debug')('provider:gradeService');

class Grade {
  constructor(getPlatform, ENCRYPTIONKEY, logger, Database) {
    _getPlatform.set(this, {
      writable: true,
      value: null
    });

    _ENCRYPTIONKEY.set(this, {
      writable: true,
      value: ''
    });

    _logger.set(this, {
      writable: true,
      value: void 0
    });

    _Database.set(this, {
      writable: true,
      value: void 0
    });

    (0, _classPrivateFieldSet2.default)(this, _getPlatform, getPlatform);
    (0, _classPrivateFieldSet2.default)(this, _ENCRYPTIONKEY, ENCRYPTIONKEY);
    (0, _classPrivateFieldSet2.default)(this, _logger, logger);
    (0, _classPrivateFieldSet2.default)(this, _Database, Database);
  }
  /**
   * @description Gets lineitems from a given platform
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} [filters] - Filter options
   * @param {Boolean} [filters.resourceLinkId = false] - Filters based on the resourceLinkId
   * @param {String} [filters.resourceId = false] - Filters based on the resourceId
   * @param {String} [filters.tag = false] - Filters based on the tag
   * @param {Number} [filters.limit = false] - Sets a maximum number of lineitems to be returned
   */


  async GetLineItems(idtoken, filters) {
    if (!idtoken) {
      provGradeServiceDebug('IdToken object missing.');
      return false;
    }

    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await (0, _classPrivateFieldGet2.default)(this, _getPlatform).call(this, idtoken.iss, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _logger), (0, _classPrivateFieldGet2.default)(this, _Database));

    if (!platform) {
      provGradeServiceDebug('Platform not found, returning false');
      return false;
    }

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');

    try {
      const tokenRes = await platform.platformAccessToken();
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
      const lineitemsEndpoint = idtoken.endpoint.lineitems;
      let query = '';

      if (filters) {
        const queryParams = [];
        if (filters.resourceLinkId) queryParams.push(['resource_link_id', idtoken.platformContext.resource.id]);
        if (filters.limit) queryParams.push(['limit', filters.limit]);
        if (filters.tag) queryParams.push(['tag', filters.tag]);
        if (filters.resourceId) queryParams.push(['resource_id', filters.resourceId]);
        query = new URLSearchParams(queryParams);
      }

      let lineitemRes = await got.get(lineitemsEndpoint, {
        query: query,
        headers: {
          Authorization: tokenRes.token_type + ' ' + tokenRes.access_token
        }
      });
      lineitemRes = JSON.parse(lineitemRes.body);
      return lineitemRes;
    } catch (err) {
      provGradeServiceDebug(err.message);
      if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
      return false;
    }
  }
  /**
   * @description Creates a new lineItem for the given context
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} lineItem - LineItem Object, following the application/vnd.ims.lis.v2.lineitem+json specification
   * @param {Object} [options] - Aditional configuration for the lineItem
   * @param {Boolean} [options.resourceLinkId = false] - If set to true, binds the created lineItem to the resource that originated the request
   * @param {String} [options.resourceId = false] - Binds the created lineItem to a specific tool resource
   * @param {String} [options.tag = false] - Binds the created LineItem to a specific tag
   */


  async CreateLineItem(idtoken, lineItem, options) {
    // Validating lineItem
    if (!idtoken) {
      provGradeServiceDebug('IdToken object missing.');
      return false;
    }

    if (!lineItem) {
      provGradeServiceDebug('LineItem object missing.');
      return false;
    }

    if (options) {
      if (options.resourceLinkId) lineItem.resourceLinkId = idtoken.platformContext.resource.id;
      if (options.tag) lineItem.tag = options.tag;
      if (options.resourceId) lineItem.resourceId = options.resourceId;
    }

    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await (0, _classPrivateFieldGet2.default)(this, _getPlatform).call(this, idtoken.iss, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _logger), (0, _classPrivateFieldGet2.default)(this, _Database));

    if (!platform) {
      provGradeServiceDebug('Platform not found, returning false');
      return false;
    }

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');

    try {
      const tokenRes = await platform.platformAccessToken();
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
      const lineitemsEndpoint = idtoken.endpoint.lineitems;
      await got.post(lineitemsEndpoint, {
        headers: {
          Authorization: tokenRes.token_type + ' ' + tokenRes.access_token,
          'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json'
        },
        body: JSON.stringify(lineItem)
      });
      provGradeServiceDebug('LineItem successfully created');
      return true;
    } catch (err) {
      provGradeServiceDebug(err.message);
      if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
      return false;
    }
  }
  /**
   * @description Deletes lineitems from a given platform
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} [filters] - Filter options
   * @param {Boolean} [filters.resourceLinkId = false] - Filters based on the resourceLinkId
   * @param {String} [filters.resourceId = false] - Filters based on the resourceId
   * @param {String} [filters.tag = false] - Filters based on the tag
   * @param {Number} [filters.limit = false] - Sets a maximum number of lineitems to be returned
   */


  async DeleteLineItems(idtoken, filters) {
    if (!idtoken) {
      provGradeServiceDebug('IdToken object missing.');
      return false;
    }

    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await (0, _classPrivateFieldGet2.default)(this, _getPlatform).call(this, idtoken.iss, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _logger), (0, _classPrivateFieldGet2.default)(this, _Database));

    if (!platform) {
      provGradeServiceDebug('Platform not found, returning false');
      return false;
    }

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');

    try {
      const tokenRes = await platform.platformAccessToken();
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
      const lineitemsEndpoint = idtoken.endpoint.lineitems;
      let query = '';

      if (filters) {
        const queryParams = [];
        if (filters.resourceLinkId) queryParams.push(['resource_link_id', idtoken.platformContext.resource.id]);
        if (filters.limit) queryParams.push(['limit', filters.limit]);
        if (filters.tag) queryParams.push(['tag', filters.tag]);
        if (filters.resourceId) queryParams.push(['resource_id', filters.resourceId]);
        query = new URLSearchParams(queryParams);
      }

      let lineitemRes = await got.get(lineitemsEndpoint, {
        query: query,
        headers: {
          Authorization: tokenRes.token_type + ' ' + tokenRes.access_token
        }
      });
      lineitemRes = JSON.parse(lineitemRes.body);
      let success = true;

      for (const lineitem of lineitemRes) {
        try {
          const lineitemUrl = lineitem.id;
          provGradeServiceDebug('Deleting: ' + lineitemUrl);
          await got.delete(lineitemUrl, {
            headers: {
              Authorization: tokenRes.token_type + ' ' + tokenRes.access_token
            }
          });
          provGradeServiceDebug('LineItem sucessfully deleted');
        } catch (err) {
          provGradeServiceDebug(err.message);
          if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
            level: 'error',
            message: 'Message: ' + err.message + '\nStack: ' + err.stack
          });
          success = false;
          continue;
        }
      }

      return success;
    } catch (err) {
      provGradeServiceDebug(err.message);
      if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
      return false;
    }
  }
  /**
     * @description Publishes a score or grade to a platform. Represents the Score Publish service described in the lti 1.3 specification
     * @param {Object} idtoken - Idtoken for the user
     * @param {Object} score - Score/Grade following the Lti Standard application/vnd.ims.lis.v1.score+json
     * @param {Object} [filters] - Filters for LineItems in case there is more than one
     * @param {String} [filters.resourceId = false] - Filters based on the resourceId
     * @param {String} [filters.tag = false] - Filters based on the tag
     * @param {Number} [filters.limit = false] - Sets a maximum number of lineitems to be reached
     */


  async ScorePublish(idtoken, score, filters) {
    if (!idtoken) {
      provGradeServiceDebug('IdToken object missing.');
      return false;
    }

    if (!score) {
      provGradeServiceDebug('Score object missing.');
      return false;
    }

    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await (0, _classPrivateFieldGet2.default)(this, _getPlatform).call(this, idtoken.iss, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _logger), (0, _classPrivateFieldGet2.default)(this, _Database));

    if (!platform) {
      provGradeServiceDebug('Platform not found, returning false');
      return false;
    }

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');

    try {
      const tokenRes = await platform.platformAccessToken();
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
      if (filters) filters.resourceLinkId = true;else {
        filters = {
          resourceLinkId: true
        };
      }
      const lineitemsEndpoint = idtoken.endpoint.lineitems;
      let query = '';

      if (filters) {
        const queryParams = [];
        if (filters.resourceLinkId) queryParams.push(['resource_link_id', idtoken.platformContext.resource.id]);
        if (filters.limit) queryParams.push(['limit', filters.limit]);
        if (filters.tag) queryParams.push(['tag', filters.tag]);
        if (filters.resourceId) queryParams.push(['resource_id', filters.resourceId]);
        query = new URLSearchParams(queryParams);
      }

      let lineitemRes = await got.get(lineitemsEndpoint, {
        query: query,
        headers: {
          Authorization: tokenRes.token_type + ' ' + tokenRes.access_token
        }
      });
      lineitemRes = JSON.parse(lineitemRes.body);
      let success = true;

      for (const lineitem of lineitemRes) {
        try {
          const lineitemUrl = lineitem.id;
          let scoreUrl = lineitemUrl + '/scores';

          if (lineitemUrl.indexOf('?') !== -1) {
            const query = lineitemUrl.split('\?')[1];
            const url = lineitemUrl.split('\?')[0];
            scoreUrl = url + '/scores?' + query;
          }

          provGradeServiceDebug('Sending score to: ' + scoreUrl);
          score.userId = idtoken.user;
          score.timestamp = new Date(Date.now()).toISOString();
          score.scoreMaximum = lineitem.scoreMaximum;
          provGradeServiceDebug(score);
          await got.post(scoreUrl, {
            headers: {
              Authorization: tokenRes.token_type + ' ' + tokenRes.access_token,
              'Content-Type': 'application/vnd.ims.lis.v1.score+json'
            },
            body: JSON.stringify(score)
          });
          provGradeServiceDebug('Score successfully sent');
        } catch (err) {
          provGradeServiceDebug(err.message);
          if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
            level: 'error',
            message: 'Message: ' + err.message + '\nStack: ' + err.stack
          });
          success = false;
          continue;
        }
      }

      return success;
    } catch (err) {
      provGradeServiceDebug(err.message);
      if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
      return false;
    }
  }
  /**
   * @description Retrieves a certain lineitem's results. Represents the Result service described in the lti 1.3 specification
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} [filters] - Filter options
   * @param {Boolean} [filters.userId = false] - Filters based on the userId
   * @param {String} [filters.resourceId = false] - Filters based on the resourceId
   * @param {String} [filters.tag = false] - Filters based on the tag
   * @param {Number} [filters.limit = false] - Sets a maximum number of results per lineitem to be returned
   */


  async Result(idtoken, filters) {
    if (!idtoken) {
      provGradeServiceDebug('IdToken object missing.');
      return false;
    }

    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await (0, _classPrivateFieldGet2.default)(this, _getPlatform).call(this, idtoken.iss, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _logger), (0, _classPrivateFieldGet2.default)(this, _Database));

    if (!platform) {
      provGradeServiceDebug('Platform not found, returning false');
      return false;
    }

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');

    try {
      const tokenRes = await platform.platformAccessToken();
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
      if (filters) filters.resourceLinkId = true;else {
        filters = {
          resourceLinkId: true
        };
      }
      const lineitemsEndpoint = idtoken.endpoint.lineitems;
      let query = '';

      if (filters) {
        const queryParams = [];
        if (filters.resourceLinkId) queryParams.push(['resource_link_id', idtoken.platformContext.resource.id]);
        if (filters.tag) queryParams.push(['tag', filters.tag]);
        if (filters.resourceId) queryParams.push(['resource_id', filters.resourceId]);
        query = new URLSearchParams(queryParams);
      }

      let lineitemRes = await got.get(lineitemsEndpoint, {
        query: query,
        headers: {
          Authorization: tokenRes.token_type + ' ' + tokenRes.access_token
        }
      });
      lineitemRes = JSON.parse(lineitemRes.body);
      const resultsArray = [];

      for (const lineitem of lineitemRes) {
        try {
          const lineitemUrl = lineitem.id;
          let resultsUrl = lineitemUrl + '/results';

          if (lineitemUrl.indexOf('?') !== -1) {
            const query = lineitemUrl.split('\?')[1];
            const url = lineitemUrl.split('\?')[0];
            resultsUrl = url + '/results?' + query;
          }

          provGradeServiceDebug('Requesting results from: ' + resultsUrl);
          let query = '';

          if (filters) {
            const queryParams = [];
            if (filters.userId) queryParams.push(['user_id', idtoken.user]);
            if (filters.limit) queryParams.push(['limit', filters.limit]);
            query = new URLSearchParams(queryParams);
          }

          let finalRes = await got.get(resultsUrl, {
            query: query,
            headers: {
              Authorization: tokenRes.token_type + ' ' + tokenRes.access_token
            }
          });
          finalRes = JSON.parse(finalRes.body);

          if (finalRes.length > 0) {
            for (const result of finalRes) {
              result.lineItem = lineitem.label;
              resultsArray.push(result);
            }
          }
        } catch (err) {
          provGradeServiceDebug(err.message);
          if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
            level: 'error',
            message: 'Message: ' + err.message + '\nStack: ' + err.stack
          });
          continue;
        }
      }

      return resultsArray;
    } catch (err) {
      provGradeServiceDebug(err.message);
      if ((0, _classPrivateFieldGet2.default)(this, _logger)) (0, _classPrivateFieldGet2.default)(this, _logger).log({
        level: 'error',
        message: 'Message: ' + err.message + '\nStack: ' + err.stack
      });
      return false;
    }
  }

}

var _getPlatform = new WeakMap();

var _ENCRYPTIONKEY = new WeakMap();

var _logger = new WeakMap();

var _Database = new WeakMap();

module.exports = Grade;