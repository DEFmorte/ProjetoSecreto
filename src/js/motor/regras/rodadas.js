// ── Rules: rodadas, turnos e ativação ──
// Parte do Rules (regras básicas). Os métodos são juntados em regras.js; use sempre Rules.nome(...).
import { CONFIG } from '../config.js';
import { Engine } from '../engine.js';
import { Rules } from '../regras.js';

export default {
    buildInitiativeOrder(state) {
        const cfg = CONFIG.rules.initiative;
        const jog = state.jogadores || [1, 2];
        const firstPlayer = cfg.alternateOnTie ? jog[(state.round - 1) % jog.length] : jog[0];
        // ordem sorteada no início
        const sorteada = Array.isArray(state.ordem) && state.ordem.length ? state.ordem : null;
        const ordem = (p) =>
            // empate: ordem sorteada (antigas: gira quem vem primeiro)
            sorteada ? sorteada.indexOf(p) : (jog.indexOf(p) - jog.indexOf(firstPlayer) + jog.length) % jog.length;
        return state.pieces
            .filter((p) => CONFIG.rules.isAlive(p))
            .sort((a, b) => {
                for (const key of [cfg.stat, ...cfg.tieBreakStats]) {
                    const va = Rules.stat(a, key),
                        vb = Rules.stat(b, key);
                    if (va !== vb) return vb - va;
                }
                if (a.player !== b.player) return ordem(a.player) - ordem(b.player);
                return a.id - b.id;
            })
            .map((p) => p.id);
    },
    buildBlocks(state) {
        if (CONFIG.rules.turnMode !== 'initiative') {
            const jog = state.jogadores || [1, 2],
                k = Math.max(0, jog.indexOf(CONFIG.rules.startingPlayer));
            // Ordem sorteada no início (state.ordem); partidas antigas: ciclo fixo 1 → 2 (→ 3) a cada rodada.
            const order =
                Array.isArray(state.ordem) && state.ordem.length
                    ? state.ordem.filter((pl) => jog.includes(pl))
                    : [...jog.slice(k), ...jog.slice(0, k)];
            return order
                .map((pl) => ({
                    player: pl,
                    ids: state.pieces.filter((p) => p.player === pl && CONFIG.rules.isAlive(p)).map((p) => p.id),
                }))
                .filter((b) => b.ids.length > 0);
        }
        const blocks = [];
        for (const id of Rules.buildInitiativeOrder(state)) {
            const p = Rules.pieceById(state, id);
            const last = blocks[blocks.length - 1];
            if (last && last.player === p.player) last.ids.push(id);
            else blocks.push({ player: p.player, ids: [id] });
        }
        return blocks;
    },
    startRound(state) {
        state.pieces.forEach((p) => {
            p.turn = { activated: false, done: false, moveSpent: 0, actionUsed: false, extra: null, usos: {} };
        });
        state.blocks = Rules.buildBlocks(state);
        state.blockIndex = 0;
        state.activeId = null;
    },
    initMatch(state) {
        if (!state.renome)
            state.renome = ((Rules.mapa || CONFIG.mapas.classico).renome || []).map((m) => ({
                q: m.q,
                r: m.r,
                valor: m.valor ?? 1,
            }));
        Rules.startRound(state);
        const first = state.blocks[0];
        if (first) Rules.iniciarTurno(state, first.player);
    },
    // Início do turno do jogador: expirações/recuperação e passivas 'inicioTurno'. true = espera uma escolha
    // (state.pending).
    iniciarTurno(state, player) {
        Rules.fireTurnEvent(state, 'turnStart', player);
        Rules.contarRenomeExtra(state);
        if (Engine.gatilhosTurno(state, player, 'inicioTurno')) Engine.resolveQueue(state);
        return !!state.pending;
    },
    currentBlock(state) {
        return state.blocks[state.blockIndex] || null;
    },
    pendingIds(state) {
        const block = Rules.currentBlock(state);
        if (!block) return [];
        return block.ids.filter((id) => {
            const p = Rules.pieceById(state, id);
            return p && !p.turn.done;
        });
    },
    activePiece(state) {
        return state.activeId != null ? Rules.pieceById(state, state.activeId) : null;
    },
    canSelect(state, piece) {
        if (state.winner || state.pending || !piece || !piece.turn || piece.turn.done) return false;
        const block = Rules.currentBlock(state);
        if (!block || !block.ids.includes(piece.id)) return false;
        return state.activeId == null || state.activeId === piece.id;
    },
    beginActivation(state, piece) {
        if (piece.turn.activated) return;
        piece.turn.activated = true;
        state.activeId = piece.id;
    },
    endActivation(state, piece) {
        if (piece.turn.done) return;
        Rules.beginActivation(state, piece);
        piece.turn.done = true;
        if (state.activeId === piece.id) state.activeId = null;
        for (const id of Object.keys(piece.objetos || {}))
            if ((CONFIG.objetos[id] || {}).recolheNoFim && Engine.objetoNaZonaDe(piece, id))
                Engine.recolherObjeto(state, piece, id, 'fim da jogada');
        Engine.emit(state, 'fimAtivacao', { peca: piece });
        if (state.triggers && state.triggers.length) Engine.resolveQueue(state); // ex.: Chegada (escolha do aliado)
    },
    autoEndIfExhausted(state, piece) {
        const canAct = CONFIG.rules.hasUsableAction(state, piece);
        if (Rules.movementLeft(piece) <= 0 && !canAct) Rules.endActivation(state, piece);
    },
    turnBounds(state, player) {
        let first = -1,
            last = -1;
        state.blocks.forEach((b, i) => {
            if (b.player === player) {
                if (first < 0) first = i;
                last = i;
            }
        });
        return { first, last };
    },
    nextTurnRound(state, player) {
        const { first } = Rules.turnBounds(state, player);
        return first >= 0 && state.blockIndex < first ? state.round : state.round + 1;
    },
    fireTurnEvent(state, event, player) {
        state.pieces.forEach((p) => {
            p.effects = (p.effects || []).filter((e) => {
                if (!(e.expiraEvento === event && e.expiraJogador === player && state.round >= e.expiraRodada))
                    return true;
                if (e.travaArmadura)
                    // conversão acabou: Armadura volta
                    p.stats.armadura = Math.min(p.stats.armaduraMax, p.stats.armadura + (e.devolve || 0));
                return false;
            });
        });
        if (event === 'turnStart') {
            if (state.log) {
                Engine.novoGrupoLog(state);
                Engine.log(state, `Rodada ${state.round} · Turno de ${CONFIG.players[player].label}`);
            }
            state.turnos = state.turnos || {};
            state.turnos[player] = (state.turnos[player] || 0) + 1;
            // Duração em turnos: reduzida no início do turno do jogador que aplicou o efeito.
            state.pieces.forEach((p) => {
                p.effects = (p.effects || []).filter((e) => {
                    if (e.turnosRestantes == null || e.contaJogador !== player) return true;
                    e.turnosRestantes--;
                    if (e.turnosRestantes > 0) return true;
                    if (state.log) Engine.log(state, `${Engine.label(p)}: ${e.origem} expirou`);
                    return false;
                });
            });
            const own = state.pieces.filter((p) => p.player === player && CONFIG.rules.isAlive(p));
            own.forEach((p) => CONFIG.rules.turnStart(p));
            if (own.length && state.log) {
                Engine.log(
                    state,
                    `${CONFIG.players[player].label}: Armadura restaurada e +${CONFIG.rules.amagoRegenPerTurn} Âmago`,
                );
            }
        }
    },
    settle(state) {
        if (state.activeId != null && !Rules.pieceById(state, state.activeId)) state.activeId = null;
        let guard = 0;
        while (state.pieces.length && !state.pending && Rules.pendingIds(state).length === 0 && guard++ < 100) {
            const leaving = state.blocks[state.blockIndex];
            if (leaving && Rules.turnBounds(state, leaving.player).last === state.blockIndex) {
                // Passivas de fim de turno (ex.: Correção de Vitalidade): resolvidas uma vez; se pedirem escolha, a
                // troca de turno espera.
                const chave = `${state.round}:${state.blockIndex}`;
                if (state.fimTurnoFeito !== chave) {
                    state.fimTurnoFeito = chave;
                    if (
                        Engine.gatilhosTurno(
                            state,
                            leaving.player,
                            'fimTurno',
                            `Fim do turno de ${CONFIG.players[leaving.player].label}`,
                        )
                    ) {
                        Engine.resolveQueue(state);
                        if (state.pending) return;
                    }
                }
                Rules.fireTurnEvent(state, 'turnEnd', leaving.player);
            }
            state.blockIndex++;
            if (state.blockIndex >= state.blocks.length) {
                state.round++;
                Rules.startRound(state);
            }
            const arriving = state.blocks[state.blockIndex];
            if (arriving && Rules.turnBounds(state, arriving.player).first === state.blockIndex) {
                if (Rules.iniciarTurno(state, arriving.player)) return;
            }
        }
    },
};
