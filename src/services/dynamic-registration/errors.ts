import { LtijsError } from '#shared/errors'

export class MissingOpenIdConfigurationUrlError extends LtijsError {
  constructor() {
    super('MISSING_OPENID_CONFIGURATION_URL')
  }
}
