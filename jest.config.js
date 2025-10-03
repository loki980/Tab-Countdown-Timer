module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['jest-chrome'],
  setupFilesAfterEnv: ['./jest.setup.js', './tests/setup/chrome-mocks.js'],
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true,
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/lib/jquery-3.5.1.min.js',
    '/node_modules/'
  ],
  coverageThreshold: {
    global: {
      branches: 39,
      functions: 55,
      lines: 40,
      statements: 40
    }
  },
  testTimeout: 10000
}
