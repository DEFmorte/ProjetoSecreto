// ── Rules: atributos, marcas e registro de dano no turno ──
// Parte do Rules (regras básicas). Os métodos são juntados em regras.js; use sempre Rules.nome(...).
import { CONFIG } from '../config.js';
import { Rules } from '../regras.js';

export default {
    // 'primarios' | 'secundarios' | chave | lista → lista de chaves de status.
    expandStats(spec) {
        if (Array.isArray(spec)) return spec.flatMap((k) => Rules.expandStats(k));
        return CONFIG.stats[spec] && spec !== 'internos' ? [...CONFIG.stats[spec]] : [spec];
    },
    categoriaStat(key) {
        return ['primarios', 'secundarios', 'internos'].find((c) => CONFIG.stats[c].includes(key)) || null;
    },
    stat(piece, key) {
        let v = piece.stats[key] || 0;
        for (const e of piece.effects || []) if (e.stat === key) v += e.delta;
        return Math.max(0, v);
    },
    // Contador de turnos de cada jogador (incrementa no início do turno dele).
    turnoAtual(state, player) {
        return (state.turnos && state.turnos[player]) || 0;
    },
    registrarDano(state, source, target) {
        const k = Rules.turnoAtual(state, source.player);
        const reg = (source.registroDano = source.registroDano || {});
        Object.keys(reg).forEach((key) => {
            if (+key < k - 1) delete reg[key];
        });
        reg[k] = reg[k] || [];
        if (!reg[k].includes(target.id)) reg[k].push(target.id);
    },
    // source causou dano a target no turno (do jogador de source) atual + offset? (offset -1 = turno anterior)
    feriuNoTurno(state, source, target, offset = 0) {
        const reg = source.registroDano || {};
        return !!target && (reg[Rules.turnoAtual(state, source.player) + offset] || []).includes(target.id);
    },
    marks(piece, markId) {
        return (piece.effects || []).filter((e) => e.tipo === 'marca' && (!markId || e.marca === markId)).length;
    },
};
