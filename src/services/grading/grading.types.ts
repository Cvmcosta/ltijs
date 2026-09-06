import type { z } from 'zod'
import type {
  GetLineItemsOptionsSchema,
  GetScoresOptionsSchema,
  LineItemSchema,
  ResultSchema,
  ScoreSchema,
} from '#services/grading/grading.schemas'

/** An AGS line item (a gradable column) as read from or written to the platform's Line Item service. */
export type LineItem = z.infer<typeof LineItemSchema>
/** A score submission for a single learner on a line item -- posted via `Grading.submitScore`. */
export type Score = z.infer<typeof ScoreSchema>
/** A previously-submitted result for a single learner, as returned by `Grading.getScores`. */
export type Result = z.infer<typeof ResultSchema>
/** Filters/pagination for `Grading.getLineItems`. */
export type GetLineItemsOptions = z.infer<typeof GetLineItemsOptionsSchema>
/** Filters/pagination for `Grading.getScores`. */
export type GetScoresOptions = z.infer<typeof GetScoresOptionsSchema>

/** RFC 8288 pagination links, as returned by the platform's `Link` response header. */
export interface PaginatedLinks {
  next?: string
  prev?: string
  first?: string
  last?: string
}

export type GetLineItemsResult = PaginatedLinks & { lineItems: readonly LineItem[] }
export type GetScoresResult = PaginatedLinks & { scores: readonly Result[] }
