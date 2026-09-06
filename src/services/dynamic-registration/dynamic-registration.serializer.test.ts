import { buildOpenIDConfiguration } from '#services/dynamic-registration/dynamic-registration.serializer'
import type { OpenIDConfiguration } from '#services/dynamic-registration/dynamic-registration.types'

const openIdConfiguration: OpenIDConfiguration = {
  issuer: 'http://localhost/moodle',
  authorization_endpoint: 'http://localhost/moodle/auth',
  token_endpoint: 'http://localhost/moodle/AccessTokenUrl',
  registration_endpoint: 'http://localhost/moodle/register',
  jwks_uri: 'http://localhost/moodle/keyset',
}

describe('buildOpenIDConfiguration()', () => {
  it('returns a frozen copy of the given configuration', () => {
    const configuration = buildOpenIDConfiguration(openIdConfiguration)

    expect(configuration).toEqual(openIdConfiguration)
    expect(Object.isFrozen(configuration)).toBe(true)
  })
})
