import type { ZodError } from 'zod'
import { LtijsError } from '#shared/errors'

type FieldErrors = Record<string, string[]>

export class ValidationError extends LtijsError {
  public readonly issues: ZodError['issues']
  public readonly errors: FieldErrors

  constructor(error: ZodError) {
    const details = error.issues
      .map(issue => {
        const pathLabel = issue.path.join('.')
        return `${pathLabel !== '' ? pathLabel : '(root)'}: ${issue.message}`
      })
      .join('; ')
    super(`Validation failed: ${details}`)
    this.issues = error.issues
    this.errors = ValidationError.groupByField(error.issues)
  }

  private static groupByField(issues: ZodError['issues']): FieldErrors {
    const errors: FieldErrors = {}
    for (const issue of issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '(root)'
      errors[key] = [...(errors[key] ?? []), issue.message]
    }
    return errors
  }
}
