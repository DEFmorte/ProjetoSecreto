// ── Engine: básico (sorteio, definições, registro da partida) ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { CONFIG } from '../config.js';

export default {
    rng: Math.random,
    def(id) {
        return CONFIG.abilities[id] || null;
    },
    abilitiesOf(piece) {
        return (piece.habilidades || []).map((id) => CONFIG.abilities[id]).filter(Boolean);
    },
    isAlive(p) {
        return CONFIG.rules.isAlive(p);
    },
    label(p) {
        return p ? `J${p.player} ${p.stats.nome}` : 'Efeito externo';
    },
    // state.log: linhas (texto). Os acontecimentos (uma ação e tudo o que ela causou) começam nos índices absolutos de
    // state.logGrupos; state.logTotal conta as linhas já registradas (as mais antigas saem após CONFIG.logMax).
    log(state, text) {
        state.logTotal = (state.logTotal ?? state.log.length) + 1;
        state.log.push(text);
        if (state.log.length > CONFIG.logMax) state.log.splice(0, state.log.length - CONFIG.logMax);
    },
    // Abre um novo acontecimento no log: a próxima linha vira o título do grupo.
    novoGrupoLog(state) {
        const inicio = state.logTotal ?? state.log.length;
        const base = inicio - state.log.length;
        state.logGrupos = (state.logGrupos || []).filter((g) => g >= base && g !== inicio);
        state.logGrupos.push(inicio);
    },
    // Grupos de linhas do log (mais antigo → mais recente).
    gruposLog(state) {
        const total = state.logTotal ?? state.log.length,
            base = total - state.log.length;
        const inicios = [
            0,
            ...(state.logGrupos || []).map((g) => g - base).filter((i) => i > 0 && i < state.log.length),
        ];
        return inicios
            .map((ini, k) => state.log.slice(ini, inicios[k + 1] ?? state.log.length))
            .filter((g) => g.length);
    },
};
