import { resolvePlatformPrivateKey, resolvePlatformPublicKey } from '#services/platform-manager/platform-keys'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import type { Platform } from '#services/platform-manager/platform-manager.types'

const buildPlatform = (overrides: Partial<Platform> = {}): Platform => ({
  id: 'kid-1',
  url: 'http://localhost/moodle',
  clientId: 'ClientId1',
  name: 'Moodle',
  authenticationEndpoint: 'http://localhost/moodle/auth',
  accessTokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
  accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
  authorizationServer: 'http://localhost/moodle/AccessTokenUrl',
  idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: 'public-key-pem' },
  authConfig: { method: IdTokenValidationMethod.RsaKey, key: 'public-key-pem' },
  active: true,
  keys: { public: 'public-key-pem', private: 'private-key-pem' },
  publicKey: 'public-key-pem',
  privateKey: 'private-key-pem',
  ...overrides,
})

describe('resolvePlatformPrivateKey()', () => {
  it('returns the platform private key when present', () => {
    expect(resolvePlatformPrivateKey(buildPlatform())).toBe('private-key-pem')
  })

  it('throws PRIVATE_KEY_NOT_FOUND when the platform has no private key', () => {
    const platform = buildPlatform({ keys: { public: 'public-key-pem', private: '' } })
    expect(() => resolvePlatformPrivateKey(platform)).toThrow('PRIVATE_KEY_NOT_FOUND')
  })
})

describe('resolvePlatformPublicKey()', () => {
  it('returns the platform public key when present', () => {
    expect(resolvePlatformPublicKey(buildPlatform())).toBe('public-key-pem')
  })

  it('throws PUBLIC_KEY_NOT_FOUND when the platform has no public key', () => {
    const platform = buildPlatform({ keys: { public: '', private: 'private-key-pem' } })
    expect(() => resolvePlatformPublicKey(platform)).toThrow('PUBLIC_KEY_NOT_FOUND')
  })
})
