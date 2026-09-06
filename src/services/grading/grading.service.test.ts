import crypto from 'node:crypto'
import { MissingOrInvalidResourceLinkIdError } from '#shared/errors'
import { Grading } from '#services/grading/grading.service'
import { AccessTokenManager } from '#services/access-token-manager/access-token-manager.service'
import { FetchRequestHandler } from '#services/request-handler/fetch/fetch-request-handler.service'
import { buildMockDatabaseManager } from '#utils/tests/mock-database-manager'
import { buildMockFetchResponse } from '#utils/tests/mock-fetch-response'
import type { MockFetchResponseOptions } from '#utils/tests/mock-fetch-response'
import { expectValidationErrorOnField } from '#utils/tests/expect-validation-error'
import { IdTokenClaim, LtiMessageType } from '#services/launch/id-token.constants'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import { LTI_VERSION } from '#services/oidc/oidc.constants'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import type { Logger } from '#services/logger/logger.types'
import type { IdTokenRecord } from '#services/database-manager/database-manager.types'
import type { LaunchContext } from '#services/launch/launch-context.service'
import type { LineItem, Score } from '#services/grading/grading.types'

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
})

const requestHandler = new FetchRequestHandler()
const logger: Logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() }

type RouteResponse = MockFetchResponseOptions | ((url: string) => MockFetchResponseOptions)

// Routes by URL (ignoring any query string and HTTP method), mirroring
// axios-mock-adapter's own per-URL matching.
const mockFetchRoutes = (routes: Partial<Record<string, RouteResponse>>): jest.SpiedFunction<typeof fetch> =>
  jest.spyOn(global, 'fetch').mockImplementation(async input => {
    const url = input as string
    const [baseUrl] = url.split('?')
    const route = routes[baseUrl]
    if (route === undefined) throw new Error(`Unexpected fetch call to ${url}`)
    return buildMockFetchResponse(typeof route === 'function' ? route(url) : route)
  })

const buildLinkHeader = (rels: Partial<Record<'next' | 'prev' | 'first' | 'last', string>>): string =>
  Object.entries(rels)
    .map(([rel, url]) => `<${url}>; rel="${rel}"`)
    .join(', ')

afterEach(() => {
  jest.restoreAllMocks()
})

const TOKEN_URL = 'http://localhost/moodle/AccessTokenUrl'
const tokenResponse = { token_type: 'Bearer', access_token: 'abc123', expires_in: 3600 }

const basePlatform: Platform = {
  id: 'kid-1',
  url: 'http://localhost/moodle',
  clientId: 'ClientId1',
  name: 'Moodle',
  authenticationEndpoint: 'http://localhost/moodle/auth',
  accessTokenEndpoint: TOKEN_URL,
  accesstokenEndpoint: TOKEN_URL,
  authorizationServer: TOKEN_URL,
  idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: 'unused-in-this-flow' },
  authConfig: { method: IdTokenValidationMethod.RsaKey, key: 'unused-in-this-flow' },
  active: true,
  keys: { public: 'unused-in-this-flow', private: privateKey },
  publicKey: 'unused-in-this-flow',
  privateKey,
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
  [IdTokenClaim.Endpoint]: { lineitems: 'http://localhost/moodle/lineitems' },
  [IdTokenClaim.ResourceLink]: { id: '5' },
}

const buildLaunchContext = (platform: Platform, rawIdToken: IdTokenRecord): LaunchContext =>
  ({ platform, rawIdToken }) as unknown as LaunchContext

const buildService = (platform: Platform = basePlatform, idToken: IdTokenRecord = baseIdToken): Grading => {
  const accessTokenManager = new AccessTokenManager(buildMockDatabaseManager(), requestHandler, logger)
  return new Grading(buildLaunchContext(platform, idToken), accessTokenManager, requestHandler, logger)
}

const lineItem = { id: 'http://localhost/moodle/lineitems/1', label: 'Activity', scoreMaximum: 100 }

