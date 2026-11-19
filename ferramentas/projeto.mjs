// Informações do projeto usadas pelo servidor, pelo build e pela checagem.
// A fonte da verdade é src/index.html: a ordem dos <link> e <script src> lá é a ordem de carga do jogo.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = path.join(RAIZ, 'src');
export const DIST = path.join(RAIZ, 'dist');

export const pacote = () => JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
export const lerIndex = () => fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

export const RE_SCRIPT = /<script src="([^"]+)"><\/script>/g;
export const RE_ESTILO = /<link rel="stylesheet" href="([^"]+)">/g;

export function arquivos(html = lerIndex()) {
    return {
        scripts: [...html.matchAll(RE_SCRIPT)].map(m => m[1]),
        estilos: [...html.matchAll(RE_ESTILO)].map(m => m[1]),
    };
}

// Arquivos do motor que o Worker do Bot importa (a linha do importScripts em js/bot/worker.js).
export const WORKER = 'js/bot/worker.js';
export function importsDoWorker() {
    const txt = fs.readFileSync(path.join(SRC, WORKER), 'utf8');
    const linha = txt.split('\n').find(l => l.startsWith('importScripts('));
    if (!linha) throw new Error(`${WORKER}: linha "importScripts(...)" não encontrada`);
    const lista = [...linha.matchAll(/'([^']+)'/g)].map(m => path.posix.join(path.posix.dirname(WORKER), m[1]));
    return { txt, linha, lista };
}

// Impressão digital do código: muda sempre que qualquer script, estilo ou o HTML muda.
// O modo online usa isso para só juntar jogadores com o mesmo código (ver Rede.versao).
export function versaoDoCodigo() {
    const html = lerIndex();
    const { scripts, estilos } = arquivos(html);
    const h = crypto.createHash('sha256');
    h.update(html.replace(/<meta name="versao-jogo" content="[^"]*">/, ''));
    for (const f of [...estilos, ...scripts, WORKER]) h.update('\0' + f + '\0').update(fs.readFileSync(path.join(SRC, f)));
    return `${pacote().version}-${h.digest('hex').slice(0, 10)}`;
}

export const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
    '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
    '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

// Tailwind (instalado com `npm install`): caminho da linha de comando, ou null se não estiver instalado.
export function cliTailwind() {
    const p = path.join(RAIZ, 'node_modules', 'tailwindcss', 'lib', 'cli.js');
    return fs.existsSync(p) ? p : null;
}
export const ARGS_TAILWIND = ['-c', 'tailwind.config.cjs', '-i', 'ferramentas/tailwind.entrada.css', '-o', 'src/css/tailwind.css', '--minify'];
