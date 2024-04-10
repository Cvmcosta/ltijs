"use strict";

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
function _classPrivateFieldGet(s, a) { return s.get(_assertClassBrand(s, a)); }
function _classPrivateFieldSet(s, a, r) { return s.set(_assertClassBrand(s, a), r), r; }
function _assertClassBrand(e, t, n) { if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n; throw new TypeError("Private element is not present on this object"); }
/* eslint-disable require-atomic-updates */
/* eslint-disable no-useless-escape */

/* Provider Assignment and Grade Service */

const got = require('got');
const parseLink = require('parse-link-header');
const provGradeServiceDebug = require('debug')('provider:gradeService');
var _getPlatform = /*#__PURE__*/new WeakMap();
var _ENCRYPTIONKEY = /*#__PURE__*/new WeakMap();
var _Database = /*#__PURE__*/new WeakMap();
class Grade {
  constructor(getPlatform, ENCRYPTIONKEY, Database) {
    _classPrivateFieldInitSpec(this, _getPlatform, null);
    _classPrivateFieldInitSpec(this, _ENCRYPTIONKEY, '');
    _classPrivateFieldInitSpec(this, _Database, void 0);
    _classPrivateFieldSet(_getPlatform, this, getPlatform);
    _classPrivateFieldSet(_ENCRYPTIONKEY, this, ENCRYPTIONKEY);
    _classPrivateFieldSet(_Database, this, Database);
  }

  /**
   * @description Gets lineitems from a given platform
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} [options] - Options object
   * @param {Boolean} [options.resourceLinkId = false] - Filters line items based on the resourceLinkId of the resource that originated the request
   * @param {String} [options.resourceId = false] - Filters line items based on the resourceId
   * @param {String} [options.tag = false] - Filters line items based on the tag
   * @param {Number} [options.limit = false] - Sets a maximum number of line items to be returned
   * @param {String} [options.id = false] - Filters line items based on the id
   * @param {String} [options.label = false] - Filters line items based on the label
   * @param {String} [options.url = false] - Retrieves line items from a specific URL. Usually retrieved from the `next` link header of a previous request.
   */
  async getLineItems(idtoken, options, accessToken) {
    if (!idtoken) {
      provGradeServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    if (!accessToken) {
      const platform = await _classPrivateFieldGet(_getPlatform, this).call(this, idtoken.iss, idtoken.clientId, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this)); // Remove and use DB instead

      /* istanbul ignore next */
      if (!platform) {
        provGradeServiceDebug('Platform not found');
        throw new Error('PLATFORM_NOT_FOUND');
      }
      const platformActive = await platform.platformActive();
      if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
      provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
      accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly');
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
    }
    const result = {};
    let response;
    if (options && options.url) {
      provGradeServiceDebug('Requesting line items from: ' + options.url);
      response = await got.get(options.url, {
        headers: {
          Authorization: accessToken.token_type + ' ' + accessToken.access_token,
          Accept: 'application/vnd.ims.lis.v2.lineitemcontainer+json'
        }
      });
    } else {
      let lineitemsEndpoint = idtoken.platformContext.endpoint.lineitems;
      let query = [];
      if (lineitemsEndpoint.indexOf('?') !== -1) {
        query = Array.from(new URLSearchParams(lineitemsEndpoint.split('\?')[1]));
        lineitemsEndpoint = lineitemsEndpoint.split('\?')[0];
      }
      let queryParams = [...query];
      if (options) {
        if (options.resourceLinkId) queryParams.push(['resource_link_id', idtoken.platformContext.resource.id]);
        if (options.limit && !options.id && !options.label) queryParams.push(['limit', options.limit]);
        if (options.tag) queryParams.push(['tag', options.tag]);
        if (options.resourceId) queryParams.push(['resource_id', options.resourceId]);
      }
      queryParams = new URLSearchParams(queryParams);
      provGradeServiceDebug('Requesting line items from: ' + lineitemsEndpoint);
      response = await got.get(lineitemsEndpoint, {
        searchParams: queryParams,
        headers: {
          Authorization: accessToken.token_type + ' ' + accessToken.access_token,
          Accept: 'application/vnd.ims.lis.v2.lineitemcontainer+json'
        }
      });
    }
    const headers = response.headers;
    let lineItems = JSON.parse(response.body);

    // Parsing link headers
    const parsedLinks = parseLink(headers.link);
    if (parsedLinks) {
      if (parsedLinks.next) result.next = parsedLinks.next.url;
      if (parsedLinks.prev) result.prev = parsedLinks.prev.url;
      if (parsedLinks.first) result.first = parsedLinks.first.url;
      if (parsedLinks.last) result.last = parsedLinks.last.url;
    }

    // Applying special filters
    if (options && options.id) lineItems = lineItems.filter(lineitem => {
      return lineitem.id === options.id;
    });
    if (options && options.label) lineItems = lineItems.filter(lineitem => {
      return lineitem.label === options.label;
    });
    if (options && options.limit && (options.id || options.label) && options.limit < lineItems.length) lineItems = lineItems.slice(0, options.limit);
    result.lineItems = lineItems;
    return result;
  }

