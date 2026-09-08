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
// `<script>`. The real script reads it back via `document.getElementById(...).textContent`, so it has
// to actually be in the document (mirroring how a real browser parses the file top to bottom) before the
// executable script runs. The launch template's tests insert this (and its `<form>` markup) themselves
// via `renderIntoDocument` before mocking the form's `.submit`, so only the login template's helpers need
// to do it here; doing it again in `runScript` would recreate the form and wipe out that mock.
const insertDataIsland = (html: string): void => {
  const [markup] = html.split('<script>')
  document.body.innerHTML = markup
}

// Executes the real shipped template's script verbatim, not attacker-controlled input.
const runScript = (html: string): void => {
  window.eval(extractScript(html))
}

// login-redirect.spy ends with a bare `storeState();` that self-invokes on eval, stripped here so the
// test controls exactly when it runs, after installing its own spies/fakes, instead of it firing
// immediately (and for real, with the real redirectToLMS) as a side effect of just defining the functions.
const runLoginScriptWithoutAutorun = (html: string): void => {
  insertDataIsland(html)
  window.eval(extractScript(html).replace(/\n\s*storeState\(\);\s*$/, ''))
}

interface TemplateData {
  key?: string
  state?: string
  recoveryToken?: string
  targetUrl?: string
  idToken?: string
  storageTarget?: string
  platformLoginOrigin?: string
}

describe('login-redirect.spy', () => {
  // `state` is the shared key-seed (both login and launch independently compute the same localStorage
  // key from it); `recoveryToken` is the separate, never-sent-to-the-platform value actually stored --
  // real Provider code has state !== recoveryToken, kept distinct here too so a regression that
  // accidentally stores `state` itself again would fail these assertions.
  const render = (dataOverrides: TemplateData = {}): string =>
    renderTemplate(LOGIN_TEMPLATE, {
      dataJson: JSON.stringify({
        key: 'ltijs_state_state-1',
        state: 'state-1',
        recoveryToken: 'recovery-token-1',
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
    expect(localStorage.getItem('ltijs_state_state-1')).toBe('recovery-token-1')
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
    expect(received[0].payload).toMatchObject({
      subject: 'lti.put_data',
      key: 'state_state-1',
      value: 'recovery-token-1',
    })
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
  // id_token/state are delivered via the JSON data island and written onto the form's hidden inputs by
  // the script (a DOM property assignment, immune to HTML injection), not interpolated into the template
  // as `value="{{...}}"` attributes; see the test below that exercises a value containing `"><script>`.
  const render = (dataOverrides: TemplateData = {}): string =>
    renderTemplate(LAUNCH_TEMPLATE, {
      dataJson: JSON.stringify({
        key: 'ltijs_state_state-1',
        idToken: 'raw-id-token',
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
    expect((document.getElementById('ltijs_id_token') as HTMLInputElement).value).toBe('raw-id-token')
    expect((document.getElementById('ltijs_state') as HTMLInputElement).value).toBe('state-1')
    expect((document.getElementById('ltijs_recovered_state') as HTMLInputElement).value).toBe('recovered-state-1')
    expect(localStorage.getItem('ltijs_state_state-1')).toBeNull()
    expect(received).toHaveLength(0)
  })

  // Regression test for a real XSS: id_token/state used to be interpolated directly into
  // value="{{id_token}}" attributes, so a value containing `"><img src=x onerror=...>` broke out of the
  // attribute and injected a live element into the page. They're now delivered only through the JSON
  // data island and written onto the form via a DOM property assignment (`.value = ...`), which never
  // touches HTML parsing. This checks the claim at both levels: the raw rendered markup never embeds the
  // value as an attribute at all (so nothing can break out of it), and the value still correctly reaches
  // the form field once the script runs.
  it('never embeds a malicious id_token/state value as raw HTML, only ever as a DOM property assignment', () => {
    const maliciousValue = '"><img src=x onerror=window.xssFired=true>'
    localStorage.setItem('ltijs_state_state-1', 'recovered-state-1')
    const html = render({ idToken: maliciousValue, state: maliciousValue })

    // The static markup itself: these inputs' `value` attributes are always empty at render time,
    // regardless of what id_token/state contain, since there's no `{{id_token}}`/`{{state}}` placeholder
    // left in the template for a value to be interpolated into in the first place.
    expect(/<input[^>]*id="ltijs_id_token"[^>]*value=""/.exec(html)).not.toBeNull()
    expect(/<input[^>]*id="ltijs_state"[^>]*value=""/.exec(html)).not.toBeNull()

    renderIntoDocument(html)
    const submit = jest.fn()
    ;(document.getElementById('ltijs_launch') as HTMLFormElement).submit = submit

    runScript(html)

    // No injected element ever made it into the document, and the value still round-trips correctly.
    expect(document.querySelectorAll('img').length).toBe(0)
    expect((window as unknown as { xssFired?: boolean }).xssFired).toBeUndefined()
    expect((document.getElementById('ltijs_id_token') as HTMLInputElement).value).toBe(maliciousValue)
    expect((document.getElementById('ltijs_state') as HTMLInputElement).value).toBe(maliciousValue)
    expect(submit).toHaveBeenCalledTimes(1)
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
