// Servidor de desenvolvimento (sem dependências).
//   npm run dev          → http://localhost:8080 (só este computador)
//   npm run dev:rede     → também na rede local (para testar no celular, no mesmo Wi-Fi)
//   npm run preview      → serve o arquivo único gerado pelo build (dist/)
// Opções: --porta 8080, --rede, --dist
//
// Em desenvolvimento: serve src/, recarrega a página quando um arquivo muda (CSS é trocado sem recarregar, então a
// partida na tela continua) e, se o Tailwind estiver instalado, regenera src/css/tailwind.css sozinho.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { SRC, DIST, RAIZ, MIME, versaoDoCodigo, cliTailwind, ARGS_TAILWIND, pacote } from './projeto.mjs';

const args = process.argv.slice(2);
const opc = (nome, padrao) => { const i = args.indexOf(nome); return i < 0 ? padrao : args[i + 1]; };
const REDE = args.includes('--rede');
const MODO_DIST = args.includes('--dist');
const PORTA = Number(opc('--porta', process.env.PORT || (MODO_DIST ? 8090 : 8080)));
const PASTA = MODO_DIST ? DIST : SRC;

// ── Recarregar automático (Server-Sent Events) ──
const clientes = new Set();
const avisar = (evento) => { for (const r of clientes) r.write(`data: ${evento}\n\n`); };
const SCRIPT_RECARGA = `<script>
(() => { // [servidor de desenvolvimento] recarrega quando um arquivo muda; CSS troca sem recarregar.
    const es = new EventSource('/__recarregar');
    es.onmessage = (e) => {
        if (e.data !== 'css') return location.reload();
        for (const l of document.querySelectorAll('link[rel=stylesheet]')) l.href = l.href.split('?')[0] + '?t=' + Date.now();
    };
})();
</script>`;

function arquivoDist() {
    if (!fs.existsSync(DIST)) return null;
    const nome = `PlayZinordia_${pacote().version}.html`;
    if (fs.existsSync(path.join(DIST, nome))) return nome;
    const htmls = fs.readdirSync(DIST).filter(f => f.endsWith('.html'));
    return htmls.sort((a, b) => fs.statSync(path.join(DIST, b)).mtimeMs - fs.statSync(path.join(DIST, a)).mtimeMs)[0] || null;
}

const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/__recarregar' && !MODO_DIST) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.write(': ok\n\n');
        clientes.add(res);
        req.on('close', () => clientes.delete(res));
        return;
    }
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '/index.html') rel = MODO_DIST ? '/' + (arquivoDist() || 'index.html') : '/index.html';
    const alvo = path.resolve(PASTA, '.' + rel);
    if (!alvo.startsWith(PASTA + path.sep)) { res.writeHead(403).end('Proibido'); return; }
    fs.stat(alvo, (erro, st) => {
        if (erro || !st.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(MODO_DIST && !arquivoDist() ? 'Nada em dist/. Rode "npm run build" primeiro.' : 'Não encontrado: ' + rel);
            return;
        }
        const tipo = MIME[path.extname(alvo).toLowerCase()] || 'application/octet-stream';
        const cab = { 'Content-Type': tipo, 'Cache-Control': 'no-store' };
        if (!MODO_DIST && alvo === path.join(SRC, 'index.html')) {
            let html = fs.readFileSync(alvo, 'utf8');
            html = html.replace(/<meta name="versao-jogo" content="[^"]*">/, `<meta name="versao-jogo" content="${versaoDoCodigo()}">`);
            html = html.replace(/<\/body>/i, SCRIPT_RECARGA + '\n</body>');
            res.writeHead(200, cab).end(html);
            return;
        }
        res.writeHead(200, cab);
        fs.createReadStream(alvo).pipe(res);
    });
});

// ── Observa src/ ──
if (!MODO_DIST) {
    let timer = null, soCss = true;
    fs.watch(SRC, { recursive: true }, (_ev, nome) => {
        if (!nome) return;
        soCss = soCss && nome.endsWith('.css');
        clearTimeout(timer);
        timer = setTimeout(() => {
            const ev = soCss ? 'css' : 'reload';
            soCss = true;
            if (clientes.size) console.log(`  ↻ ${ev === 'css' ? 'estilo atualizado' : 'recarregando'} (${nome})`);
            avisar(ev);
        }, 120);
    });

    const tw = cliTailwind();
    if (tw) {
        const p = spawn(process.execPath, [tw, ...ARGS_TAILWIND, '--watch'], { cwd: RAIZ, stdio: ['pipe', 'ignore', 'pipe'] });
        p.stderr.on('data', (d) => { const t = String(d).trim(); if (/error/i.test(t)) console.error('  [tailwind]', t); });
        const parar = () => { try { p.kill(); } catch {} process.exit(); };
        process.on('SIGINT', parar); process.on('SIGTERM', parar);
    } else {
        console.log('  (Tailwind não instalado: rode "npm install" para classes novas do Tailwind funcionarem.)');
    }
}

servidor.on('error', (e) => {
    if (e.code === 'EADDRINUSE') console.error(`\n  A porta ${PORTA} já está em uso. Feche o outro servidor ou use: npm run dev -- --porta 8081\n`);
    else console.error(e);
    process.exit(1);
});

servidor.listen(PORTA, REDE ? '0.0.0.0' : '127.0.0.1', () => {
    console.log(`\n  ${MODO_DIST ? 'Prévia do build (dist/)' : 'Teste Z — desenvolvimento'}`);
    console.log(`  → http://localhost:${PORTA}`);
    if (REDE) {
        for (const lista of Object.values(os.networkInterfaces()))
            for (const n of lista || []) if (n.family === 'IPv4' && !n.internal) console.log(`  → http://${n.address}:${PORTA}  (rede local)`);
    }
    console.log('  Ctrl+C para parar.\n');
});
