import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { DeepLinking } from '#services/deep-linking/deep-linking.service'
import { expectValidationErrorOnField } from '#utils/tests/expect-validation-error'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import { LTI_VERSION } from '#services/oidc/oidc.constants'
import { buildIdToken as serializeIdToken } from '#services/launch/id-token.serializer'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import type { Logger } from '#services/logger/logger.types'
import type { IdTokenRecord } from '#services/database-manager/database-manager.types'
import type { LaunchContext } from '#services/launch/launch-context.service'
import type { ContentItem } from '#services/deep-linking/deep-linking.types'

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
})

const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }

const basePlatform: Platform = {
  id: 'kid-1',
  url: 'http://localhost/moodle',
  clientId: 'ClientId1',
  name: 'Moodle',
  authenticationEndpoint: 'http://localhost/moodle/auth',
  accessTokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
  accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
  authorizationServer: 'http://localhost/moodle/AccessTokenUrl',
  idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: publicKey },
  authConfig: { method: IdTokenValidationMethod.RsaKey, key: publicKey },
  active: true,
  keys: { public: publicKey, private: privateKey },
  publicKey,
  privateKey,
}

const buildIdToken = (deepLinkingSettings: Record<string, unknown> | undefined): IdTokenRecord => ({
  id: 'record-1',
  iss: 'http://localhost/moodle',
  sub: 'user-1',
  [IdTokenClaim.ClientId]: 'ClientId1',
  [IdTokenClaim.PlatformId]: 'kid-1',
  [IdTokenClaim.DeploymentId]: 'deployment-1',
  [IdTokenClaim.MessageType]: LtiMessageType.DeepLinkingRequest,
  [IdTokenClaim.Version]: LTI_VERSION,
  [IdTokenClaim.Roles]: ['Learner'],
  [IdTokenClaim.TargetLinkUri]: 'https://tool.example.com/launch',
  [IdTokenClaim.DeepLinkingSettings]: deepLinkingSettings,
})

const acceptingAllTypesToken = buildIdToken({
  accept_types: ['ltiResourceLink'],
  accept_multiple: true,
  deep_link_return_url: 'https://platform.example.com/deep-link-return',
})

// `idToken` is a getter, computed lazily, rather than eagerly at construction like the real
// `LaunchContext` does -- so that tests asserting a raw claim is read a specific number of times
// (e.g. "reads only once") aren't thrown off by an extra read from building this fake itself.
const buildLaunchContext = (platform: Platform, rawIdToken: IdTokenRecord): LaunchContext =>
  ({
    platform,
    rawIdToken,
    get idToken() {
      return serializeIdToken(rawIdToken)
    },
  }) as unknown as LaunchContext

const buildService = (
  platform: Platform = basePlatform,
  idToken: IdTokenRecord = acceptingAllTypesToken,
): DeepLinking => new DeepLinking(buildLaunchContext(platform, idToken), logger)

const contentItem = { type: 'ltiResourceLink', title: 'Activity' }

describe('DeepLinking.isAvailable()', () => {
  it('returns true when the idToken declares deep-linking settings', () => {
    const service = buildService()
    expect(service.isAvailable()).toBe(true)
  })

  it('returns false when the idToken has no deepLinkingSettings', () => {
    const service = buildService(basePlatform, buildIdToken(undefined))
    expect(service.isAvailable()).toBe(false)
  })
})

