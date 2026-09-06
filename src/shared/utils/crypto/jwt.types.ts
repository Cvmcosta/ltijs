export interface TokenHeader {
  kid?: string
  alg?: string
}

export type DecodedToken = Record<string, unknown> & {
  iss: string
  aud: string | string[]
  azp?: string
  iat: number
  exp: number
  nonce: string
  sub: string
}
