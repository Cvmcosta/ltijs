import mongoose from 'mongoose'
import { randomBytes } from 'node:crypto'
import { decryptAes256, encryptAes256 } from '#utils/crypto/aes-encryption'
import type { EncryptedPayload } from '#utils/crypto/aes-encryption.types'
import { validate } from '#utils/validation/validation'
import { randomUuid } from '#utils/random/random'
import { IdTokenClaim } from '#services/launch/id-token.constants'
import {
  AccessTokenRecordSchema,
  IdTokenRecordSchema,
  PlatformRecordSchema,
} from '#services/database-manager/mongo-legacy/mongo-legacy-database-manager.schemas'
import {
  ContextTokenModel,
  LegacyAccessTokenModel,
  LegacyIdTokenModel,
  LegacyPlatformModel,
  NonceModel,
  PlatformStatusModel,
  PrivateKeyModel,
  PublicKeyModel,
  type ContextTokenDoc,
  type KeyDoc,
  type LegacyIdTokenDoc,
  type LegacyPlatformDoc,
} from '#services/database-manager/mongo-legacy/database-schemas'
import { MissingDatabaseConfigError, ProviderNotDeployedError } from '#services/database-manager/mongo-legacy/errors'
import type {
  AccessTokenRecord,
  DatabaseManager,
  IdTokenClaims,
  IdTokenRecord,
  PlatformAttributes,
  PlatformFilter,
  PlatformRecord,
} from '#services/database-manager/database-manager.types'
import type { MongoConnectionConfig } from '#services/database-manager/mongo-legacy/mongo-legacy-database-manager.types'
import type { Logger } from '#services/logger/logger.types'

/**
 * A fully standalone `DatabaseManager` implementation reading/writing the
 * real, existing legacy collection structure `src/utils/Database.js` always
 * used: platform base fields, status, and keys live in four separate
 * collections (`platform`/`platformStatus`/`publickey`/`privatekey`) and are
 * merged into (or decomposed from) a single `PlatformRecord`; the raw
 * id_token is split across `idToken` (identity claims) and `contexttoken`
 * (context/resource claims) and merged into (or decomposed from) a single
 * `IdTokenRecord`. `publickey`/`privatekey`/`accesstoken` stay encrypted via
 * an `encryptionKey` constructor parameter, exactly as before.
 *
 * Deliberately independent of `../mongo/mongo-database-manager.service.ts`
 * (no shared imports, no inheritance) -- `mongo/` and `mongo-legacy/` are
 * treated as isolated implementations that could each be extracted into
 * their own package, so this class duplicates the generic Mongoose
 * connection-lifecycle logic rather than inheriting it.
 */
export class MongoLegacyDatabaseManager implements DatabaseManager {
  private readonly LOG_COMPONENT = 'database'
  private readonly CONNECTED_EVENT = 'connected'
  private readonly OPEN_EVENT = 'open'
  private readonly ERROR_EVENT = 'error'
  private readonly RECONNECTED_EVENT = 'reconnected'
  private readonly DISCONNECTED_EVENT = 'disconnected'

  private readonly url: string
  private readonly connectionOptions: mongoose.ConnectOptions
  private readonly logger: Logger
  private readonly encryptionKey: string
  private deployed = false

  /**
   * Note the extra `encryptionKey` parameter -- unlike the default `MongoDatabaseManager`'s two-arg
   * constructor, this one requires the same key legacy's `Provider.setup('LTIKEY', ...)` used, so it can
   * decrypt the existing `publickey`/`privatekey`/`accesstoken` documents it reads.
   */
  constructor(logger: Logger, config: MongoConnectionConfig, encryptionKey: string) {
    if (config === undefined || config.url === '') throw new MissingDatabaseConfigError()
    this.url = config.url
    if (config.debug === true) mongoose.set('debug', true)
    this.connectionOptions = { connectTimeoutMS: 300000, ...config.connection }
    this.logger = logger
    this.encryptionKey = encryptionKey
  }

