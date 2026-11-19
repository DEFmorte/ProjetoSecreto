// Build: junta src/ num arquivo HTML único e autossuficiente (como o jogo sempre foi distribuído):
// CSS e scripts embutidos, imagens e fontes viram data: URIs, o Worker do Bot vai embutido e a política de
// segurança volta à versão estrita (nada de 'self': nenhum arquivo externo é carregado).
//   npm run build  →  dist/PlayZinordia_<versão>.html
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SRC, DIST, RAIZ, MIME, RE_SCRIPT, RE_ESTILO, lerIndex, pacote, versaoDoCodigo, importsDoWorker, WORKER, cliTailwind, ARGS_TAILWIND } from './projeto.mjs';

const CSP_ESTRITA = "default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src https://0.peerjs.com wss://0.peerjs.com; base-uri 'none'; form-action 'none'";

const falhar = (msg) => { console.error('\n  ✗ ' + msg + '\n'); process.exit(1); };
const ler = (rel) => {
    const p = path.join(SRC, rel);
    if (!fs.existsSync(p)) falhar(`arquivo não encontrado: src/${rel} (listado em src/index.html?)`);
    return fs.readFileSync(p, 'utf8');
};

// 1) Tailwind atualizado (se instalado).
const tw = cliTailwind();
if (tw) {
    const r = spawnSync(process.execPath, [tw, ...ARGS_TAILWIND], { cwd: RAIZ, encoding: 'utf8' });
    if (r.status !== 0) falhar('Tailwind falhou:\n' + r.stderr);
} else console.warn('  ! Tailwind não instalado (npm install): usando src/css/tailwind.css como está.');

// 2) Caminhos de assets ("assets/...", "../assets/...") → data: URIs.
const usados = new Set();
function embutirAssets(txt, deOnde) {
    return txt.replace(/(["'(])((?:\.\.\/)*assets\/[^"'()\s]+?\.([a-z0-9]+))(?=["')])/gi, (_, abre, ref, ext) => {
        // No CSS o caminho é relativo ao arquivo .css; no JS, à página (index.html).
        const base = deOnde.endsWith('.css') ? path.posix.dirname(deOnde) : '';
        const rel = path.posix.normalize(path.posix.join(base, ref));
        const p = path.join(SRC, rel);
        if (!fs.existsSync(p)) falhar(`${deOnde}: asset não encontrado: ${ref}`);
        const mime = MIME['.' + ext.toLowerCase()];
        if (!mime) falhar(`${deOnde}: tipo de asset desconhecido: ${ref}`);
        usados.add(rel);
        return `${abre}data:${mime.split(';')[0]};base64,${fs.readFileSync(p).toString('base64')}`;
    });
}
const semFechamento = (txt, nome) => {
    if (/<\/script/i.test(txt)) falhar(`${nome} contém "</script" — isso quebraria o arquivo único.`);
    return txt;
};
const finalSemQuebra = (t) => t.replace(/\s+$/, '');

// 3) Worker do Bot: worker.js com a linha do importScripts trocada por /*@motor@*/. Os scripts do motor já estão na
//    página; eles ganham data-worker e o BotWorker junta tudo na hora de criar o Worker (sem duplicar o código).
const { txt: workerTxt, linha, lista } = importsDoWorker();
const workerFonte = workerTxt.replace(linha, () => '/*@motor@*/');
const naPagina = [...lerIndex().matchAll(RE_SCRIPT)].map(m => m[1]).filter(f => lista.includes(f));
if (naPagina.join() !== lista.join()) falhar(`${WORKER}: o importScripts precisa listar ${lista.join(', ')} na mesma ordem em que aparecem em src/index.html.`);

// 4) Monta o HTML.
let html = lerIndex();
html = html.replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]*(">)/, `$1${CSP_ESTRITA}$2`);
html = html.replace(/<!-- Segurança:[\s\S]*?-->/, '<!-- Segurança: o jogo só pode falar com o servidor de salas do PeerJS (modo online). Imagens, fontes e scripts\n         vêm todos de dentro deste arquivo; nada externo é carregado. -->');
html = html.replace(/<meta name="versao-jogo" content="[^"]*">/, `<meta name="versao-jogo" content="${versaoDoCodigo()}">`);
html = html.replace(RE_ESTILO, (_, f) => `<style>\n${finalSemQuebra(embutirAssets(ler(f), f))}\n    </style>`);
let primeiro = true;
html = html.replace(RE_SCRIPT, (_, f) => {
    let tag = `<script${lista.includes(f) ? ` data-worker="${f}"` : ''}>\n${semFechamento(finalSemQuebra(embutirAssets(ler(f), f)), f)}\n</script>`;
    if (primeiro) { // o código do Worker vai junto, como texto, antes do primeiro script
        primeiro = false;
        tag = `<script type="text/plain" id="fonte-bot-worker">\n${semFechamento(finalSemQuebra(workerFonte), WORKER)}\n</script>\n    ` + tag;
    }
    return tag;
});
if (/<script src=|<link rel="stylesheet"/.test(html)) falhar('sobrou alguma referência externa no HTML.');

// 5) Grava.
fs.mkdirSync(DIST, { recursive: true });
const nome = `PlayZinordia_${pacote().version}.html`;
fs.writeFileSync(path.join(DIST, nome), html);

// Assets que estão em src/assets mas ninguém usa (só um aviso).
const todos = [];
(function varrer(d) { for (const e of fs.readdirSync(path.join(SRC, d), { withFileTypes: true })) e.isDirectory() ? varrer(path.posix.join(d, e.name)) : todos.push(path.posix.join(d, e.name)); })('assets');
const sobrando = todos.filter(a => !usados.has(a));

const kb = (fs.statSync(path.join(DIST, nome)).size / 1024).toFixed(0);
console.log(`\n  ✓ dist/${nome}  (${kb} KB, versão ${versaoDoCodigo()})`);
if (sobrando.length) console.log(`  ! assets sem uso: ${sobrando.join(', ')}`);
console.log('  Abra direto no navegador (funciona offline) ou rode "npm run preview".\n');
