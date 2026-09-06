import { buildPlatform } from '#services/platform-manager/platform.serializer'
import { IdTokenValidationMethod } from '#services/platform-manager/platform-manager.constants'
import type { PlatformRecord } from '#services/database-manager/database-manager.types'

const buildRecord = (overrides: Partial<PlatformRecord> = {}): PlatformRecord => ({
  id: 'kid-1',
  url: 'http://localhost/moodle',
  clientId: 'ClientId1',
  name: 'Moodle',
  authenticationEndpoint: 'http://localhost/moodle/auth',
  accessTokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
  authorizationServer: 'http://localhost/moodle/AccessTokenUrl',
  idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: 'public-key-pem' },
  active: true,
  keys: { public: 'public-key-pem', private: 'private-key-pem' },
  ...overrides,
})

describe('buildPlatform()', () => {
  it('maps a PlatformRecord onto Platform, including the accesstokenEndpoint/authConfig output aliases', () => {
    const platform = buildPlatform(buildRecord())

    expect(platform).toMatchObject({
      id: 'kid-1',
      url: 'http://localhost/moodle',
      clientId: 'ClientId1',
      name: 'Moodle',
      authenticationEndpoint: 'http://localhost/moodle/auth',
      accessTokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
      accesstokenEndpoint: 'http://localhost/moodle/AccessTokenUrl',
      idTokenValidation: { method: IdTokenValidationMethod.RsaKey, key: 'public-key-pem' },
      authConfig: { method: IdTokenValidationMethod.RsaKey, key: 'public-key-pem' },
      active: true,
      keys: { public: 'public-key-pem', private: 'private-key-pem' },
      publicKey: 'public-key-pem',
      privateKey: 'private-key-pem',
    })
  })

  it('returns a deeply frozen object', () => {
    const platform = buildPlatform(buildRecord())

    expect(Object.isFrozen(platform)).toBe(true)
    expect(Object.isFrozen(platform.keys)).toBe(true)
    expect(Object.isFrozen(platform.idTokenValidation)).toBe(true)
  })

  it('passes an explicit authorizationServer through unchanged', () => {
    const platform = buildPlatform(buildRecord({ authorizationServer: 'http://localhost/moodle/custom-auth' }))

    expect(platform.authorizationServer).toBe('http://localhost/moodle/custom-auth')
  })

  it('falls back to accessTokenEndpoint when authorizationServer is undefined', () => {
    const platform = buildPlatform(buildRecord({ authorizationServer: undefined }))

    expect(platform.authorizationServer).toBe('http://localhost/moodle/AccessTokenUrl')
  })

  it('falls back to accessTokenEndpoint when authorizationServer is an empty string', () => {
    const platform = buildPlatform(buildRecord({ authorizationServer: '' }))

    expect(platform.authorizationServer).toBe('http://localhost/moodle/AccessTokenUrl')
  })
})
