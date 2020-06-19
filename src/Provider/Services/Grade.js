/* eslint-disable require-atomic-updates */
/* eslint-disable no-useless-escape */

/* Provider Assignment and Grade Service */

const got = require('got')
const provGradeServiceDebug = require('debug')('provider:gradeService')

class Grade {
  #getPlatform = null

  #ENCRYPTIONKEY = ''

  #Database

  constructor (getPlatform, ENCRYPTIONKEY, Database) {
    this.#getPlatform = getPlatform
    this.#ENCRYPTIONKEY = ENCRYPTIONKEY
    this.#Database = Database
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
   */
  async getLineItems (idtoken, options, accessToken) {
    if (!idtoken) { provGradeServiceDebug('IdToken object missing.'); throw new Error('MISSING_ID_TOKEN') }
    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    if (!accessToken) {
      const platform = await this.#getPlatform(idtoken.iss, this.#ENCRYPTIONKEY, this.#Database) // Remove and use DB instead

      if (!platform) {
        provGradeServiceDebug('Platform not found')
        throw new Error('PLATFORM_NOT_FOUND')
      }

      provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')

      accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly')
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')
    }

    const lineitemsEndpoint = idtoken.endpoint.lineitems

    let queryParams = []
    if (options) {
      if (options.resourceLinkId) queryParams.push(['resource_link_id', idtoken.platformContext.resource.id])
      if (options.limit) queryParams.push(['limit', options.limit])
      if (options.tag) queryParams.push(['tag', options.tag])
      if (options.resourceId) queryParams.push(['resource_id', options.resourceId])
    }
    queryParams = new URLSearchParams(queryParams)

    let lineItems = await got.get(lineitemsEndpoint, { searchParams: queryParams, headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token, Accept: 'application/vnd.ims.lis.v2.lineitemcontainer+json' } }).json()

    // Applying special filters
    if (options && options.id) lineItems = lineItems.filter(lineitem => { return lineitem.id === options.id })
    if (options && options.label) lineItems = lineItems.filter(lineitem => { return lineitem.label === options.label })

    return lineItems
  }

  /**
   * @description Creates a new lineItem for the given context
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} lineItem - LineItem Object, following the application/vnd.ims.lis.v2.lineitem+json specification
   * @param {Object} [options] - Aditional configuration for the lineItem
   * @param {Boolean} [options.resourceLinkId = false] - If set to true, binds the created lineItem to the resource that originated the request
   */
  async createLineItem (idtoken, lineItem, options, accessToken) {
    // Validating lineItem
    if (!idtoken) { provGradeServiceDebug('IdToken object missing.'); throw new Error('MISSING_ID_TOKEN') }
    if (!lineItem) { provGradeServiceDebug('Line item object missing.'); throw new Error('MISSING_LINE_ITEM') }

    if (options && options.resourceLinkId) lineItem.resourceLinkId = idtoken.platformContext.resource.id

    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    if (!accessToken) {
      const platform = await this.#getPlatform(idtoken.iss, this.#ENCRYPTIONKEY, this.#Database)

      if (!platform) {
        provGradeServiceDebug('Platform not found')
        throw new Error('PLATFORM_NOT_FOUND')
      }

      provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')

      accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem')
      provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')
    }
    const lineitemsEndpoint = idtoken.endpoint.lineitems

    provGradeServiceDebug('Creating Line item: ')
    provGradeServiceDebug(lineItem)

    const newLineItem = await got.post(lineitemsEndpoint, { headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token, 'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json' }, json: lineItem }).json()

