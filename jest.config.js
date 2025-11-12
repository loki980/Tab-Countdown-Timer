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
      branches: 69,
      functions: 85,
      lines: 77,
      statements: 77
    },
    './popup/popup.js': {
      branches: 78,
      functions: 99,
      lines: 93,
      statements: 93
    }
  },
  testTimeout: 10000
};