  public async listen(): Promise<void> {
    const connection = mongoose.connection
    connection.removeAllListeners(this.CONNECTED_EVENT)
    connection.removeAllListeners(this.ERROR_EVENT)
    connection.removeAllListeners(this.RECONNECTED_EVENT)
    connection.removeAllListeners(this.DISCONNECTED_EVENT)
    connection.on(this.CONNECTED_EVENT, () => {
      this.logger.debug(this.LOG_COMPONENT, 'Database connected')
    })
    connection.once(this.OPEN_EVENT, () => {
      this.logger.debug(this.LOG_COMPONENT, 'Database connection open')
    })
    connection.on(this.ERROR_EVENT, () => {
      mongoose.disconnect().catch(() => undefined)
    })
    connection.on(this.RECONNECTED_EVENT, () => {
      this.logger.debug(this.LOG_COMPONENT, 'Database reconnected')
    })
    connection.on(this.DISCONNECTED_EVENT, () => {
      this.logger.debug(this.LOG_COMPONENT, 'Database disconnected')
      this.logger.debug(this.LOG_COMPONENT, 'Attempting to reconnect')
      setTimeout(() => {
        if (connection.readyState === mongoose.ConnectionStates.disconnected) {
          mongoose.connect(this.url, this.connectionOptions).catch((err: unknown) => {
            this.logger.error(this.LOG_COMPONENT, `Error in MongoDb connection: ${String(err)}`)
          })
        }
      }, 1000)
    })
    if (connection.readyState === mongoose.ConnectionStates.disconnected) {
      await mongoose.connect(this.url, this.connectionOptions)
    }
    this.deployed = true
  }

  public async close(): Promise<void> {
    mongoose.connection.removeAllListeners()
    await mongoose.connection.close()
    this.deployed = false
  }

  public async getPlatformByUrlAndClientId(url: string, clientId: string): Promise<PlatformRecord | undefined> {
    this.ensureDeployed()
    const doc = await LegacyPlatformModel.findOne({ platformUrl: url, clientId }).lean()
    if (doc === null) return undefined
    return await this.toPlatformRecord(doc)
  }

  public async getPlatforms(filter: PlatformFilter = {}): Promise<PlatformRecord[]> {
    this.ensureDeployed()
    const docs = await LegacyPlatformModel.find(this.buildLegacyPlatformQuery(filter)).lean()
    return await Promise.all(docs.map(async doc => await this.toPlatformRecord(doc)))
  }

  public async getPlatformById(id: string): Promise<PlatformRecord | undefined> {
    this.ensureDeployed()
    const doc = await LegacyPlatformModel.findOne({ kid: id }).lean()
    if (doc === null) return undefined
    return await this.toPlatformRecord(doc)
  }

  public async savePlatform(platform: PlatformAttributes): Promise<string> {
    this.ensureDeployed()
    const kid = await this.generateUniqueKid()
    const doc: LegacyPlatformDoc = {
      platformUrl: platform.url,
      platformName: platform.name,
      clientId: platform.clientId,
      authEndpoint: platform.authenticationEndpoint,
      accesstokenEndpoint: platform.accessTokenEndpoint,
      authorizationServer: platform.authorizationServer,
      kid,
      authConfig: platform.idTokenValidation,
    }
    await Promise.all([
      LegacyPlatformModel.create(doc),
      PlatformStatusModel.create({ id: kid, active: platform.active }),
      this.saveEncryptedKey(PublicKeyModel, kid, platform.url, platform.clientId, platform.keys.public),
      this.saveEncryptedKey(PrivateKeyModel, kid, platform.url, platform.clientId, platform.keys.private),
    ])
    return kid
  }

