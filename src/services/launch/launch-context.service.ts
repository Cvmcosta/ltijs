import { NamesAndRoles } from '#services/names-and-roles/names-and-roles.service'
import { Grading } from '#services/grading/grading.service'
import { DeepLinking } from '#services/deep-linking/deep-linking.service'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import type { AccessTokenManager } from '#services/access-token-manager/access-token-manager.service'
import type { RequestHandler } from '#services/request-handler/request-handler.types'
import type { Logger } from '#services/logger/logger.types'
import type { IdTokenRecord } from '#services/database-manager/database-manager.types'
import type { IdToken, LegacyIdToken } from '#services/launch/id-token.types'
import { buildIdToken, buildLegacyIdToken } from '#services/launch/id-token.serializer'

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
}

export default LaunchContext
