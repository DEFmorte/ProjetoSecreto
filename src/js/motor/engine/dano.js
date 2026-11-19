// ── Engine: dano, marcas e abates ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { CONFIG } from '../config.js';
import { Rules } from '../regras.js';
import { Engine } from '../engine.js';

export default {
    expiry(state, source, duracao) {
        // 'ser-gasto': sem expiração, só sai quando consumido
        if (!source || (duracao && (duracao.ate === 'ser-gasto' || duracao.ate === 'permanente'))) return {};
        if (duracao && duracao.turnos) return { turnosRestantes: duracao.turnos, contaJogador: source.player };
        const ate = (duracao && duracao.ate) || 'fim-proximo-turno';
        if (ate === 'fim-turno') {
            // fim do turno em andamento (de quem estiver jogando)
            const b = state.blocks && state.blocks[state.blockIndex];
            return { expiraEvento: 'turnEnd', expiraJogador: b ? b.player : source.player, expiraRodada: state.round };
        }
        return {
            expiraEvento: ate === 'fim-proximo-turno' ? 'turnEnd' : 'turnStart',
            expiraJogador: source.player,
            expiraRodada: Rules.nextTurnRound(state, source.player),
        };
    },
    applyMark(state, source, target, markId) {
        const m = CONFIG.marks[markId];
        if (!m || !target || !Engine.isAlive(target)) return;
        target.effects.push({
            tipo: 'marca',
            marca: markId,
            origem: m.nome,
            debuff: m.debuff !== false,
            fonteId: source ? source.id : null,
            ...Engine.expiry(state, source, m.duracao),
        });
        Engine.log(state, `${Engine.label(target)} recebe ${m.nome} (×${Rules.marks(target, markId)})`);
    },
    removeDebuffs(state, piece, causa) {
        const before = piece.effects.length;
        piece.effects = piece.effects.filter((e) => !Engine.isDebuff(e));
        const n = before - piece.effects.length;
        if (n) Engine.log(state, `${Engine.label(piece)}: ${n} debuff(s) removido(s)${causa ? ` (${causa})` : ''}`);
        return n;
    },
    // info.base: status em que o dano se baseia (ex.: ['magico']); info.compartilhado: parte transferida (não volta a
    // ser dividida).
    dealDamage(state, source, target, amount, causa, ability = null, info = {}) {
        if (amount <= 0 || !Engine.isAlive(target)) return;
        // Divisão de dano (ex.: Projeção AA): um aliado adjacente com o estado assume parte do dano.
        const prot = !info.compartilhado && Engine.protetorDe(state, target);
        if (prot) {
            const parte = Math.floor(amount * prot.estado.compartilhaDano);
            if (parte > 0) {
                Engine.log(
                    state,
                    `${prot.estado.origem}: ${Engine.label(prot.peca)} assume ${parte} de ${amount} do dano em ${Engine.label(target)}`,
                );
                Engine.receberDano(state, source, target, amount - parte, causa, ability, info);
                Engine.receberDano(state, source, prot.peca, parte, `${causa} → ${prot.estado.origem}`, ability, {
                    ...info,
                    compartilhado: true,
                });
                return;
            }
        }
        Engine.receberDano(state, source, target, amount, causa, ability, info);
    },
    // Aliado vivo, adjacente ao alvo, com estado que divide o dano (compartilhaDano = fração assumida).
    protetorDe(state, target) {
        for (const p of state.pieces) {
            if (p === target || p.player !== target.player || !Engine.isAlive(p) || Rules.hexDistance(p, target) !== 1)
                continue;
            const estado = (p.effects || []).find((e) => e.tipo === 'estado' && e.compartilhaDano);
            if (estado) return { peca: p, estado };
        }
        return null;
    },
    receberDano(state, source, target, amount, causa, ability = null, info = {}) {
        if (amount <= 0 || !Engine.isAlive(target)) return;
        // Passivas que reduzem o dano recebido (reduzDano: { valor, minimo, base }); seus efeitos rodam na própria
        // Estrela.
        const reatores = [];
        for (const a of Engine.abilitiesOf(target)) {
            const rd = a.tipo === 'passiva' && a.reduzDano;
            if (!rd || (rd.base && !(info.base || []).includes(rd.base))) continue;
            const novo = Math.max(Math.min(amount, rd.minimo ?? 0), amount - rd.valor);
            if (novo < amount) causa += `, -${amount - novo} ${a.nome}`;
            amount = novo;
            reatores.push(a);
        }
        // Estado limiteDano (Chegada): com a fonte viva e adjacente, no máximo N de dano por instância.
        const lim = (target.effects || []).find(
            (e) =>
                e.tipo === 'estado' &&
                e.limiteDano != null &&
                amount > e.limiteDano &&
                ((f) => f && Engine.isAlive(f) && Rules.hexDistance(f, target) === 1)(
                    Rules.pieceById(state, e.fonteId),
                ),
        );
        if (lim) {
            causa += `, máx. ${lim.limiteDano} ${lim.origem}`;
            amount = lim.limiteDano;
        }
        const r = Rules.applyDamage(target, amount, !!info.ignoraArmadura);
        Engine.fx(state, {
            k: 'dano',
            de: source ? source.id : null,
            para: target.id,
            v: amount,
            abs: r.absorbed,
            vida: r.lifeLost,
            h: (ability && ability.id) || null,
        });
        const partes = [r.absorbed ? `armadura -${r.absorbed}` : '', r.lifeLost ? `vida -${r.lifeLost}` : '']
            .filter(Boolean)
            .join(', ');
        Engine.log(state, `${Engine.label(target)} sofre ${amount} de dano (${causa})${partes ? ': ' + partes : ''}`);
        if (Engine.isAlive(target)) for (const a of reatores) Engine.runEffects(state, target, a, [target], null);
        if (source) {
            Engine.emit(state, 'causouDano', {
                fonte: source,
                alvo: target,
                habilidade: ability,
                valor: amount,
                absorvido: r.absorbed,
            });
            Rules.registrarDano(state, source, target);
        }
        if (!Engine.isAlive(target)) {
            Engine.log(state, `${Engine.label(target)} foi derrotado`);
            Engine.registrarAbate(state, source, target, ability);
            return;
        }
        if (r.lifeLost === 0 && !CONFIG.rules.passivesTriggerOnAbsorbedDamage) return;
        for (const e of [...target.effects]) {
            if (e.tipo !== 'estado' || e.gatilho !== 'sofreuDano') continue;
            state.triggers.push({
                donoId: target.id,
                abilityId: e.aciona,
                origemId: source ? source.id : null,
                valor: amount,
            });
            Engine.gastarEstado(state, target, e);
        }
        for (const a of Engine.gatilhos(target, 'sofreuDano', 'passiva')) {
            // condicao(ctx, dono, state), ctx = { fonte, alvo, habilidade, valor } (ex.: Dar no Pé: só dano de Jogada
            // de Ataque)
            if (
                a.gatilho.condicao &&
                !a.gatilho.condicao({ fonte: source, alvo: target, habilidade: ability, valor: amount }, target, state)
            )
                continue;
            state.triggers.push({
                donoId: target.id,
                abilityId: a.id,
                origemId: source ? source.id : null,
                valor: amount,
            });
        }
    },
    // Quem derrota uma inimiga recebe Renome pelo abate + o Renome do derrotado. Evento 'derrotou' { fonte, alvo,
    // habilidade, renome }.
    registrarAbate(state, source, target, ability = null) {
        // Sem autor ou abate de aliada: ninguém ganha Renome (removeDead solta o Renome do derrotado no tabuleiro).
        if (!source || source === target || source.player === target.player) return;
        const ganho = (CONFIG.renome.porAbate || 0) + (target.renome || 0);
        target.renome = 0;
        source.renome = (source.renome || 0) + ganho;
        if (ganho)
            Engine.log(state, `${Engine.label(source)} recebe ${ganho} Renome pelo abate (total ${source.renome})`);
        Rules.checarMetaRenome(state, source.player);
        Engine.emit(state, 'derrotou', { fonte: source, alvo: target, habilidade: ability, renome: ganho });
    },
    temMarcaDe(target, markId, source) {
        return (target.effects || []).some((e) => e.tipo === 'marca' && e.marca === markId && e.fonteId === source.id);
    },
};
