export interface AuthenticationRequestParams {
  loginHint: string
  redirectUri: string
  state: string
  ltiMessageHint?: string
  ltiDeploymentId?: string
}

export interface State {
  query?: Record<string, string>
}
