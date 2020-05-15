/* Names and Roles Provisioning Service */

const got = require('got')
const provNamesAndRolesServiceDebug = require('debug')('provider:namesAndRolesService')

class NamesAndRoles {
  #getPlatform = null

  #ENCRYPTIONKEY = ''

  #logger

  #Database

  constructor (getPlatform, ENCRYPTIONKEY, logger, Database) {
    this.#getPlatform = getPlatform
    this.#ENCRYPTIONKEY = ENCRYPTIONKEY
    this.#logger = logger
    this.#Database = Database
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
  async getMembers (idtoken, options) {
    try {
      if (!idtoken) { provNamesAndRolesServiceDebug('IdToken object missing.'); return false }
      provNamesAndRolesServiceDebug('Attempting to retrieve memberships')
      provNamesAndRolesServiceDebug('Target platform: ' + idtoken.iss)

      const platform = await this.#getPlatform(idtoken.iss, this.#ENCRYPTIONKEY, this.#logger, this.#Database)

      if (!platform) {
        provNamesAndRolesServiceDebug('Platform not found, returning false')
        return false
      }

      provNamesAndRolesServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')
      const tokenRes = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly')
      provNamesAndRolesServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')

      let query = []
      if (options && options.role) {
        provNamesAndRolesServiceDebug('Adding role parameter with value: ' + options.role)
        query.push(['role', options.role])
      }
      if (options && options.limit) {
        provNamesAndRolesServiceDebug('Adding limit parameter with value: ' + options.limit)
        query.push(['limit', options.limit])
      }
      if (options && options.pages) provNamesAndRolesServiceDebug('Maximum number of pages retrieved: ' + options.pages)

      query = new URLSearchParams(query)

      const membershipsEndpoint = idtoken.namesRoles.context_memberships_url
      let result
      let next = (options && options.url) ? options.url : false
      let curPage = 1

      do {
        if (options && options.pages && curPage > options.pages) {
          if (next) result.next = next
          break
        }
        let response
        provNamesAndRolesServiceDebug('Member pages found: ', curPage)

        if (!next) response = await got.get(membershipsEndpoint, { searchParams: query, headers: { Authorization: tokenRes.token_type + ' ' + tokenRes.access_token, Accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json' } })
        else response = await got.get(next, { headers: { Authorization: tokenRes.token_type + ' ' + tokenRes.access_token, Accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json' } })

        const headers = response.headers
        const body = JSON.parse(response.body)

        if (!result) result = JSON.parse(JSON.stringify(body))
        else {
          result.members = [
            ...result.members,
            ...body.members
          ]
        }
        // Trying to find "rel=next" header, indicating additional pages
        if (headers.link && headers.link.search(/rel=.*next/)) next = headers.link.split(';rel=next')[0]
        else next = false
        curPage++
      } while (next)

      provNamesAndRolesServiceDebug('Memberships retrieved')
      return result
    } catch (err) {
      provNamesAndRolesServiceDebug(err.message)
      if (this.#logger) this.#logger.log({ level: 'error', message: 'Message: ' + err.message + '\nStack: ' + err.stack })
      return false
    }
  }
}

module.exports = NamesAndRoles
