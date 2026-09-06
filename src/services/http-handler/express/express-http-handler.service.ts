import type { Server } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import type { Server as HttpsServer } from 'node:https'
import express from 'express'
import type { Express, Request, Response } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { LtijsError } from '#shared/errors'
import type { Logger } from '#services/logger/logger.types'
import { ExpressHttpResponse } from '#services/http-handler/express/express-http-response'
import { HttpMethod } from '#services/http-handler/http-handler.types'
import type {
  CorsOptions,
  HttpHandler,
  HttpRequestParameters,
  RouteHandler,
  SslOptions,
} from '#services/http-handler/http-handler.types'

export interface ExpressHttpHandlerOptions {
  /** Defaults to reflecting any request origin with `credentials: true`. Pass `false` to disable CORS entirely. */
  cors?: false | CorsOptions
}

export class ExpressHttpHandler implements HttpHandler {
  private readonly LOG_COMPONENT = 'expressHttpHandler'
  private readonly INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'

  private readonly logger: Logger
  private server: Server | HttpsServer | undefined

  public readonly app: Express

  constructor(logger: Logger, options: ExpressHttpHandlerOptions = {}) {
    this.logger = logger
    this.app = express()
    this.applyMiddleware(options.cors)
  }

  public registerRoute(path: string, methods: HttpMethod[], handler: RouteHandler): void {
    const adapter = this.buildAdapter(handler)
    for (const method of methods) this.app[this.toExpressMethod(method)](path, adapter)
  }

  public async listen(port: number, ssl?: SslOptions): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server = ssl === undefined ? this.app.listen(port) : createHttpsServer(ssl, this.app).listen(port)
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

  private applyMiddleware(corsOptions: false | CorsOptions | undefined): void {
    this.app.use(helmet({ frameguard: false, contentSecurityPolicy: false }))
    if (corsOptions !== false) {
      const corsMiddleware = cors({
        origin: corsOptions?.origin ?? true,
        credentials: corsOptions?.credentials ?? true,
      })
      this.app.use(corsMiddleware)
      this.app.options('*splat', corsMiddleware)
    }
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
