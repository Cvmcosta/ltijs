import type { HttpHandler, HttpMethod, RouteHandler } from '#services/http-handler/http-handler.types'

export interface MockHttpHandler extends HttpHandler {
  getHandler: (path: string, method: HttpMethod) => RouteHandler
}

export const buildMockHttpHandler = (): MockHttpHandler => {
  const routes = new Map<string, RouteHandler>()
  const routeKey = (path: string, method: HttpMethod): string => `${method} ${path}`

  return {
    registerRoute: (path, methods, handler) => {
      for (const method of methods) routes.set(routeKey(path, method), handler)
    },
    listen: async () => undefined,
    close: async () => undefined,
    getHandler: (path, method) => {
      const handler = routes.get(routeKey(path, method))
      if (handler === undefined) throw new Error(`No handler registered for ${method} ${path}`)
      return handler
    },
  }
}
