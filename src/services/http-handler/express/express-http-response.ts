import type { CookieOptions as ExpressCookieOptions, Response } from 'express'
import type { CookieOptions, HttpResponse } from '#services/http-handler/http-handler.types'

export class ExpressHttpResponse implements HttpResponse {
  private readonly res: Response

  constructor(res: Response) {
    this.res = res
  }

  status(code: number): HttpResponse {
    this.res.status(code)
    return this
  }

  setCookie(name: string, value: string, options?: CookieOptions): HttpResponse {
    this.res.cookie(name, value, this.buildCookieOptions(options))
    return this
  }

  clearCookie(name: string, options?: CookieOptions): HttpResponse {
    this.res.clearCookie(name, this.buildCookieOptions(options))
    return this
  }

  redirect(url: string): void {
    this.res.redirect(url)
  }

  html(content: string): void {
    this.res.type('html').send(content)
  }

  json(body: unknown): void {
    this.res.json(body)
  }

  private buildCookieOptions(options?: CookieOptions): ExpressCookieOptions {
    return {
      httpOnly: options?.httpOnly,
      secure: options?.secure,
      sameSite: options?.sameSite,
      domain: options?.domain,
      maxAge: options?.maxAge,
      partitioned: options?.partitioned,
    }
  }
}

export default ExpressHttpResponse
