export interface AuthenticationRequestParams {
  loginHint: string
  redirectUri: string
  state: string
  ltiMessageHint?: string
  ltiDeploymentId?: string
}

export interface State {
  /** Ties this state token to the separate, never-sent-to-the-platform recovery token stored client-side. */
  stateId: string
  query?: Record<string, string>
  /** The login-time `target_link_uri` fragment, restored only if the id_token's own claim has none. */
  fragment?: string
  /** The platform's declared postMessage storage target frame name (`lti_storage_target`), if it sent one at login. */
  storageTarget?: string
  /** The platform's authentication endpoint origin, captured at login time so the launch page can target postMessage calls precisely. */
  platformLoginOrigin?: string
}

/** The parts of the login-time `target_link_uri` carried in the state token. */
export type TargetLinkUriState = Pick<State, 'query' | 'fragment'>

export interface StorageTarget {
  target: string
  loginOrigin: string
}