  public async updatePlatformById(id: string, fields: Partial<PlatformAttributes>): Promise<void> {
    this.ensureDeployed()
    const {
      active,
      keys,
      url,
      clientId,
      name,
      authenticationEndpoint,
      accessTokenEndpoint,
      idTokenValidation,
      authorizationServer,
    } = fields
    const legacyUpdate: Partial<Omit<LegacyPlatformDoc, 'kid'>> = {}
    if (url !== undefined) legacyUpdate.platformUrl = url
    if (clientId !== undefined) legacyUpdate.clientId = clientId
    if (name !== undefined) legacyUpdate.platformName = name
    if (authenticationEndpoint !== undefined) legacyUpdate.authEndpoint = authenticationEndpoint
    if (accessTokenEndpoint !== undefined) legacyUpdate.accesstokenEndpoint = accessTokenEndpoint
    if (authorizationServer !== undefined) legacyUpdate.authorizationServer = authorizationServer
    if (idTokenValidation !== undefined) legacyUpdate.authConfig = idTokenValidation

    const writes: Array<Promise<unknown>> = []
    if (Object.keys(legacyUpdate).length > 0) {
      writes.push(LegacyPlatformModel.updateOne({ kid: id }, { $set: legacyUpdate }))
    }
    if (active !== undefined) writes.push(PlatformStatusModel.updateOne({ id }, { $set: { active } }, { upsert: true }))

    // Real legacy cascades a `url`/`clientId` change onto the key docs' own
    // denormalized copies of those fields (`Provider.js`'s `updatePlatformById`).
    if (url !== undefined || clientId !== undefined) {
      const keyUpdate: Partial<Pick<KeyDoc, 'platformUrl' | 'clientId'>> = {}
      if (url !== undefined) keyUpdate.platformUrl = url
      if (clientId !== undefined) keyUpdate.clientId = clientId
      writes.push(PublicKeyModel.updateOne({ kid: id }, { $set: keyUpdate }))
      writes.push(PrivateKeyModel.updateOne({ kid: id }, { $set: keyUpdate }))
    }

    if (keys !== undefined) {
      const platform = await LegacyPlatformModel.findOne({ kid: id }).lean()
      const platformUrl = url ?? platform?.platformUrl ?? ''
      const platformClientId = clientId ?? platform?.clientId ?? ''
      writes.push(this.saveEncryptedKey(PublicKeyModel, id, platformUrl, platformClientId, keys.public))
      writes.push(this.saveEncryptedKey(PrivateKeyModel, id, platformUrl, platformClientId, keys.private))
    }

    await Promise.all(writes)
  }

  public async deletePlatformById(id: string): Promise<void> {
    this.ensureDeployed()
    await Promise.all([
      LegacyPlatformModel.deleteOne({ kid: id }),
      PlatformStatusModel.deleteOne({ id }),
      PublicKeyModel.deleteOne({ kid: id }),
      PrivateKeyModel.deleteOne({ kid: id }),
    ])
  }

  public async getAccessToken(
    platformUrl: string,
    clientId: string,
    scopes: string,
  ): Promise<AccessTokenRecord | undefined> {
    this.ensureDeployed()
    const doc = await LegacyAccessTokenModel.findOne({ platformUrl, clientId, scopes }).lean()
    if (doc === null) return undefined
    const decrypted = this.decryptPayload({ iv: doc.iv, data: doc.data })
    const { token } = JSON.parse(decrypted) as { token: Record<string, unknown> }
    const merged = { ...token, createdAt: doc.createdAt.getTime() }
    return validate<AccessTokenRecord>(AccessTokenRecordSchema, merged)
  }

  public async saveAccessToken(
    platformUrl: string,
    clientId: string,
    scopes: string,
    token: AccessTokenRecord,
  ): Promise<string> {
    this.ensureDeployed()
    const { createdAt: _createdAt, ...value } = token
    const encrypted = this.encryptPayload(JSON.stringify({ token: value }))
    // `findOneAndReplace` (not `replaceOne`) so the resulting document --
    // whichever it is, freshly inserted or the existing one just replaced --
    // comes back with its own real `_id` to return, matching `saveIdToken`'s
    // own "Mongo generates the id" structure. `AccessTokenRecord` itself has
    // no `id` field, so nothing re-attaches this to the record on read.
    const doc = await LegacyAccessTokenModel.findOneAndReplace(
      { platformUrl, clientId, scopes },
      { platformUrl, clientId, scopes, ...encrypted },
      { upsert: true, new: true },
    )
    return doc._id.toString()
  }

