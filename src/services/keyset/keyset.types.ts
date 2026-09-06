import type { JsonWebKey } from 'node:crypto'

export interface Jwk extends JsonWebKey {
  kid: string
  alg: string
  use: string
}

export interface Keyset {
  keys: Jwk[]
}
