/* eslint-disable require-atomic-updates */
/* eslint-disable no-useless-escape */

/* Provider Assignment and Grade Services */

const find = require('lodash.find')
const got = require('got')
const provGradeScoreDebug = require('debug')('provider:gradeScore')

class Grade {
  /**
     * @description Publishes a score or grade to a platform
     * @param {Object} idtoken - Idtoken for the user
     * @param {Object} score - Score/Grade following the Lti Standard application/vnd.ims.lis.v1.score+json
     */
  static async ScorePublish (idtoken, score) {
    provGradeScoreDebug('Target platform: ' + idtoken.iss)

    let platform = await this.getPlatform(idtoken.iss)

    if (!platform) {
      provGradeScoreDebug('Platform not found, returning false')
      return false
    }

    provGradeScoreDebug('Attempting to retrieve platform access_token for [' + idtoken.iss + ']')
    try {
      let tokenRes = await platform.platformAccessToken()
      provGradeScoreDebug('Access_token retrieved for [' + idtoken.iss + ']')
      let lineitemsEndpoint = idtoken.endpoint.lineitems

      let lineitemRes = await got.get(lineitemsEndpoint, { headers: { Authorization: tokenRes.token_type + ' ' + tokenRes.access_token }, body: JSON.stringify({ request: 'lineitems' }) })

      let resourceId = idtoken.platformContext.resource

      let lineitem = find(JSON.parse(lineitemRes.body), ['resourceLinkId', resourceId.id])
      let lineitemUrl = lineitem.id
      let scoreUrl = lineitemUrl + '/scores'

      if (lineitemUrl.indexOf('?') !== -1) {
        let query = lineitemUrl.split('\?')[1]
        let url = lineitemUrl.split('\?')[0]
        scoreUrl = url + '/scores?' + query
      }

      provGradeScoreDebug('Sending score to: ' + scoreUrl)

      score.userId = idtoken.user
      score.timestamp = new Date(Date.now()).toISOString()
      score.scoreMaximum = lineitem.scoreMaximum
      provGradeScoreDebug(score)

      let finalRes = await got.post(scoreUrl, { headers: { Authorization: tokenRes.token_type + ' ' + tokenRes.access_token, 'Content-Type': 'application/vnd.ims.lis.v1.score+json' }, body: JSON.stringify(score) })
      if (finalRes.statusCode === 200) {
        provGradeScoreDebug('Score successfully sent')
        return true
      }
      return false
    } catch (err) {
      provGradeScoreDebug(err)
      return false
    }
  }
}

module.exports = Grade
