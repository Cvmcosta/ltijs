import mongoose from 'mongoose'
import { validate } from '#utils/validation/validation'
import type { Logger } from '#services/logger/logger.types'
import {
  AccessTokenRecordSchema,
  IdTokenRecordSchema,
  PlatformRecordSchema,
} from '#services/database-manager/mongo/mongo-database-manager.schemas'
import {
  AccessTokenModel,
  IDTOKEN_COLLECTION,
  NonceModel,
  PlatformModel,
  type IdTokenDoc,
  type PlatformDoc,
} from '#services/database-manager/mongo/database-schemas'
import { MissingDatabaseConfigError, ProviderNotDeployedError } from '#services/database-manager/mongo/errors'
import type {
  AccessTokenRecord,
  DatabaseManager,
  IdTokenClaims,
  IdTokenRecord,
  PlatformAttributes,
  PlatformFilter,
  PlatformRecord,
} from '#services/database-manager/database-manager.types'
import type { MongoConnectionConfig } from '#services/database-manager/mongo/mongo-database-manager.types'

export class MongoDatabaseManager implements DatabaseManager {
  private readonly LOG_COMPONENT = 'database'
  private readonly CONNECTED_EVENT = 'connected'
  private readonly OPEN_EVENT = 'open'
  private readonly ERROR_EVENT = 'error'
  private readonly RECONNECTED_EVENT = 'reconnected'
  private readonly DISCONNECTED_EVENT = 'disconnected'

  private readonly url: string
  private readonly connectionOptions: mongoose.ConnectOptions
  private readonly logger: Logger
  private deployed = false

  constructor(logger: Logger, config: MongoConnectionConfig) {
    if (config === undefined || config.url === '') throw new MissingDatabaseConfigError()
    this.url = config.url
    if (config.debug === true) mongoose.set('debug', true)
    this.connectionOptions = { connectTimeoutMS: 300000, ...config.connection }
    this.logger = logger
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
    // The `idTokens` collection has no Mongoose model/schema (see
    // `IdTokenDoc`'s comment in `database-schemas.ts`), so its TTL index is
    // created directly -- `createIndex()` is a no-op once it already exists
    // with the same spec. Lookups are by the document's own `_id`, so no
    // other index is needed.
    await mongoose.connection
      .collection(IDTOKEN_COLLECTION)
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 * 24 })
    this.deployed = true
  }

  public async close(): Promise<void> {
    mongoose.connection.removeAllListeners()
    await mongoose.connection.close()
    this.deployed = false
  }

  public async getPlatformByUrlAndClientId(url: string, clientId: string): Promise<PlatformRecord | undefined> {
    this.ensureDeployed()
    const doc = await PlatformModel.findOne({ url, clientId }).lean()
    if (doc === null) return undefined
    return this.toPlatformRecord(doc)
  }

  public async getPlatforms(filter: PlatformFilter = {}): Promise<PlatformRecord[]> {
    this.ensureDeployed()
    const docs = await PlatformModel.find(this.buildPlatformQuery(filter)).lean()
    return docs.map(doc => this.toPlatformRecord(doc))
  }

  public async getPlatformById(id: string): Promise<PlatformRecord | undefined> {
    this.ensureDeployed()
    if (!mongoose.isValidObjectId(id)) return undefined
    const doc = await PlatformModel.findOne({ _id: new mongoose.Types.ObjectId(id) }).lean()
    if (doc === null) return undefined
    return this.toPlatformRecord(doc)
  }

  public async savePlatform(platform: PlatformAttributes): Promise<string> {
    this.ensureDeployed()
    const doc = await PlatformModel.create(platform)
    return doc._id.toString()
  }

  public async updatePlatformById(id: string, fields: Partial<PlatformAttributes>): Promise<void> {
    this.ensureDeployed()
    await PlatformModel.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { ...fields } })
  }

  public async deletePlatformById(id: string): Promise<void> {
    this.ensureDeployed()
    await PlatformModel.deleteOne({ _id: new mongoose.Types.ObjectId(id) })
  }

  public async getAccessToken(
    platformUrl: string,
    clientId: string,
    scopes: string,
  ): Promise<AccessTokenRecord | undefined> {
    this.ensureDeployed()
    const doc = await AccessTokenModel.findOne({ platformUrl, clientId, scopes }).lean()
    if (doc === null) return undefined
    const merged = { ...(doc.value as Record<string, unknown>), createdAt: doc.createdAt.getTime() }
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
    const doc = await AccessTokenModel.findOneAndReplace(
      { platformUrl, clientId, scopes },
      { platformUrl, clientId, scopes, value },
      { upsert: true, new: true },
    )
    return doc._id.toString()
  }

  public async getIdToken(id: string): Promise<IdTokenRecord | undefined> {
    this.ensureDeployed()
    if (!mongoose.isValidObjectId(id)) return undefined
    const doc = await mongoose.connection
      .collection<IdTokenDoc>(IDTOKEN_COLLECTION)
      .findOne({ _id: new mongoose.Types.ObjectId(id) })
    if (doc === null) return undefined
    const { _id, createdAt: _createdAt, ...token } = doc
    return validate<IdTokenRecord>(IdTokenRecordSchema, { ...token, id: _id.toString() })
  }

  public async saveIdToken(token: IdTokenClaims): Promise<string> {
    this.ensureDeployed()
    const doc: IdTokenDoc = { ...token, createdAt: new Date() }
    const result = await mongoose.connection.collection<IdTokenDoc>(IDTOKEN_COLLECTION).insertOne(doc)
    return result.insertedId.toString()
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

  private buildPlatformQuery(filter: PlatformFilter): Record<string, unknown> {
    const query: Record<string, unknown> = {}
    if (filter.url !== undefined) query.url = filter.url
    if (filter.name !== undefined) query.name = filter.name
    if (filter.clientId !== undefined) {
      query.clientId = Array.isArray(filter.clientId) ? { $in: filter.clientId } : filter.clientId
    }
    return query
  }

  private toPlatformRecord(doc: PlatformDoc & { _id: mongoose.Types.ObjectId }): PlatformRecord {
    return validate<PlatformRecord>(PlatformRecordSchema, { ...doc, id: doc._id.toString() })
  }
}

export default MongoDatabaseManager
