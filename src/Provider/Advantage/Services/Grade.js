/* eslint-disable require-atomic-updates */
/* eslint-disable no-useless-escape */

/* Provider Assignment and Grade Service */

// Dependencies
const got = require('got')
const parseLink = require('parse-link-header')
const provGradeServiceDebug = require('debug')('provider:gradeService')

// Classes
const Platform = require('../Classes/Platform')

class Grade {
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
  static async getLineItems (idtoken, options, accessToken) {
    if (!idtoken) { provGradeServiceDebug('Missing IdToken object.'); throw new Error('MISSING_ID_TOKEN') }
    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    if (!accessToken) {
      const platform = await Platform.getPlatform(idtoken.iss, idtoken.clientId)
      /* istanbul ignore next */
      if (!platform) {
        provGradeServiceDebug('Platform not found')
        throw new Error('PLATFORM_NOT_FOUND')
      }
      const platformActive = await platform.platformActive()
      if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED')

      provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')

      accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly')
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')
    }

    const result = {}
    let response

    if (options && options.url) {
      provGradeServiceDebug('Requesting line items from: ' + options.url)
      response = await got.get(options.url, { headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token, Accept: 'application/vnd.ims.lis.v2.lineitemcontainer+json' } })
    } else {
      let lineitemsEndpoint = idtoken.platformContext.endpoint.lineitems
      let query = []
      if (lineitemsEndpoint.indexOf('?') !== -1) {
        query = Array.from(new URLSearchParams(lineitemsEndpoint.split('\?')[1]))
        lineitemsEndpoint = lineitemsEndpoint.split('\?')[0]
      }

      let queryParams = [...query]
      if (options) {
        if (options.resourceLinkId) queryParams.push(['resource_link_id', idtoken.platformContext.resource.id])
        if (options.limit && !options.id && !options.label) queryParams.push(['limit', options.limit])
        if (options.tag) queryParams.push(['tag', options.tag])
        if (options.resourceId) queryParams.push(['resource_id', options.resourceId])
      }
      queryParams = new URLSearchParams(queryParams)
      provGradeServiceDebug('Requesting line items from: ' + lineitemsEndpoint)
      response = await got.get(lineitemsEndpoint, { searchParams: queryParams, headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token, Accept: 'application/vnd.ims.lis.v2.lineitemcontainer+json' } })
    }

    const headers = response.headers
    let lineItems = JSON.parse(response.body)

    // Parsing link headers
    const parsedLinks = parseLink(headers.link)

    if (parsedLinks) {
      if (parsedLinks.next) result.next = parsedLinks.next.url
      if (parsedLinks.prev) result.prev = parsedLinks.prev.url
      if (parsedLinks.first) result.first = parsedLinks.first.url
      if (parsedLinks.last) result.last = parsedLinks.last.url
    }

    // Applying special filters
    if (options && options.id) lineItems = lineItems.filter(lineitem => { return lineitem.id === options.id })
    if (options && options.label) lineItems = lineItems.filter(lineitem => { return lineitem.label === options.label })
    if (options && options.limit && (options.id || options.label) && options.limit < lineItems.length) lineItems = lineItems.slice(0, options.limit)

    result.lineItems = lineItems
    return result
  }

  /**
   * @description Creates a new lineItem for the given context
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} lineItem - LineItem Object, following the application/vnd.ims.lis.v2.lineitem+json specification
   * @param {Object} [options] - Aditional configuration for the lineItem
   * @param {Boolean} [options.resourceLinkId = false] - If set to true, binds the created lineItem to the resource that originated the request
   */
  static async createLineItem (idtoken, lineItem, options, accessToken) {
    // Validating lineItem
    if (!idtoken) { provGradeServiceDebug('Missing IdToken object.'); throw new Error('MISSING_ID_TOKEN') }
    if (!lineItem) { provGradeServiceDebug('Line item object missing.'); throw new Error('MISSING_LINE_ITEM') }

    if (options && options.resourceLinkId) lineItem.resourceLinkId = idtoken.platformContext.resource.id

    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    if (!accessToken) {
      const platform = await Platform.getPlatform(idtoken.iss, idtoken.clientId)

      /* istanbul ignore next */
      if (!platform) {
        provGradeServiceDebug('Platform not found')
        throw new Error('PLATFORM_NOT_FOUND')
      }
      const platformActive = await platform.platformActive()
      if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED')

      provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')

      accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem')
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')
    }
    const lineitemsEndpoint = idtoken.platformContext.endpoint.lineitems

    provGradeServiceDebug('Creating Line item: ')
    provGradeServiceDebug(lineItem)

    const newLineItem = await got.post(lineitemsEndpoint, { headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token, 'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json' }, json: lineItem }).json()

    provGradeServiceDebug('Line item successfully created')
    return newLineItem
  }

  /**
   * @description Gets LineItem by the ID
   * @param {Object} idtoken - Idtoken for the user
   * @param {String} lineItemId - LineItem ID.
   */
  static async getLineItemById (idtoken, lineItemId, accessToken) {
    if (!idtoken) { provGradeServiceDebug('Missing IdToken object.'); throw new Error('MISSING_ID_TOKEN') }
    if (!lineItemId) { provGradeServiceDebug('Missing lineItemID.'); throw new Error('MISSING_LINEITEM_ID') }

    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    if (!accessToken) {
      const platform = await Platform.getPlatform(idtoken.iss, idtoken.clientId) // Remove and use DB instead

      /* istanbul ignore next */
      if (!platform) {
        provGradeServiceDebug('Platform not found')
        throw new Error('PLATFORM_NOT_FOUND')
      }
      const platformActive = await platform.platformActive()
      if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED')

      provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')

      accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly')
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')
    }

    const lineitemUrl = lineItemId
    provGradeServiceDebug('Retrieving: ' + lineitemUrl)
    let response = await got.get(lineitemUrl, { headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token } })
    response = JSON.parse(response.body)
    provGradeServiceDebug('LineItem sucessfully retrieved')
    return response
  }

  /**
   * @description Updates LineItem by the ID
   * @param {Object} idtoken - Idtoken for the user
   * @param {String} lineItemId - LineItem ID.
   * @param {Object} lineItem - Updated fields.
   */
  static async updateLineItemById (idtoken, lineItemId, lineItem) {
    if (!idtoken) { provGradeServiceDebug('Missing IdToken object.'); throw new Error('MISSING_ID_TOKEN') }
    if (!lineItemId) { provGradeServiceDebug('Missing lineItemID.'); throw new Error('MISSING_LINEITEM_ID') }
    if (!lineItem) { provGradeServiceDebug('Missing lineItem object.'); throw new Error('MISSING_LINEITEM') }

    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    const platform = await Platform.getPlatform(idtoken.iss, idtoken.clientId)

    /* istanbul ignore next */
    if (!platform) {
      provGradeServiceDebug('Platform not found')
      throw new Error('PLATFORM_NOT_FOUND')
    }
    const platformActive = await platform.platformActive()
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED')

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem')
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')

    const lineitemUrl = lineItemId
    provGradeServiceDebug('Updating: ' + lineitemUrl)
    let response = await got.put(lineitemUrl, { json: lineItem, headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token, 'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json' } })
    response = JSON.parse(response.body)
    provGradeServiceDebug('LineItem sucessfully updated')
    return response
  }

  /**
   * @description Deletes LineItem by the ID
   * @param {Object} idtoken - Idtoken for the user
   * @param {String} lineItemId - LineItem ID.
   */
  static async deleteLineItemById (idtoken, lineItemId) {
    if (!idtoken) { provGradeServiceDebug('Missing IdToken object.'); throw new Error('MISSING_ID_TOKEN') }
    if (!lineItemId) { provGradeServiceDebug('Missing lineItemID.'); throw new Error('MISSING_LINEITEM_ID') }

    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    const platform = await Platform.getPlatform(idtoken.iss, idtoken.clientId)

    /* istanbul ignore next */
    if (!platform) {
      provGradeServiceDebug('Platform not found')
      throw new Error('PLATFORM_NOT_FOUND')
    }
    const platformActive = await platform.platformActive()
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED')

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem')
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')

    const lineitemUrl = lineItemId
    provGradeServiceDebug('Deleting: ' + lineitemUrl)
    await got.delete(lineitemUrl, { headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token } })
    provGradeServiceDebug('LineItem sucessfully deleted')
    return true
  }

  /**
   * @description Publishes a score or grade to a lineItem. Represents the Score Publish service described in the lti 1.3 specification.
   * @param {Object} idtoken - Idtoken for the user.
   * @param {String} lineItemId - LineItem ID.
   * @param {Object} score - Score/Grade following the LTI Standard application/vnd.ims.lis.v1.score+json.
   */
  static async submitScore (idtoken, lineItemId, score) {
    if (!idtoken) { provGradeServiceDebug('Missing IdToken object.'); throw new Error('MISSING_ID_TOKEN') }
    if (!lineItemId) { provGradeServiceDebug('Missing lineItemID.'); throw new Error('MISSING_LINEITEM_ID') }
    if (!score) { provGradeServiceDebug('Score object missing.'); throw new Error('MISSING_SCORE') }
    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    const platform = await Platform.getPlatform(idtoken.iss, idtoken.clientId)

    /* istanbul ignore next */
    if (!platform) {
      provGradeServiceDebug('Platform not found')
      throw new Error('PLATFORM_NOT_FOUND')
    }
    const platformActive = await platform.platformActive()
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED')

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score')
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')

    // Creating scores URL
    const lineitemUrl = lineItemId
    let scoreUrl = lineitemUrl + '/scores'
    if (lineitemUrl.indexOf('?') !== -1) {
      const query = lineitemUrl.split('\?')[1]
      const url = lineitemUrl.split('\?')[0]
      scoreUrl = url + '/scores?' + query
    }

    // Creating scoreMaximum if it is not present and scoreGiven exists
    if (score.scoreGiven !== undefined && score.scoreMaximum === undefined) {
      const lineItem = await this.getLineItemById(idtoken, lineItemId, accessToken)
      score.scoreMaximum = lineItem.scoreMaximum
    }
    // If no user is specified, sends the score to the user that originated request
    if (score.userId === undefined) score.userId = idtoken.user
    // Creating timestamp
    score.timestamp = new Date(Date.now()).toISOString()

    provGradeServiceDebug('Sending score to: ' + scoreUrl)
    provGradeServiceDebug(score)

    await got.post(scoreUrl, { headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token, 'Content-Type': 'application/vnd.ims.lis.v1.score+json' }, json: score })
    provGradeServiceDebug('Score successfully sent')
    return score
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
  static async getScores (idtoken, lineItemId, options) {
    if (!idtoken) { provGradeServiceDebug('Missing IdToken object.'); throw new Error('MISSING_ID_TOKEN') }
    if (!lineItemId) { provGradeServiceDebug('Missing lineItemID.'); throw new Error('MISSING_LINEITEM_ID') }

    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    const platform = await Platform.getPlatform(idtoken.iss, idtoken.clientId)

    /* istanbul ignore next */
    if (!platform) {
      provGradeServiceDebug('Platform not found')
      throw new Error('PLATFORM_NOT_FOUND')
    }
    const platformActive = await platform.platformActive()
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED')

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly')
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')

    const result = {}
    let response

    if (options && options.url) {
      provGradeServiceDebug('Requesting scores from: ' + options.url)
      response = await got.get(options.url, { headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token, Accept: 'application/vnd.ims.lis.v2.resultcontainer+json' } })
    } else {
      // Creating results URL
      const lineitemUrl = lineItemId
      let query = []
      let resultsUrl = lineitemUrl + '/results'
      if (lineitemUrl.indexOf('?') !== -1) {
        query = Array.from(new URLSearchParams(lineitemUrl.split('\?')[1]))
        const url = lineitemUrl.split('\?')[0]
        resultsUrl = url + '/results'
      }

      // Creating query parameters
      const queryParams = []
      if (options) {
        if (options.userId) queryParams.push(['user_id', options.userId])
        if (options.limit) queryParams.push(['limit', options.limit])
      }
      let searchParams = [...queryParams, ...query]
      searchParams = new URLSearchParams(searchParams)

      provGradeServiceDebug('Requesting scores from: ' + resultsUrl)
      response = await got.get(resultsUrl, { searchParams: searchParams, headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token, Accept: 'application/vnd.ims.lis.v2.resultcontainer+json' } })
    }

    const headers = response.headers
    result.scores = JSON.parse(response.body)

    // Parsing link headers
    const parsedLinks = parseLink(headers.link)

    if (parsedLinks) {
      if (parsedLinks.next) result.next = parsedLinks.next.url
      if (parsedLinks.prev) result.prev = parsedLinks.prev.url
      if (parsedLinks.first) result.first = parsedLinks.first.url
      if (parsedLinks.last) result.last = parsedLinks.last.url
    }

    return result
  }
}

module.exports = Grade
