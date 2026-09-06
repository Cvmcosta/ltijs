import { LtijsError } from '#shared/errors'

export class DynamicRegistrationNotConfiguredError extends LtijsError {
  constructor() {
    super('DYNAMIC_REGISTRATION_NOT_CONFIGURED')
  }
}
