import type { Server } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import type { Server as HttpsServer } from 'node:https'
import express from 'express'
import type { Express, NextFunction, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { LtijsError } from '#shared/errors'
import { HttpError } from '#services/request-handler/errors'
import type { Logger } from '#services/logger/logger.types'
import { ExpressHttpResponse } from '#services/http-handler/express/express-http-response'
import { HttpMethod } from '#services/http-handler/http-handler.types'
import type {
  HttpHandler,
  HttpRequestParameters,
  RouteHandler,
  SslOptions,
} from '#services/http-handler/http-handler.types'
import type { ExpressHttpHandlerOptions } from '#services/http-handler/express/express-http-handler.types'

export class ExpressHttpHandler implements HttpHandler {
  private readonly LOG_COMPONENT = 'expressHttpHandler'
  private readonly INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'

  private readonly logger: Logger
  private readonly port: number
  private readonly ssl: SslOptions | undefined
  private server: Server | HttpsServer | undefined

  public readonly app: Express

  constructor(logger: Logger, options: ExpressHttpHandlerOptions) {
    this.logger = logger
    this.port = options.port
    this.ssl = options.ssl
    this.app = express()
    this.setupServer(options)
  }

  public registerRoute(path: string, methods: HttpMethod[], handler: RouteHandler): void {
    const adapter = this.buildAdapter(handler)
    for (const method of methods) this.app[this.toExpressMethod(method)](path, adapter)
  }

  public async listen(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server =
        this.ssl === undefined ? this.app.listen(this.port) : createHttpsServer(this.ssl, this.app).listen(this.port)
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

  private setupServer(options: ExpressHttpHandlerOptions): void {
    this.app.use(helmet({ frameguard: false, contentSecurityPolicy: false }))
    if (options.cors !== false) {
      const corsMiddleware = cors({
        origin: options.cors?.origin ?? true,
        credentials: options.cors?.credentials ?? true,
      })
      this.app.use(corsMiddleware)
      this.app.options('*splat', corsMiddleware)
    }
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: false }))

    // Catches errors thrown by the middleware above (a malformed JSON body, say) before any route ever
    // runs. Route handlers already get this same mapping via buildAdapter()'s own try/catch, so this
    // only needs to sit after the middleware registered here, regardless of what registerRoute() adds
    // later: Express only propagates an error forward through the stack from where it was thrown, and a
    // route handler's own errors never reach `next()` at all.
    this.app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      this.handleRouteError(err, new ExpressHttpResponse(res))
    })
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
    if (error instanceof HttpError) {
      this.logger.error(this.LOG_COMPONENT, error.message)
      // The platform rejected the outbound call, so its own status best describes what went wrong (e.g. a
      // 400 for a bad score submission). 502 is only a fallback for when the call failed before a status
      // was ever received (e.g. a network error). `external: true` tells the caller this status came from
      // the platform, not from this tool validating the caller's own request.
      response.status(error.status ?? 502).json({
        error: error.name,
        message: error.message,
        external: true,
        platformResponse: error.response,
      })
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    this.logger.error(this.LOG_COMPONENT, message)

    // A handful of libraries (body-parser among them, for a malformed request body) throw a plain Error
    // carrying its own `.status`/`.statusCode`, deliberately meant to be shown to the caller. Trusting
    // only the 4xx range keeps a genuine 5xx-ish or absent status falling through to the generic case
    // below, rather than exposing an arbitrary internal error's shape to the client.
    const clientErrorStatus = this.resolveClientErrorStatus(error)
    if (clientErrorStatus !== undefined && error instanceof Error) {
      response.status(clientErrorStatus).json({ error: error.name, message })
      return
    }
    response.status(500).json({ error: this.INTERNAL_SERVER_ERROR })
  }

  private resolveClientErrorStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) return undefined
    const { status, statusCode } = error as { status?: unknown; statusCode?: unknown }
    const candidate = typeof status === 'number' ? status : statusCode
    if (typeof candidate !== 'number' || candidate < 400 || candidate >= 500) return undefined
    return candidate
  }

  private buildRequestParameters(req: Request): HttpRequestParameters {
    return {
      method: req.method,
      path: req.path,
      query: req.query as Record<string, string | string[]>,
      body: (req.body as Record<string, unknown> | undefined) ?? {},
      headers: req.headers as Record<string, string | string[]>,
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
