const chai = require('chai')
const chaiHttp = require('chai-http')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
chai.use(chaiHttp)
const expect = chai.expect
const path = require('path')
const nock = require('nock')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const LTI = require('../dist/Provider/Provider')
const Platform = require('../dist/Utils/Platform')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * @type {LTI}
 */
let lti

describe('Testing Provider', function () {
  this.timeout(8000)
  it('Provider.contructor expected to not throw Error', () => {
    let fn = () => {
      lti = new LTI('EXAMPLEKEY',
        { url: 'mongodb://127.0.0.1/database'
        },
        { appUrl: '/', loginUrl: '/login', staticPath: path.join(__dirname, '/views/') })
      return lti
    }
    expect(fn).to.not.throw(Error)
  })
  it('Provider.appUrl expected to return a String equal to argument', () => {
    expect(lti.appUrl('/')).to.be.a('string').equal('/')
  })
  it('Provider.loginUrl expected to return a String equal to argument', () => {
    expect(lti.loginUrl('/login')).to.be.a('string').equal('/login')
  })
  it('Provider.sessionTimeoutUrl expected to return a String equal to argument', () => {
    expect(lti.sessionTimeoutUrl('/sessionTimeout')).to.be.a('string').equal('/sessionTimeout')
  })
  it('Provider.invalidTokenUrl expected to return a String equal to argument', () => {
    expect(lti.invalidTokenUrl('/invalidToken')).to.be.a('string').equal('/invalidToken')
  })
  it('Provider.deploy expected to resolve true', async () => {
    await expect(lti.deploy()).to.eventually.become(true)
  })
  it('Provider.registerPlatform expected to resolve Platform object', () => {
    return expect(lti.registerPlatform(
      'https://platform.com',
      'Platform Name', 'ClientIdThePlatformCreatedForYourApp',
      'https://platform.com/AuthorizationUrl',
      'https://platform.com/AccessTokenUrl',
      { method: 'JWK_SET', key: 'https://platform.com/keyset' })).to.eventually.be.instanceOf(Platform)
  })
  it('Provider.getPlatform expected to resolve Platform object', async () => {
    return expect(lti.getPlatform('https://platform.com')).to.eventually.be.instanceOf(Platform)
  })
  it('Provider.getAllPlatforms expected to resolve Array', async () => {
    return expect(lti.getAllPlatforms()).to.eventually.be.a('array')
  })
  it('Provider.onConnect expected to not throw error', () => {
    let fn = () => {
      return lti.onConnect((req, res) => { res.sendStatus(200) })
    }
    expect(fn).to.not.throw(Error)
  })

  it('Login route with unregistered platform is expected to return 401', async () => {
    let url = await lti.loginUrl()
    return chai.request(lti.app).post(url).send({ iss: 'https://unregisteredPlatform.com' }).then(res => {
      expect(res).to.have.status(401)
    })
  })

  it('Login route with registered platform is expected to redirect to authenticationEndpoint', async () => {
    nock('https://platform.com').get(/\/AuthorizationUrl.*/).reply(200)
    let url = await lti.loginUrl()
    return chai.request(lti.app).post(url).send({ iss: 'https://platform.com' }).then(res => {
      expect(res).to.redirectTo(/^https:\/\/platform.com\/AuthorizationUrl.*/)
    })
  })

  it('MainApp route receiving no idToken is expected to redirect to the session timeout route', async () => {
    let url = await lti.appUrl()
    return chai.request(lti.app).post(url).then(res => {
      expect(res).to.redirectTo(/.*\/sessionTimeout/)
    })
  })

  it('MainApp route receiving an idtoken is expected to generate cookies, present idToken on final endpoint and return status 200', async () => {
    let plat = await lti.getPlatform('https://platform.com')
    let clientId = await plat.platformClientId()
    let token = {
      nonce: crypto.randomBytes(16).toString('base64'),
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
      iss: 'https://platform.com',
      aud: clientId,
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id': '2',
      'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://localhost',
      sub: '22',
      'https://purl.imsglobal.org/spec/lti/claim/lis': { person_sourcedid: '', course_section_sourcedid: '' },
      'https://purl.imsglobal.org/spec/lti/claim/roles': [
        'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
        'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator'
      ],
      'https://purl.imsglobal.org/spec/lti/claim/context': {
        id: '3',
        label: 'Curso Teste',
        title: 'Curso Teste',
        type: [Array]
      },
      'https://purl.imsglobal.org/spec/lti/claim/resource_link': { title: 'teste local', id: '5' },
      'https://purl.imsglobal.org/spec/lti-bos/claim/basicoutcomesservice': {
        lis_result_sourcedid: '{"data":{"instanceid":"5","userid":"22","typeid":"2","launchid":932474241},"hash":"86f641f363947a7c5e8b0007f612f5dda68c3b7a708b9be0812b7132df5b4075"}',
        lis_outcome_service_url: 'https://alfa.educsaite.org/mod/lti/service.php'
      },
      given_name: 'Carlos',
      family_name: 'Vinícius',
      name: 'Carlos Vinícius',
      'https://purl.imsglobal.org/spec/lti/claim/ext': { user_username: 'cvmcosta10@hotmail.com', lms: 'moodle-2' },
      email: 'cvmcosta10@hotmail.com',
      'https://purl.imsglobal.org/spec/lti/claim/launch_presentation': {
        locale: 'pt_br',
        document_target: 'iframe',
        return_url: 'https://alfa.educsaite.org/mod/lti/return.php?course=3&launch_container=3&instanceid=5&sesskey=ejFUKvABeF'
      },
      'https://purl.imsglobal.org/spec/lti/claim/tool_platform': {
        family_code: 'moodle',
        version: '2019052000.02',
        guid: 'alfa.educsaite.org',
        name: 'educSaite',
        description: 'educSaite'
      },
      'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
      'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
      'https://purl.imsglobal.org/spec/lti/claim/custom': {
        resource: 'qualificacao_dos_processos_de_trabalho_na_ABS/EDUCSAITE/TRILHA_4/SAUDE_PESSOA_DEFICIENCIA_INFANCIA/EBOOK_2',
        system_setting_url: 'https://alfa.educsaite.org/mod/lti/services.php/tool/2/custom',
        context_setting_url: 'https://alfa.educsaite.org/mod/lti/services.php/CourseSection/3/bindings/tool/2/custom',
        link_setting_url: 'https://alfa.educsaite.org/mod/lti/services.php/links/{link_id}/custom'
      },
      'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
        scope: [Array],
        lineitems: 'https://alfa.educsaite.org/mod/lti/services.php/3/lineitems?type_id=2',
        lineitem: ''
      },
      'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice': {
        context_memberships_url: 'https://alfa.educsaite.org/mod/lti/services.php/CourseSection/3/bindings/2/memberships',
        service_versions: [Array]
      }
    }

    let payload = jwt.sign(token, '-----BEGIN RSA PRIVATE KEY-----\n' +
    'MIICWgIBAAKBgFayUq/sZYvDX7gHZP1npuQQEZpluAaSb1wcdzGxWP9IKx/Qnezs\n' +
    'QcFWEsCOD+MoS9u7qWtfxQkcC4t62jj0iTpBxA7xcLcmGTL3WHKQ2E7+iUVam4BM\n' +
    'mbR2vr4y9cAaqlu+cjw0aMmXZwPDFq38kVDmpOd2VVh0SoAZz+d6F5uzAgMBAAEC\n' +
    'gYA8ZDOdQHrsBMiklOIQcyeaLmdUug6a5V6VN28AOp3YFhmUK+oWo+yaFK8zWsJO\n' +
    'Zj+RbQPzO98xHUwdeRKSIiWEk0MT0Y7GfOL61dRNoZty9v/Sf88xTm6djPMZg+LU\n' +
    'npQmBgKtjSBFWJAy0NMn3U892lr6iFfYe5OAMg6ARV6RQQJBAJ/KG2Ds4ig0dURH\n' +
    'UK6Smt76uCtI6HGsSSn58sz5kWmfytfsqj0DHA9ZQrJj/WXa6ex6FL4YIgZBtv/T\n' +
    'UZi/zikCQQCK5bOoAfVzYGb6d94LC4P5OtUN77xF92xbRxRwHyvVwXve9W8Qx0Jl\n' +
    '/tdgvds6AxMZszIqX/mw7B7eA8AM6N57AkBI1wXiCjoSH8+xH11NJzGIIfygZqzn\n' +
    'XKVBiFpBTCcYYipCgfUcuPUqngMEdQZHTyLBlOktuqyP85brSbZxjkX5AkBIKINI\n' +
    'EhRw5zE4iBNby5S5Yt4SimxWMO8jEG9GvHrqZsUylHEp10rgcB92S8vbfINsw5KZ\n' +
    'PxkZ1+FFV89rJYOHAkBsNl1+JXvUa6U5CsKwVzjoBmW+hvGBiuTYsxRbvjdLlsEn\n' +
    '8TMKXIcwoXmy5rqK3fQ9tDg7smgzC/MPJSiI7V+z\n' +
    '-----END RSA PRIVATE KEY-----', { algorithm: 'RS256', keyid: '123456' })

    lti.onConnect((token, req, res) => {
      res.status(200).send(JSON.stringify(res.locals.token))
    })

    nock('https://platform.com').get('/keyset').reply(200, {
      'keys': [
        { 'kty': 'RSA', 'e': 'AQAB', 'kid': '123456', 'n': 'VrJSr-xli8NfuAdk_Wem5BARmmW4BpJvXBx3MbFY_0grH9Cd7OxBwVYSwI4P4yhL27upa1_FCRwLi3raOPSJOkHEDvFwtyYZMvdYcpDYTv6JRVqbgEyZtHa-vjL1wBqqW75yPDRoyZdnA8MWrfyRUOak53ZVWHRKgBnP53oXm7M' }
      ]
    })

    let url = await lti.appUrl()
    return chai.request(lti.app).post(url).type('json').send({ id_token: payload }).then(res => {
      expect(res).to.have.status(200)
      expect(JSON.parse(res.text).iss).to.equal('https://platform.com')
      expect(res.headers['set-cookie'][0].search(/^plat/)).to.not.equal(-1)
    })
  })

  it('Provider.redirect expected to redirect to new route with prepended issuer', async () => {
    let plat = await lti.getPlatform('https://platform.com')
    let clientId = await plat.platformClientId()
    let token = {
      nonce: crypto.randomBytes(16).toString('base64'),
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
      iss: 'https://platform.com',
      aud: clientId,
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id': '2',
      'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://localhost',
      sub: '22',
      'https://purl.imsglobal.org/spec/lti/claim/lis': { person_sourcedid: '', course_section_sourcedid: '' },
      'https://purl.imsglobal.org/spec/lti/claim/roles': [
        'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
        'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator'
      ],
      'https://purl.imsglobal.org/spec/lti/claim/context': {
        id: '3',
        label: 'Curso Teste',
        title: 'Curso Teste',
        type: [Array]
      },
      'https://purl.imsglobal.org/spec/lti/claim/resource_link': { title: 'teste local', id: '5' },
      'https://purl.imsglobal.org/spec/lti-bos/claim/basicoutcomesservice': {
        lis_result_sourcedid: '{"data":{"instanceid":"5","userid":"22","typeid":"2","launchid":932474241},"hash":"86f641f363947a7c5e8b0007f612f5dda68c3b7a708b9be0812b7132df5b4075"}',
        lis_outcome_service_url: 'https://alfa.educsaite.org/mod/lti/service.php'
      },
      given_name: 'Carlos',
      family_name: 'Vinícius',
      name: 'Carlos Vinícius',
      'https://purl.imsglobal.org/spec/lti/claim/ext': { user_username: 'cvmcosta10@hotmail.com', lms: 'moodle-2' },
      email: 'cvmcosta10@hotmail.com',
      'https://purl.imsglobal.org/spec/lti/claim/launch_presentation': {
        locale: 'pt_br',
        document_target: 'iframe',
        return_url: 'https://alfa.educsaite.org/mod/lti/return.php?course=3&launch_container=3&instanceid=5&sesskey=ejFUKvABeF'
      },
      'https://purl.imsglobal.org/spec/lti/claim/tool_platform': {
        family_code: 'moodle',
        version: '2019052000.02',
        guid: 'alfa.educsaite.org',
        name: 'educSaite',
        description: 'educSaite'
      },
      'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
      'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
      'https://purl.imsglobal.org/spec/lti/claim/custom': {
        resource: 'qualificacao_dos_processos_de_trabalho_na_ABS/EDUCSAITE/TRILHA_4/SAUDE_PESSOA_DEFICIENCIA_INFANCIA/EBOOK_2',
        system_setting_url: 'https://alfa.educsaite.org/mod/lti/services.php/tool/2/custom',
        context_setting_url: 'https://alfa.educsaite.org/mod/lti/services.php/CourseSection/3/bindings/tool/2/custom',
        link_setting_url: 'https://alfa.educsaite.org/mod/lti/services.php/links/{link_id}/custom'
      },
      'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
        scope: [Array],
        lineitems: 'https://alfa.educsaite.org/mod/lti/services.php/3/lineitems?type_id=2',
        lineitem: ''
      },
      'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice': {
        context_memberships_url: 'https://alfa.educsaite.org/mod/lti/services.php/CourseSection/3/bindings/2/memberships',
        service_versions: [Array]
      }
    }

    let payload = jwt.sign(token, '-----BEGIN RSA PRIVATE KEY-----\n' +
    'MIICWgIBAAKBgFayUq/sZYvDX7gHZP1npuQQEZpluAaSb1wcdzGxWP9IKx/Qnezs\n' +
    'QcFWEsCOD+MoS9u7qWtfxQkcC4t62jj0iTpBxA7xcLcmGTL3WHKQ2E7+iUVam4BM\n' +
    'mbR2vr4y9cAaqlu+cjw0aMmXZwPDFq38kVDmpOd2VVh0SoAZz+d6F5uzAgMBAAEC\n' +
    'gYA8ZDOdQHrsBMiklOIQcyeaLmdUug6a5V6VN28AOp3YFhmUK+oWo+yaFK8zWsJO\n' +
    'Zj+RbQPzO98xHUwdeRKSIiWEk0MT0Y7GfOL61dRNoZty9v/Sf88xTm6djPMZg+LU\n' +
    'npQmBgKtjSBFWJAy0NMn3U892lr6iFfYe5OAMg6ARV6RQQJBAJ/KG2Ds4ig0dURH\n' +
    'UK6Smt76uCtI6HGsSSn58sz5kWmfytfsqj0DHA9ZQrJj/WXa6ex6FL4YIgZBtv/T\n' +
    'UZi/zikCQQCK5bOoAfVzYGb6d94LC4P5OtUN77xF92xbRxRwHyvVwXve9W8Qx0Jl\n' +
    '/tdgvds6AxMZszIqX/mw7B7eA8AM6N57AkBI1wXiCjoSH8+xH11NJzGIIfygZqzn\n' +
    'XKVBiFpBTCcYYipCgfUcuPUqngMEdQZHTyLBlOktuqyP85brSbZxjkX5AkBIKINI\n' +
    'EhRw5zE4iBNby5S5Yt4SimxWMO8jEG9GvHrqZsUylHEp10rgcB92S8vbfINsw5KZ\n' +
    'PxkZ1+FFV89rJYOHAkBsNl1+JXvUa6U5CsKwVzjoBmW+hvGBiuTYsxRbvjdLlsEn\n' +
    '8TMKXIcwoXmy5rqK3fQ9tDg7smgzC/MPJSiI7V+z\n' +
    '-----END RSA PRIVATE KEY-----', { algorithm: 'RS256', keyid: '123456' })

    lti.onConnect((token, req, res) => {
      lti.redirect(res, '/finalRoute', true)
    })

    nock('https://platform.com').get('/keyset').reply(200, {
      'keys': [
        { 'kty': 'RSA', 'e': 'AQAB', 'kid': '123456', 'n': 'VrJSr-xli8NfuAdk_Wem5BARmmW4BpJvXBx3MbFY_0grH9Cd7OxBwVYSwI4P4yhL27upa1_FCRwLi3raOPSJOkHEDvFwtyYZMvdYcpDYTv6JRVqbgEyZtHa-vjL1wBqqW75yPDRoyZdnA8MWrfyRUOak53ZVWHRKgBnP53oXm7M' }
      ]
    })

    let url = await lti.appUrl()
    return chai.request(lti.app).post(url).type('json').send({ id_token: payload }).then(res => {
      expect(res).to.redirectTo(/\/finalRoute/)
    })
  })

  it('Provider.messagePlatform expected to return true', async () => {
    let token = {
      iss: 'https://platform.com',
      issuer_code: 'platformCode',
      user: '2', // User id
      roles: [
        'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
        'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
        'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator'
      ],
      userInfo: {
        given_name: 'User Given Name',
        family_name: 'Use Family Name',
        name: 'User Full Name',
        email: 'user@email.com'
      },
      platformInfo: {
        family_code: 'platform_type', // ex: Moodle
        version: 'versionNumber',
        name: 'LTI',
        description: 'LTI tool'
      },
      endpoint: {
        scope: [ // List of scopes
          'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
          'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
          'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
          'https://purl.imsglobal.org/spec/lti-ags/scope/score'
        ],
        lineitems: 'https://platform.com/lineitems/url',
        lineitem: ''
      },
      namesRoles: {
        context_memberships_url: 'https://platform.com/context/membership/url',
        service_versions: [ '1.0', '2.0' ]
      },
      platformContext: { // Context of connection
        context: { id: '2', label: 'course label', title: 'course title', type: [Array] },
        resource: { title: 'Activity name', id: '1g3k4dlk49fk' }, // Activity that originated login
        custom: { // Custom parameter sent by the platform
          resource: '123456', // Id for a requested resource
          system_setting_url: 'https://platform.com/customs/system/setting',
          context_setting_url: 'https://platform.com/customs/context/setting',
          link_setting_url: 'https://platform.com/customs/link/setting'
        }
      }
    }
    let message = {
      'scoreGiven': 83,
      'comment': 'This is exceptional work.',
      'activityProgress': 'Completed',
      'gradingProgress': 'FullyGraded'
    }

    nock('https://platform.com').post('/AccessTokenUrl').reply(200, {
      access_token: 'f3399be7242f95890887236756efa196',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly'
    })

    nock('https://platform.com').get('/lineitems/url').reply(200, [{
      'id': 'https://lms.example.com/context/2923/lineitems/1',
      'scoreMaximum': 60,
      'label': 'Chapter 5 Test',
      'resourceId': 'a-9334df-33',
      'tag': 'grade',
      'resourceLinkId': '1g3k4dlk49fk',
      'startDateTime': '2018-03-06T20:05:02Z',
      'endDateTime': '2018-04-06T22:05:03Z'
    }])

    nock('https://lms.example.com').post('/context/2923/lineitems/1/scores').reply(200)

    return expect(lti.messagePlatform(token, message)).to.eventually.become(true)
  })

  it('Provider.deletePlatform expected to resolve true and delete platform', async () => {
    await expect(lti.deletePlatform('https://platform.com')).to.eventually.include(true)
    return expect(lti.getPlatform('https://platform.com')).to.eventually.become(false)
  })

  // Closes connections
  it('Provider.close expected to return true', async () => {
    await lti.db.dropDatabase()
    return expect(lti.close()).to.eventually.equal(true)
  })
})
