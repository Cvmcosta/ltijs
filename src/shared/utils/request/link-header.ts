import parseLink from 'parse-link-header'

export type ParsedLinks = ReturnType<typeof parseLink>

export const parseLinkHeader = (headerValue: unknown): ParsedLinks => {
  return typeof headerValue === 'string' ? parseLink(headerValue) : null
}

export default parseLinkHeader
