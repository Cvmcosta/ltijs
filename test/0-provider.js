// Tests for the Provider class main methods
// Cvmcosta 2020

const chai = require('chai')
const chaiHttp = require('chai-http')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
chai.use(chaiHttp)

const expect = chai.expect
const path = require('path')

const lti = require('../dist/Provider/Provider')
const Platform = require('../dist/Utils/Platform')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const appRoute = '/approute'
const loginRoute = '/loginroute'
const sessionTimeoutRoute = '/sessiontimeoutroute'
const invalidTokenRoute = '/invalidtokenroute'
const keysetRoute = '/keysetroute'

describe('Testing Provider', function () {
  this.timeout(10000)

  // Setting up provider
  it('Provider.setup expected to not throw Error', () => {
    const fn = () => {
      lti.setup('LTIKEY',
        { url: 'mongodb://127.0.0.1/testdatabase' },
        {
          appRoute: appRoute,
          loginRoute: loginRoute,
          sessionTimeoutRoute: sessionTimeoutRoute,
          invalidTokenRoute: invalidTokenRoute,
          keysetRoute: keysetRoute,
          staticPath: path.join(__dirname, '/views/'),
          devMode: true
        })
      return lti
    }
    expect(fn).to.not.throw(Error)
  })
  it('Provider.appRoute expected to return registered route', () => {
    expect(lti.appRoute()).to.be.a('string').equal(appRoute)
  })
  it('Provider.loginRoute expected to return registered route', () => {
    expect(lti.loginRoute()).to.be.a('string').equal(loginRoute)
  })
  it('Provider.sessionTimeoutRoute expected to return registered route', () => {
    expect(lti.sessionTimeoutRoute()).to.be.a('string').equal(sessionTimeoutRoute)
  })
  it('Provider.invalidTokenRoute expected to return registered route', () => {
    expect(lti.invalidTokenRoute()).to.be.a('string').equal(invalidTokenRoute)
  })
  it('Provider.keysetRoute expected to return registered route', () => {
    expect(lti.keysetRoute()).to.be.a('string').equal(keysetRoute)
  })
  it('Provider.whitelist expected to return true', () => {
    expect(lti.whitelist('/whitelist1', { route: '/whitelist2', method: 'POST' })).to.be.equal(true)
  })
  it('Provider.deploy expected to resolve true', async () => {
    await expect(lti.deploy({ silent: true })).to.eventually.become(true)
  })
  it('Provider.registerPlatform expected to resolve Platform object', () => {
    return expect(lti.registerPlatform({
      url: 'http://localhost/moodle',
      name: 'Platform Name',
      clientId: 'ClientIdThePlatformCreatedForYourApp',
      authenticationEndpoint: 'http://localhost/moodle/AuthorizationUrl',
      accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
      authConfig: { method: 'JWK_SET', key: 'http://localhost/moodle/keyset' }
    })).to.eventually.be.instanceOf(Platform)
  })
  it('Provider.getPlatform expected to resolve Platform object', async () => {
    return expect(lti.getPlatform('http://localhost/moodle')).to.eventually.be.instanceOf(Platform)
  })
  it('Provider.getAllPlatforms expected to resolve Array containing registered platforms', async () => {
    const plats = await lti.getAllPlatforms()
    await expect(plats[0].platformUrl()).to.eventually.become('http://localhost/moodle')
  })
  it('Provider.deletePlatform expected to return true and delete the platform', async () => {
    await lti.registerPlatform({
      url: 'http://localhost/moodle2',
      name: 'Platform Name 2',
      clientId: 'ClientIdThePlatformCreatedForYourApp2',
      authenticationEndpoint: 'http://localhost/moodle/AuthorizationUrl2',
      accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl2',
      authConfig: { method: 'JWK_SET', key: 'http://localhost/moodle/keyset2' }
    })
    await expect(lti.getPlatform('http://localhost/moodle2')).to.eventually.be.instanceOf(Platform)
    await expect(lti.deletePlatform('http://localhost/moodle2')).to.eventually.become(true)
    await expect(lti.getPlatform('http://localhost/moodle2')).to.eventually.become(false)
  })
  it('Provider.onConnect expected to throw error when receiving no callback', () => {
    const fn = () => {
      return lti.onConnect()
    }
    expect(fn).to.throw(Error)
  })

  it('Provider.onConnect expected to not throw error when receiving callback', () => {
    const fn = () => {
      return lti.onConnect((req, res) => { res.status(200).send('It works!') })
    }
    expect(fn).to.not.throw(Error)
  })
})
