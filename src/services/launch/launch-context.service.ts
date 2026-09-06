import { NamesAndRoles } from '#services/names-and-roles/names-and-roles.service'
import { Grading } from '#services/grading/grading.service'
import { DeepLinking } from '#services/deep-linking/deep-linking.service'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import type { AccessTokenManager } from '#services/access-token-manager/access-token-manager.service'
import type { RequestHandler } from '#services/request-handler/request-handler.types'
import type { Logger } from '#services/logger/logger.types'
import type { IdTokenRecord } from '#services/database-manager/database-manager.types'
import type { IdToken, LegacyIdToken } from '#services/launch/id-token.types'
import type { RedirectOptions } from '#services/launch/launch.types'
import type { HttpResponse } from '#services/http-handler/http-handler.types'
import { buildIdToken, buildLegacyIdToken } from '#services/launch/id-token.serializer'

const REDIRECT_PLACEHOLDER_ORIGIN = 'http://ltijs-redirect-placeholder.invalid'

/**
 * Everything a launch handler needs about the current launch -- passed as the first argument to
 * `onResourceLink`/`onDeepLinking`/`onSubmissionReview`, and returned by `Provider.getLaunchContext(ltik)`
 * to resume a launch outside the original request.
 */
export class LaunchContext {
  /** The full validated id_token record as stored, keyed by its database `id`. */
  public readonly rawIdToken: IdTokenRecord
  /** The id_token's claims, reshaped into ltijs's own (non-legacy) `IdToken` type. */
  public readonly idToken: IdToken
  /** The platform this launch came from. */
  public readonly platform: Platform
  /** Opaque token identifying this launch -- pass it to `Provider.getLaunchContext` to resume the launch later. */
  public readonly ltik: string
  // LTI Services
  /** Names and Role Provisioning Service (NRPS) -- `getMembers()`. */
  public readonly namesAndRoles: NamesAndRoles
  /** Assignment and Grade Services (AGS) -- line items and score submission. */
  public readonly grading: Grading
  /** Deep Linking service -- `createDeepLinkingMessage`/`createDeepLinkingForm`. */
  public readonly deepLinking: DeepLinking
  /** @deprecated Use {@link LaunchContext.idToken} instead. */
  public readonly legacyIdToken: LegacyIdToken

  // Derived, not stored -- always equal to rawIdToken.id, so a getter (rather than a separately
  // assigned field) is the only representation that can't drift out of sync with it.
  public get contextId(): string {
    return this.rawIdToken.id
  }

  // eslint-disable-next-line @typescript-eslint/max-params
  constructor(
    idToken: IdTokenRecord,
    platform: Platform,
    ltik: string,
    accessTokenManager: AccessTokenManager,
    requestHandler: RequestHandler,
    logger: Logger,
  ) {
    this.rawIdToken = idToken
    this.idToken = buildIdToken(idToken)
    this.platform = platform
    this.ltik = ltik
    this.namesAndRoles = new NamesAndRoles(this, accessTokenManager, requestHandler, logger)
    this.grading = new Grading(this, accessTokenManager, requestHandler, logger)
    this.deepLinking = new DeepLinking(this, logger)
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    this.legacyIdToken = buildLegacyIdToken(idToken)
  }

  /**
   * Redirects to `path`, preserving its existing query parameters, merging in `options.query`, and always
   * appending this launch's `ltik` (overriding any `ltik` already present in `path` or `options.query`),
   * so a follow-up request through this same URL can still be resolved via `Provider.getLaunchContext`.
   * `path` can be a plain path (`/grades`) or a full URL on another origin. Either way, only its query
   * string is touched; everything else about it is preserved as given.
   */
  public redirect(response: HttpResponse, path: string, options: RedirectOptions = {}): void {
    const url = new URL(path, REDIRECT_PLACEHOLDER_ORIGIN)
    const isRelative = url.origin === REDIRECT_PLACEHOLDER_ORIGIN

    for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value)
    url.searchParams.set('ltik', this.ltik)

    response.redirect(isRelative ? `${url.pathname}${url.search}${url.hash}` : url.toString())
  }
}

export default LaunchContext
