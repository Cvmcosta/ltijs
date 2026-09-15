import { LtijsError } from '#shared/errors'

export class MissingLineItemsEndpointError extends LtijsError {
  constructor() {
    super('MISSING_LINEITEMS_ENDPOINT')
  }
}

export class AssignmentAndGradesNotAvailableError extends LtijsError {
  constructor() {
    super('ASSIGNMENT_AND_GRADES_NOT_AVAILABLE')
  }
}
