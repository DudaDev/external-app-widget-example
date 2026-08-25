import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'server/node_modules/**',
      'worker/node_modules/**',
      'worker/.wrangler/**',
      'preview/dist/**',
      'preview/public/**',
      '**/.wrangler/**',
      // Widget Builder integration files, plain HTML/JS/CSS strings, not JS modules
      '**/custom-widget-builder.js',
      '**/custom-widget-builder.local.js',
      '**/duda-widget-builder.js',
      '**/duda-widget-builder.local.js',
    ],
  },

  // TypeScript source files (frontend)
  {
    files: ['src/**/*.{ts,tsx}', 'preview/entries/**/*.tsx', 'shared-react/entry.ts'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // TypeScript already checks this, and understands ambient/global type
      // references (React.CSSProperties, RequestInit, etc.) that no-undef
      // doesn't, so it false-positives on every one of them.
      'no-undef': 'off',

      // Props are typed via TypeScript interfaces, no need for prop-types
      'react/prop-types': 'off',

      // Intentional: role="list" on <ul> preserves list semantics in Safari/VoiceOver
      // when list-style: none is applied via CSS (see ResultsGrid)
      'jsx-a11y/no-redundant-roles': 'off',

      // Defer unused-vars to TypeScript rule which understands type-only imports
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // TypeScript server/worker/preview-build files (no JSX, Node or Workers-style globals)
  {
    files: ['server/**/*.ts', 'worker/**/*.ts', 'preview/worker-src/**/*.ts', 'preview/vite.config.ts', 'shared-react/vite.config.ts'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.node },
      parserOptions: { sourceType: 'module' },
    },
    rules: {
      ...js.configs.recommended.rules,
      // TypeScript already checks this, and understands ambient/global type
      // references (RequestInit, etc.) that no-undef doesn't.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Test files, relaxed rules for test-specific patterns
  {
    files: ['src/**/__tests__/**/*.{ts,tsx}', 'server/__tests__/**/*.ts'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Test wrapper components (StatefulWrapper etc.) don't need display names
      'react/display-name': 'off',
      // Test patterns like `let setId; Wrapper = () => { setId = ... }` are deliberate
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/globals': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Disable formatting rules that conflict with Prettier
  prettier,
];
