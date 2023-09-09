module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['standard-with-typescript', 'prettier'],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['tsconfig.json', 'tests/*/tsconfig.json'],
  },
  rules: {},
  settings: {
    react: {
      version: '18',
    },
  },
}