    provGradeServiceDebug('Line item successfully created')
    return newLineItem
  }

  /**
   * @description Deletes lineitems from a given platform
   * @param {Object} idtoken - Idtoken for the user
   * @param {Object} [options] - Options object
   * @param {Boolean} [options.resourceLinkId = false] - Filters line items based on the resourceLinkId of the resource that originated the request
   * @param {String} [options.resourceId = false] - Filters line items based on the resourceId
   * @param {String} [options.tag = false] - Filters line items based on the tag
   * @param {Number} [options.limit = false] - Sets a maximum number of line items to be deleted
   * @param {String} [options.id = false] - Filters line items based on the id
   * @param {String} [options.label = false] - Filters line items based on the label
   */
  async deleteLineItems (idtoken, options) {
    if (!idtoken) { provGradeServiceDebug('IdToken object missing.'); throw new Error('MISSING_ID_TOKEN') }

    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    const platform = await this.#getPlatform(idtoken.iss, this.#ENCRYPTIONKEY, this.#Database)

    if (!platform) {
      provGradeServiceDebug('Platform not found')
      throw new Error('PLATFORM_NOT_FOUND')
    }

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem')
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')

    const lineItems = await this.getLineItems(idtoken, options, accessToken)

    const result = { success: [], failure: [] }
    for (const lineitem of lineItems) {
      try {
        const lineitemUrl = lineitem.id

        provGradeServiceDebug('Deleting: ' + lineitemUrl)
        await got.delete(lineitemUrl, { headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token } })
        provGradeServiceDebug('LineItem sucessfully deleted')
        result.success.push({ lineitem: lineitemUrl })
      } catch (err) {
        provGradeServiceDebug(err)
        result.failure.push({ lineitem: lineitem.id, error: err.message })
        continue
      }
    }
    return result
  }

  /**
     * @description Publishes a score or grade to a platform. Represents the Score Publish service described in the lti 1.3 specification
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
  async scorePublish (idtoken, score, options) {
    if (!idtoken) { provGradeServiceDebug('IdToken object missing.'); throw new Error('MISSING_ID_TOKEN') }
    if (!score) { provGradeServiceDebug('Score object missing.'); throw new Error('MISSING_SCORE') }
    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    const platform = await this.#getPlatform(idtoken.iss, this.#ENCRYPTIONKEY, this.#Database)

    if (!platform) {
      provGradeServiceDebug('Platform not found')
      throw new Error('PLATFORM_NOT_FOUND')
    }

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')

    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score')
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')

    if (options) {
      if (options.resourceLinkId === false) options.resourceLinkId = false
      else options.resourceLinkId = true
    } else options = { resourceLinkId: true }

    const lineItems = await this.getLineItems(idtoken, options, accessToken)

    const result = { success: [], failure: [] }

    if (lineItems.length === 0) {
      if (options && options.autoCreate) {
        provGradeServiceDebug('No line item found, creating new lite item automatically')
        lineItems.push(await this.createLineItem(idtoken, options.autoCreate, { resourceLinkId: options.resourceLinkId }, accessToken))
      } else provGradeServiceDebug('No available line item found')
    }

    for (const lineitem of lineItems) {
      try {
        const lineitemUrl = lineitem.id
        let scoreUrl = lineitemUrl + '/scores'

        if (lineitemUrl.indexOf('?') !== -1) {
          const query = lineitemUrl.split('\?')[1]
          const url = lineitemUrl.split('\?')[0]
          scoreUrl = url + '/scores?' + query
        }

        provGradeServiceDebug('Sending score to: ' + scoreUrl)

        if (options && options.userId) score.userId = options.userId
        else score.userId = idtoken.user

        score.timestamp = new Date(Date.now()).toISOString()
        score.scoreMaximum = lineitem.scoreMaximum
        provGradeServiceDebug(score)

        await got.post(scoreUrl, { headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token, 'Content-Type': 'application/vnd.ims.lis.v1.score+json' }, json: score })
        provGradeServiceDebug('Score successfully sent')
        result.success.push({ lineitem: lineitemUrl })
      } catch (err) {
        provGradeServiceDebug(err)
        result.failure.push({ lineitem: lineitem.id, error: err.message })
        continue
      }
    }
    return result
  }

  /**
   * @description Retrieves a certain lineitem's results. Represents the Result service described in the lti 1.3 specification
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
  async result (idtoken, options) {
    if (!idtoken) { provGradeServiceDebug('IdToken object missing.'); throw new Error('MISSING_ID_TOKEN') }

    provGradeServiceDebug('Target platform: ' + idtoken.iss)

    const platform = await this.#getPlatform(idtoken.iss, this.#ENCRYPTIONKEY, this.#Database)

    if (!platform) {
      provGradeServiceDebug('Platform not found')
      throw new Error('PLATFORM_NOT_FOUND')
    }

    provGradeServiceDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')
    const accessToken = await platform.platformAccessToken('https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly')
    provGradeServiceDebug('Access_token retrieved for [' + idtoken.iss + ']')

    let limit = false

    if (options) {
      if (options.resourceLinkId === false) options.resourceLinkId = false
      else options.resourceLinkId = true

      if (options.limit) {
        limit = options.limit
        options.limit = false
      }
    } else options = { resourceLinkId: true }

    const lineItems = await this.getLineItems(idtoken, options, accessToken)

    let queryParams = []
    if (options) {
      if (options.userId) queryParams.push(['user_id', options.userId])
      if (limit) queryParams.push(['limit', limit])
    }
    queryParams = new URLSearchParams(queryParams)
    queryParams = queryParams.toString()

    const resultsArray = []

    for (const lineitem of lineItems) {
      try {
        const lineitemUrl = lineitem.id
        let resultsUrl = lineitemUrl + '/results'

        if (lineitemUrl.indexOf('?') !== -1) {
          const query = lineitemUrl.split('\?')[1]
          const url = lineitemUrl.split('\?')[0]
          resultsUrl = url + '/results?' + query + '&' + queryParams
        } else {
          resultsUrl = resultsUrl + '?' + queryParams
        }

        provGradeServiceDebug('Requesting results from: ' + resultsUrl)
        const results = await got.get(resultsUrl, { headers: { Authorization: accessToken.token_type + ' ' + accessToken.access_token, Accept: 'application/vnd.ims.lis.v2.resultcontainer+json' } }).json()

        resultsArray.push({
          lineItem: lineitem.id,
          results: results
        })
      } catch (err) {
        provGradeServiceDebug(err.message)
        continue
      }
    }
    return resultsArray
  }

  // Deprecated methods, these methods will be removed in version 6.0

  /**
   * @description Gets lineitems from a given platform. This method is deprecated, use getLineItems() instead.
   * @deprecated
   */
  async GetLineItems (idtoken, options, accessToken) {
    console.log('Deprecation warning: GetLineItems() is now deprecated, use getLineItems() instead. GetLineItems() will be removed in the 6.0 release.')
    return this.getLineItems(idtoken, options, accessToken)
  }

  /**
   * @description Creates a new lineItem for the given context. This method is deprecated, use createLineItem() instead.
   * @deprecated
   */
  async CreateLineItem (idtoken, lineItem, options, accessToken) {
    console.log('Deprecation warning: CreateLineItem() is now deprecated, use createLineItem() instead. CreateLineItem() will be removed in the 6.0 release.')
    return this.createLineItem(idtoken, lineItem, options, accessToken)
  }

  /**
   * @description Deletes lineitems from a given platform. This method is deprecated, use createLineItem() instead.
   * @deprecated
   */
  async DeleteLineItems (idtoken, options) {
    console.log('Deprecation warning: DeleteLineItems() is now deprecated, use deleteLineItems() instead. DeleteLineItems() will be removed in the 6.0 release.')
    return this.deleteLineItems(idtoken, options)
  }

  /**
   * @description Publishes a score or grade to a platform. Represents the Score Publish service described in the lti 1.3 specification. This method is deprecated, use scorePublish() instead.
   * @deprecated
   */
  async ScorePublish (idtoken, score, options) {
    console.log('Deprecation warning: ScorePublish() is now deprecated, use scorePublish() instead. ScorePublish() will be removed in the 6.0 release.')
    return this.scorePublish(idtoken, score, options)
  }

  /**
   * @description Retrieves a certain lineitem's results. Represents the Result service described in the lti 1.3 specification. This method is deprecated, use scorePublish() instead.
   * @deprecated
   */
  async Result (idtoken, options) {
    console.log('Deprecation warning: Result() is now deprecated, use result() instead. Result() will be removed in the 6.0 release.')
    return this.result(idtoken, options)
  }
}

module.exports = Grade
