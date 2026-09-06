import mongoose, { Schema } from 'mongoose'
import type { IdTokenClaims } from '#services/database-manager/database-manager.types'

export interface PlatformDoc {
  url: string
  clientId: string
  name: string
  authenticationEndpoint: string
  accessTokenEndpoint: string
  authorizationServer?: string
  idTokenValidation: { method: string; key: string }
  active: boolean
  keys: { public: string; private: string }
}

export interface AccessTokenDoc {
  platformUrl: string
  clientId: string
  scopes: string
  value: unknown
  createdAt: Date
}

export type IdTokenDoc = IdTokenClaims & { createdAt: Date }

export interface NonceDoc {
  nonce: string
  createdAt: Date
}

const platformSchema = new Schema<PlatformDoc>({
  url: String,
  clientId: String,
  name: String,
  authenticationEndpoint: String,
  accessTokenEndpoint: String,
  authorizationServer: String,
  idTokenValidation: { method: String, key: String },
  active: { type: Boolean, default: true },
  keys: { public: String, private: String },
})
platformSchema.index({ url: 1 })
platformSchema.index(
  { url: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { url: { $type: 'string' }, clientId: { $type: 'string' } } },
)

const accessTokenSchema = new Schema<AccessTokenDoc>({
  platformUrl: String,
  clientId: String,
  scopes: String,
  value: Schema.Types.Mixed,
  createdAt: { type: Date, expires: 3600, default: Date.now },
})
accessTokenSchema.index({ platformUrl: 1, clientId: 1, scopes: 1 }, { unique: true })

const nonceSchema = new Schema<NonceDoc>({
  nonce: String,
  createdAt: { type: Date, expires: 600, default: Date.now },
})
nonceSchema.index({ nonce: 1 })

// Re-requiring this module (e.g. once per test file) must not re-register the
// same model twice on the shared `mongoose` instance.
function model<T>(name: string, schema: Schema<T>, collection?: string): mongoose.Model<T> {
  return (mongoose.models[name] as mongoose.Model<T> | undefined) ?? mongoose.model<T>(name, schema, collection)
}

export const PlatformModel = model('platform', platformSchema)
export const AccessTokenModel = model('accesstoken', accessTokenSchema)
export const NonceModel = model('nonce', nonceSchema)
export const IDTOKEN_COLLECTION = 'idTokens'
