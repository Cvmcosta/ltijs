export interface MongoConnectionConfig {
  url: string
  connection?: Record<string, unknown>
  debug?: boolean
}
