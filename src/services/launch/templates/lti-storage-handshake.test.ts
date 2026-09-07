/** @jest-environment jsdom */
import path from 'node:path'
import { renderTemplate } from '#utils/templating/template-renderer'

const LOGIN_TEMPLATE = path.join(__dirname, 'login-redirect.spy')
const LAUNCH_TEMPLATE = path.join(__dirname, 'signed-state-form.spy')

interface FakePlatformMessage {
  payload: Record<string, unknown>
  targetOrigin: string
}

// Installs a fake `window.parent` that records every postMessage it receives and, per test, either
// answers with a fake platform response (after a real but tiny delay, to exercise the same async
// resolution path a real platform round-trip would) or never answers at all (to exercise the timeout).
const installFakePlatform = (
  respond: (payload: Record<string, unknown>) => Record<string, unknown> | undefined,
): FakePlatformMessage[] => {
  const received: FakePlatformMessage[] = []
  const frames: Record<string, unknown> = {}
  const fakeParent = {
    frames,
    postMessage: (payload: Record<string, unknown>, targetOrigin: string) => {
      received.push({ payload, targetOrigin })
      const response = respond(payload)
      if (response !== undefined) {
        setTimeout(() => {
          window.dispatchEvent(new MessageEvent('message', { data: response, origin: targetOrigin }))
        }, 0)
      }
    },
  }
  Object.defineProperty(window, 'parent', { value: fakeParent, configurable: true })
  return received
}

const extractScript = (html: string): string => {
  const match = /<script>([\s\S]*)<\/script>/.exec(html)
  if (match === null) throw new Error('No <script> block found in rendered template')
  return match[1]
}

// Both templates render a `<script type="application/json">` data island before their executable
// `<script>` -- the real script reads it back via `document.getElementById(...).textContent`, so it has
// to actually be in the document (mirroring how a real browser parses the file top to bottom) before the
// executable script runs. The launch template's tests insert this (and its `<form>` markup) themselves
// via `renderIntoDocument` before mocking the form's `.submit`, so only the login template's helpers need
// to do it here -- doing it again in `runScript` would recreate the form and wipe out that mock.
const insertDataIsland = (html: string): void => {
  const [markup] = html.split('<script>')
  document.body.innerHTML = markup
}

// Executes the real shipped template's script verbatim -- not attacker-controlled input.
const runScript = (html: string): void => {
  window.eval(extractScript(html))
}

// login-redirect.spy ends with a bare `storeState();` that self-invokes on eval -- stripped here so the
// test controls exactly when it runs, after installing its own spies/fakes, instead of it firing
// immediately (and for real, with the real redirectToLMS) as a side effect of just defining the functions.
const runLoginScriptWithoutAutorun = (html: string): void => {
  insertDataIsland(html)
  window.eval(extractScript(html).replace(/\n\s*storeState\(\);\s*$/, ''))
}

interface TemplateData {
  key?: string
  value?: string
  targetUrl?: string
  id_token?: string
  state?: string
  storageTarget?: string
  platformLoginOrigin?: string
}

describe('login-redirect.spy', () => {
  const render = (dataOverrides: TemplateData = {}): string =>
    renderTemplate(LOGIN_TEMPLATE, {
      dataJson: JSON.stringify({
        key: 'ltijs_state_state-1',
        value: 'state-1',
        targetUrl: 'https://platform.example.com/auth',
        ...dataOverrides,
      }),
    })

  afterEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    jest.restoreAllMocks()
  })

  it('redirects immediately when localStorage round-trips, without touching postMessage', () => {
    const received = installFakePlatform(() => undefined)
    const redirectToLMS = jest.fn()
    runLoginScriptWithoutAutorun(render())
    Object.assign(window, { redirectToLMS })

    ;(window as unknown as { storeState: () => void }).storeState()

    expect(redirectToLMS).toHaveBeenCalledTimes(1)
    expect(received).toHaveLength(0)
    expect(localStorage.getItem('ltijs_state_state-1')).toBe('state-1')
  })

  it('falls back to postMessage put_data when localStorage fails, and redirects once it succeeds', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    const received = installFakePlatform(payload => ({
      subject: 'lti.put_data.response',
      message_id: payload.message_id,
      key: payload.key,
      value: payload.value,
    }))
    runLoginScriptWithoutAutorun(
      render({
        storageTarget: '_parent',
        platformLoginOrigin: 'https://platform.example.com',
      }),
    )
    const redirectToLMS = jest.fn()
    Object.assign(window, { redirectToLMS })

    ;(window as unknown as { storeState: () => void }).storeState()
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(received).toHaveLength(1)
    expect(received[0].payload).toMatchObject({ subject: 'lti.put_data', key: 'state_state-1', value: 'state-1' })
    expect(received[0].targetOrigin).toBe('https://platform.example.com')
    expect(redirectToLMS).toHaveBeenCalledTimes(1)
  })

  it('redirects anyway when localStorage fails and no storageTarget is available', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    const received = installFakePlatform(() => undefined)
    runLoginScriptWithoutAutorun(render())
    const redirectToLMS = jest.fn()
    Object.assign(window, { redirectToLMS })

    ;(window as unknown as { storeState: () => void }).storeState()

    expect(redirectToLMS).toHaveBeenCalledTimes(1)
    expect(received).toHaveLength(0)
  })
})

