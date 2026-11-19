// Plugin do Vite com o que é específico deste jogo:
//  - política de segurança (CSP) do index.html: aberta para o servidor de desenvolvimento, estrita no build;
//  - <meta name="versao-jogo">: impressão digital do código (o modo online só junta jogadores com a mesma);
//  - nome do arquivo do build: dist/PlayZinordia_<versão do package.json>.html.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(RAIZ, 'src');

const CSP_BUILD = "default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src https://0.peerjs.com wss://0.peerjs.com; base-uri 'none'; form-action 'none'";
const CSP_DEV = "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss: https://0.peerjs.com wss://0.peerjs.com; base-uri 'none'; form-action 'none'";

const versaoPacote = () => JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;

// Hash de todos os arquivos de src/ (e da versão das dependências): muda sempre que o código muda.
function versaoDoCodigo() {
    const h = crypto.createHash('sha256');
    const varrer = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) varrer(p);
            else h.update(path.relative(SRC, p).replace(/\\/g, '/') + '\0').update(fs.readFileSync(p));
        }
    };
    varrer(SRC);
    h.update(fs.readFileSync(path.join(RAIZ, 'package-lock.json')));
    return `${versaoPacote()}-${h.digest('hex').slice(0, 10)}`;
}

export function jogo() {
    let build = false;
    return {
        name: 'teste-z',
        enforce: 'post',
        configResolved(cfg) { build = cfg.command === 'build'; },
        transformIndexHtml(html) {
            return html
                .replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]*(">)/, (_, a, b) => a + (build ? CSP_BUILD : CSP_DEV) + b)
                .replace(/(<meta name="versao-jogo" content=")[^"]*(">)/, (_, a, b) => a + versaoDoCodigo() + b);
        },
        generateBundle(_, bundle) {
            const html = bundle['index.html'];
            if (html) html.fileName = `PlayZinordia_${versaoPacote()}.html`;
        },
    };
}
