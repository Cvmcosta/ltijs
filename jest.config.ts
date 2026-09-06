/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverage: true,
  coverageProvider: 'v8',
  coverageDirectory: 'coverage',
  roots: ['<rootDir>'],
  testEnvironmentOptions: {
    customExportConditions: ['development'],
  },
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  verbose: true,
}
