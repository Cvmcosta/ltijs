"use strict";

function _classPrivateFieldInitSpec(obj, privateMap, value) { _checkPrivateRedeclaration(obj, privateMap); privateMap.set(obj, value); }
function _checkPrivateRedeclaration(obj, privateCollection) { if (privateCollection.has(obj)) { throw new TypeError("Cannot initialize the same private elements twice on an object"); } }
function _classPrivateFieldGet(s, a) { return s.get(_assertClassBrand(s, a)); }
function _classPrivateFieldSet(s, a, r) { return s.set(_assertClassBrand(s, a), r), r; }
function _assertClassBrand(e, t, n) { if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n; throw new TypeError("Private element is not present on this object"); }
/* Names and Roles Provisioning Service */

const got = require('got');
const parseLink = require('parse-link-header');
const provNamesAndRolesServiceDebug = require('debug')('provider:namesAndRolesService');
var _getPlatform = /*#__PURE__*/new WeakMap();
var _ENCRYPTIONKEY = /*#__PURE__*/new WeakMap();
var _Database = /*#__PURE__*/new WeakMap();
class NamesAndRoles {
  constructor(getPlatform, ENCRYPTIONKEY, Database) {
    _classPrivateFieldInitSpec(this, _getPlatform, null);
    _classPrivateFieldInitSpec(this, _ENCRYPTIONKEY, '');
    _classPrivateFieldInitSpec(this, _Database, void 0);
    _classPrivateFieldSet(_getPlatform, this, getPlatform);
    _classPrivateFieldSet(_ENCRYPTIONKEY, this, ENCRYPTIONKEY);
    _classPrivateFieldSet(_Database, this, Database);
  }

  /**
   * @description Retrieves members from platform.
   * @param {Object} idtoken - Idtoken for the user.
   * @param {Object} options - Request options.
   * @param {String} [options.role] - Filters based on the User role.
   * @param {Number} [options.limit] - Sets a maximum number of memberships to be returned per page.
   * @param {Number} [options.pages = 1] - Sets a maximum number of pages to be returned. Defaults to 1. If set to false retrieves every available page.
   * @param {String} [options.url] - Retrieve memberships from a specific URL. Usually retrieved from the `next` link header of a previous request.
   * @param {Boolean} [options.resourceLinkId = false] - If set to true, retrieves resource Link level memberships.
   */
  async getMembers(idtoken, options) {
    if (!idtoken) {
      provNamesAndRolesServiceDebug('Missing IdToken object.');
      throw new Error('MISSING_ID_TOKEN');
    }
    provNamesAndRolesServiceDebug('Attempting to retrieve memberships');
    provNamesAndRolesServiceDebug('Target platform: ' + idtoken.iss);
    const platform = await _classPrivateFieldGet(_getPlatform, this).call(this, idtoken.iss, idtoken.clientId, _classPrivateFieldGet(_ENCRYPTIONKEY, this), _classPrivateFieldGet(_Database, this));
    if (!platform) {
      provNamesAndRolesServiceDebug('Platform not found');
      throw new Error('PLATFORM_NOT_FOUND');
    }
    const platformActive = await platform.platformActive();
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
    provNamesAndRolesServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']');
    const tokenRes = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly');
    provNamesAndRolesServiceDebug('Access_token retrieved for [' + idtoken.iss + ']');
    let pages = 1; // Page limit
    let query = [];
    let next = idtoken.platformContext.namesRoles.context_memberships_url;
    if (options) {
      if (options.pages || options.pages === false) {
        provNamesAndRolesServiceDebug('Maximum number of pages retrieved: ' + options.pages);
        pages = options.pages;
      }
      if (options.url) {
        next = options.url;
        query = false;
      } else {
        if (options.role) {
          provNamesAndRolesServiceDebug('Adding role parameter with value: ' + options.role);
          query.push(['role', options.role]);
        }
        if (options.limit) {
          provNamesAndRolesServiceDebug('Adding limit parameter with value: ' + options.limit);
          query.push(['limit', options.limit]);
        }
        if (options.resourceLinkId) {
          provNamesAndRolesServiceDebug('Adding rlid parameter with value: ' + idtoken.platformContext.resource.id);
          query.push(['rlid', idtoken.platformContext.resource.id]);
        }
      }
    }
    if (query && query.length > 0) query = new URLSearchParams(query);else query = false;
    let differences;
    let result;
    let curPage = 1;
    do {
      if (pages && curPage > pages) {
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
      const parsedLinks = parseLink(headers.link);
      // Trying to find "rel=differences" header
      if (parsedLinks && parsedLinks.differences) differences = parsedLinks.differences.url;
      // Trying to find "rel=next" header, indicating additional pages
      if (parsedLinks && parsedLinks.next) next = parsedLinks.next.url;else next = false;
      curPage++;
    } while (next);
    if (differences) result.differences = differences;
    provNamesAndRolesServiceDebug('Memberships retrieved');
    return result;
  }
}
module.exports = NamesAndRoles;