export enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Delete = 'DELETE',
  All = 'ALL',
}

export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  domain?: string
  maxAge?: number
  partitioned?: boolean
}

export interface HttpRequestParameters {
  method: string
  path: string
  query: Record<string, string>
  body: Record<string, unknown>
  cookies: Record<string, string>
  headers: Record<string, string>
}

export interface HttpResponse {
  status: (code: number) => HttpResponse
  setCookie: (name: string, value: string, options?: CookieOptions) => HttpResponse
  clearCookie: (name: string, options?: CookieOptions) => HttpResponse
  redirect: (url: string) => void
  html: (content: string) => void
  json: (body: unknown) => void
}

export type RouteHandler = (request: HttpRequestParameters, response: HttpResponse) => Promise<void>

export interface HttpHandler {
  registerRoute: (path: string, methods: HttpMethod[], handler: RouteHandler) => void
  listen: (port: number) => Promise<void>
  close: () => Promise<void>
}
