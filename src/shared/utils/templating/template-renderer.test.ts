import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { renderTemplate } from '#utils/templating/template-renderer'

describe('renderTemplate', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ltijs-template-renderer-'))
  const templatePath = path.join(dir, 'fixture.html')

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('substitutes {{key}} placeholders with the matching data value', () => {
    fs.writeFileSync(templatePath, '<p>{{greeting}}, {{name}}!</p>')

    const result = renderTemplate(templatePath, { greeting: 'Hello', name: 'World' })

    expect(result).toBe('<p>Hello, World!</p>')
  })

  it('falls back to an empty string for a key missing from the data object', () => {
    fs.writeFileSync(templatePath, '<p>{{missing}}</p>')

    const result = renderTemplate(templatePath, {})

    expect(result).toBe('<p></p>')
  })
})