describe('Grading.getLineItems()', () => {
  it('returns line items from the platform context endpoint', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/lineitems': { body: [lineItem] },
    })
    const grading = buildService()

    const result = await grading.getLineItems()

    expect(result.lineItems).toEqual([lineItem])
  })

  it('requests from options.url directly when provided', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/custom-lineitems': { body: [lineItem] },
    })
    const grading = buildService()

    const result = await grading.getLineItems({ url: 'http://localhost/moodle/custom-lineitems' })

    expect(result.lineItems).toEqual([lineItem])
  })

  it('filters the result by id when options.id is provided', async () => {
    const other = { id: 'http://localhost/moodle/lineitems/2', label: 'Other', scoreMaximum: 50 }
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/lineitems': { body: [lineItem, other] },
    })
    const grading = buildService()

    const result = await grading.getLineItems({ id: lineItem.id })

    expect(result.lineItems).toEqual([lineItem])
  })

  it('filters the result by label when options.label is provided', async () => {
    const other = { id: 'http://localhost/moodle/lineitems/2', label: 'Other', scoreMaximum: 50 }
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/lineitems': { body: [lineItem, other] },
    })
    const grading = buildService()

    const result = await grading.getLineItems({ label: 'Other' })

    expect(result.lineItems).toEqual([other])
  })

  it('re-slices to options.limit after client-side id/label filtering, without sending limit server-side', async () => {
    const fetchSpy = mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/lineitems': { body: [lineItem] },
    })
    const grading = buildService()

    const result = await grading.getLineItems({ label: 'Activity', limit: 1 })

    expect(result.lineItems).toEqual([lineItem])
    const lineItemsCall = fetchSpy.mock.calls.find(([url]) =>
      (url as string).startsWith('http://localhost/moodle/lineitems'),
    )
    expect(lineItemsCall?.[0]).toBe('http://localhost/moodle/lineitems')
  })

  it('also skips the server-side limit param when filtering by id, not just label', async () => {
    const fetchSpy = mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/lineitems': { body: [lineItem] },
    })
    const grading = buildService()

    const result = await grading.getLineItems({ id: lineItem.id, limit: 1 })

    expect(result.lineItems).toEqual([lineItem])
    const lineItemsCall = fetchSpy.mock.calls.find(([url]) =>
      (url as string).startsWith('http://localhost/moodle/lineitems'),
    )
    expect(lineItemsCall?.[0]).toBe('http://localhost/moodle/lineitems')
  })

  it('adds resourceLinkId/resourceId/tag/limit query params when no id/label filter is active', async () => {
    const fetchSpy = mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/lineitems': { body: [lineItem] },
    })
    const grading = buildService()

    await grading.getLineItems({ resourceLinkId: true, resourceId: 'resource-1', tag: 'tag-1', limit: 5 })

    const lineItemsCall = fetchSpy.mock.calls.find(([url]) =>
      (url as string).startsWith('http://localhost/moodle/lineitems'),
    )
    expect(lineItemsCall?.[0]).toBe(
      'http://localhost/moodle/lineitems?resource_link_id=5&limit=5&tag=tag-1&resource_id=resource-1',
    )
  })

  it('populates next/prev/first/last from the Link response header', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/lineitems': {
        body: [lineItem],
        headers: {
          link: buildLinkHeader({
            next: 'http://localhost/moodle/lineitems?page=2',
            prev: 'http://localhost/moodle/lineitems?page=0',
            first: 'http://localhost/moodle/lineitems?page=1',
            last: 'http://localhost/moodle/lineitems?page=9',
          }),
        },
      },
    })
    const grading = buildService()

    const result = await grading.getLineItems()

    expect(result).toMatchObject({
      next: 'http://localhost/moodle/lineitems?page=2',
      prev: 'http://localhost/moodle/lineitems?page=0',
      first: 'http://localhost/moodle/lineitems?page=1',
      last: 'http://localhost/moodle/lineitems?page=9',
    })
  })

  it('throws MISSING_LINEITEMS_ENDPOINT when the idToken has no endpoint claim and no options.url', async () => {
    const grading = buildService(basePlatform, { ...baseIdToken, [IdTokenClaim.Endpoint]: undefined })
    await expect(grading.getLineItems()).rejects.toThrow('MISSING_LINEITEMS_ENDPOINT')
  })

  it('throws MISSING_OR_INVALID_RESOURCE_LINK_ID when resourceLinkId is true but the idToken has no resource link claim', async () => {
    const grading = buildService(basePlatform, { ...baseIdToken, [IdTokenClaim.ResourceLink]: undefined })
    await expect(grading.getLineItems({ resourceLinkId: true })).rejects.toThrow('MISSING_OR_INVALID_RESOURCE_LINK_ID')
  })

  it('throws the shared MissingOrInvalidResourceLinkIdError -- the same class NamesAndRoles throws, not a duplicate', async () => {
    const grading = buildService(basePlatform, { ...baseIdToken, [IdTokenClaim.ResourceLink]: undefined })
    await expect(grading.getLineItems({ resourceLinkId: true })).rejects.toBeInstanceOf(
      MissingOrInvalidResourceLinkIdError,
    )
  })
})

