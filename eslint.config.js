// ESLint: aponta erros comuns (variável não importada, variável não usada, código inalcançável...).
// Rodar: npm run lint (ou ver direto no editor com a extensão do ESLint).
import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['dist/', 'node_modules/', 'PlayZinordia_*.html'] },
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser },
        },
        rules: {
            'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
            // Valor inicial "por segurança" antes de um try (let ok = false; try { ok = ... }) é intencional aqui.
            'no-useless-assignment': 'off',
            'no-empty': ['warn', { allowEmptyCatch: true }],
        },
    },
    {
        // Worker do Bot
        files: ['src/js/bot/worker.js'],
        languageOptions: { globals: { ...globals.worker } },
    },
    {
        // Ferramentas e configurações (Node)
        files: ['*.js', '*.cjs', 'ferramentas/**/*.js', 'testes/**/*.js', 'electron/**/*.cjs'],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        files: ['*.cjs', 'electron/**/*.cjs'],
        languageOptions: { sourceType: 'commonjs' },
    },
];
