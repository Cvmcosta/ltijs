import request from 'supertest'
import { LtijsError } from '#shared/errors'
import type { Logger } from '#services/logger/logger.types'
import { ExpressHttpHandler } from '#services/http-handler/express/express-http-handler.service'
import { HttpMethod } from '#services/http-handler/http-handler.types'

class TestError extends LtijsError {
  constructor() {
    super('SOMETHING_WENT_WRONG')
  }
}

const buildLogger = (): Logger => ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn() })

describe('ExpressHttpHandler', () => {
  it('routes a request to the handler registered for that path and method', async () => {
    const handler = new ExpressHttpHandler(buildLogger())
    handler.registerRoute('/ping', [HttpMethod.Get], async (_request, response) => {
      response.json({ pong: true })
    })

    const response = await request(handler.app).get('/ping')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ pong: true })
  })

  it('does not match a route registered for a different method', async () => {
    const handler = new ExpressHttpHandler(buildLogger())
    handler.registerRoute('/ping', [HttpMethod.Post], async (_request, response) => {
      response.json({ pong: true })
    })

    const response = await request(handler.app).get('/ping')

    expect(response.status).toBe(404)
  })

  it('matches any method when registered with HttpMethod.All', async () => {
    const handler = new ExpressHttpHandler(buildLogger())
    handler.registerRoute('/ping', [HttpMethod.All], async (_request, response) => {
      response.json({ method: _request.method })
    })

    const getResponse = await request(handler.app).get('/ping')
    const postResponse = await request(handler.app).post('/ping')

    expect(getResponse.status).toBe(200)
    expect(postResponse.status).toBe(200)
  })

  it('extracts query, body, and cookie parameters into HttpRequestParameters', async () => {
    const handler = new ExpressHttpHandler(buildLogger())
    handler.registerRoute('/echo', [HttpMethod.Post], async (request, response) => {
      response.json({ query: request.query, body: request.body, cookies: request.cookies })
    })

    const response = await request(handler.app)
      .post('/echo?iss=platform')
      .set('Cookie', 'state=abc123')
      .send({ id_token: 'token-value' })

    expect(response.body).toEqual({
      query: { iss: 'platform' },
      body: { id_token: 'token-value' },
      cookies: { state: 'abc123' },
    })
  })

  it('maps a thrown LtijsError to a 400 response carrying its name and message', async () => {
    const logger = buildLogger()
    const handler = new ExpressHttpHandler(logger)
    handler.registerRoute('/fail', [HttpMethod.Get], async () => {
      throw new TestError()
    })

    const response = await request(handler.app).get('/fail')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'TestError', message: 'SOMETHING_WENT_WRONG' })
    expect(logger.error).toHaveBeenCalledWith('expressHttpHandler', 'SOMETHING_WENT_WRONG')
  })

  it('maps an unknown thrown error to a generic 500 response', async () => {
    const logger = buildLogger()
    const handler = new ExpressHttpHandler(logger)
    handler.registerRoute('/fail', [HttpMethod.Get], async () => {
      throw new Error('unexpected')
    })

    const response = await request(handler.app).get('/fail')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: 'INTERNAL_SERVER_ERROR' })
    expect(logger.error).toHaveBeenCalledWith('expressHttpHandler', 'unexpected')
  })

  it('listen() resolves once the server is listening, and close() tears it down', async () => {
    const handler = new ExpressHttpHandler(buildLogger())

    await handler.listen(0)
    await expect(handler.close()).resolves.toBeUndefined()
  })

  it('listen() rejects when the port is already in use', async () => {
    const port = 34_567
    const occupant = new ExpressHttpHandler(buildLogger())
    await occupant.listen(port)

    const handler = new ExpressHttpHandler(buildLogger())
    await expect(handler.listen(port)).rejects.toThrow()

    await occupant.close()
  })

  it('close() resolves immediately when the server was never started', async () => {
    const handler = new ExpressHttpHandler(buildLogger())

    await expect(handler.close()).resolves.toBeUndefined()
  })
})
