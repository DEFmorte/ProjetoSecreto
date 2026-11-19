// ── Worker do Bot (roda em paralelo à página) ──
// Carrega uma cópia do motor (regras + Estrelas) e da IA, sem nada de tela, e responde qual jogada fazer.
// Quem cria e conversa com este Worker é o BotWorker (bot-worker.js).
import { Rules } from '../motor/index.js';
import { IA } from './ia.js';

// Mensagem: { id, estado (JSON), mapa, niveis, nivel, passos } → resposta: { id, acao, ms } ou { id, erro }.
self.onmessage = (e) => {
    const m = e.data;
    try {
        const estado = JSON.parse(m.estado);
        Rules.usarMapa(m.mapa);
        if (m.niveis) IA.niveis = m.niveis;
        const t = performance.now();
        const acao = IA.decidir(estado, { nivel: m.nivel, passos: m.passos });
        self.postMessage({ id: m.id, acao, ms: performance.now() - t });
    } catch (err) {
        self.postMessage({ id: m.id, erro: String((err && err.message) || err) });
    }
};
