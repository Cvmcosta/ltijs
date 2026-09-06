import {
  createPublicKey,
  generateKeyPair as generateKeyPairCallback,
  type JsonWebKey,
  type KeyObject,
} from 'node:crypto'
import { promisify } from 'node:util'
import type { GeneratedKeyPair } from '#services/platform-manager/platform-manager.types'

const RSA_MODULUS_LENGTH = 2048
const PUBLIC_KEY_ENCODING = { type: 'spki', format: 'pem' } as const
const PRIVATE_KEY_ENCODING = { type: 'pkcs1', format: 'pem' } as const

// Promisified callback-based generateKeyPair, not the synchronous generateKeyPairSync -- offloads
// RSA-2048 generation (tens of ms of CPU) to libuv's threadpool instead of blocking the event loop.
const generateKeyPairAsync = promisify(generateKeyPairCallback)

export async function generateKeyPair(): Promise<GeneratedKeyPair> {
  const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
    modulusLength: RSA_MODULUS_LENGTH,
    publicKeyEncoding: PUBLIC_KEY_ENCODING,
    privateKeyEncoding: PRIVATE_KEY_ENCODING,
  })
  return { public: publicKey, private: privateKey }
}

export function jwkToRsa(jwk: JsonWebKey): KeyObject {
  return createPublicKey({ key: jwk, format: 'jwk' })
}

export function rsaToJwk(pem: string): JsonWebKey {
  return createPublicKey(pem).export({ format: 'jwk' })
}
