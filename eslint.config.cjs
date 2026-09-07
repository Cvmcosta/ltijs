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
      // Several public constructors type a parameter as required (accurate for TS-checked callers) but
      // still guard it at runtime with `=== undefined`, since the value can genuinely arrive as undefined
      // from a plain-JS caller, parsed JSON/env config, or an optional field threaded through from
      // elsewhere (e.g. ProviderOptions.database). This rule can't tell that boundary check apart from a
      // truly dead condition, so it's off project-wide rather than disabled inline at every occurrence.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Conflicts with no-undef-init for `let x: T | undefined` accumulator variables:
      // one wants an explicit `= undefined` initializer, the other forbids it.
      '@typescript-eslint/init-declarations': 'off',
      // Conflicts with no-non-null-assertion: this rule demands `!` over `as X` to strip null/undefined
      // from a type, but no-non-null-assertion forbids `!` outright. Keeping no-non-null-assertion (the
      // stronger safety rail) means `as X` has to stay allowed for that one narrowing case.
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      curly: ['error', 'multi-line'],
    },
  },
]
