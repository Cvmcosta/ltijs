import { LtijsError } from '#shared/errors'

export class MissingLineItemsEndpointError extends LtijsError {
  constructor() {
    super('MISSING_LINEITEMS_ENDPOINT')
  }
}
