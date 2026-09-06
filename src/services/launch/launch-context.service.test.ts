/* eslint-disable @typescript-eslint/no-deprecated */
import crypto from 'node:crypto'
import { LaunchContext } from '#services/launch/launch-context.service'
import { NamesAndRoles } from '#services/names-and-roles/names-and-roles.service'
import { Grading } from '#services/grading/grading.service'
import { DeepLinking } from '#services/deep-linking/deep-linking.service'
import { AccessTokenManager } from '#services/access-token-manager/access-token-manager.service'
import { FetchRequestHandler } from '#services/request-handler/fetch/fetch-request-handler.service'
import { buildMockDatabaseManager } from '#utils/tests/mock-database-manager'
import { buildMockFetchResponse } from '#utils/tests/mock-fetch-response'
import { buildIdToken, buildLegacyIdToken } from '#services/launch/id-token.serializer'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import { LTI_VERSION } from '#services/oidc/oidc.constants'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import type { Logger } from '#services/logger/logger.types'
import type { IdTokenRecord } from '#services/database-manager/database-manager.types'

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
})

const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }
const requestHandler = new FetchRequestHandler()

afterEach(() => {
  jest.restoreAllMocks()
})

const platform: Platform = {
  id: 'kid-1',
  url: 'http://localhost/moodle',
  clientId: 'ClientId1',
  name: 'Moodle',
  authenticationEndpoint: 'http://localhost/moodle/auth',
  accessTokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
  accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
  authorizationServer: 'http://localhost/moodle/AccessTokenUrl',
  idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: 'unused-in-this-flow' },
  authConfig: { method: IdTokenValidationMethod.RsaKey, key: 'unused-in-this-flow' },
  active: true,
  keys: { public: 'unused-in-this-flow', private: privateKey },
  publicKey: 'unused-in-this-flow',
  privateKey,
}

const rawIdToken: IdTokenRecord = {
  id: 'record-1',
  iss: 'http://localhost/moodle',
  sub: 'user-1',
  [IdTokenClaim.ClientId]: 'ClientId1',
  [IdTokenClaim.PlatformId]: 'kid-1',
  [IdTokenClaim.DeploymentId]: 'deployment-1',
  [IdTokenClaim.MessageType]: LtiMessageType.ResourceLinkRequest,
  [IdTokenClaim.Version]: LTI_VERSION,
  [IdTokenClaim.Roles]: ['Learner'],
  [IdTokenClaim.TargetLinkUri]: 'https://tool.example.com/launch',
  [IdTokenClaim.NamesRoleService]: {
    context_memberships_url: 'http://localhost/moodle/members',
  },
  [IdTokenClaim.Endpoint]: {
    lineitems: 'http://localhost/moodle/lineitems',
  },
  [IdTokenClaim.DeepLinkingSettings]: {
    accept_types: ['ltiResourceLink'],
    accept_multiple: true,
    deep_link_return_url: 'http://localhost/moodle/deep-link-return',
  },
}

const ltik = 'ltik-fixture'

const buildContext = (): LaunchContext => {
  const databaseManager = buildMockDatabaseManager()
  const accessTokenManager = new AccessTokenManager(databaseManager, requestHandler, logger)
  return new LaunchContext(rawIdToken, platform, ltik, accessTokenManager, requestHandler, logger)
}

describe('LaunchContext', () => {
  it('exposes the raw id token and platform as-given, and builds the formatted id tokens from it', () => {
    const context = buildContext()

    expect(context.rawIdToken).toBe(rawIdToken)
    expect(context.contextId).toBe(rawIdToken.id)
    expect(context.idToken).toEqual(buildIdToken(rawIdToken))
    expect(context.legacyIdToken).toEqual(buildLegacyIdToken(rawIdToken))
    expect(context.platform).toBe(platform)
    expect(context.ltik).toBe(ltik)
    expect(context.namesAndRoles).toBeInstanceOf(NamesAndRoles)
    expect(context.grading).toBeInstanceOf(Grading)
    expect(context.deepLinking).toBeInstanceOf(DeepLinking)
  })

  it('builds a NamesAndRoles instance already scoped to this launch platform/idToken', async () => {
    const context = buildContext()
    expect(context.namesAndRoles).toBeInstanceOf(NamesAndRoles)

    jest.spyOn(global, 'fetch').mockImplementation(async input => {
      const url = input as string
      if (url === 'http://localhost/moodle/AccessTokenUrl') {
        return buildMockFetchResponse({ body: { token_type: 'bearer', access_token: 'token-1', expires_in: 3600 } })
      }
      if (url === 'http://localhost/moodle/members') {
        return buildMockFetchResponse({ body: { id: 'members-1', members: [] } })
      }
      throw new Error(`Unexpected fetch call to ${url}`)
    })
    await expect(context.namesAndRoles.getMembers()).resolves.toMatchObject({ members: [] })
  })

  it('builds a Grading instance already scoped to this launch platform/idToken', async () => {
    const context = buildContext()
    expect(context.grading).toBeInstanceOf(Grading)

    jest.spyOn(global, 'fetch').mockImplementation(async input => {
      const url = input as string
      if (url === 'http://localhost/moodle/AccessTokenUrl') {
        return buildMockFetchResponse({ body: { token_type: 'bearer', access_token: 'token-1', expires_in: 3600 } })
      }
      if (url === 'http://localhost/moodle/lineitems') {
        return buildMockFetchResponse({ body: [] })
      }
      throw new Error(`Unexpected fetch call to ${url}`)
    })
    await expect(context.grading.getLineItems()).resolves.toMatchObject({ lineItems: [] })
  })

  it('builds a DeepLinking instance already scoped to this launch platform/idToken', async () => {
    const context = buildContext()
    expect(context.deepLinking).toBeInstanceOf(DeepLinking)

    const message = await context.deepLinking.createDeepLinkingMessage({ type: 'ltiResourceLink', title: 'Activity' })

    expect(message).toEqual(expect.any(String))
  })
})
