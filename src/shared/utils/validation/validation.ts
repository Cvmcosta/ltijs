import type { z } from 'zod'
import { ValidationError } from '#utils/validation/errors'

export const validate = <T>(schema: z.ZodType, value: unknown): T => {
  const result = schema.safeParse(value)
  if (!result.success) throw new ValidationError(result.error)
  return result.data as T
}
