import type { KeyObject } from 'node:crypto'
import jwt from 'jsonwebtoken'
import type { DecodedToken, TokenHeader } from '#utils/crypto/jwt.types'

export function decodeToken(token: string): { header: TokenHeader; payload: DecodedToken } {
  const decoded = jwt.decode(token, { complete: true })
  return {
    header: { kid: decoded?.header.kid, alg: decoded?.header.alg },
    payload: (decoded?.payload ?? {}) as DecodedToken,
  }
}

export function verifyTokenSignature(token: string, key: string | KeyObject, algorithms: string[]): DecodedToken {
  return jwt.verify(token, key, {
    algorithms: algorithms as jwt.Algorithm[],
    clockTimestamp: Date.now() / 1000,
  }) as unknown as DecodedToken
}

export function signJwt(payload: object, secret: string, options?: jwt.SignOptions): string {
  return jwt.sign(payload, secret, options)
}
