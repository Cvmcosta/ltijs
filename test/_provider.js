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
  this.timeout(10000)
  it('Provider.contructor expected to not throw Error', () => {
    const fn = () => {
      lti = new LTI('LTIKEY',
        { url: 'mongodb://127.0.0.1/testdatabase' },
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
  it('Provider.whitelist expected to return true', () => {
    expect(lti.whitelist('/1', '/2')).to.be.equal(true)
  })
  it('Provider.deploy expected to resolve true', async () => {
    await expect(lti.deploy({ silent: true })).to.eventually.become(true)
  })
  it('Provider.registerPlatform expected to resolve Platform object', () => {
    lti.registerPlatform({
      url: 'https://platform2.com',
      name: 'Platform Name',
      clientId: 'ClientIdThePlatformCreatedForYourApp',
      authenticationEndpoint: 'http://localhost/moodle/AuthorizationUrl',
      accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
      authConfig: { method: 'JWK_SET', key: 'http://localhost/moodle/keyset' }
    })
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
  it('Provider.getAllPlatforms expected to resolve Array', async () => {
    return expect(lti.getAllPlatforms()).to.eventually.be.a('array')
  })
  it('Provider.onConnect expected to not throw error', () => {
    const fn = () => {
      return lti.onConnect((req, res) => { res.sendStatus(200) })
    }
    expect(fn).to.not.throw(Error)
  })

  it('Login route with unregistered platform is expected to return 401', async () => {
    const url = await lti.loginUrl()
    return chai.request(lti.app).post(url).send({ iss: 'https://unregisteredPlatform.com' }).then(res => {
      expect(res).to.have.status(401)
    })
  })

  it('Login route POST request with registered platform is expected to redirect to authenticationEndpoint', async () => {
    nock('http://localhost/moodle').get(/\/AuthorizationUrl.*/).reply(200)
    const url = await lti.loginUrl()
    return chai.request(lti.app).post(url).send({ iss: 'http://localhost/moodle' }).then(res => {
      expect(res).to.redirectTo(/^http:\/\/localhost\/moodle\/AuthorizationUrl.*/)
    })
  })

  it('Login route GET request with registered platform is expected to redirect to authenticationEndpoint', async () => {
    nock('http://localhost/moodle').get(/\/AuthorizationUrl.*/).reply(200)
    const url = await lti.loginUrl()
    return chai.request(lti.app).get(url).query({ iss: 'http://localhost/moodle' }).then(res => {
      expect(res).to.redirectTo(/^http:\/\/localhost\/moodle\/AuthorizationUrl.*/)
    })
  })

  it('MainApp route receiving no idToken is expected to redirect to the session timeout route', async () => {
    const url = await lti.appUrl()
    return chai.request(lti.app).post(url).then(res => {
      expect(res).to.redirectTo(/.*\/invalidToken/)
    })
  })

  it('MainApp route receiving an idtoken is expected to return status 200', async () => {
    const plat = await lti.getPlatform('http://localhost/moodle')
    const clientId = await plat.platformClientId()
    const token = {
      nonce: crypto.randomBytes(16).toString('base64'),
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
      iss: 'http://localhost/moodle',
      aud: clientId,
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id': '2',
      'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://localhost',
      sub: '2',
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

    const payload = jwt.sign(token, '-----BEGIN RSA PRIVATE KEY-----\n' +
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

    nock('http://localhost/moodle').get('/keyset').reply(200, {
      keys: [
        { kty: 'RSA', e: 'AQAB', kid: '123456', n: 'VrJSr-xli8NfuAdk_Wem5BARmmW4BpJvXBx3MbFY_0grH9Cd7OxBwVYSwI4P4yhL27upa1_FCRwLi3raOPSJOkHEDvFwtyYZMvdYcpDYTv6JRVqbgEyZtHa-vjL1wBqqW75yPDRoyZdnA8MWrfyRUOak53ZVWHRKgBnP53oXm7M' }
      ]
    })

    const url = await lti.appUrl()
    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state: 'YN9CBVcmutRB2QJy60zjwQ%3D%3D' }).set('Cookie', ['YN9CBVcmutRB2QJy60zjwQ%3D%3D-state=s%3AYN9CBVcmutRB2QJy60zjwQ%253D%253D.fcxb11oRje6DrK%2FEbf3v%2BxUgvlujA1%2B15sm9AHp%2BBSw; Path=/; HttpOnly; SameSite=None', 'YN9CBVcmutRB2QJy60zjwQ%3D%3D-iss=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly; SameSite=None', 'plataHR0cDovL2xvY2FsaG9zdC9tb29kbGU%3D/3_5=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
    })
  })

  it('Provider.redirect expected to redirect to new route with prepended issuer', async () => {
    const plat = await lti.getPlatform('http://localhost/moodle')
    const clientId = await plat.platformClientId()
    const token = {
      nonce: crypto.randomBytes(16).toString('base64'),
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
      iss: 'http://localhost/moodle',
      aud: clientId,
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id': '2',
      'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://localhost',
      sub: '2',
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
      'https://purl.imsglobal.org/spec/lti/claim/ ': { title: 'teste local', id: '5' },
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

    const payload = jwt.sign(token, '-----BEGIN RSA PRIVATE KEY-----\n' +
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
      lti.redirect(res, '/finalRoute', { isNewResource: true })
    })

    nock('http://localhost/moodle').get('/keyset').reply(200, {
      keys: [
        { kty: 'RSA', e: 'AQAB', kid: '123456', n: 'VrJSr-xli8NfuAdk_Wem5BARmmW4BpJvXBx3MbFY_0grH9Cd7OxBwVYSwI4P4yhL27upa1_FCRwLi3raOPSJOkHEDvFwtyYZMvdYcpDYTv6JRVqbgEyZtHa-vjL1wBqqW75yPDRoyZdnA8MWrfyRUOak53ZVWHRKgBnP53oXm7M' }
      ]
    })

    const url = await lti.appUrl()
    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state: 'YN9CBVcmutRB2QJy60zjwQ%3D%3D' }).set('Cookie', ['YN9CBVcmutRB2QJy60zjwQ%3D%3D-state=s%3AYN9CBVcmutRB2QJy60zjwQ%253D%253D.fcxb11oRje6DrK%2FEbf3v%2BxUgvlujA1%2B15sm9AHp%2BBSw; Path=/; HttpOnly; SameSite=None', 'YN9CBVcmutRB2QJy60zjwQ%3D%3D-iss=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly; SameSite=None', 'plataHR0cDovL2xvY2FsaG9zdC9tb29kbGU%3D/3_5=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).set('host', 'http://localhost').then(res => {
      expect(res).to.redirectTo(/\/finalRoute/)
    })
  })

  it('Provider.Grade.ScorePublish expected to return true', async () => {
    const token = {
      iss: 'http://localhost/moodle',
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
        lineitems: 'http://localhost/moodle/lineitems/url',
        lineitem: ''
      },
      namesRoles: {
        context_memberships_url: 'http://localhost/moodle/context/membership/url',
        service_versions: ['1.0', '2.0']
      },
      platformContext: { // Context of connection
        context: { id: '2', label: 'course label', title: 'course title', type: [Array] },
        resource: { title: 'Activity name', id: '1g3k4dlk49fk' }, // Activity that originated login
        custom: { // Custom parameter sent by the platform
          resource: '123456', // Id for a requested resource
          system_setting_url: 'http://localhost/moodle/customs/system/setting',
          context_setting_url: 'http://localhost/moodle/customs/context/setting',
          link_setting_url: 'http://localhost/moodle/customs/link/setting'
        }
      }
    }
    const message = {
      scoreGiven: 83,
      comment: 'This is exceptional work.',
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded'
    }

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'f3399be7242f95890887236756efa196',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly'
    })

    nock('http://localhost/moodle').get('/lineitems/url').reply(200, [{
      id: 'https://lms.example.com/context/2923/lineitems/1',
      scoreMaximum: 60,
      label: 'Chapter 5 Test',
      resourceId: 'a-9334df-33',
      tag: 'grade',
      resourceLinkId: '1g3k4dlk49fk',
      startDateTime: '2018-03-06T20:05:02Z',
      endDateTime: '2018-04-06T22:05:03Z'
    }])

    nock('https://lms.example.com').post('/context/2923/lineitems/1/scores').reply(200)

    return expect(lti.Grade.ScorePublish(token, message)).to.eventually.become(true)
  })

  it('Provider.Grade.Result expected to return object', async () => {
    const token = {
      iss: 'http://localhost/moodle',
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
        lineitems: 'http://localhost/moodle/lineitems/url',
        lineitem: ''
      },
      namesRoles: {
        context_memberships_url: 'http://localhost/moodle/context/membership/url',
        service_versions: ['1.0', '2.0']
      },
      platformContext: { // Context of connection
        context: { id: '2', label: 'course label', title: 'course title', type: [Array] },
        resource: { title: 'Activity name', id: '1g3k4dlk49fk' }, // Activity that originated login
        custom: { // Custom parameter sent by the platform
          resource: '123456', // Id for a requested resource
          system_setting_url: 'http://localhost/moodle/customs/system/setting',
          context_setting_url: 'http://localhost/moodle/customs/context/setting',
          link_setting_url: 'http://localhost/moodle/customs/link/setting'
        }
      }
    }
    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'f3399be7242f95890887236756efa196',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly'
    })

    nock('http://localhost/moodle').get('/lineitems/url').reply(200, [{
      id: 'https://lms.example.com/context/2923/lineitems/1',
      scoreMaximum: 60,
      label: 'Chapter 5 Test',
      resourceId: 'a-9334df-33',
      tag: 'grade',
      resourceLinkId: '1g3k4dlk49fk',
      startDateTime: '2018-03-06T20:05:02Z',
      endDateTime: '2018-04-06T22:05:03Z'
    }])

    nock('https://lms.example.com').get('/context/2923/lineitems/1/results?').reply(200, [{
      id: 'https://lms.example.com/context/2923/lineitems/1/results/5323497',
      scoreOf: 'https://lms.example.com/context/2923/lineitems/1',
      userId: '5323497',
      resultScore: 0.83,
      resultMaximum: 1,
      comment: 'This is exceptional work.'
    }])

    return expect(lti.Grade.Result(token)).to.eventually.deep.include.members([{
      id: 'https://lms.example.com/context/2923/lineitems/1/results/5323497',
      lineItem: 'Chapter 5 Test',
      scoreOf: 'https://lms.example.com/context/2923/lineitems/1',
      userId: '5323497',
      resultScore: 0.83,
      resultMaximum: 1,
      comment: 'This is exceptional work.'
    }])
  })

  it('Provider.Grade.GetLineItems expected to return object containing lineitems', async () => {
    const token = {
      iss: 'http://localhost/moodle',
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
        lineitems: 'http://localhost/moodle/lineitems/url',
        lineitem: ''
      },
      namesRoles: {
        context_memberships_url: 'http://localhost/moodle/context/membership/url',
        service_versions: ['1.0', '2.0']
      },
      platformContext: { // Context of connection
        context: { id: '2', label: 'course label', title: 'course title', type: [Array] },
        resource: { title: 'Activity name', id: '1g3k4dlk49fk' }, // Activity that originated login
        custom: { // Custom parameter sent by the platform
          resource: '123456', // Id for a requested resource
          system_setting_url: 'http://localhost/moodle/customs/system/setting',
          context_setting_url: 'http://localhost/moodle/customs/context/setting',
          link_setting_url: 'http://localhost/moodle/customs/link/setting'
        }
      }
    }
    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'f3399be7242f95890887236756efa196',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly'
    })

    nock('http://localhost/moodle').get('/lineitems/url').reply(200, [{
      id: 'https://lms.example.com/context/2923/lineitems/1',
      scoreMaximum: 60,
      label: 'Chapter 5 Test',
      resourceId: 'a-9334df-33',
      tag: 'grade',
      resourceLinkId: '1g3k4dlk49fk',
      startDateTime: '2018-03-06T20:05:02Z',
      endDateTime: '2018-04-06T22:05:03Z'
    }])

    return expect(lti.Grade.GetLineItems(token, { resourceLinkId: '1g3k4dlk49fk' })).to.eventually.deep.include.members([{
      id: 'https://lms.example.com/context/2923/lineitems/1',
      scoreMaximum: 60,
      label: 'Chapter 5 Test',
      resourceId: 'a-9334df-33',
      tag: 'grade',
      resourceLinkId: '1g3k4dlk49fk',
      startDateTime: '2018-03-06T20:05:02Z',
      endDateTime: '2018-04-06T22:05:03Z'
    }])
  })

  it('Provider.Grade.CreateLineItem expected to return true', async () => {
    const token = {
      iss: 'http://localhost/moodle',
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
        lineitems: 'http://localhost/moodle/lineitems/url',
        lineitem: ''
      },
      namesRoles: {
        context_memberships_url: 'http://localhost/moodle/context/membership/url',
        service_versions: ['1.0', '2.0']
      },
      platformContext: { // Context of connection
        context: { id: '2', label: 'course label', title: 'course title', type: [Array] },
        resource: { title: 'Activity name', id: '1g3k4dlk49fk' }, // Activity that originated login
        custom: { // Custom parameter sent by the platform
          resource: '123456', // Id for a requested resource
          system_setting_url: 'http://localhost/moodle/customs/system/setting',
          context_setting_url: 'http://localhost/moodle/customs/context/setting',
          link_setting_url: 'http://localhost/moodle/customs/link/setting'
        }
      }
    }
    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'f3399be7242f95890887236756efa196',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly'
    })

    nock('http://localhost/moodle').post('/lineitems/url').reply(201)

    return expect(lti.Grade.CreateLineItem(token, {
      scoreMaximum: 60,
      label: 'Chapter 5 Test',
      resourceId: 'quiz-231',
      tag: 'grade',
      startDateTime: '2018-03-06T20:05:02Z',
      endDateTime: '2018-04-06T22:05:03Z'
    }, { resourceLinkId: '1g3k4dlk49fk' })).to.eventually.become(true)
  })

  it('Provider.Grade.DeleteLineItems expected to return true', async () => {
    const token = {
      iss: 'http://localhost/moodle',
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
        lineitems: 'http://localhost/moodle/lineitems/url',
        lineitem: ''
      },
      namesRoles: {
        context_memberships_url: 'http://localhost/moodle/context/membership/url',
        service_versions: ['1.0', '2.0']
      },
      platformContext: { // Context of connection
        context: { id: '2', label: 'course label', title: 'course title', type: [Array] },
        resource: { title: 'Activity name', id: '1g3k4dlk49fk' }, // Activity that originated login
        custom: { // Custom parameter sent by the platform
          resource: '123456', // Id for a requested resource
          system_setting_url: 'http://localhost/moodle/customs/system/setting',
          context_setting_url: 'http://localhost/moodle/customs/context/setting',
          link_setting_url: 'http://localhost/moodle/customs/link/setting'
        }
      }
    }
    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'f3399be7242f95890887236756efa196',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly'
    })

    nock('http://localhost/moodle').get('/lineitems/url').reply(200, [{
      id: 'https://lms.example.com/context/2923/lineitems/1',
      scoreMaximum: 60,
      label: 'Chapter 5 Test',
      resourceId: 'a-9334df-33',
      tag: 'grade',
      resourceLinkId: '1g3k4dlk49fk',
      startDateTime: '2018-03-06T20:05:02Z',
      endDateTime: '2018-04-06T22:05:03Z'
    }])

    nock('https://lms.example.com').delete('/context/2923/lineitems/1').reply(204)

    return expect(lti.Grade.DeleteLineItems(token)).to.eventually.become(true)
  })

  it('Provider.keyset expected to return a keyset', async () => {
    const url = await lti.keysetUrl()
    return chai.request(lti.app).get(url).then(res => {
      expect(res.body).to.have.key('keys')
    })
  })

  it('Provider.deletePlatform expected to resolve true and delete platform', async () => {
    await lti.deletePlatform('https://platform2.com')
    await expect(lti.deletePlatform('http://localhost/moodle')).to.eventually.include(true)
    return expect(lti.getPlatform('http://localhost/moodle')).to.eventually.become(false)
  })

  // Closes connections
  it('Provider.close expected to return true', async () => {
    return expect(lti.close()).to.eventually.equal(true)
  })
})