  public async getIdToken(id: string): Promise<IdTokenRecord | undefined> {
    this.ensureDeployed()
    const [idTokenDoc, contextTokenDoc] = await Promise.all([
      LegacyIdTokenModel.findOne({ launchId: id }).lean(),
      ContextTokenModel.findOne({ launchId: id }).lean(),
    ])
    if (idTokenDoc === null || contextTokenDoc === null) return undefined
    return validate<IdTokenRecord>(IdTokenRecordSchema, this.toIdTokenRecord(idTokenDoc, contextTokenDoc))
  }

  public async saveIdToken(token: IdTokenClaims): Promise<string> {
    this.ensureDeployed()
    const launchId = randomUuid()
    const deploymentId = token[IdTokenClaim.DeploymentId]
    const idTokenDoc: Omit<LegacyIdTokenDoc, 'createdAt'> = {
      launchId,
      iss: token.iss,
      user: token.sub,
      clientId: token[IdTokenClaim.ClientId],
      deploymentId,
      userInfo: {
        given_name: token.given_name,
        family_name: token.family_name,
        name: token.name,
        email: token.email,
      },
      platformInfo: token[IdTokenClaim.ToolPlatform] ?? {},
      platformId: token[IdTokenClaim.PlatformId],
    }
    const contextTokenDoc: Omit<ContextTokenDoc, 'createdAt'> = {
      launchId,
      // Kept for shape-compatibility with the real, existing `contexttoken`
      // collection -- no longer derived from claim values (see the removed
      // `buildContextId`), just the same opaque `launchId`.
      contextId: launchId,
      user: token.sub,
      context: token[IdTokenClaim.Context],
      resource: token[IdTokenClaim.ResourceLink],
      messageType: token[IdTokenClaim.MessageType],
      version: token[IdTokenClaim.Version],
      deepLinkingSettings: token[IdTokenClaim.DeepLinkingSettings],
      lis: token[IdTokenClaim.Lis],
      roles: token[IdTokenClaim.Roles],
      targetLinkUri: token[IdTokenClaim.TargetLinkUri],
      custom: token[IdTokenClaim.Custom],
      launchPresentation: token[IdTokenClaim.LaunchPresentation],
      endpoint: token[IdTokenClaim.Endpoint],
      namesRoles: token[IdTokenClaim.NamesRoleService],
    }
    await Promise.all([LegacyIdTokenModel.create(idTokenDoc), ContextTokenModel.create(contextTokenDoc)])
    return launchId
  }

  public async consumeNonce(nonce: string): Promise<boolean> {
    this.ensureDeployed()
    const result = await NonceModel.deleteOne({ nonce })
    return result.deletedCount > 0
  }

  public async saveNonce(nonce: string): Promise<string> {
    this.ensureDeployed()
    const doc = await new NonceModel({ nonce }).save()
    return doc._id.toString()
  }

  private ensureDeployed(): void {
    if (!this.deployed) throw new ProviderNotDeployedError()
  }

  // `kid` is real legacy's own platform-identity field -- generated the same
  // way real legacy's `Auth.generatePlatformKeyPair` did (16 random bytes,
  // hex-encoded, collision-checked), just scoped to id generation alone now
  // that key generation itself is a separate concern (`generateKeyPair()`).
  private async generateUniqueKid(): Promise<string> {
    let kid = randomBytes(16).toString('hex')
    while ((await LegacyPlatformModel.exists({ kid })) !== null) {
      kid = randomBytes(16).toString('hex')
    }
    return kid
  }

  private buildLegacyPlatformQuery(filter: PlatformFilter): Record<string, unknown> {
    const query: Record<string, unknown> = {}
    if (filter.url !== undefined) query.platformUrl = filter.url
    if (filter.name !== undefined) query.platformName = filter.name
    if (filter.clientId !== undefined) {
      query.clientId = Array.isArray(filter.clientId) ? { $in: filter.clientId } : filter.clientId
    }
    return query
  }

