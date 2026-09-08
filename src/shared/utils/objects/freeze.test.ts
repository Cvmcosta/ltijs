import { deepFreeze } from '#utils/objects/freeze'

describe('deepFreeze()', () => {
  it('freezes the top-level object', () => {
    const result = deepFreeze({ a: 1 })

    expect(Object.isFrozen(result)).toBe(true)
  })

  it('freezes nested objects', () => {
    const result = deepFreeze({ a: { b: { c: 1 } } })

    expect(Object.isFrozen(result.a)).toBe(true)
    expect(Object.isFrozen(result.a.b)).toBe(true)
  })

  it('freezes nested arrays and their items', () => {
    const result = deepFreeze({ a: [{ b: 1 }, { b: 2 }] })

    expect(Object.isFrozen(result.a)).toBe(true)
    expect(Object.isFrozen(result.a[0])).toBe(true)
    expect(Object.isFrozen(result.a[1])).toBe(true)
  })

  it('prevents mutation of nested properties', () => {
    const result = deepFreeze({ a: { b: 1 } })

    expect(() => {
      // @ts-expect-error intentional mutation attempt
      result.a.b = 2
    }).toThrow(TypeError)
  })

  it('returns the same reference it was given', () => {
    const original = { a: 1 }
    const result = deepFreeze(original)

    expect(result).toBe(original)
  })

  it('handles primitives without throwing', () => {
    expect(deepFreeze(1)).toBe(1)
    expect(deepFreeze('a')).toBe('a')
    expect(deepFreeze(null)).toBe(null)
  })

  it('does not throw when re-freezing an already-frozen object', () => {
    const original = Object.freeze({ a: { b: 1 } })

    expect(() => deepFreeze(original)).not.toThrow()
  })

  it('handles a circular reference without stack-overflowing', () => {
    const node: { self?: unknown } = {}
    node.self = node

    expect(() => deepFreeze(node)).not.toThrow()
    expect(Object.isFrozen(node)).toBe(true)
  })
})
