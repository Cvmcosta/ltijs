export class LtijsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

// Shared by grading (AGS) and names-and-roles (NRPS) -- both resolve resourceLinkId from the same
// launch-layer idToken claim, so it belongs here rather than in either service's own errors.ts.
export class MissingOrInvalidResourceLinkIdError extends LtijsError {
  constructor() {
    super('MISSING_OR_INVALID_RESOURCE_LINK_ID')
  }
}
