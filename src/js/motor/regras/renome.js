// ── Rules: Renome (marcadores, coleta e vitória) ──
// Parte do Rules (regras básicas). Os métodos são juntados em regras.js; use sempre Rules.nome(...).
import { CONFIG } from '../config.js';
import { Engine } from '../engine.js';
import { Rules } from '../regras.js';

export default {
    // ── Renome ──
    renomeEm(state, q, r) {
        return (state.renome || []).find((m) => m.q === q && m.r === r) || null;
    },
    renomeTime(state, player) {
        return state.pieces.filter((p) => p.player === player).reduce((n, p) => n + (p.renome || 0), 0);
    },
    // Coloca Renome no tabuleiro (soma com um marcador já existente na mesma zona).
    soltarRenome(state, q, r, valor) {
        if (valor <= 0) return;
        state.renome = state.renome || [];
        const m = Rules.renomeEm(state, q, r);
        if (m) m.valor += valor;
        else state.renome.push({ q, r, valor });
    },
    // Chamado sempre que alguém ganha Renome: registra o primeiro time a atingir a meta (vitória instantânea).
    // Renome para vencer na partida (depende do modo: CONFIG.modos[modo].metaRenome).
    metaRenome(state) {
        const md = state && CONFIG.modos[state.modo];
        return md && md.metaRenome !== undefined ? md.metaRenome : CONFIG.renome.metaVitoria;
    },
    // Texto das metas para a ajuda: "3" ou "3 (5 com 3 jogadores)".
    textoMetaRenome() {
        const por = {};
        for (const [id, md] of Object.entries(CONFIG.modos)) {
            const m = Rules.metaRenome({ modo: id });
            if (m) (por[m] = por[m] || []).push(md.jogadores.length);
        }
        const metas = Object.keys(por).map(Number);
        if (metas.length <= 1) return metas.length ? `${metas[0]}` : '';
        const principal = Rules.metaRenome({ modo: CONFIG.modoPadrao });
        return `${principal} (${metas
            .filter((m) => m !== principal)
            .map((m) => `${m} com ${[...new Set(por[m])].join('/')} jogadores`)
            .join(', ')})`;
    },
    checarMetaRenome(state, player) {
        const meta = Rules.metaRenome(state);
        if (!meta || state.vencedorRenome || state.winner) return;
        if (Rules.renomeTime(state, player) >= meta) {
            state.vencedorRenome = player;
            Engine.log(state, `${CONFIG.players[player].label} alcança ${meta} de Renome!`);
        }
    },
    // ── Renome extra (desempate) ── state.renomeExtra = { faltam (rodadas), rodada (última contada) } enquanto a
    // contagem está ativa (ver CONFIG.renome.extra).
    renomeExtraAtivo(state) {
        const cfg = CONFIG.renome.extra;
        return (
            !!cfg &&
            (state.jogadores || [1, 2]).some((pl) => {
                const n = state.pieces.filter((p) => p.player === pl && CONFIG.rules.isAlive(p)).length;
                return n > 0 && n <= cfg.quandoEquipeCom;
            })
        );
    },
    // Chamado no início de cada turno: inicia, avança (uma vez por rodada, no 1º turno dela) ou encerra a contagem;
    // ao chegar a 0, sorteia o novo marcador.
    contarRenomeExtra(state) {
        const cfg = CONFIG.renome.extra;
        if (!cfg || state.winner || state.vencedorRenome || !Rules.renomeExtraAtivo(state)) {
            state.renomeExtra = null;
            return;
        }
        const n = Math.max(1, cfg.rodadas || 5),
            txt = (k) => `${k} ${k === 1 ? 'rodada' : 'rodadas'}`;
        if (!state.renomeExtra) {
            state.renomeExtra = { faltam: n, rodada: state.round };
            Engine.log(
                state,
                `Uma equipe ficou com só ${cfg.quandoEquipeCom === 1 ? '1 Estrela' : `${cfg.quandoEquipeCom} Estrelas`}: em ${txt(n)} surge um novo Renome`,
            );
            return;
        }
        if (state.renomeExtra.rodada === state.round) return;
        state.renomeExtra.rodada = state.round;
        if (--state.renomeExtra.faltam > 0) return;
        state.renomeExtra.faltam = n;
        const z = Rules.sortearZonaRenome(state);
        if (!z) return;
        Rules.soltarRenome(state, z.q, z.r, cfg.valor);
        // destacado durante este turno
        state.renomeExtra.ultimo = { q: z.q, r: z.r, rodada: state.round, bloco: state.blockIndex };
        Engine.log(state, `Novo Renome (${cfg.valor}) surge em (${z.q}, ${z.r}); o próximo em ${txt(n)}`);
    },
    sortearZonaRenome(state) {
        const vazias = Rules.zonas().filter((z) => !Rules.pieceAt(state, z.q, z.r) && !Rules.renomeEm(state, z.q, z.r));
        const longe = vazias.filter((z) => state.pieces.every((p) => Rules.distancia(p, z) >= 2));
        const op = longe.length ? longe : vazias;
        return op.length ? op[Math.floor(Engine.rng() * op.length)] : null;
    },
    podeColetar(state, piece) {
        return !!(
            piece &&
            piece.turn &&
            !piece.turn.actionUsed &&
            Rules.canSelect(state, piece) &&
            Rules.renomeEm(state, piece.q, piece.r)
        );
    },
    coletarRenome(state, piece) {
        if (!Rules.podeColetar(state, piece)) return false;
        const m = Rules.renomeEm(state, piece.q, piece.r);
        Rules.beginActivation(state, piece);
        Engine.novoGrupoLog(state);
        piece.turn.actionUsed = true;
        state.renome = state.renome.filter((x) => x !== m);
        piece.renome = (piece.renome || 0) + m.valor;
        Engine.log(state, `${Engine.label(piece)} coleta ${m.valor} Renome (total ${piece.renome})`);
        Engine.fx(state, { k: 'renome', id: piece.id, v: m.valor });
        Rules.checarMetaRenome(state, piece.player);
        Engine.emit(state, 'coletouRenome', { peca: piece, valor: m.valor });
        return true;
    },
};
