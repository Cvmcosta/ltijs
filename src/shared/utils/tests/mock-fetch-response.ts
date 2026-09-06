export interface MockFetchResponseOptions {
  status?: number
  statusText?: string
  body?: unknown
  url?: string
  headers?: HeadersInit
}

// A minimal fake `Response` (just what `FetchRequestHandler` reads) for `jest.spyOn(global, 'fetch')`
// mocks, so tests don't hand-roll their own copy.
export function buildMockFetchResponse(options: MockFetchResponseOptions = {}): Response {
  const { status = 200, statusText = 'OK', body, url = 'http://example.com/resource', headers = {} } = options
  const response: Pick<Response, 'ok' | 'status' | 'statusText' | 'url' | 'headers' | 'text'> = {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    url,
    headers: new Headers(headers),
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }
  return response as Response
}
