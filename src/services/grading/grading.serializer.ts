import { deepFreeze } from '#utils/objects/freeze'
import type { GetLineItemsResult, GetScoresResult, LineItem, Score } from '#services/grading/grading.types'

export function buildLineItem(lineItem: LineItem): LineItem {
  return deepFreeze({ ...lineItem })
}

export function buildLineItems(result: GetLineItemsResult): GetLineItemsResult {
  return deepFreeze({ ...result, lineItems: result.lineItems.map(lineItem => ({ ...lineItem })) })
}

export function buildScore(score: Score): Score {
  return deepFreeze({ ...score })
}

export function buildScores(result: GetScoresResult): GetScoresResult {
  return deepFreeze({ ...result, scores: result.scores.map(score => ({ ...score })) })
}
