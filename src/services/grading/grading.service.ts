import type { AccessToken } from '#services/access-token-manager/access-token-manager.types'
import type { AccessTokenManager } from '#services/access-token-manager/access-token-manager.service'
import type { RequestHandler } from '#services/request-handler/request-handler.types'
import type { Logger } from '#services/logger/logger.types'
import type { LaunchContext } from '#services/launch/launch-context.service'
import type { IdTokenRecord } from '#services/database-manager/database-manager.types'
import { IdTokenClaim } from '#services/launch/id-token.constants'
import {
  AGS_LINEITEM_READONLY_SCOPE,
  AGS_LINEITEM_SCOPE,
  AGS_RESULT_READONLY_SCOPE,
  AGS_SCORE_SCOPE,
} from '#shared/lti-scopes.constants'
import { buildBearerAuthorization } from '#utils/request/authorization-header'
import { parseLinkHeader } from '#utils/request/link-header'
import type { ParsedLinks } from '#utils/request/link-header'
import { validate } from '#utils/validation/validation'
import {
  LineItemIdSchema,
  LineItemSchema,
  LineItemsListSchema,
  ResultsListSchema,
  ScoreSchema,
} from '#services/grading/grading.schemas'
import { buildLineItem, buildLineItems, buildScore, buildScores } from '#services/grading/grading.serializer'
import { MissingLineItemsEndpointError } from '#services/grading/errors'
import { MissingOrInvalidResourceLinkIdError } from '#shared/errors'
import type {
  GetLineItemsOptions,
  GetLineItemsResult,
  GetScoresOptions,
  GetScoresResult,
  LineItem,
  PaginatedLinks,
  Result,
  Score,
} from '#services/grading/grading.types'

export class Grading {
  private readonly LOG_COMPONENT = 'gradingService'

  private readonly LINEITEM_CONTAINER_ACCEPT = 'application/vnd.ims.lis.v2.lineitemcontainer+json'
  private readonly LINEITEM_MEDIA_TYPE = 'application/vnd.ims.lis.v2.lineitem+json'
  private readonly RESULT_CONTAINER_ACCEPT = 'application/vnd.ims.lis.v2.resultcontainer+json'
  private readonly SCORE_CONTENT_TYPE = 'application/vnd.ims.lis.v1.score+json'

  private readonly RESOURCE_LINK_ID_PARAM = 'resource_link_id'
  private readonly RESOURCE_ID_PARAM = 'resource_id'
  private readonly TAG_PARAM = 'tag'
  private readonly LIMIT_PARAM = 'limit'
  private readonly USER_ID_PARAM = 'user_id'

  private readonly launchContext: LaunchContext
  private readonly accessTokenManager: AccessTokenManager
  private readonly requestHandler: RequestHandler
  private readonly logger: Logger

  constructor(
    launchContext: LaunchContext,
    accessTokenManager: AccessTokenManager,
    requestHandler: RequestHandler,
    logger: Logger,
  ) {
    this.launchContext = launchContext
    this.accessTokenManager = accessTokenManager
    this.requestHandler = requestHandler
    this.logger = logger
  }

  /** Whether this launch declared AGS support. Check before calling any other method on this service. */
  public isAvailable(): boolean {
    return this.launchContext.idToken.services.assignmentAndGrades.available
  }

  public async getLineItems(options?: GetLineItemsOptions): Promise<GetLineItemsResult> {
    const { platform, rawIdToken: idToken } = this.launchContext
    if (options?.url === undefined) this.ensureServiceAvailability(idToken)
    this.logger.debug(this.LOG_COMPONENT, 'Attempting to retrieve line items')

    const url = options?.url ?? this.resolveLineItemsEndpoint(idToken)
    const query = options?.url !== undefined ? undefined : this.buildLineItemsQuery(idToken, options)

    const accessToken = await this.accessTokenManager.getAccessToken(platform, AGS_LINEITEM_READONLY_SCOPE)
    const { lineItems, links } = await this.fetchLineItemsPage(url, query, accessToken)

    return buildLineItems({ lineItems: this.filterLineItems(lineItems, options), ...this.buildPaginationLinks(links) })
  }

