// ── Worker do Bot (roda em paralelo à página) ──
// Carrega uma cópia do motor (CONFIG, Rules, Engine) e do Bot, sem nada de tela. Quem cria e conversa com este
// Worker é o BotWorker (bot-worker.js).
// Em desenvolvimento, o navegador abre este arquivo e o importScripts carrega os arquivos do motor. No build
// (arquivo único), ferramentas/build.mjs troca a linha do importScripts pelo conteúdo desses arquivos e embute
// tudo na página — por isso a lista abaixo precisa ficar numa linha só, com os caminhos relativos a esta pasta.
let state = null;
const Rede = { ativo: () => false }, Tutorial = { partida: false, ativo: false }, $ = () => null;
function botsDoModo(modo) { const md = CONFIG.modos[modo]; return md && Array.isArray(md.bots) ? md.bots : []; }

importScripts('../motor/config.js', '../motor/regras.js', '../motor/engine.js', 'bot.js');

self.onmessage = (e) => {
    const m = e.data;
    try {
        state = JSON.parse(m.estado);
        Rules.usarMapa(m.mapa);
        if (CONFIG.modos[state.modo]) CONFIG.modos[state.modo].bots = m.bots;
        Object.assign(Bot, { niveis: m.niveis, nivelForcado: m.nivel, passos: m.passos, segundoPlano: false });
        const t = performance.now(), acao = Bot.decidir();
        self.postMessage({ id: m.id, acao, ms: performance.now() - t });
    } catch (err) { self.postMessage({ id: m.id, erro: String((err && err.message) || err) }); }
};
