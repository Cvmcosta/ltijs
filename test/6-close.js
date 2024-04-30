// Test for the Provider class close method
// Cvmcosta 2020

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect

const lti = require('../dist/Provider/Provider')

describe('Testing shutdown method', function () {
  this.timeout(10000)

  // Closes connections
  it('Provider.close expected to return true', async () => {
    await expect(lti.deletePlatform('http://localhost/moodle', 'ClientId1')).to.eventually.become(true)
    await expect(lti.deletePlatform('http://localhost/moodledyn', '123456')).to.eventually.become(true)
    return expect(lti.close({ silent: true })).to.eventually.equal(true)
  })
  it('Provider.registerPlatform expected to throw error when Provider is closed', async () => {
    await expect(lti.registerPlatform({
      url: 'http://localhost/moodle',
      name: 'Platform Name',
      clientId: 'ClientIdThePlatformCreatedForYourApp',
      authenticationEndpoint: 'http://localhost/moodle/AuthorizationUrl',
      accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
      authConfig: { method: 'INVALID_METHOD', key: 'http://localhost/moodle/keyset' }
    })).to.be.rejectedWith(Error)
  })
})
