import { LtijsError } from '#shared/errors'

export class MissingDatabaseConfigError extends LtijsError {
  constructor() {
    super('MISSING_DATABASE_CONFIG')
  }
}

export class ProviderNotDeployedError extends LtijsError {
  constructor() {
    super('PROVIDER_NOT_DEPLOYED')
  }
}
