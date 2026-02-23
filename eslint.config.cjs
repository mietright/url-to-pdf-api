const airbnb = require("eslint-flat-config-airbnb").default;
const importPlugin = require("eslint-plugin-import");

const baseConfigs = airbnb.filter(cfg => !cfg.plugins || (Array.isArray(cfg.plugins) && !cfg.plugins.includes("react")));

const config = [
  ...baseConfigs,
  {
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __filename: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        describe: 'readonly',
        it: 'readonly',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      'no-implicit-coercion': 'error',
      'no-process-env': 'error',
      'no-path-concat': 'error',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'no-use-before-define': ['error', { functions: false }],
      'no-underscore-dangle': 'off',
      'no-console': 'off',
      'comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'ignore',
        },
      ],
      'function-paren-newline': 'off',
    },
  },
];

module.exports = config;
