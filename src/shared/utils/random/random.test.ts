import { randomJti, randomUuid } from '#utils/random/random'

describe('randomUuid()', () => {
  it('returns a valid, unique UUID on each call', () => {
    const first = randomUuid()
    const second = randomUuid()

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(first).not.toBe(second)
  })
})

describe('randomJti()', () => {
  it('returns a unique, URL-safe 25-character identifier on each call', () => {
    const first = randomJti()
    const second = randomJti()

    expect(first).toHaveLength(25)
    expect(first).toMatch(/^[0-9a-z]+$/)
    expect(first).not.toBe(second)
  })

  it('does not use Math.random() as its entropy source', () => {
    // jti exists specifically for platform-side replay detection on the signed client-credentials
    // assertion -- a Math.random()-backed generator (not a CSPRNG) would undermine that guarantee.
    const mathRandomSpy = jest.spyOn(Math, 'random')

    randomJti()

    expect(mathRandomSpy).not.toHaveBeenCalled()
    mathRandomSpy.mockRestore()
  })
})
