// Vitest: testes automáticos (npm test). Os testes ficam em testes/ e usam só a lógica pura (motor, Estrelas, IA).
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['testes/**/*.test.js'],
        environment: 'node',
        testTimeout: 120000, // partidas simuladas inteiras levam alguns segundos
    },
});
