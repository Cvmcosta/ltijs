import type { Response } from 'express'
import type { HttpResponse } from '#services/http-handler/http-handler.types'

export class ExpressHttpResponse implements HttpResponse {
  private readonly res: Response

  constructor(res: Response) {
    this.res = res
  }

  status(code: number): HttpResponse {
    this.res.status(code)
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
}

export default ExpressHttpResponse