describe('signed-state-form.spy', () => {
  const render = (dataOverrides: TemplateData = {}): string =>
    renderTemplate(LAUNCH_TEMPLATE, {
      id_token: 'raw-id-token',
      state: 'state-1',
      dataJson: JSON.stringify({
        key: 'ltijs_state_state-1',
        state: 'state-1',
        ...dataOverrides,
      }),
    })

  afterEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    jest.restoreAllMocks()
  })

  // The launch template's script reaches for `document.getElementById('ltijs_launch')` etc, so its form
  // markup needs to actually exist in the document before the script segment runs.
  const renderIntoDocument = insertDataIsland

  it('submits the form with the localStorage-recovered state when it round-trips', () => {
    localStorage.setItem('ltijs_state_state-1', 'recovered-state-1')
    const html = render()
    renderIntoDocument(html)
    const submit = jest.fn()
    ;(document.getElementById('ltijs_launch') as HTMLFormElement).submit = submit
    const received = installFakePlatform(() => undefined)

    runScript(html)

    expect(submit).toHaveBeenCalledTimes(1)
    expect((document.getElementById('ltijs_recovered_state') as HTMLInputElement).value).toBe('recovered-state-1')
    expect(localStorage.getItem('ltijs_state_state-1')).toBeNull()
    expect(received).toHaveLength(0)
  })

  it('falls back to postMessage get_data when localStorage has nothing stored', async () => {
    const html = render({
      storageTarget: '_parent',
      platformLoginOrigin: 'https://platform.example.com',
    })
    renderIntoDocument(html)
    const submit = jest.fn()
    ;(document.getElementById('ltijs_launch') as HTMLFormElement).submit = submit
    const received = installFakePlatform(payload => ({
      subject: 'lti.get_data.response',
      message_id: payload.message_id,
      key: payload.key,
      value: 'recovered-via-postmessage',
    }))

    runScript(html)
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(received).toHaveLength(1)
    expect(received[0].payload).toMatchObject({ subject: 'lti.get_data', key: 'state_state-1' })
    expect(submit).toHaveBeenCalledTimes(1)
    expect((document.getElementById('ltijs_recovered_state') as HTMLInputElement).value).toBe(
      'recovered-via-postmessage',
    )
  })

  it('logs and submits anyway (letting the server raise) when localStorage is empty and no storageTarget is available', () => {
    const html = render()
    renderIntoDocument(html)
    const submit = jest.fn()
    ;(document.getElementById('ltijs_launch') as HTMLFormElement).submit = submit
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    runScript(html)

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('failed to retrieve'))
    expect(submit).toHaveBeenCalledTimes(1)
    expect((document.getElementById('ltijs_recovered_state') as HTMLInputElement).value).toBe('')
  })

  it('logs and submits anyway (letting the server raise) when the platform never responds to get_data', async () => {
    jest.useFakeTimers()
    const html = render({
      storageTarget: '_parent',
      platformLoginOrigin: 'https://platform.example.com',
    })
    renderIntoDocument(html)
    const submit = jest.fn()
    ;(document.getElementById('ltijs_launch') as HTMLFormElement).submit = submit
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    installFakePlatform(() => undefined)

    runScript(html)
    await jest.advanceTimersByTimeAsync(3000)

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('failed to retrieve'))
    expect(submit).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })
})
