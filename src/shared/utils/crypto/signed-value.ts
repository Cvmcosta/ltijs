import crypto from 'node:crypto'

// Cookie-signing-style HMAC, for values that only this server ever signs and verifies. Unlike the
// RS256 JWTs used elsewhere (state, ltik), there's no third party independently verifying these, so
// there's no need for asymmetric signing. As a side effect, the two are structurally incompatible: an
// HMAC token is never JWT-shaped, so `verifyTokenSignature` rejects it outright, and vice versa.

const HMAC_ALGORITHM = 'sha256'
const SEPARATOR = '.'

export function signValue(value: string, secret: string): string {
  const signature = crypto.createHmac(HMAC_ALGORITHM, secret).update(value).digest('base64url')
  return `${value}${SEPARATOR}${signature}`
}

export function verifySignedValue(token: string, secret: string): string | undefined {
  const separatorIndex = token.lastIndexOf(SEPARATOR)
  if (separatorIndex === -1) return undefined

  const value = token.slice(0, separatorIndex)
  const signature = token.slice(separatorIndex + 1)
  const expected = crypto.createHmac(HMAC_ALGORITHM, secret).update(value).digest('base64url')

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (signatureBuffer.length !== expectedBuffer.length) return undefined
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return undefined

  return value
}