describe('DeepLinking.createDeepLinkingMessage()', () => {
  it('throws MISSING_DEEP_LINK_SETTINGS when the token has no deepLinkingSettings', async () => {
    const service = buildService(basePlatform, buildIdToken(undefined))
    await expect(service.createDeepLinkingMessage(contentItem)).rejects.toThrow('MISSING_DEEP_LINK_SETTINGS')
  })

  it('throws a ValidationError when no content items are provided', async () => {
    const service = buildService()
    await expectValidationErrorOnField(service.createDeepLinkingMessage(undefined as unknown as ContentItem), '(root)')
  })

  it('throws PRIVATE_KEY_NOT_FOUND instead of signing with an empty key when the platform has none', async () => {
    const service = buildService({ ...basePlatform, keys: { ...basePlatform.keys, private: '' } })
    await expect(service.createDeepLinkingMessage(contentItem)).rejects.toThrow('PRIVATE_KEY_NOT_FOUND')
  })

  it('returns a signed JWT containing the accepted content items', async () => {
    const service = buildService()

    const message = await service.createDeepLinkingMessage(contentItem)

    const decoded = jwt.verify(message, publicKey, { algorithms: ['RS256'] }) as Record<string, unknown>
    expect(decoded['https://purl.imsglobal.org/spec/lti/claim/message_type']).toBe('LtiDeepLinkingResponse')
    expect(decoded['https://purl.imsglobal.org/spec/lti-dl/claim/content_items']).toEqual([contentItem])
    expect(decoded.iss).toBe('ClientId1')
    expect(decoded.aud).toBe('http://localhost/moodle')
    expect(decoded.nonce).toEqual(expect.any(String))
  })

  it('filters out content items whose type is not accepted by the platform', async () => {
    const token = buildIdToken({
      accept_types: ['file'],
      accept_multiple: true,
      deep_link_return_url: 'https://platform.example.com/deep-link-return',
    })
    const service = buildService(basePlatform, token)

    const message = await service.createDeepLinkingMessage(contentItem)

    const decoded = jwt.decode(message) as Record<string, unknown>
    expect(decoded['https://purl.imsglobal.org/spec/lti-dl/claim/content_items']).toEqual([])
  })

  it('only includes the first accepted item when accept_multiple is false', async () => {
    const token = buildIdToken({
      accept_types: ['ltiResourceLink'],
      accept_multiple: false,
      deep_link_return_url: 'https://platform.example.com/deep-link-return',
    })
    const second = { type: 'ltiResourceLink', title: 'Second' }
    const service = buildService(basePlatform, token)

    const message = await service.createDeepLinkingMessage([contentItem, second])

    const decoded = jwt.decode(message) as Record<string, unknown>
    expect(decoded['https://purl.imsglobal.org/spec/lti-dl/claim/content_items']).toEqual([contentItem])
  })

  it('also treats the string "false" as false, for platforms that send accept_multiple as a string', async () => {
    const token = buildIdToken({
      accept_types: ['ltiResourceLink'],
      accept_multiple: 'false',
      deep_link_return_url: 'https://platform.example.com/deep-link-return',
    })
    const second = { type: 'ltiResourceLink', title: 'Second' }
    const service = buildService(basePlatform, token)

    const message = await service.createDeepLinkingMessage([contentItem, second])

    const decoded = jwt.decode(message) as Record<string, unknown>
    expect(decoded['https://purl.imsglobal.org/spec/lti-dl/claim/content_items']).toEqual([contentItem])
  })

  it('writes errMessage to the errormsg claim, without a trailing space in the key', async () => {
    const service = buildService()

    const message = await service.createDeepLinkingMessage(contentItem, { errMessage: 'Something went wrong' })

    const decoded = jwt.decode(message) as Record<string, unknown>
    expect(decoded['https://purl.imsglobal.org/spec/lti-dl/claim/errormsg']).toBe('Something went wrong')
    expect(decoded['https://purl.imsglobal.org/spec/lti-dl/claim/errormsg ']).toBeUndefined()
  })

  it('writes message/log/errLog to their respective claims', async () => {
    const service = buildService()

    const message = await service.createDeepLinkingMessage(contentItem, {
      message: 'All good',
      log: 'log entry',
      errLog: 'error log entry',
    })

    const decoded = jwt.decode(message) as Record<string, unknown>
    expect(decoded['https://purl.imsglobal.org/spec/lti-dl/claim/msg']).toBe('All good')
    expect(decoded['https://purl.imsglobal.org/spec/lti-dl/claim/log']).toBe('log entry')
    expect(decoded['https://purl.imsglobal.org/spec/lti-dl/claim/errorlog']).toBe('error log entry')
  })

  it('passes deepLinkingSettings.data through onto the data claim', async () => {
    const token = buildIdToken({
      accept_types: ['ltiResourceLink'],
      accept_multiple: true,
      deep_link_return_url: 'https://platform.example.com/deep-link-return',
      data: 'opaque-state',
    })
    const service = buildService(basePlatform, token)

    const message = await service.createDeepLinkingMessage(contentItem)

    const decoded = jwt.decode(message) as Record<string, unknown>
    expect(decoded['https://purl.imsglobal.org/spec/lti-dl/claim/data']).toBe('opaque-state')
  })
})

describe('DeepLinking.createDeepLinkingForm()', () => {
  it('returns an HTML auto-submitting form embedding the signed message', async () => {
    const service = buildService()

    const form = await service.createDeepLinkingForm(contentItem)

    expect(form).toContain('<form')
    expect(form).toContain('https://platform.example.com/deep-link-return')
  })

  it('resolves the deepLinkingSettings claim only once, not once per internal validation pass', async () => {
    let settingsReadCount = 0
    const idToken = buildIdToken(undefined)
    Object.defineProperty(idToken, IdTokenClaim.DeepLinkingSettings, {
      enumerable: true,
      get() {
        settingsReadCount++
        return {
          accept_types: ['ltiResourceLink'],
          accept_multiple: true,
          deep_link_return_url: 'https://platform.example.com/deep-link-return',
        }
      },
    })
    const service = buildService(basePlatform, idToken)

    await service.createDeepLinkingForm(contentItem)

    expect(settingsReadCount).toBe(1)
  })
})
