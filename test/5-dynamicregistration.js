// Tests for the Names and Roles class LTI methods
// Cvmcosta 2020
const nock = require('nock')
const Platform = require('../dist/Utils/Platform')

const chai = require('chai')
const chaiHttp = require('chai-http')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
chai.use(chaiHttp)

const expect = chai.expect

const dynamicRegistrationRequest = { openid_configuration: 'http://localhost/moodledyn/openid_configuration', registration_token: 'gYA8ZDOdQHrsBMiklOIQcyeaLmdUug6a5V6VN28AOp3YFhmUK.oWoiuasjvdvgqweuytbnvcuiyeqyaFK8zWs' }

const configurationInformation = {
  issuer: 'http://localhost/moodledyn',
  authorization_endpoint: 'http://localhost/moodledyn/authorize',
  token_endpoint: 'http://localhost/moodledyn/token',
  'token_ endpoint_auth_methods_supported': ['private_key_jwt'],
  token_endpoint_auth_signing_alg_values_supported: ['RS256'],
  jwks_uri: 'http://localhost/moodledyn/keyset',
  registration_endpoint: 'http://localhost/moodledyn/register',
  scopes_supported: ['openid', 'https://purl.imsglobal.org/spec/lti-gs/scope/contextgroup.readonly', 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem', 'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly', 'https://purl.imsglobal.org/spec/lti-ags/scope/score', 'https://purl.imsglobal.org/spec/lti-reg/scope/registration'],
  response_types_supported: ['id_token'],
  subject_types_supported: ['public', 'pairwise'],
  id_token_signing_alg_values_supported: ['RS256', 'ES256', 'HS256'],
  claims_supported: ['sub', 'iss', 'name', 'given_name', 'family_name', 'nickname', 'picture', 'email', 'locale'],
  'https://purl.imsglobal.org/spec/lti-platform-configuration': {
    product_family_code: 'ExampleLMS',
    messages_supported: [{ type: 'LtiResourceLink' }, { type: 'LtiDeepLinkingRequest', placements: 'ContentArea' }],
    variables: ['CourseSection.timeFrame.end', 'CourseSection.timeFrame.begin', 'Context.id.history', 'ResourceLink.id.history']
  }
}

const registrationResponse = { client_id: '123456' }

const lti = require('../dist/Provider/Provider')

describe('Testing Dynamic registration Service', function () {
  this.timeout(10000)

  it('Dynamic Registration endpoint expected to return valid closing message and register Platform', async () => {
    const url = lti.dynRegRoute()

    nock('http://localhost/moodledyn').get('/openid_configuration').reply(200, configurationInformation)

    nock('http://localhost/moodledyn').post('/register').reply(200, registrationResponse)

    return chai.request(lti.app).get(url).query(dynamicRegistrationRequest).then(async res => {
      expect(res).to.have.status(200)
      const response = res.text
      expect(response).to.equal('<script>(window.opener || window.parent).postMessage({subject:"org.imsglobal.lti.close"}, "*");</script>')
      const platform = await lti.getPlatform('http://localhost/moodledyn', '123456')
      expect(platform).to.be.instanceOf(Platform)
      await expect(platform.platformActive()).to.eventually.equal(false)
      await expect(platform.platformUrl()).to.eventually.equal(configurationInformation.issuer)
      const authConfig = await platform.platformAuthConfig()
      expect(authConfig.key).to.equal(configurationInformation.jwks_uri)
      await expect(platform.platformAuthenticationEndpoint()).to.eventually.equal(configurationInformation.authorization_endpoint)
      await expect(platform.platformAccessTokenEndpoint()).to.eventually.equal(configurationInformation.token_endpoint)
    })
  })
  it('Login route with inactive platform is expected to return 401 error', async () => {
    const url = lti.loginRoute()
    return chai.request(lti.app).post(url).send({ iss: 'http://localhost/moodledyn', login_hint: '2', target_link_uri: 'http://localhost:3000/' }).then(res => {
      expect(res).to.have.status(401)
      expect(res.body.details.message).to.equal('Platform not active!')
    })
  })
  it('Dynamically registered Platform expected to be activated by Platform.platformActive(true)', async () => {
    const platform = await lti.getPlatform('http://localhost/moodledyn', '123456')
    expect(platform).to.be.instanceOf(Platform)
    await expect(platform.platformActive()).to.eventually.equal(false)
    await platform.platformActive(true)
    await expect(platform.platformActive()).to.eventually.equal(true)
  })
})
