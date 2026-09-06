import { LtijsError } from '#shared/errors'

export class SessionNotFoundError extends LtijsError {
  constructor() {
    super('SESSION_NOT_FOUND')
  }
}

export class PlatformNotFoundError extends LtijsError {
  constructor() {
    super('PLATFORM_NOT_FOUND')
  }
}

export class UnregisteredPlatformError extends LtijsError {
  constructor() {
    super('UNREGISTERED_PLATFORM')
  }
}

export class PlatformNotActivatedError extends LtijsError {
  constructor() {
    super('PLATFORM_NOT_ACTIVATED')
  }
}

export class InvalidLtikError extends LtijsError {
  constructor() {
    super('INVALID_LTIK')
  }
}
