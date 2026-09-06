import { deepFreeze } from '#utils/objects/freeze'
import type { OpenIDConfiguration } from '#services/dynamic-registration/dynamic-registration.types'

export function buildOpenIDConfiguration(configuration: OpenIDConfiguration): OpenIDConfiguration {
  return deepFreeze({ ...configuration })
}
