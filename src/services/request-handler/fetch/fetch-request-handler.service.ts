import { HttpError } from '#services/request-handler/errors'
import { HttpMethod } from '#services/http-handler/http-handler.types'
import type {
  RequestHandler,
  RequestHeaders,
  RequestOptions,
  RequestResponse,
} from '#services/request-handler/request-handler.types'

export class FetchRequestHandler implements RequestHandler {
  private readonly AUTHORIZATION_HEADER = 'Authorization'
  private readonly ACCEPT_HEADER = 'Accept'
  private readonly CONTENT_TYPE_HEADER = 'Content-Type'
  private readonly JSON_CONTENT_TYPE = 'application/json'

  private readonly permanentHeaders: Record<string, string> = {}

  public async get<T = unknown>(url: string, options?: RequestOptions): Promise<RequestResponse<T>> {
    return await this.request<T>(HttpMethod.Get, url, undefined, options)
  }

  public async post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<RequestResponse<T>> {
    return await this.request<T>(HttpMethod.Post, url, body, options)
  }

  public async put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<RequestResponse<T>> {
    return await this.request<T>(HttpMethod.Put, url, body, options)
  }

  public async delete<T = unknown>(url: string, options?: RequestOptions): Promise<RequestResponse<T>> {
    return await this.request<T>(HttpMethod.Delete, url, undefined, options)
  }

  public setPermanentHeader(name: string, value: string): void {
    this.permanentHeaders[name] = value
  }

  private async request<T>(
    method: HttpMethod,
    url: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<RequestResponse<T>> {
    const response = await fetch(this.buildUrl(url, options?.query), {
      method,
      headers: this.buildHeaders(body, options?.headers),
      body: this.buildBody(body),
    })

    const data = await this.parseBody<T>(response)
    if (!response.ok) {
      throw new HttpError({
        message: `HTTP request failed with status ${response.status}: ${response.statusText}`,
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        response: data,
      })
    }
    return { data, headers: Object.fromEntries(response.headers.entries()) }
  }

  private buildUrl(url: string, query?: URLSearchParams): string {
    if (query === undefined || query.toString() === '') return url
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${query.toString()}`
  }

  private buildHeaders(body: unknown, headers?: RequestHeaders): Record<string, string> {
    const mapped: Record<string, string> = { ...this.permanentHeaders }
    if (headers?.authorization !== undefined) mapped[this.AUTHORIZATION_HEADER] = headers.authorization
    if (headers?.accept !== undefined) mapped[this.ACCEPT_HEADER] = headers.accept
    if (headers?.contentType !== undefined) mapped[this.CONTENT_TYPE_HEADER] = headers.contentType
    if (body !== undefined && !(body instanceof URLSearchParams) && !(this.CONTENT_TYPE_HEADER in mapped)) {
      mapped[this.CONTENT_TYPE_HEADER] = this.JSON_CONTENT_TYPE
    }
    return mapped
  }

  // URLSearchParams bodies (e.g. the OAuth2 client-credentials grant) must be form-encoded, not JSON --
  // passed straight through, fetch serializes it and sets the correct content-type itself.
  private buildBody(body: unknown): BodyInit | undefined {
    if (body === undefined) return undefined
    if (body instanceof URLSearchParams) return body
    return JSON.stringify(body)
  }

  private async parseBody<T>(response: Response): Promise<T> {
    const text = await response.text()
    if (text === '') return undefined as T
    try {
      return JSON.parse(text) as T
    } catch {
      return text as T
    }
  }
}

export default FetchRequestHandler
