import { buildBearerAuthorization } from '#utils/request/authorization-header'

describe('buildBearerAuthorization()', () => {
  it('builds a bearer authorization header from an access token', () => {
    expect(buildBearerAuthorization({ token_type: 'Bearer', access_token: 'abc123', expires_in: 3600 })).toBe(
      'Bearer abc123',
    )
  })

  it('builds a bearer authorization header from a raw token string', () => {
    expect(buildBearerAuthorization('abc123')).toBe('Bearer abc123')
  })
})
