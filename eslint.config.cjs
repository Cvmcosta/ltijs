module.exports = [
  {
    // Plain CommonJS config/scripts stay outside the type-aware TS project, since
    // eslint-config-love's ruleset below assumes a TypeScript parser.
    ignores: ['dist/*', 'node_modules/*', 'coverage/*', 'eslint.config.cjs', 'scripts/**/*.js'],
  },
  {
    ...require('eslint-config-love'),
    files: ['src/**/*.ts', 'jest.config.ts', 'jest.dbconfig.ts'],
  },
  {
    files: ['src/**/*.ts', 'jest.config.ts', 'jest.dbconfig.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/class-methods-use-this': 'off',
      // Conflicts with no-undef-init for `let x: T | undefined` accumulator variables:
      // one wants an explicit `= undefined` initializer, the other forbids it.
      '@typescript-eslint/init-declarations': 'off',
      curly: ['error', 'multi-line'],
    },
  },
]
