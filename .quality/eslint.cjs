module.exports = {
  root: true,
  env: { browser: true, node: true, es2022: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  rules: {
    'no-undef': 'error',
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'valid-typeof': 'error',
    'no-unreachable': 'error',
    'no-constant-condition': ['error', { checkLoops: false }]
  },
  globals: { qrcode: 'readonly' }
};
