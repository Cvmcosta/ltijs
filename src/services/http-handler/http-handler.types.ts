export enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Delete = 'DELETE',
  All = 'ALL',
}

export interface SslOptions {
  key: string
  cert: string
}

export interface CorsOptions {
  /**
   * A single string always sets that exact value on every response, regardless of the request's actual
   * origin (safe -- a browser on a different origin still rejects the mismatched response itself) but not
   * a real allowlist. To allow a specific set of origins and omit the header for everyone else, pass an
   * array, even with a single entry.
   */
  origin?: string | string[]
  credentials?: boolean
}

export interface HttpRequestParameters {
  method: string
  path: string
  query: Record<string, string>
  body: Record<string, unknown>
  headers: Record<string, string>
}

export interface HttpResponse {
  status: (code: number) => HttpResponse
  redirect: (url: string) => void
  html: (content: string) => void
  json: (body: unknown) => void
}

export type RouteHandler = (request: HttpRequestParameters, response: HttpResponse) => Promise<void>

export interface HttpHandler {
  registerRoute: (path: string, methods: HttpMethod[], handler: RouteHandler) => void
  listen: () => Promise<void>
  close: () => Promise<void>
}
