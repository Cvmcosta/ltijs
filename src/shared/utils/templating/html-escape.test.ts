import { escapeHtmlAttribute } from '#utils/templating/html-escape'

describe('escapeHtmlAttribute()', () => {
  it('leaves plain text untouched', () => {
    expect(escapeHtmlAttribute('https://tool.example.com/return')).toBe('https://tool.example.com/return')
  })

  it('escapes a double quote, preventing it from breaking out of a quoted attribute', () => {
    expect(escapeHtmlAttribute('"><script>alert(1)</script>')).toBe('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('escapes ampersands without double-escaping the entities it just produced', () => {
    expect(escapeHtmlAttribute('a & b < c')).toBe('a &amp; b &lt; c')
  })

  it('escapes single quotes', () => {
    expect(escapeHtmlAttribute("value'onmouseover='alert(1)")).toBe('value&#39;onmouseover=&#39;alert(1)')
  })
})
