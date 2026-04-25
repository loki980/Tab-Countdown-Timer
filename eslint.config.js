const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/',
      'lib/',
      'coverage/',
      'reports/',
      'dist/',
      '**/*.min.js'
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        chrome: 'readonly',
        $: 'readonly',
        jQuery: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
      'no-var': 'warn',
      'no-undef': 'error',
      semi: ['warn', 'always'],
      quotes: ['warn', 'single'],
      indent: ['warn', 2],
      'no-trailing-spaces': 'warn',
      'eol-last': 'warn',
      'comma-dangle': ['warn', 'never'],
      'object-curly-spacing': ['warn', 'always'],
      'array-bracket-spacing': ['warn', 'never'],
      'space-before-function-paren': ['warn', 'never'],
      'keyword-spacing': 'warn',
      'space-infix-ops': 'warn',
      'no-multiple-empty-lines': ['warn', { max: 2 }],
      'brace-style': ['warn', '1tbs', { allowSingleLine: true }]
    }
  }
];
