import { EventEmitter } from 'node:events'
import * as https from 'node:https'
import request from 'supertest'
import { LtijsError } from '#shared/errors'
import { HttpError } from '#services/request-handler/errors'
import type { Logger } from '#services/logger/logger.types'
import { ExpressHttpHandler } from '#services/http-handler/express/express-http-handler.service'
import type { ExpressHttpHandlerOptions } from '#services/http-handler/express/express-http-handler.types'
import { HttpMethod } from '#services/http-handler/http-handler.types'

jest.mock('node:https', () => ({ createServer: jest.fn() }))

class TestError extends LtijsError {
  constructor() {
    super('SOMETHING_WENT_WRONG')
  }
}

const buildLogger = (): Logger => ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn() })

const buildHandler = (options: Partial<ExpressHttpHandlerOptions> = {}, logger = buildLogger()): ExpressHttpHandler =>
  new ExpressHttpHandler(logger, { port: 0, ...options })

describe('ExpressHttpHandler', () => {
  it('routes a request to the handler registered for that path and method', async () => {
    const handler = buildHandler()
    handler.registerRoute('/ping', [HttpMethod.Get], async (_request, response) => {
      response.json({ pong: true })
    })

    const response = await request(handler.app).get('/ping')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ pong: true })
  })

  it('does not match a route registered for a different method', async () => {
    const handler = buildHandler()
    handler.registerRoute('/ping', [HttpMethod.Post], async (_request, response) => {
      response.json({ pong: true })
    })

    const response = await request(handler.app).get('/ping')

    expect(response.status).toBe(404)
  })

  it('matches any method when registered with HttpMethod.All', async () => {
    const handler = buildHandler()
    handler.registerRoute('/ping', [HttpMethod.All], async (_request, response) => {
      response.json({ method: _request.method })
    })

    const getResponse = await request(handler.app).get('/ping')
    const postResponse = await request(handler.app).post('/ping')

    expect(getResponse.status).toBe(200)
    expect(postResponse.status).toBe(200)
  })

  it('extracts query and body parameters into HttpRequestParameters', async () => {
    const handler = buildHandler()
    handler.registerRoute('/echo', [HttpMethod.Post], async (request, response) => {
      response.json({ query: request.query, body: request.body })
    })

    const response = await request(handler.app).post('/echo?iss=platform').send({ id_token: 'token-value' })

    expect(response.body).toEqual({
      query: { iss: 'platform' },
      body: { id_token: 'token-value' },
    })
  })

  it('maps a thrown LtijsError to a 400 response carrying its name and message', async () => {
    const logger = buildLogger()
    const handler = buildHandler({}, logger)
    handler.registerRoute('/fail', [HttpMethod.Get], async () => {
      throw new TestError()
    })

    const response = await request(handler.app).get('/fail')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'TestError', message: 'SOMETHING_WENT_WRONG' })
    expect(logger.error).toHaveBeenCalledWith('expressHttpHandler', 'SOMETHING_WENT_WRONG')
  })

  it('maps a thrown HttpError (a failed outbound call to the platform) to a 502 carrying the platform detail', async () => {
    const logger = buildLogger()
    const handler = buildHandler({}, logger)
    handler.registerRoute('/fail', [HttpMethod.Get], async () => {
      throw new HttpError({
        message: 'HTTP request failed with status 400: Incorrect score received',
        status: 400,
        statusText: 'Incorrect score received',
        url: 'https://platform.example.com/lineitem/scores',
        response: { error: 'invalid_score' },
      })
    })

    const response = await request(handler.app).get('/fail')

    expect(response.status).toBe(502)
    expect(response.body).toEqual({
      error: 'HttpError',
      message: 'HTTP request failed with status 400: Incorrect score received',
      platformStatus: 400,
      platformResponse: { error: 'invalid_score' },
    })
    expect(logger.error).toHaveBeenCalledWith(
      'expressHttpHandler',
      'HTTP request failed with status 400: Incorrect score received',
    )
  })

  it('maps an unknown thrown error to a generic 500 response', async () => {
    const logger = buildLogger()
    const handler = buildHandler({}, logger)
    handler.registerRoute('/fail', [HttpMethod.Get], async () => {
      throw new Error('unexpected')
    })

    const response = await request(handler.app).get('/fail')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: 'INTERNAL_SERVER_ERROR' })
    expect(logger.error).toHaveBeenCalledWith('expressHttpHandler', 'unexpected')
  })

  it('listen() resolves once the server is listening, and close() tears it down', async () => {
    const handler = buildHandler()

    await handler.listen()
    await expect(handler.close()).resolves.toBeUndefined()
  })

  it('listen() rejects when the port is already in use', async () => {
    const port = 34_567
    const occupant = buildHandler({ port })
    await occupant.listen()

    const handler = buildHandler({ port })
    await expect(handler.listen()).rejects.toThrow()

    await occupant.close()
  })

  it('close() resolves immediately when the server was never started', async () => {
    const handler = buildHandler()

    await expect(handler.close()).resolves.toBeUndefined()
  })

  it('listen() terminates TLS via https.createServer when given ssl options', async () => {
    const fakeServer = Object.assign(new EventEmitter(), { listen: jest.fn(), close: jest.fn() })
    fakeServer.listen.mockImplementation(() => {
      process.nextTick(() => fakeServer.emit('listening'))
      return fakeServer
    })
    jest.mocked(https.createServer).mockReturnValue(fakeServer as unknown as https.Server)

    const ssl = { key: 'fake-key', cert: 'fake-cert' }
    const handler = buildHandler({ port: 4443, ssl })

    await handler.listen()

    expect(https.createServer).toHaveBeenCalledWith(ssl, handler.app)
    expect(fakeServer.listen).toHaveBeenCalledWith(4443)
  })

  it('listen() falls back to plain HTTP when no ssl options are given', async () => {
    const handler = buildHandler()

    await handler.listen()

    expect(https.createServer).not.toHaveBeenCalled()
    await handler.close()
  })

  it('reflects any origin and allows credentials by default', async () => {
    const handler = buildHandler()
    handler.registerRoute('/ping', [HttpMethod.Get], async (_request, response) => {
      response.json({ pong: true })
    })

    const response = await request(handler.app).get('/ping').set('Origin', 'https://example.com')

    expect(response.headers['access-control-allow-origin']).toBe('https://example.com')
    expect(response.headers['access-control-allow-credentials']).toBe('true')
  })

  it('restricts CORS to an explicit origin allowlist when given', async () => {
    const handler = buildHandler({ cors: { origin: ['https://allowed.example.com'] } })
    handler.registerRoute('/ping', [HttpMethod.Get], async (_request, response) => {
      response.json({ pong: true })
    })

    const allowed = await request(handler.app).get('/ping').set('Origin', 'https://allowed.example.com')
    const blocked = await request(handler.app).get('/ping').set('Origin', 'https://blocked.example.com')

    expect(allowed.headers['access-control-allow-origin']).toBe('https://allowed.example.com')
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('disables CORS entirely when cors is false', async () => {
    const handler = buildHandler({ cors: false })
    handler.registerRoute('/ping', [HttpMethod.Get], async (_request, response) => {
      response.json({ pong: true })
    })

    const response = await request(handler.app).get('/ping').set('Origin', 'https://example.com')

    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })
})
