// ── Versão para computador (Electron) ──
// Abre o arquivo único do build (dist/PlayZinordia_<versão>.html) numa janela própria. O jogo é exatamente o mesmo da
// versão do navegador: Bot, online e salvamento funcionam igual (o salvamento fica na pasta de dados do app).
//   npm run app    → gera o build e abre a janela (para testar)
//   npm run exe    → gera o instalador e a versão portátil em release/
// TESTEZ_AUTOTESTE=1: abre, joga uma partida (IA contra o Bot) sozinho, imprime o resultado e fecha (teste do .exe).
const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('node:path');
const { version } = require('../package.json');

const ARQUIVO = path.join(__dirname, '..', 'dist', `PlayZinordia_${version}.html`);
const AUTOTESTE = process.env.TESTEZ_AUTOTESTE === '1';

// Só uma janela do jogo por vez (duas cópias brigariam pelo mesmo salvamento).
if (!app.requestSingleInstanceLock()) app.quit();

function criarJanela() {
    const janela = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 600,
        backgroundColor: '#111827',
        title: 'Teste Z',
        show: !AUTOTESTE,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });
    janela.loadFile(ARQUIVO);

    const wc = janela.webContents;
    // A página não sai do jogo: links externos abrem no navegador do sistema.
    wc.setWindowOpenHandler(({ url }) => {
        if (/^https:\/\//.test(url)) shell.openExternal(url);
        return { action: 'deny' };
    });
    wc.on('will-navigate', (e, url) => {
        if (!url.startsWith('file:')) e.preventDefault();
    });
    // F11: tela cheia (o botão de tela cheia do próprio jogo também funciona).
    wc.on('before-input-event', (e, input) => {
        if (input.type === 'keyDown' && input.key === 'F11') {
            janela.setFullScreen(!janela.isFullScreen());
            e.preventDefault();
        }
    });
    if (AUTOTESTE) autoteste(wc);
    return janela;
}

// Joga uma partida inteira sem ninguém: o jogador 1 é a IA, o jogador 2 é o Bot (pelo Worker, como no jogo).
function autoteste(wc) {
    const problemas = [];
    wc.on('console-message', (e, ...antigo) => {
        const nivel = e.level ?? antigo[0];
        const msg = e.message ?? antigo[1];
        if (nivel === 'error' || nivel === 3 || /indisponível/.test(msg)) problemas.push(String(msg));
    });
    const limite = setTimeout(() => terminar({ ok: false, erro: 'tempo esgotado' }), 120000);
    const terminar = (r) => {
        clearTimeout(limite);
        r.problemas = problemas;
        if (problemas.length) r.ok = false;
        process.stdout.write(`AUTOTESTE ${JSON.stringify(r)}\n`);
        app.exit(r.ok ? 0 : 1);
    };
    wc.on('did-finish-load', async () => {
        try {
            const r = await wc.executeJavaScript(`new Promise((fim) => {
                const tecla = (key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
                const G = window.Game;
                const passos = ['Enter', 'Enter', 's', 'Enter', 's', 'Enter'];
                let i = 0;
                const menu = setInterval(() => {
                    if (i < passos.length) return tecla(passos[i++]);
                    clearInterval(menu);
                    G.Bot.espera = { primeira: 0, passo: 0, pausa: 50 };
                    const t0 = Date.now();
                    const laco = setInterval(() => {
                        const s = G.state;
                        if (s && s.winner) { clearInterval(laco); fim({ ok: true, vencedor: s.winner, rodadas: s.round, ms: Date.now() - t0 }); return; }
                        if (Date.now() - t0 > 100000) { clearInterval(laco); fim({ ok: false, erro: 'partida não terminou' }); return; }
                        if (!s) return;
                        if (G.Sorteio.aberto()) return G.Sorteio.avancar();
                        if (document.getElementById('erro-screen')) { clearInterval(laco); fim({ ok: false, erro: 'tela de erro' }); return; }
                        if (!G.Bot.vez() && G.IA.decisor(s) != null) {
                            const a = G.IA.decidir(s, { nivel: 'normal' });
                            if (a) G.executar(a, G.IA.decisor(s));
                        }
                    }, 120);
                }, 400);
            })`);
            terminar(r);
        } catch (e) {
            terminar({ ok: false, erro: String(e) });
        }
    });
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    // Nenhuma permissão especial (câmera, microfone, localização...): só tela cheia e área de transferência.
    session.defaultSession.setPermissionRequestHandler((_wc, permissao, responder) =>
        responder(['fullscreen', 'clipboard-sanitized-write'].includes(permissao)),
    );
    const janela = criarJanela();
    app.on('second-instance', () => {
        if (janela.isMinimized()) janela.restore();
        janela.focus();
    });
});

app.on('window-all-closed', () => app.quit());
