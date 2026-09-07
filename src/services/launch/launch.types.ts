import type { z } from 'zod'
import type { LoginRequestPayloadSchema, LaunchCallbackPayloadSchema } from '#services/launch/launch.schemas'
import type { LaunchContext } from '#services/launch/launch-context.service'
import type { HttpRequestParameters, HttpResponse, RouteHandler } from '#services/http-handler/http-handler.types'
import type { IdTokenRecord } from '#services/database-manager/database-manager.types'
import type { Platform } from '#services/platform-manager/platform-manager.types'
import type { State } from '#services/oidc/oidc.types'

export type LoginRequestParams = z.infer<typeof LoginRequestPayloadSchema>
export type LaunchCallbackParams = z.infer<typeof LaunchCallbackPayloadSchema>

export interface LoginRequestResult {
  redirectUrl: string
  state: string
  /** Only set when the platform declared postMessage storage support (`lti_storage_target`) at login. */
  storageTarget?: string
  platformLoginOrigin?: string
}

export interface ProcessLaunchResult {
  idToken: IdTokenRecord
  state: State
  platform: Platform
}

export interface TargetLinkUriParts {
  targetLinkUri: string
  query?: Record<string, string>
}

/** Extra query parameters to merge into the redirect URL, in addition to the ltik `LaunchContext.redirect` always appends. */
export interface RedirectOptions {
  query?: Record<string, string>
}

export interface LaunchRoutes {
  loginRoute: string
  launchRoute: string
}

/** A launch handler -- given the resolved `LaunchContext` plus the raw request/response, for reading extra headers or sending a custom response. */
export type OnLaunchHandler = (
  context: LaunchContext,
  request: HttpRequestParameters,
  response: HttpResponse,
) => Promise<void>

// Raw route-handler overrides, matching legacy's `onUnregisteredPlatform`/
// `onInactivePlatform` exactly: given `(request, response)`, expected to
// send the response itself. The login route always returns immediately
// after invoking one -- there is no mechanism to resolve a `Platform` and
// have the OIDC flow continue automatically, on either side of the port.
export type UnregisteredPlatformHandler = RouteHandler
export type InactivePlatformHandler = RouteHandler