  public async createLineItem(lineItem: LineItem, options?: GetLineItemsOptions): Promise<LineItem> {
    const { platform, rawIdToken: idToken } = this.launchContext
    this.ensureServiceAvailability(idToken)
    const validatedLineItem = validate<LineItem>(LineItemSchema, lineItem)
    this.logger.debug(this.LOG_COMPONENT, 'Attempting to create a line item')

    const endpoint = this.resolveLineItemsEndpoint(idToken)
    const payload =
      options?.resourceLinkId === true
        ? { ...validatedLineItem, resourceLinkId: this.resolveResourceLinkId(idToken) }
        : validatedLineItem

    const accessToken = await this.accessTokenManager.getAccessToken(platform, AGS_LINEITEM_SCOPE)
    const response = await this.requestHandler.post(endpoint, payload, {
      headers: { authorization: buildBearerAuthorization(accessToken), contentType: this.LINEITEM_MEDIA_TYPE },
    })

    return buildLineItem(validate<LineItem>(LineItemSchema, response.data))
  }

  public async getLineItemById(lineItemId: string): Promise<LineItem> {
    const validatedLineItemId = validate<string>(LineItemIdSchema, lineItemId)
    const { platform } = this.launchContext
    this.logger.debug(this.LOG_COMPONENT, `Attempting to retrieve line item: ${validatedLineItemId}`)

    const accessToken = await this.accessTokenManager.getAccessToken(platform, AGS_LINEITEM_READONLY_SCOPE)
    return await this.fetchLineItemById(validatedLineItemId, accessToken)
  }

  private async fetchLineItemById(lineItemId: string, accessToken: AccessToken): Promise<LineItem> {
    const response = await this.requestHandler.get(lineItemId, {
      headers: { authorization: buildBearerAuthorization(accessToken), accept: this.LINEITEM_MEDIA_TYPE },
    })

    return buildLineItem(validate<LineItem>(LineItemSchema, response.data))
  }

  public async updateLineItemById(lineItemId: string, lineItem: LineItem): Promise<LineItem> {
    const validatedLineItemId = validate<string>(LineItemIdSchema, lineItemId)
    const validatedLineItem = validate<LineItem>(LineItemSchema, lineItem)
    const { platform } = this.launchContext
    this.logger.debug(this.LOG_COMPONENT, `Attempting to update line item: ${validatedLineItemId}`)

    const accessToken = await this.accessTokenManager.getAccessToken(platform, AGS_LINEITEM_SCOPE)
    const response = await this.requestHandler.put(validatedLineItemId, validatedLineItem, {
      headers: { authorization: buildBearerAuthorization(accessToken), contentType: this.LINEITEM_MEDIA_TYPE },
    })

    return buildLineItem(validate<LineItem>(LineItemSchema, response.data))
  }

  public async deleteLineItemById(lineItemId: string): Promise<boolean> {
    const validatedLineItemId = validate<string>(LineItemIdSchema, lineItemId)
    const { platform } = this.launchContext
    this.logger.debug(this.LOG_COMPONENT, `Attempting to delete line item: ${validatedLineItemId}`)

    const accessToken = await this.accessTokenManager.getAccessToken(platform, AGS_LINEITEM_SCOPE)
    await this.requestHandler.delete(validatedLineItemId, {
      headers: { authorization: buildBearerAuthorization(accessToken) },
    })

    return true
  }

  public async submitScore(lineItemId: string, score: Score): Promise<Score> {
    const validatedLineItemId = validate<string>(LineItemIdSchema, lineItemId)
    const validatedScore = validate<Score>(ScoreSchema, score)
    const { platform, rawIdToken: idToken } = this.launchContext
    this.logger.debug(this.LOG_COMPONENT, `Attempting to submit score to line item: ${validatedLineItemId}`)

    const built: Score = { ...validatedScore }
    const needsScoreMaximum = built.scoreGiven !== undefined && built.scoreMaximum === undefined
    const scope = needsScoreMaximum ? `${AGS_SCORE_SCOPE} ${AGS_LINEITEM_READONLY_SCOPE}` : AGS_SCORE_SCOPE
    const accessToken = await this.accessTokenManager.getAccessToken(platform, scope)

    if (needsScoreMaximum) {
      const lineItem = await this.fetchLineItemById(validatedLineItemId, accessToken)
      built.scoreMaximum = lineItem.scoreMaximum
    }
    built.userId ??= idToken.sub
    built.timestamp = new Date().toISOString()

    await this.requestHandler.post(this.appendPathSegment(validatedLineItemId, 'scores'), built, {
      headers: { authorization: buildBearerAuthorization(accessToken), contentType: this.SCORE_CONTENT_TYPE },
    })

    return buildScore(built)
  }