  /**
   * @description Creates a new lineItem for the given context
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} lineItem - LineItem Object, following the application/vnd.ims.lis.v2.lineitem+json specification
   * @param {Object} [options] - Aditional configuration for the lineItem
   * @param {Boolean} [options.resourceLinkId = false] - If set to true, binds the created lineItem to the resource that originated the request
   */
  async createLineItem(idtoken, lineItem, options, accessToken) {
    // Validating lineItem
    if (!idtoken) {
      provGradeServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    if (!lineItem) {
      provGradeServiceDebug('Line item object missing.');
      throw new Error('MISSING_LINE_ITEM');
    }
    if (options && options.resourceLinkId) lineItem.resourceLinkId = idtoken.platformContext.resource.id;
    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    if (!accessToken) {
      const platform = await _classPrivateFieldGet(_getPlatform, this).call(this, idtoken.iss, idtoken.clientId, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this));

      /* istanbul ignore next */
      if (!platform) {
        provGradeServiceDebug('Platform not found');
        throw new Error('PLATFORM_NOT_FOUND');
      }
      const platformActive = await platform.platformActive();
      if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
      provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
      accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem');
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
    }
    const lineitemsEndpoint = idtoken.platformContext.endpoint.lineitems;
    provGradeServiceDebug('Creating Line item: ');
    provGradeServiceDebug(lineItem);
    const newLineItem = await got.post(lineitemsEndpoint, {
      headers: {
        Authorization: accessToken.token_type + ' ' + accessToken.access_token,
        'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json'
      },
      json: lineItem
    }).json();
    provGradeServiceDebug('Line item successfully created');
    return newLineItem;
  }

  /**
   * @description Gets LineItem by the ID
   * @param {Object} idtoken - Idtoken for the user
   * @param {String} lineItemId - LineItem ID.
   */
  async getLineItemById(idtoken, lineItemId, accessToken) {
    if (!idtoken) {
      provGradeServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    if (!lineItemId) {
      provGradeServiceDebug('Missing lineItemID.');
      throw new Error('MISSING_LINEITEM_ID');
    }
    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    if (!accessToken) {
      const platform = await _classPrivateFieldGet(_getPlatform, this).call(this, idtoken.iss, idtoken.clientId, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this)); // Remove and use DB instead

      /* istanbul ignore next */
      if (!platform) {
        provGradeServiceDebug('Platform not found');
        throw new Error('PLATFORM_NOT_FOUND');
      }
      const platformActive = await platform.platformActive();
      if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
      provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
      accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly');
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
    }
    const lineitemUrl = lineItemId;
    provGradeServiceDebug('Retrieving: ' + lineitemUrl);
    let response = await got.get(lineitemUrl, {
      headers: {
        Authorization: accessToken.token_type + ' ' + accessToken.access_token
      }
    });
    response = JSON.parse(response.body);
    provGradeServiceDebug('LineItem sucessfully retrieved');
    return response;
  }

  /**
   * @description Updates LineItem by the ID
   * @param {Object} idtoken - Idtoken for the user
   * @param {String} lineItemId - LineItem ID.
   * @param {Object} lineItem - Updated fields.
   */
  async updateLineItemById(idtoken, lineItemId, lineItem) {
    if (!idtoken) {
      provGradeServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    if (!lineItemId) {
      provGradeServiceDebug('Missing lineItemID.');
      throw new Error('MISSING_LINEITEM_ID');
    }
    if (!lineItem) {
      provGradeServiceDebug('Missing lineItem object.');
      throw new Error('MISSING_LINEITEM');
    }
    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await _classPrivateFieldGet(_getPlatform, this).call(this, idtoken.iss, idtoken.clientId, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this));

    /* istanbul ignore next */
    if (!platform) {
      provGradeServiceDebug('Platform not found');
      throw new Error('PLATFORM_NOT_FOUND');
    }
    const platformActive = await platform.platformActive();
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem');
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
    const lineitemUrl = lineItemId;
    provGradeServiceDebug('Updating: ' + lineitemUrl);
    let response = await got.put(lineitemUrl, {
      json: lineItem,
      headers: {
        Authorization: accessToken.token_type + ' ' + accessToken.access_token,
        'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json'
      }
    });
    response = JSON.parse(response.body);
    provGradeServiceDebug('LineItem sucessfully updated');
    return response;
  }

