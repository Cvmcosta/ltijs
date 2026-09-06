import { LtijsError } from '#shared/errors'

export class MissingNamesRolesServiceUrlError extends LtijsError {
  constructor() {
    super('MISSING_NAMES_ROLES_SERVICE_URL')
  }
}

export class MembersNotFoundError extends LtijsError {
  constructor() {
    super('MEMBERS_NOT_FOUND')
  }
}
