import createDebug from 'debug'
import { DefaultLogger } from '#services/logger/default/default-logger.service'

jest.mock('debug', () => jest.fn(() => jest.fn()))

const mockCreateDebug = createDebug as unknown as jest.Mock

beforeEach(() => {
  mockCreateDebug.mockClear()
})

describe('DefaultLogger', () => {
  it('creates a debug instance namespaced "provider:<component>" on first use', () => {
    new DefaultLogger().debug('platformManager', 'hello')

    expect(mockCreateDebug).toHaveBeenCalledTimes(1)
    expect(mockCreateDebug).toHaveBeenCalledWith('provider:platformManager')
  })

  it('reuses the same debug instance across repeated calls for the same component', () => {
    const defaultLogger = new DefaultLogger()

    defaultLogger.debug('platformManager', 'first')
    defaultLogger.warn('platformManager', 'second')

    expect(mockCreateDebug).toHaveBeenCalledTimes(1)
    const debuggerInstance = mockCreateDebug.mock.results[0].value as jest.Mock
    expect(debuggerInstance).toHaveBeenCalledTimes(2)
  })

  it('creates a separate debug instance per distinct component', () => {
    const defaultLogger = new DefaultLogger()

    defaultLogger.debug('platformManager', 'a')
    defaultLogger.debug('accessTokenManager', 'b')

    expect(mockCreateDebug).toHaveBeenCalledTimes(2)
    expect(mockCreateDebug).toHaveBeenNthCalledWith(1, 'provider:platformManager')
    expect(mockCreateDebug).toHaveBeenNthCalledWith(2, 'provider:accessTokenManager')
  })

  it('prefixes the message with its level', () => {
    new DefaultLogger().warn('platformManager', 'something happened')

    const debuggerInstance = mockCreateDebug.mock.results[0].value as jest.Mock
    expect(debuggerInstance).toHaveBeenCalledWith('[warn] something happened')
  })

  it('prefixes error-level messages accordingly', () => {
    new DefaultLogger().error('platformManager', 'something broke')

    const debuggerInstance = mockCreateDebug.mock.results[0].value as jest.Mock
    expect(debuggerInstance).toHaveBeenCalledWith('[error] something broke')
  })
})
