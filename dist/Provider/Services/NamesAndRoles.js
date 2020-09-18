"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));

/* Names and Roles Provisioning Service */
const got = require('got');

const parseLink = require('parse-link-header');

const provNamesAndRolesServiceDebug = require('debug')('provider:namesAndRolesService');

var _getPlatform = new WeakMap();

var _ENCRYPTIONKEY = new WeakMap();

var _Database = new WeakMap();

class NamesAndRoles {
  constructor(getPlatform, ENCRYPTIONKEY, Database) {
    _getPlatform.set(this, {
      writable: true,
      value: null
    });

    _ENCRYPTIONKEY.set(this, {
      writable: true,
      value: ''
    });

    _Database.set(this, {
      writable: true,
      value: void 0
    });

    (0, _classPrivateFieldSet2.default)(this, _getPlatform, getPlatform);
    (0, _classPrivateFieldSet2.default)(this, _ENCRYPTIONKEY, ENCRYPTIONKEY);
    (0, _classPrivateFieldSet2.default)(this, _Database, Database);
  }
  /**
   * @description Retrieves members from platform.
   * @param {Object} idtoken - Idtoken for the user.
   * @param {Object} options - Request options.
   * @param {String} [options.role] - Specific role to be returned.
   * @param {Number} [options.limit] - Specifies maximum number of members per page.
   * @param {Number} [options.pages] - Specifies maximum number of pages returned.
   * @param {String} [options.url] - Specifies the initial members endpoint, usually retrieved from a previous incomplete request.
   */


  async getMembers(idtoken, options) {
    if (!idtoken) {
      provNamesAndRolesServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }

    provNamesAndRolesServiceDebug('Attempting to retrieve memberships');
    provNamesAndRolesServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await (0, _classPrivateFieldGet2.default)(this, _getPlatform).call(this, idtoken.iss, idtoken.clientId, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), (0, _classPrivateFieldGet2.default)(this, _Database));

    if (!platform) {
      provNamesAndRolesServiceDebug('Platform not found');
      throw new Error('PLATFORM_NOT_FOUND');
    }

    provNamesAndRolesServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
    const tokenRes = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly');
    provNamesAndRolesServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
    let query = [];

    if (options && options.role) {
      provNamesAndRolesServiceDebug('Adding role parameter with value: ' + options.role);
      query.push(['role', options.role]);
    }

    if (options && options.limit) {
      provNamesAndRolesServiceDebug('Adding limit parameter with value: ' + options.limit);
      query.push(['limit', options.limit]);
    }

    if (options && options.pages) provNamesAndRolesServiceDebug('Maximum number of pages retrieved: ' + options.pages);
    if (query.length > 0) query = new URLSearchParams(query);else query = false;
    let next = idtoken.platformContext.namesRoles.context_memberships_url;

    if (options && options.url) {
      next = options.url;
      query = false;
    }

    let differences;
    let result;
    let curPage = 1;

    do {
      if (options && options.pages && curPage > options.pages) {
        if (next) result.next = next;
        break;
      }

      let response;
      provNamesAndRolesServiceDebug('Member pages found: ', curPage);
      provNamesAndRolesServiceDebug('Current member page: ', next);
      if (query && curPage === 1) response = await got.get(next, {
        searchParams: query,
        headers: {
          Authorization: tokenRes.token_type + ' ' + tokenRes.access_token,
          Accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json'
        }
      });else response = await got.get(next, {
        headers: {
          Authorization: tokenRes.token_type + ' ' + tokenRes.access_token,
          Accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json'
        }
      });
      const headers = response.headers;
      const body = JSON.parse(response.body);
      if (!result) result = JSON.parse(JSON.stringify(body));else {
        result.members = [...result.members, ...body.members];
      }
      const parsedLinks = parseLink(headers.link); // Trying to find "rel=differences" header

      if (parsedLinks && parsedLinks.differences) differences = parsedLinks.differences.url; // Trying to find "rel=next" header, indicating additional pages

      if (parsedLinks && parsedLinks.next) next = parsedLinks.next.url;else next = false;
      curPage++;
    } while (next);

    if (differences) result.differences = differences;
    provNamesAndRolesServiceDebug('Memberships retrieved');
    return result;
  }

}

module.exports = NamesAndRoles;