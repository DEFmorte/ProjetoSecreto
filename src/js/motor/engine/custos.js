// ── Engine: custos, recursos e pagamento ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { CONFIG } from '../config.js';
import { Rules } from '../regras.js';
import { Engine } from '../engine.js';

export default {
    // ── Custos especiais ──
    // 'amago': custo normal (+ custoAdicional, se houver); 'alternativo': só o custoAlternativo, sem Âmago.
    recurso(piece, r) {
        return (piece.recursos && piece.recursos[r]) || 0;
    },
    podePagar(piece, a, modo, car = null) {
        if (modo === 'alternativo') {
            const alt = a.custoAlternativo;
            return !!alt && Engine.recurso(piece, alt.recurso) >= alt.valor;
        }
        const ad = a.custoAdicional;
        return (
            piece.stats.amago >= (car || Engine.caracteristicas(piece, a)).custo &&
            (!ad || Engine.recurso(piece, ad.recurso) >= ad.valor)
        );
    },
    modosPagamento(piece, a, car = null) {
        return ['amago', 'alternativo'].filter((m) => Engine.podePagar(piece, a, m, car));
    },
    pagouAlternativo(piece, abilityId) {
        const id = typeof abilityId === 'string' ? abilityId : abilityId && abilityId.id;
        return !!(piece && piece.turn && piece.turn.pagamento && piece.turn.pagamento[id] === 'alternativo');
    },
    textoRecurso(r, n) {
        const c = CONFIG.recursos[r] || { icone: '', nome: r, singular: r };
        return `${n} ${c.icone} ${n === 1 ? c.singular : c.nome}`;
    },
    modosDe(piece, alvo, state = null) {
        const m = alvo && alvo.modos;
        return typeof m === 'function' ? m(piece, state) : m || null;
    },
    // Bônus nas rolagens de ataque: o da próxima rolagem (gasto) + o que dura (ex.: Consagração).
    bonusAtaque(piece) {
        return piece ? Rules.stat(piece, 'bonus_ataque') + Rules.stat(piece, 'bonus_rolagem') : 0;
    },
    // Descontos que saem na primeira habilidade ativada (gastaAoUsar, ex.: Folga).
    gastarDescontos(state, piece, a) {
        const gastos = ((piece && piece.effects) || []).filter(
            (e) => e.gastaAoUsar && e.caracteristica && Engine.filtroHabilidade(e.filtro, a),
        );
        if (!gastos.length) return;
        piece.effects = piece.effects.filter((e) => !gastos.includes(e));
        Engine.log(state, `${Engine.label(piece)}: ${gastos.map((e) => e.origem).join(', ')} gasta em ${a.nome}`);
    },
    // A habilidade em uso passa a contar como Ultra Rápida (ex.: Descarga): devolve a ação se foi a primeira do turno.
    tornarUltra(state, f, hab, motivo) {
        const t = f && f.turn,
            u = t && t.ultimoUso;
        if (!u || !hab || u.abilityId !== hab.id || (t.ultraUsos && t.ultraUsos[hab.id])) return false;
        t.ultraUsos = { ...(t.ultraUsos || {}), [hab.id]: true };
        if (u.livreSeUltra && t.actionUsed) {
            t.actionUsed = false;
            Engine.log(state, `${motivo}: ${hab.nome} conta como Ultra Rápida (ação não consumida)`);
        } else Engine.log(state, `${motivo}: ${hab.nome} conta como Ultra Rápida`);
        return true;
    },
    // Ultra Rápida: não gasta a ação, mas só antes de qualquer outra habilidade no turno.
    isFree(piece, a, car = null) {
        return !!((car || Engine.caracteristicas(piece, a)).ultraRapida && !Engine.usouOutraHabilidade(piece));
    },
    usouOutraHabilidade(piece) {
        const t = piece.turn;
        if (!t) return true;
        if (t.actionUsed) return true;
        return Object.entries(t.usos || {}).some(([id, n]) => {
            const h = Engine.def(id);
            return (
                n > 0 &&
                h &&
                !Engine.caracteristicas(piece, h).ultraRapida &&
                !(t.ultraUsos && t.ultraUsos[id]) &&
                h.tipo !== 'passiva' &&
                h.tipo !== 'reacao'
            );
        });
    },
    // A Estrela ainda tem algum efeito criado por esta habilidade?
    efeitoAtivo(piece, abilityId) {
        return (piece.effects || []).some((e) => e.habilidade === abilityId);
    },
    isDebuff(e) {
        return e.debuff ?? e.delta < 0;
    },
};
