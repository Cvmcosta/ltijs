import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { generateKeyPair, jwkToRsa, rsaToJwk } from '#utils/crypto/keys'
import { verifyTokenSignature } from '#utils/crypto/jwt'

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
})

describe('jwkToRsa()', () => {
  it('converts a JWK back into a usable public key that verifies a token signed by its pair', () => {
    const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' })
    const token = jwt.sign({ foo: 'bar' }, privateKey, { algorithm: 'RS256' })

    const key = jwkToRsa(jwk)

    expect(verifyTokenSignature(token, key, ['RS256'])).toMatchObject({ foo: 'bar' })
  })
})

describe('rsaToJwk()', () => {
  it('converts a PEM public key into a JWK', () => {
    const jwk = rsaToJwk(publicKey)

    expect(jwk).toMatchObject({ kty: 'RSA' })
    expect(jwk.n).toEqual(expect.any(String))
    expect(jwk.e).toEqual(expect.any(String))
  })

  it('round-trips through jwkToRsa() back into a usable verification key', () => {
    const token = jwt.sign({ foo: 'bar' }, privateKey, { algorithm: 'RS256' })

    const key = jwkToRsa(rsaToJwk(publicKey))

    expect(verifyTokenSignature(token, key, ['RS256'])).toMatchObject({ foo: 'bar' })
  })
})

describe('generateKeyPair()', () => {
  it('returns a PEM-encoded RSA keypair (SPKI public / PKCS1 private)', async () => {
    const keys = await generateKeyPair()

    expect(keys.public).toEqual(expect.stringContaining('BEGIN PUBLIC KEY'))
    expect(keys.private).toEqual(expect.stringContaining('BEGIN RSA PRIVATE KEY'))
  })

  it('returns a genuinely usable keypair -- a token signed with the private key verifies with the public key', async () => {
    const keys = await generateKeyPair()
    const token = jwt.sign({ foo: 'bar' }, keys.private, { algorithm: 'RS256' })

    expect(verifyTokenSignature(token, keys.public, ['RS256'])).toMatchObject({ foo: 'bar' })
  })

  it('generates a fresh, distinct keypair on every call', async () => {
    const first = await generateKeyPair()
    const second = await generateKeyPair()

    expect(first.public).not.toBe(second.public)
    expect(first.private).not.toBe(second.private)
  })
})