describe('Grading.createLineItem()', () => {
  it('throws a ValidationError when no lineItem is provided', async () => {
    const grading = buildService()
    await expectValidationErrorOnField(grading.createLineItem(undefined as unknown as LineItem), '(root)')
  })

  it('posts the line item and returns the created resource', async () => {
    const created = { ...lineItem, id: 'http://localhost/moodle/lineitems/new' }
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/lineitems': { status: 201, statusText: 'Created', body: created },
    })
    const grading = buildService()

    const result = await grading.createLineItem(lineItem)

    expect(result).toEqual(created)
  })

  it('sets resourceLinkId on the posted body when options.resourceLinkId is true', async () => {
    const fetchSpy = mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/lineitems': { status: 201, statusText: 'Created', body: lineItem },
    })
    const grading = buildService()

    await grading.createLineItem(lineItem, { resourceLinkId: true })

    const lineItemsCall = fetchSpy.mock.calls.find(([url]) =>
      (url as string).startsWith('http://localhost/moodle/lineitems'),
    )
    const body = JSON.parse(lineItemsCall?.[1]?.body as string) as Record<string, unknown>
    expect(body.resourceLinkId).toBe('5')
  })
})

describe('Grading.getLineItemById()', () => {
  it('throws a ValidationError when no lineItemId is provided', async () => {
    const grading = buildService()
    await expectValidationErrorOnField(grading.getLineItemById(undefined as unknown as string), '(root)')
  })

  it('throws a ValidationError when lineItemId is an empty string', async () => {
    const grading = buildService()
    await expectValidationErrorOnField(grading.getLineItemById(''), '(root)')
  })

  it('returns the requested line item', async () => {
    mockFetchRoutes({ [TOKEN_URL]: { body: tokenResponse }, [lineItem.id]: { body: lineItem } })
    const grading = buildService()

    await expect(grading.getLineItemById(lineItem.id)).resolves.toEqual(lineItem)
  })
})

describe('Grading.updateLineItemById()', () => {
  it('throws a ValidationError when no lineItemId is provided', async () => {
    const grading = buildService()
    await expectValidationErrorOnField(grading.updateLineItemById(undefined as unknown as string, lineItem), '(root)')
  })

  it('throws a ValidationError when no lineItem is provided', async () => {
    const grading = buildService()
    await expectValidationErrorOnField(
      grading.updateLineItemById(lineItem.id, undefined as unknown as LineItem),
      '(root)',
    )
  })

  it('puts the updated line item and returns it', async () => {
    const updated = { ...lineItem, label: 'Renamed' }
    mockFetchRoutes({ [TOKEN_URL]: { body: tokenResponse }, [lineItem.id]: { body: updated } })
    const grading = buildService()

    await expect(grading.updateLineItemById(lineItem.id, updated)).resolves.toEqual(updated)
  })
})

