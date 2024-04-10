// Tests for the Assignment and Grades class LTI methods
// Cvmcosta 2020

const jwt = require('jsonwebtoken')
const nock = require('nock')

const chai = require('chai')
const chaiHttp = require('chai-http')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
chai.use(chaiHttp)

const expect = chai.expect

const lineItemsResponse = [{ id: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/2/lineitem?type_id=1', label: 'LTI', scoreMaximum: 100, resourceId: '', tag: '', resourceLinkId: '1', ltiLinkId: '1' }, { id: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1', label: 'Chapter 5 Test', scoreMaximum: 100, resourceId: '24a420e7066b42a09f8c71e9a20b1498', tag: 'grade', resourceLinkId: '51', ltiLinkId: '51' }]

const newLineItem = {
  id: 'https://lms.example.com/context/2923/lineitems/1',
  scoreMaximum: 100,
  label: 'Grade',
  tag: 'grade'
}

const resultsResponse = [
  {
    lineitem: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/2/lineitem?type_id=1',
    results: [
      {
        id: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/2/lineitem/results?type_id=1&user_id=2',
        userId: '2'
      }
    ]
  },
  {
    lineitem: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1',
    results: [
      {
        id: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem/results?type_id=1&user_id=2',
        userId: '2',
        resultScore: 100,
        resultMaximum: 100,
        scoreOf: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1',
        timestamp: '2020-06-02T10:51:08-03:00'
      }
    ]
  }
]

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
    lineitems: 'http://localhost/moodle/lineitems?type_id=2',
    lineitem: ''
  },
  'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice': {
    context_memberships_url: 'http://localhost/moodle/members',
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

describe('Testing Assignment and Grades Service', function () {
  this.timeout(10000)

  it('Grades.getLineItems() expected to return valid lineitem list', async () => {
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

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
    })

    nock('http://localhost/moodle').get('/lineitems?type_id=2&tag=tag').reply(200, lineItemsResponse)

    lti.onConnect(async (token, req, res) => {
      try {
        return res.send(await lti.Grade.getLineItems(token, { tag: 'tag' }))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
      const lineItems = JSON.parse(res.text)
      expect(lineItems.lineItems).to.exist // eslint-disable-line
    })
  })
  it('Grades.getLineItemById() expected to return valid lineitem', async () => {
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

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
    })

    nock('http://localhost/moodle').get('/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1').reply(200, lineItemsResponse[1])

    lti.onConnect(async (token, req, res) => {
      try {
        return res.send(await lti.Grade.getLineItemById(token, 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1'))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
      const lineItems = JSON.parse(res.text)
      expect(lineItems).to.deep.equal(lineItemsResponse[1])
    })
  })
  it('Grades.updateLineItemById() expected to return valid updated lineitem', async () => {
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

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem'
    })

    nock('http://localhost/moodle').put('/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1').reply(200, lineItemsResponse[1])

    lti.onConnect(async (token, req, res) => {
      try {
        return res.send(await lti.Grade.updateLineItemById(token, 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1', lineItemsResponse[1]))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
      const lineItems = JSON.parse(res.text)
      expect(lineItems).to.deep.equal(lineItemsResponse[1])
    })
  })
  it('Grades.deleteLineItemById() expected to return valid updated lineitem', async () => {
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

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem'
    })

    nock('http://localhost/moodle').delete('/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1').reply(204)

    lti.onConnect(async (token, req, res) => {
      try {
        return res.status(204).send(await lti.Grade.deleteLineItemById(token, 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1'))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(204)
    })
  })
  it('Grades.createLineItem() expected to return newly created lineItem', async () => {
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

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
    })

    nock('http://localhost/moodle').post('/lineitems?type_id=2').reply(200, newLineItem)

    lti.onConnect(async (token, req, res) => {
      try {
        const lineItem = {
          scoreMaximum: 100,
          label: 'Grade',
          tag: 'grade'
        }
        return res.send(await lti.Grade.createLineItem(token, lineItem))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
      const lineItem = JSON.parse(res.text)
      expect(lineItem).to.deep.equal(newLineItem)
    })
  })
  it('Grades.deleteLineItem() expected to return sucess array', async () => {
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

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
    })

    nock('http://localhost/moodle').delete('/mod/lti/services.php/2/lineitems/2/lineitem?type_id=1').reply(200)
    nock('http://localhost/moodle').delete('/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1').reply(200)
    nock('http://localhost/moodle').get('/lineitems?type_id=2&tag=tag').reply(200, lineItemsResponse)

    lti.onConnect(async (token, req, res) => {
      try {
        return res.send(await lti.Grade.deleteLineItems(token, { tag: 'tag' }))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
      const deleteLineItems = JSON.parse(res.text)
      const response = {
        failure: [],
        success: [
          {
            lineitem: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/2/lineitem?type_id=1'
          },
          {
            lineitem: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1'
          }
        ]
      }
      expect(deleteLineItems).to.deep.equal(response)
    })
  })
  it('Grades.scorePublish() expected to return sucess array', async () => {
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

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
    })

    nock('http://localhost/moodle').post('/mod/lti/services.php/2/lineitems/2/lineitem/scores?type_id=1').reply(200)
    nock('http://localhost/moodle').post('/mod/lti/services.php/2/lineitems/16/lineitem/scores?type_id=1').reply(200)
    nock('http://localhost/moodle').get('/lineitems?type_id=2&resource_link_id=5&tag=tag').reply(200, lineItemsResponse)

    lti.onConnect(async (token, req, res) => {
      try {
        const grade = {
          scoreGiven: 90,
          activityProgress: 'Completed',
          gradingProgress: 'FullyGraded'
        }
        return res.send(await lti.Grade.scorePublish(token, grade, { tag: 'tag' }))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
      const scoreLineItems = JSON.parse(res.text)
      const response = {
        failure: [],
        success: [
          {
            lineitem: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/2/lineitem?type_id=1'
          },
          {
            lineitem: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1'
          }
        ]
      }
      expect(scoreLineItems).to.deep.equal(response)
    })
  })
  it('Grades.scorePublish() with id field expected to return sucess array', async () => {
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

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
    })

    nock('http://localhost/moodle').post('/mod/lti/services.php/2/lineitems/16/lineitem/scores?type_id=1').reply(200)
    nock('http://localhost/moodle').get('/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1').reply(200, lineItemsResponse[1])

    lti.onConnect(async (token, req, res) => {
      try {
        const grade = {
          scoreGiven: 90,
          activityProgress: 'Completed',
          gradingProgress: 'FullyGraded'
        }
        return res.send(await lti.Grade.scorePublish(token, grade, { id: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1' }))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
      const scoreLineItems = JSON.parse(res.text)
      const response = {
        failure: [],
        success: [
          {
            lineitem: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1'
          }
        ]
      }
      expect(scoreLineItems).to.deep.equal(response)
    })
  })
  it('Grades.submitScore()  expected to return score', async () => {
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

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
    })

    nock('http://localhost/moodle').post('/mod/lti/services.php/2/lineitems/16/lineitem/scores?type_id=1').reply(200)
    nock('http://localhost/moodle').get('/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1').reply(200, lineItemsResponse[1])

    lti.onConnect(async (token, req, res) => {
      try {
        const grade = {
          scoreGiven: 90,
          activityProgress: 'Completed',
          gradingProgress: 'FullyGraded'
        }
        return res.send(await lti.Grade.submitScore(token, 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1', grade))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
      const response = JSON.parse(res.text)
      expect(response.scoreGiven).to.equal(90)
    })
  })
  it('Grades.result() expected to return results array', async () => {
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

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
    })

    nock('http://localhost/moodle').get('/mod/lti/services.php/2/lineitems/2/lineitem/results?type_id=1').reply(200, [
      {
        id: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/2/lineitem/results?type_id=1&user_id=2',
        userId: '2'
      }
    ])
    nock('http://localhost/moodle').get('/mod/lti/services.php/2/lineitems/16/lineitem/results?type_id=1').reply(200, [
      {
        id: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem/results?type_id=1&user_id=2',
        resultMaximum: 100,
        resultScore: 100,
        scoreOf: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1',
        timestamp: '2020-06-02T10:51:08-03:00',
        userId: '2'
      }
    ])
    nock('http://localhost/moodle').get('/lineitems?type_id=2&resource_link_id=5&tag=tag').reply(200, lineItemsResponse)

    lti.onConnect(async (token, req, res) => {
      try {
        return res.send(await lti.Grade.result(token, { tag: 'tag' }))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
      const results = JSON.parse(res.text)
      expect(results).to.deep.equal(resultsResponse)
    })
  })
  it('Grades.result() with id field expected to return results array', async () => {
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

    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
    })

    nock('http://localhost/moodle').get('/mod/lti/services.php/2/lineitems/16/lineitem/results?type_id=1').reply(200, [
      {
        id: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem/results?type_id=1&user_id=2',
        resultMaximum: 100,
        resultScore: 100,
        scoreOf: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1',
        timestamp: '2020-06-02T10:51:08-03:00',
        userId: '2'
      }
    ])
    nock('http://localhost/moodle').get('/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1').reply(200, lineItemsResponse[1])

    lti.onConnect(async (token, req, res) => {
      try {
        return res.send(await lti.Grade.result(token, { id: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1' }))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    const resultsResponse = [
      {
        lineitem: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1',
        results: [
          {
            id: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem/results?type_id=1&user_id=2',
            userId: '2',
            resultScore: 100,
            resultMaximum: 100,
            scoreOf: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1',
            timestamp: '2020-06-02T10:51:08-03:00'
          }
        ]
      }
    ]

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
      const results = JSON.parse(res.text)
      expect(results).to.deep.equal(resultsResponse)
    })
  })
  it('Grades.getScores() expected to return results array', async () => {
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

    const results = [
      {
        id: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem/results?type_id=1&user_id=2',
        resultMaximum: 100,
        resultScore: 100,
        scoreOf: 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1',
        timestamp: '2020-06-02T10:51:08-03:00',
        userId: '2'
      }
    ]
    nock('http://localhost/moodle').post('/AccessTokenUrl').reply(200, {
      access_token: 'dkj4985kjaIAJDJ89kl8rkn5',
      token_type: 'bearer',
      expires_in: 3600,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
    })

    nock('http://localhost/moodle').get('/mod/lti/services.php/2/lineitems/16/lineitem/results?type_id=1').reply(200, results)
    nock('http://localhost/moodle').get('/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1').reply(200, lineItemsResponse[1])

    lti.onConnect(async (token, req, res) => {
      try {
        return res.send(await lti.Grade.getScores(token, 'http://localhost/moodle/mod/lti/services.php/2/lineitems/16/lineitem?type_id=1'))
      } catch (err) {
        console.log(err)
        res.sendStatus(500)
      }
    })

    return chai.request(lti.app).post(url).type('json').send({ id_token: payload, state }).set('Cookie', ['state' + state + '=s%3Ahttp%3A%2F%2Flocalhost%2Fmoodle.fsJogjTuxtbJwvJcuG4esveQAlih67sfEltuwRM6MX0; Path=/; HttpOnly;', 'ltiaHR0cDovL2xvY2FsaG9zdC9tb29kbGVDbGllbnRJZDEy=s%3A2.ZezwPKtv3Uibp4A%2F6cN0UzbIQlhA%2BTAKvbtN%2FvgGaCI; Path=/; HttpOnly; SameSite=None']).then(res => {
      expect(res).to.have.status(200)
      const response = JSON.parse(res.text)
      expect(response.scores).to.exist // eslint-disable-line
    })
  })
})
