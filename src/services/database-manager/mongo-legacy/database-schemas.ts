import mongoose, { Schema } from 'mongoose'
import type { LtiMessageType } from '#services/launch/id-token.constants'

// Mongoose schema/model definitions mirroring the real, existing legacy collection structure
// `src/utils/Database.js` used -- fully independent of `../mongo/database-schemas.ts` by design (`mongo/`
// and `mongo-legacy/` are isolated implementations, each extractable on its own). Collection names
// (platforms/idTokens/accesstokens) match `mongo/`'s exactly, since both must coexist against one real
// database during a migration; registered under distinct model names (3-arg `mongoose.model()`) so both
// can be loaded in the same process (e.g. this repo's test suite) without a naming conflict.

const PLATFORM_COLLECTION = 'platforms'
const PLATFORMSTATUS_COLLECTION = 'platformstatuses'
const PUBLICKEY_COLLECTION = 'publickeys'
const PRIVATEKEY_COLLECTION = 'privatekeys'
const IDTOKEN_COLLECTION = 'idTokens'
const CONTEXTTOKEN_COLLECTION = 'contexttokens'
const ACCESSTOKEN_COLLECTION = 'accesstokens'
const NONCE_COLLECTION = 'nonces'

/** The real, existing `platform` collection shape `MongoLegacyDatabaseManager` keeps reading/writing (base fields only -- status and keys live in their own collections). `kid` is what `PlatformRecord.id` maps to. */
export interface LegacyPlatformDoc {
  platformUrl: string
  platformName: string
  clientId: string
  authEndpoint: string
  accesstokenEndpoint: string
  authorizationServer?: string
  kid: string
  authConfig: { method: string; key: string }
}

export interface PlatformStatusDoc {
  id: string
  active: boolean
}

/** Shared by both the `publickey` and `privatekey` collections -- real legacy uses the identical shape for both. */
export interface KeyDoc {
  kid: string
  platformUrl: string
  clientId: string
  iv: string
  data: string
}

export interface LegacyAccessTokenDoc {
  platformUrl: string
  clientId: string
  scopes: string
  iv: string
  data: string
  createdAt: Date
}

export interface NonceDoc {
  nonce: string
  createdAt: Date
}

/**
 * The real, existing narrow `idToken` collection shape `MongoLegacyDatabaseManager`
 * keeps reading/writing. `launchId` is a new field (not part of the original
 * legacy shape): a random opaque ID generated once per launch, written onto
 * both this doc and its paired `ContextTokenDoc`, and used as the sole
 * correlation/lookup key between the two -- see `getIdToken`/`saveIdToken`.
 */
export interface LegacyIdTokenDoc {
  launchId: string
  iss: string
  user: string
  clientId: string
  deploymentId: string
  userInfo: Record<string, unknown>
  platformInfo: Record<string, unknown>
  platformId: string
  createdAt: Date
}

/** The real, existing `contexttoken` collection -- `MongoLegacyDatabaseManager` merges this with `LegacyIdTokenDoc` to build an `IdTokenRecord`. */
export interface ContextTokenDoc {
  launchId: string
  contextId: string
  user: string
  context?: Record<string, unknown>
  resource?: Record<string, unknown>
  messageType?: LtiMessageType
  version?: string
  deepLinkingSettings?: Record<string, unknown>
  lis?: Record<string, unknown>
  roles?: string[]
  targetLinkUri?: string
  custom?: Record<string, unknown>
  launchPresentation?: Record<string, unknown>
  endpoint?: Record<string, unknown>
  namesRoles?: Record<string, unknown>
  createdAt: Date
  [claim: string]: unknown
}

const legacyPlatformSchema = new Schema<LegacyPlatformDoc>({
  platformUrl: String,
  platformName: String,
  clientId: String,
  authEndpoint: String,
  accesstokenEndpoint: String,
  authorizationServer: String,
  kid: String,
  authConfig: { method: String, key: String },
})
legacyPlatformSchema.index({ platformUrl: 1 })
// Partial, not plain, unique indexes: `platforms` is a real collection
// `../mongo/database-schemas.ts`'s own `PlatformModel` also targets (by
// design, both implementations must be able to coexist against one real
// deployed database during a migration), but that model's own docs never set
// `kid`/`platformUrl` (it uses `id`/`url` instead) -- a plain unique index
// would treat every one of its docs as colliding on `kid: null`. Genuine
// legacy data always has `kid`/`platformUrl` set, so this is a no-op for real
// legacy's own documents.
legacyPlatformSchema.index({ kid: 1 }, { unique: true, partialFilterExpression: { kid: { $type: 'string' } } })
legacyPlatformSchema.index(
  { platformUrl: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { platformUrl: { $type: 'string' }, clientId: { $type: 'string' } } },
)