describe('Grading.deleteLineItemById()', () => {
  it('throws a ValidationError when no lineItemId is provided', async () => {
    const grading = buildService()
    await expectValidationErrorOnField(grading.deleteLineItemById(undefined as unknown as string), '(root)')
  })

  it('deletes the line item and resolves true', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      [lineItem.id]: { status: 204, statusText: 'No Content' },
    })
    const grading = buildService()

    await expect(grading.deleteLineItemById(lineItem.id)).resolves.toBe(true)
  })
})

describe('Grading.submitScore()', () => {
  it('throws a ValidationError when no lineItemId is provided', async () => {
    const grading = buildService()
    await expectValidationErrorOnField(
      grading.submitScore(undefined as unknown as string, { scoreGiven: 10 }),
      '(root)',
    )
  })

  it('throws a ValidationError when no score is provided', async () => {
    const grading = buildService()
    await expectValidationErrorOnField(grading.submitScore(lineItem.id, undefined as unknown as Score), '(root)')
  })

  it('posts the score, defaulting userId to the idToken user', async () => {
    const fetchSpy = mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      [`${lineItem.id}/scores`]: { body: {} },
    })
    const grading = buildService()

    await grading.submitScore(lineItem.id, { scoreGiven: 10, scoreMaximum: 10 })

    const scoresCall = fetchSpy.mock.calls.find(([url]) => (url as string) === `${lineItem.id}/scores`)
    const body = JSON.parse(scoresCall?.[1]?.body as string) as Record<string, unknown>
    expect(body.userId).toBe('user-1')
  })

  it('backfills scoreMaximum from the line item when scoreGiven is provided without it', async () => {
    const fetchSpy = mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      [lineItem.id]: { body: lineItem },
      [`${lineItem.id}/scores`]: { body: {} },
    })
    const grading = buildService()

    const result = await grading.submitScore(lineItem.id, { scoreGiven: 10 })

    expect(result.scoreMaximum).toBe(100)
    expect(fetchSpy.mock.calls.some(([url]) => url === lineItem.id)).toBe(true)
  })

  it('backfills scoreMaximum when scoreGiven is exactly 0 (not just truthy)', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      [lineItem.id]: { body: lineItem },
      [`${lineItem.id}/scores`]: { body: {} },
    })
    const grading = buildService()

    const result = await grading.submitScore(lineItem.id, { scoreGiven: 0 })

    expect(result.scoreMaximum).toBe(100)
  })
})

describe('Grading.getScores()', () => {
  it('throws a ValidationError when no lineItemId is provided', async () => {
    const grading = buildService()
    await expectValidationErrorOnField(grading.getScores(undefined as unknown as string), '(root)')
  })

  it('returns the scores array for a line item', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      [`${lineItem.id}/results`]: { body: [{ userId: 'user-1', resultScore: 10 }] },
    })
    const grading = buildService()

    const result = await grading.getScores(lineItem.id)

    expect(result.scores).toEqual([{ userId: 'user-1', resultScore: 10 }])
  })

  it('adds userId/limit query params when provided', async () => {
    const fetchSpy = mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      [`${lineItem.id}/results`]: { body: [] },
    })
    const grading = buildService()

    await grading.getScores(lineItem.id, { userId: 'user-1', limit: 2 })

    const resultsCall = fetchSpy.mock.calls.find(([url]) => (url as string).startsWith(`${lineItem.id}/results`))
    expect(resultsCall?.[0]).toBe(`${lineItem.id}/results?user_id=user-1&limit=2`)
  })

  it('requests from options.url directly when provided', async () => {
    mockFetchRoutes({
      [TOKEN_URL]: { body: tokenResponse },
      'http://localhost/moodle/custom-results': { body: [{ userId: 'user-1', resultScore: 10 }] },
    })
    const grading = buildService()

    const result = await grading.getScores(lineItem.id, { url: 'http://localhost/moodle/custom-results' })

    expect(result.scores).toEqual([{ userId: 'user-1', resultScore: 10 }])
  })
})
