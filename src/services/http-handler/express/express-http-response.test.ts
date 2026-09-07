import express from 'express'
import request from 'supertest'
import { ExpressHttpResponse } from '#services/http-handler/express/express-http-response'

const buildApp = (): express.Express => express()

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
})
