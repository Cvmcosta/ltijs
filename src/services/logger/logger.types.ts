export interface Logger {
  debug: (component: string, message: string) => void
  warn: (component: string, message: string) => void
  error: (component: string, message: string) => void
}
