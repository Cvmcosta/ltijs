// Dependencies
const provLoginDebug = require('debug')('provider:login')
const provLaunchDebug = require('debug')('provider:launch')

/**
 * @description LTI 1.3 Core service methods.
 */
class Core {
  /**
   * @description LTI 1.3 Login handler
   */
  async login (req, res) {
    const params = { ...req.query, ...req.body }
      try {
        if (!params.iss || !params.login_hint || !params.target_link_uri) return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'MISSING_LOGIN_PARAMETERS' } })
        const iss = params.iss
        provMainDebug('Receiving a login request from: ' + iss)
        let platform
        if (params.client_id) platform = await this.getPlatform(iss, params.client_id)
        else platform = (await this.getPlatform(iss))[0]

        if (platform) {
          const platformActive = await platform.platformActive()
          if (!platformActive) return this.#inactivePlatformCallback(req, res)

          provMainDebug('Redirecting to platform authentication endpoint')
          // Create state parameter used to validade authentication response
          let state = encodeURIComponent(crypto.randomBytes(25).toString('hex'))

          provMainDebug('Target Link URI: ', params.target_link_uri)
          /* istanbul ignore next */
          // Cleaning up target link uri and retrieving query parameters
          if (params.target_link_uri.includes('?')) {
            // Retrieve raw queries
            const rawQueries = new URLSearchParams('?' + params.target_link_uri.split('?')[1])
            // Check if state is unique
            while (await this.Database.Get(false, 'state', { state: state })) state = encodeURIComponent(crypto.randomBytes(25).toString('hex'))
            provMainDebug('Generated state: ', state)
            // Assemble queries object
            const queries = {}
            for (const [key, value] of rawQueries) { queries[key] = value }
            params.target_link_uri = params.target_link_uri.split('?')[0]
            provMainDebug('Query parameters found: ', queries)
            provMainDebug('Final Redirect URI: ', params.target_link_uri)
            // Store state and query parameters on database
            await this.Database.Insert(false, 'state', { state: state, query: queries })
          }

          // Setting up validation info
          const cookieOptions = JSON.parse(JSON.stringify(this.#cookieOptions))
          cookieOptions.maxAge = 60 * 1000 // Adding max age to state cookie = 1min
          res.cookie('state' + state, iss, cookieOptions)

          // Redirect to authentication endpoint
          const query = await Request.ltiAdvantageLogin(params, platform, state)
          provMainDebug('Login request: ')
          provMainDebug(query)
          res.redirect(url.format({
            pathname: await platform.platformAuthEndpoint(),
            query: query
          }))
        } else {
          provMainDebug('Unregistered platform attempting connection: ' + iss)
          return this.#unregisteredPlatformCallback(req, res)
        }
      } catch (err) {
        provMainDebug(err)
        return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: err.message } })
      }
  }
}

module.exports = Core
