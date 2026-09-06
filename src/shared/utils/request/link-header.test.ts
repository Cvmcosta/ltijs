import { parseLinkHeader } from '#utils/request/link-header'

describe('parseLinkHeader', () => {
  it('parses a valid Link header into a keyed object', () => {
    const result = parseLinkHeader('<http://a>; rel="next",<http://b>; rel="prev"')

    expect(result?.next?.url).toBe('http://a')
    expect(result?.prev?.url).toBe('http://b')
  })

  it('returns null for a missing header value', () => {
    expect(parseLinkHeader(undefined)).toBeNull()
  })

  it('returns null for a non-string header value', () => {
    expect(parseLinkHeader(42)).toBeNull()
  })
})