  /**
   * @description Deletes LineItem by the ID
   * @param {Object} idtoken - Idtoken for the user
   * @param {String} lineItemId - LineItem ID.
   */
  async deleteLineItemById(idtoken, lineItemId) {
    if (!idtoken) {
      provGradeServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    if (!lineItemId) {
      provGradeServiceDebug('Missing lineItemID.');
      throw new Error('MISSING_LINEITEM_ID');
    }
    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await _classPrivateFieldGet(_getPlatform, this).call(this, idtoken.iss, idtoken.clientId, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this));

    /* istanbul ignore next */
    if (!platform) {
      provGradeServiceDebug('Platform not found');
      throw new Error('PLATFORM_NOT_FOUND');
    }
    const platformActive = await platform.platformActive();
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem');
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
    const lineitemUrl = lineItemId;
    provGradeServiceDebug('Deleting: ' + lineitemUrl);
    await got.delete(lineitemUrl, {
      headers: {
        Authorization: accessToken.token_type + ' ' + accessToken.access_token
      }
    });
    provGradeServiceDebug('LineItem sucessfully deleted');
    return true;
  }

  /**
   * @description Publishes a score or grade to a lineItem. Represents the Score Publish service described in the lti 1.3 specification.
   * @param {Object} idtoken - Idtoken for the user.
   * @param {String} lineItemId - LineItem ID.
   * @param {Object} score - Score/Grade following the LTI Standard application/vnd.ims.lis.v1.score+json.
   */
  async submitScore(idtoken, lineItemId, score) {
    if (!idtoken) {
      provGradeServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    if (!lineItemId) {
      provGradeServiceDebug('Missing lineItemID.');
      throw new Error('MISSING_LINEITEM_ID');
    }
    if (!score) {
      provGradeServiceDebug('Score object missing.');
      throw new Error('MISSING_SCORE');
    }
    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await _classPrivateFieldGet(_getPlatform, this).call(this, idtoken.iss, idtoken.clientId, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this));

    /* istanbul ignore next */
    if (!platform) {
      provGradeServiceDebug('Platform not found');
      throw new Error('PLATFORM_NOT_FOUND');
    }
    const platformActive = await platform.platformActive();
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
    const shouldFetchScoreMaximum = score.scoreGiven !== undefined && score.scoreMaximum === undefined;
    const scopes = ['https://purl.imsglobal.org/spec/lti-ags/scope/score'];
    if (shouldFetchScoreMaximum) {
      scopes.push('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem');
    }
    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
    const accessToken = await platform.platformAccessToken(scopes.join(' '));
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');

    // Creating scores URL
    const lineitemUrl = lineItemId;
    let scoreUrl = lineitemUrl + '/scores';
    if (lineitemUrl.indexOf('?') !== -1) {
      const query = lineitemUrl.split('\?')[1];
      const url = lineitemUrl.split('\?')[0];
      scoreUrl = url + '/scores?' + query;
    }

    // Creating scoreMaximum if it is not present and scoreGiven exists
    if (shouldFetchScoreMaximum) {
      const lineItem = await this.getLineItemById(idtoken, lineItemId, accessToken);
      score.scoreMaximum = lineItem.scoreMaximum;
    }

    // If no user is specified, sends the score to the user that originated request
    if (score.userId === undefined) score.userId = idtoken.user;

    // Creating timestamp
    score.timestamp = new Date(Date.now()).toISOString();
    provGradeServiceDebug('Sending score to: ' + scoreUrl);
    provGradeServiceDebug(score);
    await got.post(scoreUrl, {
      headers: {
        Authorization: accessToken.token_type + ' ' + accessToken.access_token,
        'Content-Type': 'application/vnd.ims.lis.v1.score+json'
      },
      json: score
    });
    provGradeServiceDebug('Score successfully sent');
    return score;
  }