const platformStatusSchema = new Schema<PlatformStatusDoc>({
  id: String,
  active: { type: Boolean, default: false },
})
platformStatusSchema.index({ id: 1 }, { unique: true })

const keySchema = new Schema<KeyDoc>({
  kid: String,
  platformUrl: String,
  clientId: String,
  iv: String,
  data: String,
})
keySchema.index({ kid: 1 }, { unique: true })

const legacyAccessTokenSchema = new Schema<LegacyAccessTokenDoc>({
  platformUrl: String,
  clientId: String,
  scopes: String,
  iv: String,
  data: String,
  createdAt: { type: Date, expires: 3600, default: Date.now },
})
legacyAccessTokenSchema.index({ platformUrl: 1, clientId: 1, scopes: 1 }, { unique: true })

// TTL/save-at-issuance behavior matches `../mongo/database-schemas.ts`'s
// own `NonceModel` exactly (both implementations' nonce handling was
// redesigned uniformly in an earlier round) -- only the file-level sharing
// is what's being removed here.
const nonceSchema = new Schema<NonceDoc>({
  nonce: String,
  createdAt: { type: Date, expires: 600, default: Date.now },
})
nonceSchema.index({ nonce: 1 })

const legacyIdTokenSchema = new Schema<LegacyIdTokenDoc>({
  launchId: String,
  iss: String,
  user: String,
  clientId: String,
  deploymentId: String,
  userInfo: Schema.Types.Mixed,
  platformInfo: Schema.Types.Mixed,
  platformId: String,
  createdAt: { type: Date, expires: 3600 * 24, default: Date.now },
})
// Partial, not plain, unique index: `idTokens` is a real collection
// `../mongo/database-schemas.ts`'s own `IdTokenDoc` also targets (same
// cross-implementation coexistence design as `legacyPlatformSchema`'s own
// indexes above), but that model's own docs never set `launchId` at all -- a
// plain unique index would treat every one of its docs as colliding on
// `launchId: null`. Genuine legacy data always sets `launchId`, so this is a
// no-op for real legacy's own documents.
legacyIdTokenSchema.index({ launchId: 1 }, { unique: true, partialFilterExpression: { launchId: { $type: 'string' } } })

const contextTokenSchema = new Schema<ContextTokenDoc>(
  {
    launchId: String,
    contextId: String,
    user: String,
    createdAt: { type: Date, expires: 3600 * 24, default: Date.now },
  },
  { strict: false },
)
contextTokenSchema.index({ launchId: 1 }, { unique: true })

// Re-requiring this module (e.g. once per test file) must not re-register the
// same model twice on the shared `mongoose` instance.
function model<T>(name: string, schema: Schema<T>, collection?: string): mongoose.Model<T> {
  return (mongoose.models[name] as mongoose.Model<T> | undefined) ?? mongoose.model<T>(name, schema, collection)
}

// Every model uses a `Legacy`-prefixed name, distinct from both `../mongo/database-schemas.ts`'s names
// and the real `src/utils/Database.js`'s own literal registrations -- this matters because the interop
// dbtest suite constructs that real class directly in-process, and its constructor registers all nine
// of its models in one try/catch that silently aborts on the first name collision, breaking the rest of
// *its* models too. Each model still targets the same real collection (explicit 3rd arg), just under a
// distinct registration name.
export const LegacyPlatformModel = model('LegacyPlatform', legacyPlatformSchema, PLATFORM_COLLECTION)
export const PlatformStatusModel = model('LegacyPlatformStatus', platformStatusSchema, PLATFORMSTATUS_COLLECTION)
export const PublicKeyModel = model('LegacyPublicKey', keySchema, PUBLICKEY_COLLECTION)
export const PrivateKeyModel = model('LegacyPrivateKey', keySchema, PRIVATEKEY_COLLECTION)
export const LegacyAccessTokenModel = model('LegacyAccessToken', legacyAccessTokenSchema, ACCESSTOKEN_COLLECTION)
export const NonceModel = model('LegacyNonce', nonceSchema, NONCE_COLLECTION)
export const LegacyIdTokenModel = model('LegacyIdToken', legacyIdTokenSchema, IDTOKEN_COLLECTION)
export const ContextTokenModel = model('LegacyContextToken', contextTokenSchema, CONTEXTTOKEN_COLLECTION)
