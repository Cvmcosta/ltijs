import type { Platform } from '#services/platform-manager/platform-manager.types'
import { PrivateKeyNotFoundError, PublicKeyNotFoundError } from '#services/platform-manager/errors'

export function resolvePlatformPrivateKey(platform: Platform): string {
  if (platform.keys.private === '') throw new PrivateKeyNotFoundError()
  return platform.keys.private
}

export function resolvePlatformPublicKey(platform: Platform): string {
  if (platform.keys.public === '') throw new PublicKeyNotFoundError()
  return platform.keys.public
}
