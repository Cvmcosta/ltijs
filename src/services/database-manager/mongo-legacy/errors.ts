import { LtijsError } from '#shared/errors'

// Independent of `../mongo/errors.ts` by design -- `mongo/` and
// `mongo-legacy/` are fully isolated implementations, so no class is shared
// between them even though these error message strings are identical.

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