  public async getScores(lineItemId: string, options?: GetScoresOptions): Promise<GetScoresResult> {
    const validatedLineItemId = validate<string>(LineItemIdSchema, lineItemId)
    const { platform } = this.launchContext
    this.logger.debug(this.LOG_COMPONENT, `Attempting to retrieve scores for line item: ${validatedLineItemId}`)

    const accessToken = await this.accessTokenManager.getAccessToken(
      platform,
      `${AGS_LINEITEM_READONLY_SCOPE} ${AGS_RESULT_READONLY_SCOPE}`,
    )

    const url = options?.url ?? this.appendPathSegment(validatedLineItemId, 'results')
    const query = options?.url !== undefined ? undefined : this.buildScoresQuery(options)
    const response = await this.requestHandler.get(url, {
      query,
      headers: { authorization: buildBearerAuthorization(accessToken), accept: this.RESULT_CONTAINER_ACCEPT },
    })

    const scores = validate<Result[]>(ResultsListSchema, response.data)
    return buildScores({ scores, ...this.buildPaginationLinks(parseLinkHeader(response.headers.link)) })
  }

  private async fetchLineItemsPage(
    url: string,
    query: URLSearchParams | undefined,
    accessToken: AccessToken,
  ): Promise<{ lineItems: LineItem[]; links: ParsedLinks }> {
    const response = await this.requestHandler.get(url, {
      query,
      headers: { authorization: buildBearerAuthorization(accessToken), accept: this.LINEITEM_CONTAINER_ACCEPT },
    })

    return {
      lineItems: validate<LineItem[]>(LineItemsListSchema, response.data),
      links: parseLinkHeader(response.headers.link),
    }
  }

  private buildLineItemsQuery(idToken: IdTokenRecord, options?: GetLineItemsOptions): URLSearchParams {
    const query = new URLSearchParams()
    if (options?.resourceLinkId === true) {
      query.append(this.RESOURCE_LINK_ID_PARAM, this.resolveResourceLinkId(idToken))
    }
    // limit is either sent to the server (here) or applied client-side after an id/label filter
    // (filterLineItems), never both, since the id/label filter can only run after the fetch,
    // which would make a server-side limit truncate results before they're ever filtered.
    if (options?.limit !== undefined && !this.filtersByIdOrLabel(options)) {
      query.append(this.LIMIT_PARAM, String(options.limit))
    }
    if (options?.tag !== undefined) query.append(this.TAG_PARAM, options.tag)
    if (options?.resourceId !== undefined) query.append(this.RESOURCE_ID_PARAM, options.resourceId)
    return query
  }

  private buildScoresQuery(options?: GetScoresOptions): URLSearchParams {
    const query = new URLSearchParams()
    if (options?.userId !== undefined) query.append(this.USER_ID_PARAM, options.userId)
    if (options?.limit !== undefined) query.append(this.LIMIT_PARAM, String(options.limit))
    return query
  }

  private filterLineItems(lineItems: LineItem[], options?: GetLineItemsOptions): LineItem[] {
    let filtered = lineItems
    if (options?.id !== undefined) filtered = filtered.filter(lineItem => lineItem.id === options.id)
    if (options?.label !== undefined) filtered = filtered.filter(lineItem => lineItem.label === options.label)
    if (options?.limit !== undefined && this.filtersByIdOrLabel(options)) {
      filtered = filtered.slice(0, options.limit)
    }
    return filtered
  }

  private filtersByIdOrLabel(options?: GetLineItemsOptions): boolean {
    return options?.id !== undefined || options?.label !== undefined
  }

  private buildPaginationLinks(links: ParsedLinks): PaginatedLinks {
    return { next: links?.next?.url, prev: links?.prev?.url, first: links?.first?.url, last: links?.last?.url }
  }

  private ensureServiceAvailability(idToken: IdTokenRecord): void {
    if (idToken[IdTokenClaim.Endpoint]?.lineitems === undefined) {
      throw new MissingLineItemsEndpointError()
    }
  }

  private resolveLineItemsEndpoint(idToken: IdTokenRecord): string {
    const endpoint = idToken[IdTokenClaim.Endpoint]?.lineitems
    if (endpoint === undefined) throw new MissingLineItemsEndpointError()
    return endpoint
  }

  // Some platforms (e.g. Moodle) return a line item URL that already carries its own query string
  // (`.../lineitem?type_id=151`). Naively concatenating a path segment onto that string would land it
  // after the query string instead of before it, producing a URL the platform can't route. Going
  // through URL keeps the new segment in the path and the existing query string intact.
  private appendPathSegment(url: string, segment: string): string {
    const parsed = new URL(url)
    parsed.pathname = `${parsed.pathname}/${segment}`
    return parsed.toString()
  }

  private resolveResourceLinkId(idToken: IdTokenRecord): string {
    const resourceLinkId = idToken[IdTokenClaim.ResourceLink]?.id
    if (resourceLinkId === undefined) throw new MissingOrInvalidResourceLinkIdError()
    return resourceLinkId
  }
}

export default Grading
