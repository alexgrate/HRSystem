import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Downgraded from error to warn so lint can gate CI: both fire on
      // deliberate, correct patterns in this codebase, not on defects.
      //   - only-export-components: HMR hint; context files idiomatically
      //     export their Provider component alongside their hooks.
      //   - set-state-in-effect: flags ordinary `setLoading(true)` at the top
      //     of a fetch effect, which is exactly how these effects should work.
      'react-refresh/only-export-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
