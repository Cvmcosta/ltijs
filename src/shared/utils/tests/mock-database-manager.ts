import type {
  AccessTokenRecord,
  DatabaseManager,
  IdTokenClaims,
  IdTokenRecord,
  PlatformAttributes,
  PlatformFilter,
  PlatformRecord,
} from '#services/database-manager/database-manager.types'

export const buildMockDatabaseManager = (): DatabaseManager => {
  const platforms = new Map<string, PlatformRecord>()
  const accessTokens = new Map<string, AccessTokenRecord>()
  const idTokens = new Map<string, IdTokenRecord>()
  const nonces = new Set<string>()
  let idTokenIdCounter = 0
  let platformIdCounter = 0
  let accessTokenIdCounter = 0

  const accessTokenKey = (platformUrl: string, clientId: string, scopes: string): string =>
    `${platformUrl}|${clientId}|${scopes}`

  return {
    setup: async () => undefined,
    close: async () => undefined,

    getPlatformByUrlAndClientId: async (url: string, clientId: string) => {
      for (const platform of platforms.values()) {
        if (platform.url === url && platform.clientId === clientId) return platform
      }
      return undefined
    },
    getPlatforms: async (filter: PlatformFilter = {}) =>
      [...platforms.values()].filter(
        platform =>
          (filter.url === undefined || platform.url === filter.url) &&
          (filter.name === undefined || platform.name === filter.name) &&
          (filter.clientId === undefined ||
            (Array.isArray(filter.clientId)
              ? filter.clientId.includes(platform.clientId)
              : platform.clientId === filter.clientId)),
      ),
    getPlatformById: async (id: string) => platforms.get(id),
    savePlatform: async (platform: PlatformAttributes) => {
      platformIdCounter += 1
      const id = String(platformIdCounter)
      platforms.set(id, { ...platform, id })
      return id
    },
    updatePlatformById: async (id: string, fields: Partial<PlatformAttributes>) => {
      const existing = platforms.get(id)
      if (existing !== undefined) platforms.set(id, { ...existing, ...fields })
    },
    deletePlatformById: async (id: string) => {
      platforms.delete(id)
    },

    getAccessToken: async (platformUrl: string, clientId: string, scopes: string) =>
      accessTokens.get(accessTokenKey(platformUrl, clientId, scopes)),
    saveAccessToken: async (platformUrl: string, clientId: string, scopes: string, token: AccessTokenRecord) => {
      accessTokens.set(accessTokenKey(platformUrl, clientId, scopes), token)
      accessTokenIdCounter += 1
      return String(accessTokenIdCounter)
    },

    getIdToken: async (id: string) => idTokens.get(id),
    saveIdToken: async (token: IdTokenClaims) => {
      idTokenIdCounter += 1
      const id = String(idTokenIdCounter)
      idTokens.set(id, { ...token, id })
      return id
    },

    saveNonce: async (nonce: string) => {
      nonces.add(nonce)
      return nonce
    },
    consumeNonce: async (nonce: string) => nonces.delete(nonce),
  }
}
