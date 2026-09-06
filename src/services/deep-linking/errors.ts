import { LtijsError } from '#shared/errors'

export class MissingDeepLinkSettingsError extends LtijsError {
  constructor() {
    super('MISSING_DEEP_LINK_SETTINGS')
  }
}
