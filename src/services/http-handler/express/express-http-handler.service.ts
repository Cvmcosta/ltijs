import type { Server } from 'node:http'
import express from 'express'
import type { Express, Request, Response } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { LtijsError } from '#shared/errors'
import type { Logger } from '#services/logger/logger.types'
import { ExpressHttpResponse } from '#services/http-handler/express/express-http-response'
import { HttpMethod } from '#services/http-handler/http-handler.types'
import type { HttpHandler, HttpRequestParameters, RouteHandler } from '#services/http-handler/http-handler.types'

export class ExpressHttpHandler implements HttpHandler {
  private readonly LOG_COMPONENT = 'expressHttpHandler'
  private readonly INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'

  private readonly logger: Logger
  private server: Server | undefined

  public readonly app: Express

  constructor(logger: Logger) {
    this.logger = logger
    this.app = express()
    this.applyMiddleware()
  }

  public registerRoute(path: string, methods: HttpMethod[], handler: RouteHandler): void {
    const adapter = this.buildAdapter(handler)
    for (const method of methods) this.app[this.toExpressMethod(method)](path, adapter)
  }

  public async listen(port: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server = this.app.listen(port)
      this.server.once('listening', () => {
        resolve()
      })
      this.server.once('error', (error: Error) => {
        reject(error)
      })
    })
  }

  public async close(): Promise<void> {
    if (this.server === undefined) return
    await new Promise<void>((resolve, reject) => {
      this.server?.close(error => {
        if (error !== undefined) {
          reject(error)
          return
        }
        resolve()
      })
    })
  }

  private applyMiddleware(): void {
    this.app.use(helmet({ frameguard: false, contentSecurityPolicy: false }))
    this.app.use(
      cors({
        origin: (origin, callback) => {
          callback(null, true)
        },
        credentials: true,
      }),
    )
    this.app.options('*splat', cors())
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: false }))
    this.app.use(cookieParser())
  }

  private buildAdapter(handler: RouteHandler): (req: Request, res: Response) => Promise<void> {
    return async (req, res) => {
      try {
        const request = this.buildRequestParameters(req)
        const response = new ExpressHttpResponse(res)
        await handler(request, response)
      } catch (error) {
        this.handleRouteError(error, new ExpressHttpResponse(res))
      }
    }
  }

  private handleRouteError(error: unknown, response: ExpressHttpResponse): void {
    if (error instanceof LtijsError) {
      this.logger.error(this.LOG_COMPONENT, error.message)
      response.status(400).json({ error: error.name, message: error.message })
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    this.logger.error(this.LOG_COMPONENT, message)
    response.status(500).json({ error: this.INTERNAL_SERVER_ERROR })
  }

  private buildRequestParameters(req: Request): HttpRequestParameters {
    return {
      method: req.method,
      path: req.path,
      query: req.query as Record<string, string>,
      body: (req.body as Record<string, unknown> | undefined) ?? {},
      cookies: (req.cookies as Record<string, string> | undefined) ?? {},
      headers: req.headers as Record<string, string>,
    }
  }

  private toExpressMethod(method: HttpMethod): 'get' | 'post' | 'put' | 'delete' | 'all' {
    const EXPRESS_METHOD_BY_HTTP_METHOD: Record<HttpMethod, 'get' | 'post' | 'put' | 'delete' | 'all'> = {
      [HttpMethod.Get]: 'get',
      [HttpMethod.Post]: 'post',
      [HttpMethod.Put]: 'put',
      [HttpMethod.Delete]: 'delete',
      [HttpMethod.All]: 'all',
    }
    return EXPRESS_METHOD_BY_HTTP_METHOD[method]
  }
}

export default ExpressHttpHandler
