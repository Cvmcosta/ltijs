import type { AccessToken } from '#services/access-token-manager/access-token-manager.types'
import type { RequestHandler } from '#services/request-handler/request-handler.types'
import type { Logger } from '#services/logger/logger.types'
import type { AccessTokenManager } from '#services/access-token-manager/access-token-manager.service'
import { parseLinkHeader } from '#utils/request/link-header'
import { buildBearerAuthorization } from '#utils/request/authorization-header'
import { validate } from '#utils/validation/validation'
import { IdTokenClaim } from '#services/launch/id-token.constants'
import { NRPS_CONTEXT_MEMBERSHIP_READONLY_SCOPE } from '#shared/lti-scopes.constants'
import type { LaunchContext } from '#services/launch/launch-context.service'
import type { IdTokenRecord } from '#services/database-manager/database-manager.types'
import { MembershipContainerSchema } from '#services/names-and-roles/names-and-roles.schemas'
import { buildMemberships } from '#services/names-and-roles/names-and-roles.serializer'
import { MissingNamesRolesServiceUrlError, MembersNotFoundError } from '#services/names-and-roles/errors'
import { MissingOrInvalidResourceLinkIdError } from '#shared/errors'
import type {
  GetMembersOptions,
  GetMembersResult,
  Memberships,
  MembershipContainer,
  MembershipsPage,
  MembershipsRequest,
} from '#services/names-and-roles/names-and-roles.types'

export class NamesAndRoles {
  private readonly LOG_COMPONENT = 'namesAndRolesService'
  private readonly NRPS_ACCEPT = 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json'
  private readonly ROLE_PARAM = 'role'
  private readonly LIMIT_PARAM = 'limit'
  private readonly RESOURCE_LINK_ID_PARAM = 'rlid'

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

  /** Whether this launch declared NRPS support. Check before calling any other method on this service. */
  public isAvailable(): boolean {
    return this.launchContext.idToken.services.namesAndRoles.available
  }

  public async getMembers(options?: GetMembersOptions): Promise<Memberships> {
    const { platform, rawIdToken: idToken } = this.launchContext
    const request = this.buildMembershipsRequest(idToken, options)

    this.logger.debug(this.LOG_COMPONENT, 'Attempting to retrieve memberships')
    this.logger.debug(this.LOG_COMPONENT, 'Target platform: ' + idToken.iss)

    const accessToken = await this.accessTokenManager.getAccessToken(platform, NRPS_CONTEXT_MEMBERSHIP_READONLY_SCOPE)
    this.logger.debug(this.LOG_COMPONENT, 'Access_token retrieved for [' + idToken.iss + ']')

    const result = await this.fetchPages(request, accessToken, this.resolveNumberOfPages(options?.pages))
    return buildMemberships(result)
  }

  private resolveNumberOfPages(pages: number | false | undefined): number | false {
    if (pages === false) return false
    return pages === undefined || pages < 1 ? 1 : pages
  }

  private buildMembershipsRequest(idToken: IdTokenRecord, options?: GetMembersOptions): MembershipsRequest {
    const namesRoles = idToken[IdTokenClaim.NamesRoleService]
    const namesRolesUrl = namesRoles?.context_memberships_url
    if (namesRolesUrl === undefined) throw new MissingNamesRolesServiceUrlError()

    const pageUrl: string = namesRolesUrl
    const query = new URLSearchParams()

    if (options === undefined) return { pageUrl, query }
    if (options.url !== undefined && options.url !== '') return { pageUrl: options.url, query }

    if (options.role !== undefined && options.role !== '') {
      this.logger.debug(this.LOG_COMPONENT, 'Adding role parameter with value: ' + options.role)
      query.append(this.ROLE_PARAM, options.role)
    }

    if (options.limit !== undefined && options.limit > 0) {
      this.logger.debug(this.LOG_COMPONENT, 'Adding limit parameter with value: ' + String(options.limit))
      query.append(this.LIMIT_PARAM, String(options.limit))
    }

    if (options.resourceLinkId !== undefined && options.resourceLinkId !== false && options.resourceLinkId !== '') {
      const resourceLinkId =
        options.resourceLinkId === true ? idToken[IdTokenClaim.ResourceLink]?.id : options.resourceLinkId
      if (resourceLinkId === undefined || resourceLinkId === '') throw new MissingOrInvalidResourceLinkIdError()

      this.logger.debug(this.LOG_COMPONENT, 'Adding rlid parameter with value: ' + resourceLinkId)
      query.append(this.RESOURCE_LINK_ID_PARAM, resourceLinkId)
    }

    return { pageUrl, query }
  }

  private async fetchPages(
    request: MembershipsRequest,
    accessToken: AccessToken,
    numberOfPages: number | false,
  ): Promise<GetMembersResult> {
    let pageUrl: string | undefined = request.pageUrl
    let differencesUrl: string | undefined
    let result: GetMembersResult | undefined
    let pageNumber = 1

    do {
      if (numberOfPages !== false && pageNumber > numberOfPages) {
        if (result !== undefined) result.next = pageUrl
        break
      }
      this.logger.debug(this.LOG_COMPONENT, `Fetching membership page ${pageNumber}: ${pageUrl}`)

      const page = await this.fetchPage(pageUrl, pageNumber === 1 ? request.query : undefined, accessToken)

      if (result === undefined) result = page.memberships
      else result.members = [...result.members, ...page.memberships.members]

      if (page.differences !== undefined) differencesUrl = page.differences
      pageUrl = page.next
      pageNumber++
    } while (pageUrl !== undefined)

    if (result === undefined) throw new MembersNotFoundError()
    if (differencesUrl !== undefined) result.differences = differencesUrl
    this.logger.debug(this.LOG_COMPONENT, 'Memberships retrieved')
    return result
  }

  private async fetchPage(
    pageUrl: string,
    query: URLSearchParams | undefined,
    accessToken: AccessToken,
  ): Promise<MembershipsPage> {
    const headers = {
      authorization: buildBearerAuthorization(accessToken),
      accept: this.NRPS_ACCEPT,
    }
    const response = await this.requestHandler.get(pageUrl, { query, headers })
    const memberships = validate<MembershipContainer>(MembershipContainerSchema, response.data)

    const parsedLinks = parseLinkHeader(response.headers.link)
    return {
      memberships,
      next: parsedLinks?.next?.url,
      differences: parsedLinks?.differences?.url,
    }
  }
}

export default NamesAndRoles
