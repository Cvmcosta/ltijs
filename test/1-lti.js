// Tests for the Provider class LTI methods
// Cvmcosta 2020

const chai = require('chai')
const chaiHttp = require('chai-http')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
chai.use(chaiHttp)

const expect = chai.expect
const nock = require('nock')

const lti = require('../dist/Provider/Provider')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

describe('Testing LTI 1.3 flow', function () {
  this.timeout(10000)

  it('Login route with unregistered platform is expected to return 401 error', async () => {
    const url = await lti.loginRoute()
    return chai.request(lti.app).post(url).send({ iss: 'https://unregisteredPlatform.com' }).then(res => {
      expect(res).to.have.status(401)
    })
  })
  it('Login route POST request with registered platform is expected to redirect to authenticationEndpoint', async () => {
    const url = await lti.loginRoute()
    return chai.request(lti.app).post(url).send({ iss: 'http://localhost/moodle' }).then(res => {
      expect(res).to.redirectTo(/^http:\/\/localhost\/moodle\/AuthorizationUrl.*/)
    })
  })

  it('Login route GET request with registered platform is expected to redirect to authenticationEndpoint', async () => {
    const url = await lti.loginRoute()
    return chai.request(lti.app).get(url).query({ iss: 'http://localhost/moodle' }).then(res => {
      expect(res).to.redirectTo(/^http:\/\/localhost\/moodle\/AuthorizationUrl.*/)
    })
  })
})
