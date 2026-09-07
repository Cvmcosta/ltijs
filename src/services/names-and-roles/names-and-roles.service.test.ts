import crypto from 'node:crypto'
import { ValidationError } from '#utils/validation/errors'
import { MissingOrInvalidResourceLinkIdError } from '#shared/errors'
import { NamesAndRoles } from '#services/names-and-roles/names-and-roles.service'
import { AccessTokenManager } from '#services/access-token-manager/access-token-manager.service'
import { FetchRequestHandler } from '#services/request-handler/fetch/fetch-request-handler.service'
import { HttpError } from '#services/request-handler/errors'
import { buildMockDatabaseManager } from '#utils/tests/mock-database-manager'
import { buildMockFetchResponse } from '#utils/tests/mock-fetch-response'
import type { MockFetchResponseOptions } from '#utils/tests/mock-fetch-response'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import { LTI_VERSION } from '#services/oidc/oidc.constants'
import { buildIdToken } from '#services/launch/id-token.serializer'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import type { Logger } from '#services/logger/logger.types'
import type { IdTokenRecord } from '#services/database-manager/database-manager.types'
import type { LaunchContext } from '#services/launch/launch-context.service'

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
})

const membersResult = {
  id: 'http://localhost/moodle/mod/lti/services.php/CourseSection/2/bindings/1/memberships',
  context: { id: '2', label: 'course', title: 'Course' },
  members: [
    { status: 'Active', roles: ['Instructor'], user_id: '2', name: 'Admin User' },
    { status: 'Active', roles: ['Learner'], user_id: '3', name: 'test user' },
  ],
}

const baseIdToken: IdTokenRecord = {
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
  [IdTokenClaim.NamesRoleService]: { context_memberships_url: 'http://localhost/moodle/members' },
  [IdTokenClaim.ResourceLink]: { id: '5' },
}

const basePlatform: Platform = {
  id: 'kid-1',
  url: baseIdToken.iss,
  clientId: baseIdToken[IdTokenClaim.ClientId],
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

const tokenResponse = { token_type: 'bearer', access_token: 'dkj4985kjaIAJDJ89kl8rkn5', expires_in: 3600 }
const TOKEN_URL = 'http://localhost/moodle/AccessTokenUrl'

type RouteResponse = MockFetchResponseOptions | ((url: string) => MockFetchResponseOptions)

// Routes by URL (ignoring any query string), mirroring axios-mock-adapter's
// own per-URL matching -- always includes the token endpoint so callers only
// need to describe the NRPS-specific route(s) a given test cares about.
const mockFetchRoutes = (routes: Partial<Record<string, RouteResponse>>): jest.SpiedFunction<typeof fetch> =>
  jest.spyOn(global, 'fetch').mockImplementation(async input => {
    const url = input as string
    const [baseUrl] = url.split('?')
    const route = routes[baseUrl]
    if (route === undefined) throw new Error(`Unexpected fetch call to ${url}`)
    return buildMockFetchResponse(typeof route === 'function' ? route(url) : route)
  })

const requestHandler = new FetchRequestHandler()
const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }

afterEach(() => {
  jest.restoreAllMocks()
})

// A real LaunchContext also constructs its own NamesAndRoles internally, so
// building one just to get a launch-context reference would redundantly
// construct a second, unused NamesAndRoles -- NamesAndRoles only ever reads
// `.platform`/`.rawIdToken`/`.idToken` off the reference it's given, so a
// minimal object shaped like just those fields is enough here. `idToken` is a
// getter, computed lazily (unlike the real LaunchContext, which computes it
// eagerly at construction), so tests asserting a raw claim is read a specific
// number of times aren't thrown off by an extra read from building this fake.
const buildLaunchContext = (platform: Platform, rawIdToken: IdTokenRecord): LaunchContext =>
  ({
    platform,
    rawIdToken,
    get idToken() {
      return buildIdToken(rawIdToken)
    },
  }) as unknown as LaunchContext

const buildService = (platform: Platform = basePlatform, idToken: IdTokenRecord = baseIdToken): NamesAndRoles => {
  const accessTokenManager = new AccessTokenManager(buildMockDatabaseManager(), requestHandler, logger)
  return new NamesAndRoles(buildLaunchContext(platform, idToken), accessTokenManager, requestHandler, logger)
}

describe('NamesAndRoles.isAvailable()', () => {
  it('returns true when the idToken declares NRPS support', () => {
    const service = buildService()
    expect(service.isAvailable()).toBe(true)
  })

  it('returns false when the idToken has no namesRoles claim', () => {
    const service = buildService(basePlatform, { ...baseIdToken, [IdTokenClaim.NamesRoleService]: undefined })
    expect(service.isAvailable()).toBe(false)
  })
})

