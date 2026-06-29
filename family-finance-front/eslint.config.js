import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// eslint-plugin-react-hooks 7.x yangi React Compiler qoidalarini qo'shdi (set-state-in-effect,
// refs, purity, immutability, preserve-manual-memoization, ...). Ular mavjud kodbazada 110+ joyda
// error beradi — bir martalik katta refactoring talab qiladi. Gradual adoption uchun
// `rules-of-hooks` (kritik) dan tashqari barchasini 'warn' qilamiz: CI bloklanmaydi, lekin
// developer ogohlantiriladi va vaqt o'tishi bilan tuzatiladi.
const reactHookRules = Object.fromEntries(
  Object.entries(reactHooks.configs.recommended.rules).map(([name, value]) => [
    name,
    name === 'react-hooks/rules-of-hooks' ? value : 'warn',
  ])
);

export default tseslint.config(
  {
    ignores: ['dist', 'dev-dist', 'android', 'node_modules', 'coverage', 'testCalcTree.js', 'e2e', 'playwright-report', 'test-results'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHookRules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
);
