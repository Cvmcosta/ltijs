import path from 'node:path'
import type { LaunchContext } from '#services/launch/launch-context.service'
import type { Logger } from '#services/logger/logger.types'
import { IdTokenClaim } from '#services/launch/id-token.constants'
import { signJwt } from '#utils/crypto/jwt'
import { RS256_ALGORITHM } from '#utils/crypto/jwt.constants'
import { randomJti } from '#utils/random/random'
import { renderTemplate } from '#utils/templating/template-renderer'
import { escapeHtmlAttribute } from '#utils/templating/html-escape'
import { validate } from '#utils/validation/validation'
import { ContentItemsInputSchema } from '#services/deep-linking/deep-linking.schemas'
import { MissingDeepLinkSettingsError } from '#services/deep-linking/errors'
import { resolvePlatformPrivateKey } from '#services/platform-manager/platform-keys'
import type { ContentItem, DeepLinkingOptions } from '#services/deep-linking/deep-linking.types'
import type { DeepLinkingSettingsClaim, IdTokenRecord } from '#services/database-manager/database-manager.types'
import type { Platform } from '#services/platform-manager/platform-manager.types'

export class DeepLinking {
  private readonly LOG_COMPONENT = 'deepLinkingService'
  private readonly RESPONSE_TTL_SECONDS = 60
  private readonly RESPONSE_MESSAGE_TYPE = 'LtiDeepLinkingResponse'
  private readonly DEEP_LINKING_SUBMISSION_FORM_TEMPLATE = path.join(
    __dirname,
    'templates',
    'deep-linking-submission-form.spy',
  )

  private readonly CONTENT_ITEMS_CLAIM = 'https://purl.imsglobal.org/spec/lti-dl/claim/content_items'
  private readonly MSG_CLAIM = 'https://purl.imsglobal.org/spec/lti-dl/claim/msg'
  private readonly ERROR_MSG_CLAIM = 'https://purl.imsglobal.org/spec/lti-dl/claim/errormsg'
  private readonly LOG_CLAIM = 'https://purl.imsglobal.org/spec/lti-dl/claim/log'
  private readonly ERROR_LOG_CLAIM = 'https://purl.imsglobal.org/spec/lti-dl/claim/errorlog'
  private readonly DATA_CLAIM = 'https://purl.imsglobal.org/spec/lti-dl/claim/data'

  private readonly launchContext: LaunchContext
  private readonly logger: Logger

  constructor(launchContext: LaunchContext, logger: Logger) {
    this.launchContext = launchContext
    this.logger = logger
  }

  /** Whether this launch is a deep-linking launch. Check before calling any other method on this service. */
  public isAvailable(): boolean {
    return this.launchContext.idToken.services.deepLinking.available
  }

  public async createDeepLinkingMessage(
    contentItems: ContentItem | ContentItem[],
    options?: DeepLinkingOptions,
  ): Promise<string> {
    const { platform, rawIdToken: idToken } = this.launchContext
    const settings = this.resolveDeepLinkingSettings(idToken)
    return await this.signDeepLinkingMessage({ idToken, platform, settings, contentItems, options })
  }

  public async createDeepLinkingForm(
    contentItems: ContentItem | ContentItem[],
    options?: DeepLinkingOptions,
  ): Promise<string> {
    const { platform, rawIdToken: idToken } = this.launchContext
    const settings = this.resolveDeepLinkingSettings(idToken)
    const message = await this.signDeepLinkingMessage({ idToken, platform, settings, contentItems, options })

    return renderTemplate(this.DEEP_LINKING_SUBMISSION_FORM_TEMPLATE, {
      action: escapeHtmlAttribute(settings.deep_link_return_url ?? ''),
      message,
    })
  }

  private async signDeepLinkingMessage(request: {
    idToken: IdTokenRecord
    platform: Platform
    settings: DeepLinkingSettingsClaim
    contentItems: ContentItem | ContentItem[]
    options?: DeepLinkingOptions
  }): Promise<string> {
    const { idToken, platform, settings, contentItems, options } = request
    const items = validate<ContentItem[]>(ContentItemsInputSchema, contentItems)
    const accepted = this.filterContentItems(items, settings)

    const payload: Record<string, unknown> = {
      iss: platform.clientId,
      aud: idToken.iss,
      nonce: randomJti(),
      [IdTokenClaim.DeploymentId]: idToken[IdTokenClaim.DeploymentId],
      [IdTokenClaim.MessageType]: this.RESPONSE_MESSAGE_TYPE,
      [IdTokenClaim.Version]: idToken[IdTokenClaim.Version],
      [this.CONTENT_ITEMS_CLAIM]: accepted,
    }

    const errMessage = options?.errMessage ?? options?.errmessage
    const errLog = options?.errLog ?? options?.errlog
    if (options?.message !== undefined) payload[this.MSG_CLAIM] = options.message
    if (errMessage !== undefined) payload[this.ERROR_MSG_CLAIM] = errMessage
    if (options?.log !== undefined) payload[this.LOG_CLAIM] = options.log
    if (errLog !== undefined) payload[this.ERROR_LOG_CLAIM] = errLog
    if (settings.data !== undefined) payload[this.DATA_CLAIM] = settings.data

    this.logger.debug(this.LOG_COMPONENT, `Signing deep linking response with ${accepted.length} content item(s)`)

    return signJwt(payload, resolvePlatformPrivateKey(platform), {
      algorithm: RS256_ALGORITHM,
      expiresIn: this.RESPONSE_TTL_SECONDS,
      keyid: platform.id,
    })
  }

  private resolveDeepLinkingSettings(idToken: IdTokenRecord): DeepLinkingSettingsClaim {
    const settings = idToken[IdTokenClaim.DeepLinkingSettings]
    if (settings === undefined) throw new MissingDeepLinkSettingsError()
    return settings
  }

  private filterContentItems(items: ContentItem[], settings: DeepLinkingSettingsClaim): ContentItem[] {
    const acceptedTypes = settings.accept_types ?? []
    // `accept_multiple` arrives from an external, platform-controlled id_token claim; the declared
    // `boolean` type isn't a runtime guarantee. Some platforms send the string 'false' instead of the
    // boolean, so both must be treated the same way here, not just the boolean.
    const rawAcceptMultiple: unknown = settings.accept_multiple
    const acceptMultiple = rawAcceptMultiple !== false && rawAcceptMultiple !== 'false'

    const accepted: ContentItem[] = []
    for (const item of items) {
      if (!acceptedTypes.includes(item.type)) continue
      accepted.push(item)
      if (!acceptMultiple) break
    }
    return accepted
  }
}

export default DeepLinking
