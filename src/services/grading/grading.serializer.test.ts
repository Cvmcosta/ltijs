import { buildLineItem, buildLineItems, buildScore, buildScores } from '#services/grading/grading.serializer'
import type { LineItem, Score } from '#services/grading/grading.types'

const buildLineItemFixture = (overrides: Partial<LineItem> = {}): LineItem => ({
  id: 'http://localhost/moodle/lineitems/1',
  label: 'Activity',
  scoreMaximum: 100,
  ...overrides,
})

const buildScoreFixture = (overrides: Partial<Score> = {}): Score => ({
  userId: 'user-1',
  scoreGiven: 10,
  scoreMaximum: 100,
  ...overrides,
})

describe('buildLineItem()', () => {
  it('returns a frozen copy of the given line item', () => {
    const input = buildLineItemFixture()

    const lineItem = buildLineItem(input)

    expect(lineItem).toEqual(input)
    expect(Object.isFrozen(lineItem)).toBe(true)
  })
})

describe('buildLineItems()', () => {
  it('returns a frozen result with a frozen lineItems array and frozen entries', () => {
    const result = buildLineItems({ lineItems: [buildLineItemFixture()] })

    expect(result.lineItems).toEqual([buildLineItemFixture()])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.lineItems)).toBe(true)
    expect(Object.isFrozen(result.lineItems[0])).toBe(true)
  })

  it('preserves pagination links', () => {
    const result = buildLineItems({
      lineItems: [],
      next: 'http://localhost/moodle/lineitems?page=2',
      prev: 'http://localhost/moodle/lineitems?page=0',
      first: 'http://localhost/moodle/lineitems?page=1',
      last: 'http://localhost/moodle/lineitems?page=9',
    })

    expect(result).toMatchObject({
      next: 'http://localhost/moodle/lineitems?page=2',
      prev: 'http://localhost/moodle/lineitems?page=0',
      first: 'http://localhost/moodle/lineitems?page=1',
      last: 'http://localhost/moodle/lineitems?page=9',
    })
  })
})

describe('buildScore()', () => {
  it('returns a frozen copy of the given score', () => {
    const input = buildScoreFixture()

    const score = buildScore(input)

    expect(score).toEqual(input)
    expect(Object.isFrozen(score)).toBe(true)
  })
})

describe('buildScores()', () => {
  it('returns a frozen result with a frozen scores array and frozen entries', () => {
    const result = buildScores({ scores: [{ userId: 'user-1', resultScore: 10 }] })

    expect(result.scores).toEqual([{ userId: 'user-1', resultScore: 10 }])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.scores)).toBe(true)
    expect(Object.isFrozen(result.scores[0])).toBe(true)
  })
})
