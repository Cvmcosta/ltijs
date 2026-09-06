import { decryptAes256, encryptAes256 } from '#utils/crypto/aes-encryption'

describe('encryptAes256() / decryptAes256()', () => {
  it('round-trips plaintext through encryption and decryption', () => {
    const encrypted = encryptAes256('super-secret-value', 'ENCRYPTIONKEY')
    expect(decryptAes256(encrypted.data, encrypted.iv, 'ENCRYPTIONKEY')).toBe('super-secret-value')
  })

  it('produces a different iv (and ciphertext) on each call', () => {
    const first = encryptAes256('same-plaintext', 'ENCRYPTIONKEY')
    const second = encryptAes256('same-plaintext', 'ENCRYPTIONKEY')
    expect(first.iv).not.toBe(second.iv)
    expect(first.data).not.toBe(second.data)
  })

  it('fails to decrypt with the wrong secret', () => {
    const encrypted = encryptAes256('super-secret-value', 'ENCRYPTIONKEY')
    expect(() => {
      decryptAes256(encrypted.data, encrypted.iv, 'WRONG_KEY')
    }).toThrow()
  })
})
