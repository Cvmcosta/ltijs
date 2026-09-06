/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
const baseConfig = require('./jest.config.ts')

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  testMatch: ['<rootDir>/src/**/*.dbtest.ts'],
  globalSetup: '<rootDir>/src/shared/utils/tests/jest-global-setup.ts',
  globalTeardown: '<rootDir>/src/shared/utils/tests/jest-global-teardown.ts',
}
