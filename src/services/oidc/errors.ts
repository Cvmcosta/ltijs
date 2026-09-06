import { LtijsError } from '#shared/errors'

export class AuthconfigNotFoundError extends LtijsError {
  constructor() {
    super('AUTHCONFIG_NOT_FOUND')
  }
}

export class AzpDoesNotMatchClientidError extends LtijsError {
  constructor() {
    super('AZP_DOES_NOT_MATCH_CLIENTID')
  }
}

export class InvalidMessageTypeError extends LtijsError {
  constructor() {
    super('INVALID_MESSAGE_TYPE')
  }
}

export class InvalidStateError extends LtijsError {
  constructor() {
    super('INVALID_STATE')
  }
}

export class InvalidNonceError extends LtijsError {
  constructor() {
    super('INVALID_NONCE_RECEIVED')
  }
}

export class TokenTooOldError extends LtijsError {
  constructor() {
    super('TOKEN_TOO_OLD')
  }
}

export class InvalidAlgError extends LtijsError {
  constructor() {
    super('INVALID_ALG')
  }
}
