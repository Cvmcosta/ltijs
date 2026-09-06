module.exports = [
  {
    // Legacy CommonJS source/tests are ported to TypeScript incrementally;
    // only lint what's already been ported until the rest catches up. Plain
    // JS config/scripts stay outside the type-aware TS project too.
    ignores: ['dist/*', 'node_modules/*', 'coverage/*', 'src/**/*.js', 'eslint.config.cjs', 'scripts/**/*.js'],
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
