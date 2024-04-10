// Tests for the Deep Linking class LTI methods
// Cvmcosta 2020

const jwt = require('jsonwebtoken')
const nock = require('nock')

const chai = require('chai')
const chaiHttp = require('chai-http')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
chai.use(chaiHttp)

const expect = chai.expect

// Valid complete token
const tokenValid = {
  exp: Math.floor(Date.now() / 1000) + (60 * 60),
  iss: 'http://localhost/moodle',
  aud: 'ClientId1',
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
  'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings': {
    accept_types: [
      'link',
      'file',
      'html',
      'ltiResourceLink'
    ],
    accept_media_types: [
      'image/*',
      'text/html',
      'application/json'
    ],
    accept_presentation_document_targets: [
      'iframe',
      'window'
    ],
    accept_multiple: true,
    auto_create: true,
    title: 'Certification Deep Linking',
    text: 'Certification Default Text Description',
    data: '190659',
    deep_link_return_url: 'https://ltiadvantagevalidator.imsglobal.org/ltitool/deeplinkresponse.html'
  },
  'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
  'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingRequest',
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

const signToken = (token, kid) => {
  const key = '-----BEGIN RSA PRIVATE KEY-----\n' +
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
  '-----END RSA PRIVATE KEY-----'

  if (!kid) return jwt.sign(token, key, { algorithm: 'RS256' })
  return jwt.sign(token, key, { algorithm: 'RS256', keyid: kid, allowInsecureKeySizes: true })
}

const lti = require('../dist/Provider/Provider')

describe('Testing Deep Linking Service', function () {
  this.timeout(10000)

  it('Deep Linking Launch expected to return status 200', async () => {
    const token = JSON.parse(JSON.stringify(tokenValid))
    token.nonce = encodeURIComponent([...Array(25)].map(_ => (Math.random() * 36 | 0).toString(36)).join``)

    const payload = signToken(token, '123456')
    const state = encodeURIComponent([...Array(25)].map(_ => (Math.random() * 36 | 0).toString(36)).join``)
    const url = await lti.appRoute()

    nock('http://localhost/moodle').get('/keyset').reply(200, {
      keys: [
        { kty: 'RSA', e: 'AQAB', kid: '123456', n: 'VrJSr-xli8NfuAdk_Wem5BARmmW4BpJvXBx3MbFY_0grH9Cd7OxBwVYSwI4P4yhL27upa1_FCRwLi3raOPSJOkHEDvFwtyYZMvdYcpDYTv6JRVqbgEyZtHa-vjL1wBqqW75yPDRoyZdnA8MWrfyRUOak53ZVWHRKgBnP53oXm7M' }
      ]
    })

    lti.onDeepLinking((token, req, res) => {
      return res.sendStatus(200)
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
    })
  })
  it('DeepLinking.createDeepLinkingMessage expected to return valid deep linking jwt', async () => {
    const token = JSON.parse(JSON.stringify(tokenValid))
    token.nonce = encodeURIComponent([...Array(25)].map(_ => (Math.random() * 36 | 0).toString(36)).join``)

    const payload = signToken(token, '123456')
    const state = encodeURIComponent([...Array(25)].map(_ => (Math.random() * 36 | 0).toString(36)).join``)
    const url = await lti.appRoute()

    const plat = await lti.getPlatform(token.iss, token.aud)

    nock('http://localhost/moodle').get('/keyset').reply(200, {
      keys: [
        { kty: 'RSA', e: 'AQAB', kid: '123456', n: 'VrJSr-xli8NfuAdk_Wem5BARmmW4BpJvXBx3MbFY_0grH9Cd7OxBwVYSwI4P4yhL27upa1_FCRwLi3raOPSJOkHEDvFwtyYZMvdYcpDYTv6JRVqbgEyZtHa-vjL1wBqqW75yPDRoyZdnA8MWrfyRUOak53ZVWHRKgBnP53oXm7M' }
      ]
    })

    const item = {
      type: 'ltiResourceLink',
      title: 'Resource',
      custom: {
        name: 'Param',
        value: 'Value'
      }
    }

    lti.onDeepLinking(async (token, req, res) => {
      try {
        return res.send(await lti.DeepLinking.createDeepLinkingMessage(token, item, { message: 'Successfully Registered' }))
      } catch (err) {
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(async res => {
      expect(res).to.have.status(200)
      const payload = jwt.verify(res.text, await plat.platformPublicKey())
      expect(payload['https://purl.imsglobal.org/spec/lti-dl/claim/content_items']).to.deep.include(item)
      expect(payload.iss).to.equal(await plat.platformClientId())
      expect(payload.aud).to.equal(await plat.platformUrl())
    })
  })
  it('DeepLinking.createDeepLinkingForm expected to return valid deep linking form', async () => {
    const token = JSON.parse(JSON.stringify(tokenValid))
    token.nonce = encodeURIComponent([...Array(25)].map(_ => (Math.random() * 36 | 0).toString(36)).join``)

    const payload = signToken(token, '123456')
    const state = encodeURIComponent([...Array(25)].map(_ => (Math.random() * 36 | 0).toString(36)).join``)
    const url = await lti.appRoute()

    const plat = await lti.getPlatform(token.iss, token.aud)

    nock('http://localhost/moodle').get('/keyset').reply(200, {
      keys: [
        { kty: 'RSA', e: 'AQAB', kid: '123456', n: 'VrJSr-xli8NfuAdk_Wem5BARmmW4BpJvXBx3MbFY_0grH9Cd7OxBwVYSwI4P4yhL27upa1_FCRwLi3raOPSJOkHEDvFwtyYZMvdYcpDYTv6JRVqbgEyZtHa-vjL1wBqqW75yPDRoyZdnA8MWrfyRUOak53ZVWHRKgBnP53oXm7M' }
      ]
    })

    const item = {
      type: 'ltiResourceLink',
      title: 'Resource',
      custom: {
        name: 'Param',
        value: 'Value'
      }
    }

    lti.onDeepLinking(async (token, req, res) => {
      try {
        return res.send(await lti.DeepLinking.createDeepLinkingForm(token, item, { message: 'Successfully Registered' }))
      } catch (err) {
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(async res => {
      expect(res).to.have.status(200)
      expect(res.text.includes('<form id="ltijs_submit" style="display: none;" action="https://ltiadvantagevalidator.imsglobal.org/ltitool/deeplinkresponse.html" method="POST"><input type="hidden" name="JWT"')).to.equal(true)
      expect(res.text.includes('<script>document.getElementById("ltijs_submit").submit()</script>')).to.equal(true)
      const _payload = res.text.split('<form id="ltijs_submit" style="display: none;" action="https://ltiadvantagevalidator.imsglobal.org/ltitool/deeplinkresponse.html" method="POST"><input type="hidden" name="JWT" value="')[1].split('" /></form><script>document.getElementById("ltijs_submit").submit()</script>')[0]
      const payload = jwt.verify(_payload, await plat.platformPublicKey())
      expect(payload['https://purl.imsglobal.org/spec/lti-dl/claim/content_items']).to.deep.include(item)
      expect(payload.iss).to.equal(await plat.platformClientId())
      expect(payload.aud).to.equal(await plat.platformUrl())
    })
  })
})
