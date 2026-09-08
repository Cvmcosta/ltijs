import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { decodeToken, signJwt, verifyTokenSignature } from '#utils/crypto/jwt'

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
})

describe('decodeToken()', () => {
  it('decodes the header and payload of a JWT without verifying its signature', () => {
    const token = jwt.sign({ foo: 'bar' }, privateKey, { algorithm: 'RS256', keyid: 'kid-1' })

    const { header, payload } = decodeToken(token)

    expect(header).toEqual({ kid: 'kid-1', alg: 'RS256' })
    expect(payload).toMatchObject({ foo: 'bar' })
  })

  it('resolves an empty header/payload for a malformed token', () => {
    const { header, payload } = decodeToken('not-a-jwt')

    expect(header).toEqual({ kid: undefined, alg: undefined })
    expect(payload).toEqual({})
  })
})

describe('verifyTokenSignature()', () => {
  it('returns the decoded payload for a validly signed token', () => {
    const token = jwt.sign({ foo: 'bar' }, privateKey, { algorithm: 'RS256' })

    expect(verifyTokenSignature(token, publicKey, ['RS256'])).toMatchObject({ foo: 'bar' })
  })

  it('throws for a token signed with a different key', () => {
    const { privateKey: otherPrivateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    })
    const token = jwt.sign({ foo: 'bar' }, otherPrivateKey, { algorithm: 'RS256' })

    expect(() => verifyTokenSignature(token, publicKey, ['RS256'])).toThrow()
  })

  it('throws when the token algorithm is not in the allowed list', () => {
    const token = jwt.sign({ foo: 'bar' }, privateKey, { algorithm: 'RS256' })

    expect(() => verifyTokenSignature(token, publicKey, ['RS384'])).toThrow()
  })

  it('throws for an already-expired token', () => {
    const token = jwt.sign({ foo: 'bar' }, privateKey, { algorithm: 'RS256', expiresIn: -60 })

    expect(() => verifyTokenSignature(token, publicKey, ['RS256'])).toThrow(jwt.TokenExpiredError)
  })

  it('throws for a not-yet-valid token (nbf in the future)', () => {
    const token = jwt.sign({ foo: 'bar' }, privateKey, { algorithm: 'RS256', notBefore: 60 })

    expect(() => verifyTokenSignature(token, publicKey, ['RS256'])).toThrow(jwt.NotBeforeError)
  })
})

describe('signJwt()', () => {
  it('signs a payload that verifyTokenSignature can then verify', () => {
    const token = signJwt({ foo: 'bar' }, privateKey, { algorithm: 'RS256' })

    expect(verifyTokenSignature(token, publicKey, ['RS256'])).toMatchObject({ foo: 'bar' })
  })

  it('honors sign options such as expiresIn', () => {
    const token = signJwt({ foo: 'bar' }, 'a-shared-secret', { expiresIn: 60 })

    const { payload } = decodeToken(token)
    expect(payload.exp).toBeDefined()
  })
})
