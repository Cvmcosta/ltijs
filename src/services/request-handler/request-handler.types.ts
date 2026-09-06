export interface RequestHeaders {
  authorization?: string
  accept?: string
  contentType?: string
}

export interface RequestOptions {
  headers?: RequestHeaders
  query?: URLSearchParams
}

export interface RequestResponse<T = unknown> {
  data: T
  headers: Record<string, string | undefined>
}

export interface RequestHandler {
  get: <T = unknown>(url: string, options?: RequestOptions) => Promise<RequestResponse<T>>
  post: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) => Promise<RequestResponse<T>>
  put: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) => Promise<RequestResponse<T>>
  delete: <T = unknown>(url: string, options?: RequestOptions) => Promise<RequestResponse<T>>
  setPermanentHeader: (name: string, value: string) => void
}
