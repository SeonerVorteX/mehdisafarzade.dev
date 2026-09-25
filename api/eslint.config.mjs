// ESLint 9 flat config (Examination-api still uses .eslintrc + ESLint 8; agreed to move to flat config).
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.mjs'] },
    ...tseslint.configs.recommendedTypeChecked,
    prettierRecommended,
    {
        languageOptions: {
            globals: { ...globals.node, ...globals.jest },
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
        rules: {
            // `any` only with an explanatory eslint-disable comment (brief §8).
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            'prettier/prettier': ['error', { endOfLine: 'auto' }],
        },
    },
    {
        // Tests assert on untyped HTTP bodies from supertest.
        files: ['test/**/*.ts', '**/*.spec.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/unbound-method': 'off',
        },
    },
);