  /**
   * @description Retrieves scores from a lineItem. Represents the Result service described in the lti 1.3 specification.
   * @param {Object} idtoken - Idtoken for the user.
   * @param {String} lineItemId - LineItem ID.
   * @param {Object} [options] - Options object.
   * @param {String} [options.userId = false] - Filters based on the userId.
   * @param {Number} [options.limit = false] - Sets a maximum number of scores to be returned.
   * @param {String} [options.url = false] - Retrieves scores from a specific URL. Usually retrieved from the `next` link header of a previous request.
   */
  async getScores(idtoken, lineItemId, options) {
    if (!idtoken) {
      provGradeServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    if (!lineItemId) {
      provGradeServiceDebug('Missing lineItemID.');
      throw new Error('MISSING_LINEITEM_ID');
    }
    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await _classPrivateFieldGet(_getPlatform, this).call(this, idtoken.iss, idtoken.clientId, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this));

    /* istanbul ignore next */
    if (!platform) {
      provGradeServiceDebug('Platform not found');
      throw new Error('PLATFORM_NOT_FOUND');
    }
    const platformActive = await platform.platformActive();
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly');
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
    const result = {};
    let response;
    if (options && options.url) {
      provGradeServiceDebug('Requesting scores from: ' + options.url);
      response = await got.get(options.url, {
        headers: {
          Authorization: accessToken.token_type + ' ' + accessToken.access_token,
          Accept: 'application/vnd.ims.lis.v2.resultcontainer+json'
        }
      });
    } else {
      // Creating results URL
      const lineitemUrl = lineItemId;
      let query = [];
      let resultsUrl = lineitemUrl + '/results';
      if (lineitemUrl.indexOf('?') !== -1) {
        query = Array.from(new URLSearchParams(lineitemUrl.split('\?')[1]));
        const url = lineitemUrl.split('\?')[0];
        resultsUrl = url + '/results';
      }

      // Creating query parameters
      const queryParams = [];
      if (options) {
        if (options.userId) queryParams.push(['user_id', options.userId]);
        if (options.limit) queryParams.push(['limit', options.limit]);
      }
      let searchParams = [...queryParams, ...query];
      searchParams = new URLSearchParams(searchParams);
      provGradeServiceDebug('Requesting scores from: ' + resultsUrl);
      response = await got.get(resultsUrl, {
        searchParams,
        headers: {
          Authorization: accessToken.token_type + ' ' + accessToken.access_token,
          Accept: 'application/vnd.ims.lis.v2.resultcontainer+json'
        }
      });
    }
    const headers = response.headers;
    result.scores = JSON.parse(response.body);

    // Parsing link headers
    const parsedLinks = parseLink(headers.link);
    if (parsedLinks) {
      if (parsedLinks.next) result.next = parsedLinks.next.url;
      if (parsedLinks.prev) result.prev = parsedLinks.prev.url;
      if (parsedLinks.first) result.first = parsedLinks.first.url;
      if (parsedLinks.last) result.last = parsedLinks.last.url;
    }
    return result;
  }

  // Deprecated methods, these methods will be removed in version 6.0

  /* istanbul ignore next */
  /**
   * @deprecated
   * @description Deletes lineitems from a given platform. Deprecated in favor of deleteLineItemById.
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} [options] - Options object
   * @param {Boolean} [options.resourceLinkId = false] - Filters line items based on the resourceLinkId of the resource that originated the request
   * @param {String} [options.resourceId = false] - Filters line items based on the resourceId
   * @param {String} [options.tag = false] - Filters line items based on the tag
   * @param {Number} [options.limit = false] - Sets a maximum number of line items to be deleted
   * @param {String} [options.id = false] - Filters line items based on the id
   * @param {String} [options.label = false] - Filters line items based on the label
   */
  async deleteLineItems(idtoken, options) {
    if (!idtoken) {
      provGradeServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await _classPrivateFieldGet(_getPlatform, this).call(this, idtoken.iss, idtoken.clientId, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this));
    if (!platform) {
      provGradeServiceDebug('Platform not found');
      throw new Error('PLATFORM_NOT_FOUND');
    }
    const platformActive = await platform.platformActive();
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem');
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
    const response = await this.getLineItems(idtoken, options, accessToken);
    const lineItems = response.lineItems;
    const result = {
      success: [],
      failure: []
    };
    for (const lineitem of lineItems) {
      try {
        const lineitemUrl = lineitem.id;
        provGradeServiceDebug('Deleting: ' + lineitemUrl);
        await got.delete(lineitemUrl, {
          headers: {
            Authorization: accessToken.token_type + ' ' + accessToken.access_token
          }
        });
        provGradeServiceDebug('LineItem sucessfully deleted');
        result.success.push({
          lineitem: lineitemUrl
        });
      } catch (err) {
        provGradeServiceDebug(err);
        result.failure.push({
          lineitem: lineitem.id,
          error: err.message
        });
        continue;
      }
    }
    return result;
  }

