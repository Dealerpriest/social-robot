const { resolve } = require('path');
module.exports = {
  // https://eslint.org/docs/user-guide/configuring#configuration-cascading-and-hierarchy
  // This option interrupts the configuration hierarchy at this file
  // Remove this if you have an higher level ESLint config file (it usually happens into a monorepos)
  root: true,

  // https://eslint.vuejs.org/user-guide/#how-to-use-custom-parser
  // Must use parserOptions instead of "parser" to allow vue-eslint-parser to keep working
  // `parser: 'vue-eslint-parser'` is already included with any 'plugin:vue/**' config and should be omitted
  // parserOptions: {
  //   // https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/parser#configuration
  //   // https://github.com/TypeStrong/fork-ts-checker-webpack-plugin#eslint
  //   // Needed to make the parser take into account 'vue' files
  //   extraFileExtensions: ['.vue'],
  //   parser: '@typescript-eslint/parser',
  //   project: resolve(__dirname, './tsconfig.json'),
  //   tsconfigRootDir: __dirname,
  //   ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
  //   sourceType: 'module' // Allows for the use of imports
  // },
  parser: "@typescript-eslint/parser",

  // env: {
  //   browser: true
  // },

  // Rules order is important, please avoid shuffling them
  extends: [
    // Base ESLint recommended rules
    'eslint:recommended',

    // https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#usage
    // ESLint typescript rules
    'plugin:@typescript-eslint/recommended',
    // 'plugin:@typescript-eslint/eslint-recommended',
    // consider disabling this class of rules if linting takes too long
    // 'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],

  plugins: [
    // required to apply rules which need type information
    '@typescript-eslint',

    // https://eslint.vuejs.org/user-guide/#why-doesn-t-it-work-on-vue-file
    // required to lint *.vue files

  ],

  globals: {
    // process: 'readonly',
  },

  // add your custom rules here
  // rules: {
  //   // allow async-await
  //   'generator-star-spacing': 'off',
  //   // allow paren-less arrow functions
  //   'arrow-parens': 'off',
  //   'one-var': 'off',
  //   'no-void': 'off',
  //   'multiline-ternary': 'off',

    
  //   quotes: [2, "single", { avoidEscape: true }],
  //   semi: [1, "always"],
  //   indent: [1, 2],
  //   "no-unreachable": 1,

  //   'import/first': 'off',
  //   'import/named': 'error',
  //   'import/namespace': 'error',
  //   'import/default': 'error',
  //   'import/export': 'error',
  //   'import/extensions': 'off',
  //   'import/no-unresolved': 'off',
  //   'import/no-extraneous-dependencies': 'off',
  //   'prefer-promise-reject-errors': 'off',


  //   "comma-dangle": ['warn', 'always-multiline'],

  //   // TypeScript
  //   quotes: ['warn', 'single', { avoidEscape: true }],
  //   '@typescript-eslint/explicit-function-return-type': 'off',
  //   '@typescript-eslint/explicit-module-boundary-types': 'off',
    
  //   // warning instead of error
  //   "@typescript-eslint/ban-types": [
  //     "warn",
  //     {
  //       "extendDefaults": true,
  //     }
  //   ],

  //   "@typescript-eslint/no-unsafe-assignment": "warn",

  //   // allow debugger during development only
  //   'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
  // }
}