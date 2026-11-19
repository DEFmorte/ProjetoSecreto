// ── Rules: vida, Âmago, Armadura e derrota ──
// Parte do Rules (regras básicas). Os métodos são juntados em regras.js; use sempre Rules.nome(...).
import { CONFIG } from '../config.js';
import { Engine } from '../engine.js';
import { Rules } from '../regras.js';

export default {
    // Armadura temporária (escudos): camada consumida antes da armadura normal.
    armaduraExtra(piece) {
        return (piece.effects || []).filter((e) => e.tipo === 'escudo').reduce((n, e) => n + e.restante, 0);
    },
    // ignoraArmadura (Sentença): o dano vai direto para a Vida; a Armadura (e a extra) fica intacta.
    applyDamage(piece, amount, ignoraArmadura = false) {
        const s = piece.stats;
        let dmg = Math.max(0, amount),
            absorbed = 0;
        for (const e of ignoraArmadura ? [] : (piece.effects || []).filter((e) => e.tipo === 'escudo')) {
            const a = Math.min(e.restante, dmg);
            e.restante -= a;
            dmg -= a;
            absorbed += a;
        }
        if (piece.effects) piece.effects = piece.effects.filter((e) => e.tipo !== 'escudo' || e.restante > 0);
        const fromArmor = ignoraArmadura ? 0 : Math.min(s.armadura, dmg);
        s.armadura -= fromArmor;
        absorbed += fromArmor;
        dmg -= fromArmor;
        const lifeLost = Math.min(s.vida, dmg);
        s.vida -= lifeLost;
        return { absorbed, lifeLost };
    },
    heal(piece, amount) {
        piece.stats.vida = Math.min(piece.stats.vidaMax, piece.stats.vida + Math.max(0, amount));
    },
    restoreAmago(piece, amount) {
        piece.stats.amago = Math.min(piece.stats.amagoMax, piece.stats.amago + Math.max(0, amount));
    },
    spendAmago(piece, cost) {
        if (piece.stats.amago < cost) return false;
        piece.stats.amago -= cost;
        return true;
    },
    removeDead(state) {
        const dead = state.pieces.filter((p) => !CONFIG.rules.isAlive(p));
        // Renome que ninguém recebeu (derrota sem autor) cai no tabuleiro.
        for (const p of dead)
            if (p.renome > 0) {
                Rules.soltarRenome(state, p.q, p.r, p.renome);
                Engine.log(state, `${p.renome} Renome de ${Engine.label(p)} cai em (${p.q}, ${p.r})`);
                p.renome = 0;
            }
        state.pieces = state.pieces.filter((p) => CONFIG.rules.isAlive(p));
        return dead;
    },
};
