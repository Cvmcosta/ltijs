import { FetchRequestHandler } from '#services/request-handler/fetch/fetch-request-handler.service'
import { HttpError } from '#services/request-handler/errors'
import { buildMockFetchResponse } from '#utils/tests/mock-fetch-response'

describe('FetchRequestHandler', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('performs GET requests through native fetch', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ status: 200, statusText: 'OK', body: { ok: true } }))
    const handler = new FetchRequestHandler()

    const response = await handler.get('http://example.com/resource')

    expect(response.data).toEqual({ ok: true })
  })

  it('exposes response headers (e.g. for NamesAndRoles Link-header pagination)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      buildMockFetchResponse({
        status: 200,
        statusText: 'OK',
        body: [],
        headers: { link: '<http://example.com/resource?page=2>; rel="next"' },
      }),
    )
    const handler = new FetchRequestHandler()

    const response = await handler.get('http://example.com/resource')

    expect(response.headers.link).toBe('<http://example.com/resource?page=2>; rel="next"')
  })

  it('passes headers and query params through on GET requests', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ status: 200, statusText: 'OK', body: {} }))
    const handler = new FetchRequestHandler()

    await handler.get('http://example.com/resource', {
      headers: { authorization: 'Bearer xyz', accept: 'application/json' },
      query: new URLSearchParams([['a', '1']]),
    })

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0]
    expect(calledUrl).toBe('http://example.com/resource?a=1')
    const headers = calledInit?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer xyz')
    expect(headers.Accept).toBe('application/json')
  })

  it('performs POST requests with a JSON body', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ status: 201, statusText: 'Created', body: { created: true } }))
    const handler = new FetchRequestHandler()

    const response = await handler.post('http://example.com/resource', { foo: 'bar' })

    const [, calledInit] = fetchSpy.mock.calls[0]
    expect(JSON.parse(calledInit?.body as string)).toEqual({ foo: 'bar' })
    expect(response.data).toEqual({ created: true })
  })

  it('sends a URLSearchParams body form-encoded, not as JSON, and lets fetch set its content-type', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ status: 200, statusText: 'OK', body: {} }))
    const handler = new FetchRequestHandler()
    const body = new URLSearchParams({ grant_type: 'client_credentials', scope: 'scope-a' })

    await handler.post('http://example.com/token', body)

    const [, calledInit] = fetchSpy.mock.calls[0]
    expect(calledInit?.body).toBe(body)
    expect((calledInit?.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('performs PUT requests with a JSON body', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ status: 200, statusText: 'OK', body: { updated: true } }))
    const handler = new FetchRequestHandler()

    const response = await handler.put('http://example.com/resource', { foo: 'bar' })

    expect(response.data).toEqual({ updated: true })
  })

  it('performs DELETE requests', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ status: 204, statusText: 'No Content', body: undefined }))
    const handler = new FetchRequestHandler()

    await expect(handler.delete('http://example.com/resource')).resolves.toBeDefined()
  })

  it('normalizes a non-2xx response into an HttpError', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      buildMockFetchResponse({
        status: 500,
        statusText: 'Internal Server Error',
        body: { detail: 'boom' },
        url: 'http://example.com/fail',
      }),
    )
    const handler = new FetchRequestHandler()

    try {
      await handler.get('http://example.com/fail')
      throw new Error('expected handler.get() to reject')
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      expect((error as HttpError).status).toBe(500)
      expect((error as HttpError).response).toEqual({ detail: 'boom' })
    }
  })

  it('rethrows the original error for a request that never gets a response', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'))
    const handler = new FetchRequestHandler()

    await expect(handler.get('http://example.com/unreachable')).rejects.not.toBeInstanceOf(HttpError)
  })

  it('sends the correct HTTP method for each verb', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ status: 200, statusText: 'OK', body: {} }))
    const handler = new FetchRequestHandler()

    await handler.get('http://example.com/resource')
    await handler.post('http://example.com/resource')
    await handler.put('http://example.com/resource')
    await handler.delete('http://example.com/resource')

    const methods = fetchSpy.mock.calls.map(([, init]) => init?.method)
    expect(methods).toEqual(['GET', 'POST', 'PUT', 'DELETE'])
  })

  it('setPermanentHeader() sends the given header on every subsequent request', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(buildMockFetchResponse({ status: 200, statusText: 'OK', body: {} }))
    const handler = new FetchRequestHandler()

    handler.setPermanentHeader('User-Agent', 'ltijs/1.2.3')
    await handler.get('http://example.com/resource')

    const [, calledInit] = fetchSpy.mock.calls[0]
    expect((calledInit?.headers as Record<string, string>)['User-Agent']).toBe('ltijs/1.2.3')
  })
})
