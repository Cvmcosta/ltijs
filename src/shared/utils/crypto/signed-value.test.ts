import { signValue, verifySignedValue } from '#utils/crypto/signed-value'

describe('signValue() / verifySignedValue()', () => {
  it('round-trips the original value', () => {
    const token = signValue('some-value', 'secret')
    expect(verifySignedValue(token, 'secret')).toBe('some-value')
  })

  it('round-trips a value that itself contains dots', () => {
    const token = signValue('state-id-1:1234567890', 'secret')
    expect(verifySignedValue(token, 'secret')).toBe('state-id-1:1234567890')
  })

  it('returns undefined for a tampered signature', () => {
    const token = signValue('some-value', 'secret')
    const tampered = `${token.slice(0, -2)}xx`
    expect(verifySignedValue(tampered, 'secret')).toBeUndefined()
  })

  it('returns undefined for a tampered value with a stale signature', () => {
    const token = signValue('some-value', 'secret')
    const separatorIndex = token.lastIndexOf('.')
    const tampered = `different-value${token.slice(separatorIndex)}`
    expect(verifySignedValue(tampered, 'secret')).toBeUndefined()
  })

  it('returns undefined for the wrong secret', () => {
    const token = signValue('some-value', 'secret')
    expect(verifySignedValue(token, 'wrong-secret')).toBeUndefined()
  })

  it('returns undefined for a token with no separator at all', () => {
    expect(verifySignedValue('no-separator-here', 'secret')).toBeUndefined()
  })

  it('returns undefined for a signature of the wrong length, without throwing', () => {
    const token = signValue('some-value', 'secret')
    const separatorIndex = token.lastIndexOf('.')
    const truncated = `${token.slice(0, separatorIndex + 1)}short`
    expect(verifySignedValue(truncated, 'secret')).toBeUndefined()
  })

  it('produces a different signature for a different secret', () => {
    expect(signValue('some-value', 'secret-a')).not.toBe(signValue('some-value', 'secret-b'))
  })
})
