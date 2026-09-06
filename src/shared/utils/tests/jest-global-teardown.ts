export default async function globalTeardown(): Promise<void> {
  await global.__MONGOD__?.stop()
}
