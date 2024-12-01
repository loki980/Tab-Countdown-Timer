module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['jest-chrome'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true,
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/lib/jquery-3.5.1.min.js'
  ]
}
