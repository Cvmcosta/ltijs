export interface HttpErrorDetails {
  message: string
  status?: number
  statusText?: string
  url?: string
  response?: unknown
}

export class HttpError extends Error {
  public readonly status?: number
  public readonly statusText?: string
  public readonly url?: string
  public readonly response: unknown

  constructor(details: HttpErrorDetails) {
    super(details.message)
    this.name = 'HttpError'
    this.status = details.status
    this.statusText = details.statusText
    this.url = details.url
    this.response = details.response
  }
}
