import type { CorsOptions, SslOptions } from '#services/http-handler/http-handler.types'

export interface ExpressHttpHandlerOptions {
  port: number
  /** Terminates TLS in-process instead of listening over plain HTTP -- pass a PEM-encoded key/cert pair. */
  ssl?: SslOptions
  /** Defaults to reflecting any request origin with credentials allowed. Pass `false` to disable CORS entirely. */
  cors?: false | CorsOptions
}
