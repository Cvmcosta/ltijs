import { ValidationError } from '#utils/validation/errors'

export const expectValidationErrorOnField = async (promise: Promise<unknown>, field: string): Promise<void> => {
  expect.assertions(2)
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).errors[field]).toBeDefined()
  }
}
