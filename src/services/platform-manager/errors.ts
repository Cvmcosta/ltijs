import { LtijsError } from '#shared/errors'

export class PrivateKeyNotFoundError extends LtijsError {
  constructor() {
    super('PRIVATE_KEY_NOT_FOUND')
  }
}

export class PublicKeyNotFoundError extends LtijsError {
  constructor() {
    super('PUBLIC_KEY_NOT_FOUND')
  }
}

export class UrlClientIdCombinationAlreadyExistsError extends LtijsError {
  constructor() {
    super('URL_CLIENT_ID_COMBINATION_ALREADY_EXISTS')
  }
}

export class PlatformAlreadyRegisteredError extends LtijsError {
  constructor() {
    super('PLATFORM_ALREADY_REGISTERED')
  }
}
