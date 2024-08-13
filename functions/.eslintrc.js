module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
    '/scripts/**/*', // Ignore scripts files.
  ],
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  rules: {
    'quotes': ['error', 'single'],
    'import/no-unresolved': 0,
    'indent': ['error', 2],
    'allowSingleLineBlocks': 0,
    'comma-dangle': 0,
    'max-len': 0,
    'padded-blocks': 0,
    'camelcase': 0,
    'no-extend-native': 0,
    'no-var-requires': 0,
    'no-prototype-builtins': 0,
    'require-jsdoc': 0,
    'no-trailing-spaces': 0,
    '@typescript-eslint/ no-explicit-any': 0
  },
};