  private async toPlatformRecord(doc: LegacyPlatformDoc): Promise<PlatformRecord> {
    const [status, publicKey, privateKey] = await Promise.all([
      PlatformStatusModel.findOne({ id: doc.kid }).lean(),
      this.getEncryptedKey(PublicKeyModel, doc.kid),
      this.getEncryptedKey(PrivateKeyModel, doc.kid),
    ])
    return validate<PlatformRecord>(PlatformRecordSchema, {
      id: doc.kid,
      url: doc.platformUrl,
      clientId: doc.clientId,
      name: doc.platformName,
      authenticationEndpoint: doc.authEndpoint,
      accessTokenEndpoint: doc.accesstokenEndpoint,
      authorizationServer: doc.authorizationServer,
      idTokenValidation: doc.authConfig,
      // Real legacy's `Platform.platformActive()` treats a missing status
      // document as active by default (`Platform.js`'s `!platformStatus ||
      // platformStatus[0].active`), not inactive.
      active: status?.active ?? true,
      keys: { public: publicKey ?? '', private: privateKey ?? '' },
    })
  }

  // Returns a plain object, not `IdTokenRecord` -- `contextTokenDoc`'s fields
  // are optional on `ContextTokenDoc` (legacy data isn't guaranteed to have
  // them), so whether the required LTI claims (message_type/version/roles/
  // target_link_uri) actually ended up present is `validate()`'s job, not a
  // compile-time guarantee this builder can make.
  private toIdTokenRecord(idTokenDoc: LegacyIdTokenDoc, contextTokenDoc: ContextTokenDoc): Record<string, unknown> {
    return {
      id: idTokenDoc.launchId,
      iss: idTokenDoc.iss,
      sub: idTokenDoc.user,
      [IdTokenClaim.ClientId]: idTokenDoc.clientId,
      [IdTokenClaim.PlatformId]: idTokenDoc.platformId,
      given_name: idTokenDoc.userInfo.given_name,
      family_name: idTokenDoc.userInfo.family_name,
      name: idTokenDoc.userInfo.name,
      email: idTokenDoc.userInfo.email,
      [IdTokenClaim.DeploymentId]: idTokenDoc.deploymentId,
      [IdTokenClaim.ToolPlatform]: idTokenDoc.platformInfo,
      [IdTokenClaim.MessageType]: contextTokenDoc.messageType,
      [IdTokenClaim.Version]: contextTokenDoc.version,
      [IdTokenClaim.Roles]: contextTokenDoc.roles,
      [IdTokenClaim.TargetLinkUri]: contextTokenDoc.targetLinkUri,
      [IdTokenClaim.Context]: contextTokenDoc.context,
      [IdTokenClaim.ResourceLink]: contextTokenDoc.resource,
      [IdTokenClaim.LaunchPresentation]: contextTokenDoc.launchPresentation,
      [IdTokenClaim.Custom]: contextTokenDoc.custom,
      [IdTokenClaim.Lis]: contextTokenDoc.lis,
      [IdTokenClaim.Endpoint]: contextTokenDoc.endpoint,
      [IdTokenClaim.NamesRoleService]: contextTokenDoc.namesRoles,
      [IdTokenClaim.DeepLinkingSettings]: contextTokenDoc.deepLinkingSettings,
    }
  }

  private async getEncryptedKey(model: mongoose.Model<KeyDoc>, id: string): Promise<string | undefined> {
    this.ensureDeployed()
    const doc = await model.findOne({ kid: id }).lean()
    if (doc === null) return undefined
    const decrypted = this.decryptPayload({ iv: doc.iv, data: doc.data })
    const { key } = JSON.parse(decrypted) as { key: string }
    return key
  }

  // eslint-disable-next-line @typescript-eslint/max-params -- mirrors save{Public,Private}Key(id, platformUrl, clientId, key)'s own 4 params, plus the shared model
  private async saveEncryptedKey(
    model: mongoose.Model<KeyDoc>,
    id: string,
    platformUrl: string,
    clientId: string,
    key: string,
  ): Promise<void> {
    this.ensureDeployed()
    const encrypted = this.encryptPayload(JSON.stringify({ key, kid: id }))
    await model.replaceOne({ kid: id }, { kid: id, platformUrl, clientId, ...encrypted }, { upsert: true })
  }

  private encryptPayload(data: string): EncryptedPayload {
    return encryptAes256(data, this.encryptionKey)
  }

  private decryptPayload(payload: EncryptedPayload): string {
    return decryptAes256(payload.data, payload.iv, this.encryptionKey)
  }
}

export default MongoLegacyDatabaseManager
