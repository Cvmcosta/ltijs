// Pluggable logger for Ltijs internal logging.
//
// Historically every module logged through the `debug` package, which writes
// all output to stderr regardless of severity. Log aggregators (e.g. Datadog)
// then classify every line as an error. This module wraps `debug` so a host
// application can register its own logger via Provider.setup({ logger }) and
// receive structured entries with a derived severity level instead.

const createDebug = require('debug')
const util = require('util')

let customLogger = null

/**
 * @description Registers a custom logger sink. When set, Ltijs routes all
 * internal logging through it instead of writing to stderr via `debug`.
 * @param {Function|null} logger - Receives { namespace, level, message }.
 */
function setLogger (logger) {
  customLogger = typeof logger === 'function' ? logger : null
}

/**
 * @description Derives a severity level from the logged arguments. Ltijs uses
 * `debug` for both traces and error reporting, so an Error argument is treated
 * as an error and everything else as a low-severity trace.
 */
function deriveLevel (args) {
  for (const arg of args) {
    if (arg instanceof Error) return 'error'
  }
  return 'debug'
}

/**
 * @description Logger factory. Returns a callable with the same signature as a
 * `debug` instance so existing call sites do not need to change.
 * @param {String} namespace - Debug namespace (Ex: 'provider:auth').
 */
function createLogger (namespace) {
  const debugInstance = createDebug(namespace)

  return (...args) => {
    if (!customLogger) {
      // Preserve original behavior when no custom logger is registered.
      return debugInstance(...args)
    }

    try {
      customLogger({
        namespace,
        level: deriveLevel(args),
        message: util.format(...args)
      })
    } catch (err) {
      // Never let logging break the request flow.
      debugInstance(...args)
    }
  }
}

module.exports = createLogger
module.exports.setLogger = setLogger
