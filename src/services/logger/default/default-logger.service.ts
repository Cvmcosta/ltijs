import createDebug, { type Debugger } from 'debug'
import type { Logger } from '#services/logger/logger.types'

export class DefaultLogger implements Logger {
  private readonly debuggers = new Map<string, Debugger>()

  public debug(component: string, message: string): void {
    this.write(component, 'debug', message)
  }

  public warn(component: string, message: string): void {
    this.write(component, 'warn', message)
  }

  public error(component: string, message: string): void {
    this.write(component, 'error', message)
  }

  private write(component: string, level: string, message: string): void {
    this.getDebugger(component)(`[${level}] ${message}`)
  }

  private getDebugger(component: string): Debugger {
    const existing = this.debuggers.get(component)
    if (existing !== undefined) return existing

    const created = createDebug(`provider:${component}`)
    this.debuggers.set(component, created)
    return created
  }
}

export default DefaultLogger