  /* istanbul ignore next */
  /**
   * @deprecated
   * @description Publishes a score or grade to a platform. Deprecated in favor of sendScores, that send scores to a specific lineItem.
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} score - Score/Grade following the Lti Standard application/vnd.ims.lis.v1.score+json
   * @param {Object} [options] - Options object
   * @param {Object} [options.autoCreate] - Line item that will be created automatically if it does not exist
   * @param {String} [options.userId = false] - Send score to a specific user. If no userId is provided, the score is sent to the user that initiated the request
   * @param {Boolean} [options.resourceLinkId = true] - Filters line items based on the resourceLinkId of the resource that originated the request. Defaults to true
   * @param {String} [options.resourceId = false] - Filters line items based on the resourceId
   * @param {String} [options.tag = false] - Filters line items based on the tag
   * @param {Number} [options.limit = false] - Sets a maximum number of line items to be reached
   * @param {String} [options.id = false] - Filters line items based on the id
   * @param {String} [options.label = false] - Filters line items based on the label
   */
  async scorePublish(idtoken, score, options) {
    if (!idtoken) {
      provGradeServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    if (!score) {
      provGradeServiceDebug('Score object missing.');
      throw new Error('MISSING_SCORE');
    }
    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await _classPrivateFieldGet(_getPlatform, this).call(this, idtoken.iss, idtoken.clientId, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this));
    if (!platform) {
      provGradeServiceDebug('Platform not found');
      throw new Error('PLATFORM_NOT_FOUND');
    }
    const platformActive = await platform.platformActive();
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score');
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
    if (options) {
      if (options.resourceLinkId === false) options.resourceLinkId = false;else options.resourceLinkId = true;
    } else options = {
      resourceLinkId: true
    };
    let lineItems;
    if (options && options.id) {
      try {
        lineItems = [await this.getLineItemById(idtoken, options.id, accessToken)];
      } catch {
        lineItems = [];
      }
    } else {
      const response = await this.getLineItems(idtoken, options, accessToken);
      lineItems = response.lineItems;
    }
    const result = {
      success: [],
      failure: []
    };
    if (lineItems.length === 0) {
      if (options && options.autoCreate) {
        provGradeServiceDebug('No line item found, creating new lite item automatically');
        lineItems.push(await this.createLineItem(idtoken, options.autoCreate, {
          resourceLinkId: options.resourceLinkId
        }, accessToken));
      } else provGradeServiceDebug('No available line item found');
    }
    for (const lineitem of lineItems) {
      try {
        const lineitemUrl = lineitem.id;
        let scoreUrl = lineitemUrl + '/scores';
        if (lineitemUrl.indexOf('?') !== -1) {
          const query = lineitemUrl.split('\?')[1];
          const url = lineitemUrl.split('\?')[0];
          scoreUrl = url + '/scores?' + query;
        }
        provGradeServiceDebug('Sending score to: ' + scoreUrl);
        if (options && options.userId) score.userId = options.userId;else score.userId = idtoken.user;
        score.timestamp = new Date(Date.now()).toISOString();
        if (score.scoreGiven) score.scoreMaximum = lineitem.scoreMaximum;
        provGradeServiceDebug(score);
        await got.post(scoreUrl, {
          headers: {
            Authorization: accessToken.token_type + ' ' + accessToken.access_token,
            'Content-Type': 'application/vnd.ims.lis.v1.score+json'
          },
          json: score
        });
        provGradeServiceDebug('Score successfully sent');
        result.success.push({
          lineitem: lineitemUrl
        });
      } catch (err) {
        provGradeServiceDebug(err);
        result.failure.push({
          lineitem: lineitem.id,
          error: err.message
        });
        continue;
      }
    }
    return result;
  }

