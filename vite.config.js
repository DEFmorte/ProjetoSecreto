// Vite: servidor de desenvolvimento (npm run dev) e build em arquivo único (npm run build).
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { jogo } from './ferramentas/vite-jogo.js';

export default defineConfig({
    root: 'src',
    base: './',
    publicDir: false,
    server: { port: 8080 },
    preview: { port: 8090 },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        target: 'es2022',
        // Sem minificar: o "Copiar detalhes" do aviso de erro (nucleo/falha.js) mostra nomes de funções legíveis.
        minify: false,
    },
    worker: { format: 'es' },
    // viteSingleFile embute JS, CSS, imagens e fontes no HTML (o jogo funciona offline, num arquivo só).
    plugins: [jogo(), viteSingleFile()],
});
