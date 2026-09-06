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

export interface LaunchRoutes {
  loginRoute: string
  launchRoute: string
}

/** A launch handler -- given the resolved `LaunchContext` plus the raw request/response, for reading extra headers/cookies or sending a custom response. */
export type OnLaunchHandler = (
  context: LaunchContext,
  request: HttpRequestParameters,
  response: HttpResponse,
) => Promise<void>

/** The three launch handlers `ProviderOptions.handlers` accepts, matching `Provider.onResourceLink`/`onDeepLinking`/`onSubmissionReview`. */
export interface LaunchHandlers {
  onResourceLink: OnLaunchHandler
  onDeepLinking: OnLaunchHandler
  onSubmissionReview: OnLaunchHandler
}

// Raw route-handler overrides, matching legacy's `onUnregisteredPlatform`/
// `onInactivePlatform` exactly: given `(request, response)`, expected to
// send the response itself. The login route always returns immediately
// after invoking one -- there is no mechanism to resolve a `Platform` and
// have the OIDC flow continue automatically, on either side of the port.
export type UnregisteredPlatformHandler = RouteHandler
export type InactivePlatformHandler = RouteHandler
