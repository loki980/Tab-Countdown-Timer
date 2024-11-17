module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['jest-chrome'],
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true
}
