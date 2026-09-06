import { MongoMemoryServer } from 'mongodb-memory-server'

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- conventional Jest global-setup naming (e.g. jest-mongodb)
  var __MONGOD__: MongoMemoryServer | undefined
}

export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryServer.create()

  process.env.MONGO_URL = mongod.getUri()
  global.__MONGOD__ = mongod
}
