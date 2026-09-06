import type { z } from 'zod'
import type {
  ContentItemSchema,
  ContentItemsInputSchema,
  DeepLinkingOptionsSchema,
} from '#services/deep-linking/deep-linking.schemas'

/** A single deep-linked resource (link, file, HTML fragment, LTI resource link, or image) being returned to the platform. */
export type ContentItem = z.infer<typeof ContentItemSchema>
/** The `contentItems` argument to `DeepLinking.createDeepLinkingMessage`/`createDeepLinkingForm`. */
export type ContentItemsInput = z.infer<typeof ContentItemsInputSchema>
/** Options controlling the generated deep-linking response JWT (e.g. `data`, custom claims). */
export type DeepLinkingOptions = z.infer<typeof DeepLinkingOptionsSchema>