  /* istanbul ignore next */
  /**
   * @deprecated
   * @description Retrieves a certain lineitem's results. Deprecated in favor of getScores that retrieves scores from a specific lineItem.
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} [options] - Options object
   * @param {String} [options.userId = false] - Filters based on the userId
   * @param {Boolean} [options.resourceLinkId = true] - Filters line items based on the resourceLinkId of the resource that originated the request. Defaults to true
   * @param {String} [options.resourceId = false] - Filters line items based on the resourceId
   * @param {String} [options.tag = false] - Filters line items based on the tag
   * @param {Number} [options.limit = false] - Sets a maximum number of results to be returned per line item
   * @param {String} [options.id = false] - Filters line items based on the id
   * @param {String} [options.label = false] - Filters line items based on the label
   */
  async result(idtoken, options) {
    if (!idtoken) {
      provGradeServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    provGradeServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await _classPrivateFieldGet(_getPlatform, this).call(this, idtoken.iss, idtoken.clientId, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this));
    if (!platform) {
      provGradeServiceDebug('Platform not found');
      throw new Error('PLATFORM_NOT_FOUND');
    }
    const platformActive = await platform.platformActive();
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly');
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
    let limit = false;
    if (options) {
      if (options.resourceLinkId === false) options.resourceLinkId = false;else options.resourceLinkId = true;
      if (options.limit) {
        limit = options.limit;
        options.limit = false;
      }
    } else options = {
      resourceLinkId: true
    };
    let lineItems;
    if (options && options.id) {
      try {
        lineItems = [await this.getLineItemById(idtoken, options.id, accessToken)];
      } catch {
        lineItems = [];
      }
    } else {
      const response = await this.getLineItems(idtoken, options, accessToken);
      lineItems = response.lineItems;
    }
    const queryParams = [];
    if (options) {
      if (options.userId) queryParams.push(['user_id', options.userId]);
      if (limit) queryParams.push(['limit', limit]);
    }
    const resultsArray = [];
    for (const lineitem of lineItems) {
      try {
        const lineitemUrl = lineitem.id;
        let query = [];
        let resultsUrl = lineitemUrl + '/results';
        if (lineitemUrl.indexOf('?') !== -1) {
          query = Array.from(new URLSearchParams(lineitemUrl.split('\?')[1]));
          const url = lineitemUrl.split('\?')[0];
          resultsUrl = url + '/results';
        }
        let searchParams = [...queryParams, ...query];
        searchParams = new URLSearchParams(searchParams);
        provGradeServiceDebug('Requesting results from: ' + resultsUrl);
        const results = await got.get(resultsUrl, {
          searchParams,
          headers: {
            Authorization: accessToken.token_type + ' ' + accessToken.access_token,
            Accept: 'application/vnd.ims.lis.v2.resultcontainer+json'
          }
        }).json();
        resultsArray.push({
          lineitem: lineitem.id,
          results
        });
      } catch (err) {
        provGradeServiceDebug(err.message);
        resultsArray.push({
          lineitem: lineitem.id,
          error: err.message
        });
        continue;
      }
    }
    return resultsArray;
  }

  /* istanbul ignore next */
  /**
   * @deprecated
   */
  async GetLineItems(idtoken, options, accessToken) {
    console.log('Deprecation warning: GetLineItems() is now deprecated, use getLineItems() instead. GetLineItems() will be removed in the 6.0 release.');
    return this.getLineItems(idtoken, options, accessToken);
  }

  /* istanbul ignore next */
  /**
   * @deprecated
   */
  async CreateLineItem(idtoken, lineItem, options, accessToken) {
    console.log('Deprecation warning: CreateLineItem() is now deprecated, use createLineItem() instead. CreateLineItem() will be removed in the 6.0 release.');
    return this.createLineItem(idtoken, lineItem, options, accessToken);
  }

  /* istanbul ignore next */
  /**
   * @deprecated
   */
  async DeleteLineItems(idtoken, options) {
    console.log('Deprecation warning: DeleteLineItems() is now deprecated, use deleteLineItems() instead. DeleteLineItems() will be removed in the 6.0 release.');
    return this.deleteLineItems(idtoken, options);
  }

  /* istanbul ignore next */
  /**
   * @deprecated
   */
  async ScorePublish(idtoken, score, options) {
    console.log('Deprecation warning: ScorePublish() is now deprecated, use scorePublish() instead. ScorePublish() will be removed in the 6.0 release.');
    return this.scorePublish(idtoken, score, options);
  }

  /* istanbul ignore next */
  /**
   * @deprecated
   */
  async Result(idtoken, options) {
    console.log('Deprecation warning: Result() is now deprecated, use result() instead. Result() will be removed in the 6.0 release.');
    return this.result(idtoken, options);
  }
}
module.exports = Grade;