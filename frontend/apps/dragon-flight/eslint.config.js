import tsParser from '../../packages/eslint-config-custom/node_modules/@typescript-eslint/parser/dist/index.js';
import tsPlugin from '../../packages/eslint-config-custom/node_modules/@typescript-eslint/eslint-plugin/dist/index.js';
import svelte from '../../packages/eslint-config-custom/node_modules/eslint-plugin-svelte/lib/index.js';

export default [
	{ ignores: ['build/**', '.svelte-kit/**'] },
	...svelte.configs['flat/recommended'],
	{
		files: ['**/*.svelte'],
		languageOptions: { parserOptions: { parser: tsParser } },
		plugins: { '@typescript-eslint': tsPlugin },
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
		},
	},
	{
		files: ['**/*.{js,ts}'],
		languageOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module' },
		plugins: { '@typescript-eslint': tsPlugin },
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
		},
	},
];
