import { LtijsError } from '#shared/errors'

export class MissingDeepLinkSettingsError extends LtijsError {
  constructor() {
    super('MISSING_DEEP_LINK_SETTINGS')
  }
}

export class DeepLinkingNotAvailableError extends LtijsError {
  constructor() {
    super('DEEP_LINKING_NOT_AVAILABLE')
  }
}
