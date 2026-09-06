import express from 'express'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import type { Response } from 'supertest'
import { ExpressHttpResponse } from '#services/http-handler/express/express-http-response'

const buildApp = (): express.Express => {
  const app = express()
  app.use(cookieParser())
  return app
}

// `@types/superagent` declares `headers['set-cookie']` as a plain `string`,
// but at runtime superagent returns an array whenever the header is present
// (confirmed empirically) -- a known gap in the third-party type
// declaration, not this repo's own typing.
const firstSetCookie = (response: Response): string => {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined
  return header?.[0] ?? ''
}

describe('ExpressHttpResponse', () => {
  it('json() sends a JSON body with a 200 default status', async () => {
    const app = buildApp()
    app.get('/', (_req, res) => {
      new ExpressHttpResponse(res).json({ ok: true })
    })

    const response = await request(app).get('/')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })

  it('status().json() chains, sending the given status code', async () => {
    const app = buildApp()
    app.get('/', (_req, res) => {
      new ExpressHttpResponse(res).status(400).json({ error: 'BAD_REQUEST' })
    })

    const response = await request(app).get('/')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'BAD_REQUEST' })
  })

  it('html() sends the given content with an html content-type', async () => {
    const app = buildApp()
    app.get('/', (_req, res) => {
      new ExpressHttpResponse(res).html('<p>hi</p>')
    })

    const response = await request(app).get('/')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('html')
    expect(response.text).toBe('<p>hi</p>')
  })

  it('redirect() sends a 302 with the given Location header', async () => {
    const app = buildApp()
    app.get('/', (_req, res) => {
      new ExpressHttpResponse(res).redirect('https://example.com/target')
    })

    const response = await request(app).get('/')

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe('https://example.com/target')
  })

  it('setCookie() sets a Set-Cookie header with the requested attributes', async () => {
    const app = buildApp()
    app.get('/', (_req, res) => {
      new ExpressHttpResponse(res)
        .setCookie('state', 'abc', { httpOnly: true, sameSite: 'none', secure: true })
        .json({})
    })

    const response = await request(app).get('/')

    const cookie = firstSetCookie(response)
    expect(cookie).toContain('state=abc')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=None')
    expect(cookie).toContain('Secure')
  })

  it('setCookie() honors the partitioned option', async () => {
    const app = buildApp()
    app.get('/', (_req, res) => {
      new ExpressHttpResponse(res).setCookie('state', 'abc', { partitioned: true, secure: true }).json({})
    })

    const response = await request(app).get('/')

    const cookie = firstSetCookie(response)
    expect(cookie).toContain('Partitioned')
  })

  it('clearCookie() sends a Set-Cookie header that expires the cookie', async () => {
    const app = buildApp()
    app.get('/', (_req, res) => {
      new ExpressHttpResponse(res).clearCookie('state').json({})
    })

    const response = await request(app).get('/')

    const cookie = firstSetCookie(response)
    expect(cookie).toContain('state=;')
  })
})
