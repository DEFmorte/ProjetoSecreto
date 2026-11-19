// ── Worker do Bot (roda em paralelo à página) ──
// Carrega uma cópia do motor (CONFIG, Estrelas, Rules, Engine) e da IA, sem nada de tela, e responde qual jogada
// fazer. Quem cria e conversa com este Worker é o BotWorker (bot-worker.js).
// Em desenvolvimento, o navegador abre este arquivo e o importScripts carrega os arquivos do motor. No build
// (arquivo único), ferramentas/build.mjs troca a linha do importScripts pelo conteúdo desses arquivos e embute
// tudo na página — por isso a lista abaixo precisa ficar numa linha só, com os caminhos relativos a esta pasta e
// na mesma ordem de src/index.html.
importScripts('../motor/config.js', '../estrelas/estrelas.js', '../estrelas/diamante.js', '../estrelas/lorena.js', '../estrelas/alex.js', '../estrelas/toppich.js', '../estrelas/rato-do-bananal.js', '../estrelas/garyn.js', '../estrelas/amina.js', '../estrelas/vitoria.js', '../estrelas/nairrun.js', '../estrelas/siff.js', '../estrelas/shou-e-cisnela.js', '../estrelas/icnoyotl.js', '../estrelas/cassandra.js', '../estrelas/ricardinho.js', '../estrelas/billy.js', '../estrelas/tico.js', '../estrelas/aurora.js', '../estrelas/angela.js', '../motor/regras.js', '../motor/engine.js', 'ia.js');

// Mensagem: { id, estado (JSON), mapa, niveis, nivel, passos } → resposta: { id, acao, ms } ou { id, erro }.
self.onmessage = (e) => {
    const m = e.data;
    try {
        const estado = JSON.parse(m.estado);
        Rules.usarMapa(m.mapa);
        if (m.niveis) IA.niveis = m.niveis;
        const t = performance.now(), acao = IA.decidir(estado, { nivel: m.nivel, passos: m.passos });
        self.postMessage({ id: m.id, acao, ms: performance.now() - t });
    } catch (err) { self.postMessage({ id: m.id, erro: String((err && err.message) || err) }); }
};
