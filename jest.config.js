module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.js', './tests/setup/chrome-mocks.js'],
  moduleFileExtensions: ['js', 'json'],
  // Agent worktrees and handoff folders under .claude/ contain repo copies
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true,
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/lib/jquery-3.7.1.min.js',
    '/node_modules/',
    '<rootDir>/.claude/'
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