describe('NamesAndRoles.getMembers()', () => {
  it('throws MISSING_NAMES_ROLES_SERVICE_URL when the idToken has no namesRoles claim', async () => {
    const service = buildService(basePlatform, { ...baseIdToken, [IdTokenClaim.NamesRoleService]: undefined })
    await expect(service.getMembers()).rejects.toThrow('MISSING_NAMES_ROLES_SERVICE_URL')
  })

  it('resolves the namesRoles claim only once, not once per internal validation pass', async () => {
    let namesRolesReadCount = 0
    const idToken = { ...baseIdToken }
    Object.defineProperty(idToken, IdTokenClaim.NamesRoleService, {
      enumerable: true,
      get() {
        namesRolesReadCount++
        return { context_memberships_url: 'http://localhost/moodle/members' }
      },
    })
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/members': { body: membersResult },
    })
    const service = buildService(basePlatform, idToken)

    await service.getMembers()

    expect(namesRolesReadCount).toBe(1)
  })

  it('returns a valid single page of members', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/members': { body: membersResult },
    })
    const service = buildService()

    const result = await service.getMembers()

    expect(result).toMatchObject(membersResult)
  })

  it('follows "next" link-header pagination and merges members, up to the page limit', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/members': {
        body: membersResult,
        headers: {
          link: '<http://localhost/moodle/differences>; rel="differences",<http://localhost/moodle/page2>; rel="next"',
        },
      },
      'http://localhost/moodle/page2': { body: membersResult },
    })
    const service = buildService()

    const result = await service.getMembers({ pages: 2 })

    expect(result.differences).toBe('http://localhost/moodle/differences')
    expect(result.members).toHaveLength(4)
  })

  it('follows every page when "pages" is set to false', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/members': {
        body: membersResult,
        headers: { link: '<http://localhost/moodle/page2>; rel="next"' },
      },
      'http://localhost/moodle/page2': { body: membersResult },
    })
    const service = buildService()

    const result = await service.getMembers({ pages: false })

    expect(result.members).toHaveLength(4)
    expect(result.next).toBeUndefined()
  })

  it('uses options.url directly and skips query construction', async () => {
    const fetchSpy = mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/members/1': { body: membersResult },
    })
    const service = buildService()

    const result = await service.getMembers({ url: 'http://localhost/moodle/members/1', role: 'Learner' })

    expect(result).toMatchObject(membersResult)
    const membersCall = fetchSpy.mock.calls.find(([url]) =>
      (url as string).startsWith('http://localhost/moodle/members'),
    )
    expect(membersCall?.[0]).toBe('http://localhost/moodle/members/1')
  })

  it('adds role/limit/resourceLinkId query params on the first page only', async () => {
    const fetchSpy = mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/members': { body: membersResult },
    })
    const service = buildService()

    await service.getMembers({ role: 'Learner', limit: 2, resourceLinkId: true })

    const membersCall = fetchSpy.mock.calls.find(([url]) =>
      (url as string).startsWith('http://localhost/moodle/members'),
    )
    expect(membersCall?.[0]).toBe('http://localhost/moodle/members?role=Learner&limit=2&rlid=5')
  })

  it('throws the shared MissingOrInvalidResourceLinkIdError when resourceLinkId is true but the idToken has no resource link claim', async () => {
    mockFetchRoutes({ [TOKEN_URL]: { body: tokenResponse } })
    const service = buildService(basePlatform, { ...baseIdToken, [IdTokenClaim.ResourceLink]: undefined })

    await expect(service.getMembers({ resourceLinkId: true })).rejects.toBeInstanceOf(
      MissingOrInvalidResourceLinkIdError,
    )
  })

  it('surfaces an HttpError when the NRPS endpoint returns a non-2xx response', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/members': { status: 403, statusText: 'Forbidden', body: { error: 'forbidden' } },
    })
    const service = buildService()

    await expect(service.getMembers()).rejects.toBeInstanceOf(HttpError)
  })

  it('surfaces a ValidationError when the response body does not match the expected shape', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/members': { body: { members: 'not-an-array' } },
    })
    const service = buildService()

    await expect(service.getMembers()).rejects.toBeInstanceOf(ValidationError)
  })

  it('preserves unknown vendor-specific extra fields on a member', async () => {
    const extendedResult = {
      ...membersResult,
      members: [{ ...membersResult.members[0], vendor_extra_field: 'custom-value' }],
    }
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/members': { body: extendedResult },
    })
    const service = buildService()

    const result = await service.getMembers()

    expect(result.members[0]).toMatchObject({ vendor_extra_field: 'custom-value' })
  })
})
