// ── Engine: eventos, passivas e fila de turno ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { Rules } from '../regras.js';
import { Engine } from '../engine.js';

export default {
    // Passivas imediatas: gatilho { evento, condicao(ctx, dono, state), alvo: 'dono' (padrão) | 'alvo' }.
    // Eventos: 'causouDano' { fonte, alvo, habilidade, valor }, 'moveu' { peca, caminho, trilha, trilhaAntes, forcado
    // },
    //          'colisao' { peca, fonte, habilidade, com: { tipo: 'terreno' | 'estrela', peca } }.
    emit(state, evento, ctx) {
        if (evento === 'causouDano') Engine.ultraContraMarca(state, ctx);
        for (const dono of [...state.pieces]) {
            if (!Engine.isAlive(dono)) continue;
            const alvosDe = (g) => (g.alvo === 'alvo' ? [ctx.alvo || ctx.peca].filter(Boolean) : [dono]);
            for (const p of Engine.gatilhos(dono, evento, 'passiva')) {
                const g = p.gatilho;
                if (g.condicao && !g.condicao(ctx, dono, state)) continue;
                // Passiva com alvo a escolher (ex.: Chegada): entra na fila e é resolvida como as de turno.
                if (p.alvo && p.alvo.tipo && p.alvo.tipo !== 'proprio') {
                    state.triggers = state.triggers || [];
                    state.triggers.push({ donoId: dono.id, abilityId: p.id, origemId: dono.id });
                    continue;
                }
                Engine.runEffects(state, dono, p, alvosDe(g), null);
            }
            // Reações do próprio dono a eventos emitidos aqui: entram na fila (perguntadas em resolveQueue).
            // As reações a ataques/arredores/apoio usam eventos próprios, enfileirados em outros pontos.
            for (const r of Engine.gatilhos(dono, evento, 'reacao')) {
                const g = r.gatilho;
                if (g.condicao && !g.condicao(ctx, dono, state)) continue;
                state.triggers = state.triggers || [];
                if (
                    !Engine.reacaoDisponivel(dono, r) ||
                    state.triggers.some((t) => t.donoId === dono.id && t.abilityId === r.id)
                )
                    continue;
                state.triggers.push({ donoId: dono.id, abilityId: r.id, origemId: dono.id });
            }
            // Estados com aoEvento (ex.: Pulso Restaurador, Luz de Benevolência): o dono do estado aciona `aciona`.
            for (const e of [...dono.effects]) {
                if (e.tipo !== 'estado' || e.aoEvento !== evento || !dono.effects.includes(e)) continue;
                const h = Engine.def(e.aciona);
                const g = (h && h.gatilho) || {};
                if (!h || (g.condicao && !g.condicao(ctx, dono, state, e))) continue;
                const alvos = alvosDe(g);
                Engine.gastarEstado(state, dono, e);
                const fonte = e.fonteId != null ? Rules.pieceById(state, e.fonteId) : null;
                Engine.runEffects(state, dono, h, alvos, null, {
                    estado: e,
                    fonteEstado: fonte && Engine.isAlive(fonte) ? fonte : null,
                });
            }
        }
    },
    // Passiva com ultraContraMarca (Graciosa): a primeira habilidade da Estrela que causar dano a uma Estrela com a
    // marca dela conta como Ultra Rápida — se foi usada com a ação e antes de qualquer outra habilidade do turno, a
    // ação é devolvida.
    ultraContraMarca(state, ctx) {
        const f = ctx.fonte,
            t = f && f.turn,
            u = t && t.ultimoUso;
        if (!u || !ctx.habilidade || u.abilityId !== ctx.habilidade.id || t.graciosaUsada || !ctx.alvo) return;
        const h = Engine.abilitiesOf(f).find(
            (a) => a.ultraContraMarca && Engine.temMarcaDe(ctx.alvo, a.ultraContraMarca, f),
        );
        if (!h) return;
        t.graciosaUsada = true;
        t.ultraUsos = { ...(t.ultraUsos || {}), [u.abilityId]: true };
        if (u.livreSeUltra && t.actionUsed) {
            t.actionUsed = false;
            Engine.log(state, `${h.nome}: ${ctx.habilidade.nome} conta como Ultra Rápida (ação não consumida)`);
        } else {
            Engine.log(state, `${h.nome}: ${ctx.habilidade.nome} conta como Ultra Rápida`);
        }
    },
    // Enfileira as passivas do evento ('inicioTurno', ex.: Graciosa; 'fimTurno', ex.: Correção) das Estrelas do jogador
    // com alvo válido. titulo: abre um acontecimento no log antes da 1ª. Retorna quantas foram enfileiradas.
    gatilhosTurno(state, player, evento, titulo = null) {
        let n = 0;
        state.triggers = state.triggers || [];
        for (const p of state.pieces) {
            if (p.player !== player || !Engine.isAlive(p)) continue;
            for (const a of Engine.gatilhos(p, evento, 'passiva')) {
                if (a.gatilho.condicao && !a.gatilho.condicao({ player }, p, state)) continue;
                if (!Engine.choices(state, p, Engine.alvoDe(p, a)).length) continue;
                if (!n && titulo && state.log) {
                    Engine.novoGrupoLog(state);
                    Engine.log(state, titulo);
                }
                state.triggers.push({ donoId: p.id, abilityId: a.id, origemId: p.id });
                n++;
            }
        }
        return n;
    },
    resolveQueue(state) {
        let guard = 0;
        while (!state.pending && state.triggers.length && guard++ < 50) {
            const t = state.triggers.shift();
            const owner = Rules.pieceById(state, t.donoId);
            const a = Engine.def(t.abilityId);
            if (!owner || !Engine.isAlive(owner)) continue;

            if (a.tipo === 'reacao') {
                // a situação mudou antes da pergunta
                if (a.gatilho && a.gatilho.ainda && !a.gatilho.ainda(owner, state, t)) continue;
                const alvoVivo = Rules.pieceById(state, t.origemId);
                if (alvoVivo && Engine.isAlive(alvoVivo) && Engine.reacaoDisponivel(owner, a)) {
                    state.pending = { tipo: 'reacao', donoId: owner.id, abilityId: a.id, alvoId: t.origemId };
                    return;
                }
                continue;
            }

            const alvoA = Engine.alvoDe(owner, a);
            const opcoes = Engine.choices(state, owner, alvoA).filter((id) => !(t.excluir || []).includes(id));
            if (opcoes.length === 0) {
                Engine.log(state, `${a.nome}: nenhum alvo disponível`);
            } else if (alvoA.opcional) {
                // o dono decide (null = não usar), mesmo com uma opção só
                Engine.log(
                    state,
                    `${a.nome} de ${Engine.label(owner)}: ${alvoA.livre ? 'pode se mover' : 'pode ser usada'}`,
                );
                state.pending = {
                    tipo: 'escolha',
                    donoId: owner.id,
                    abilityId: a.id,
                    opcoes: [null, ...opcoes],
                    opcional: true,
                };
            } else if (opcoes.length === 1) {
                Engine.log(state, `${a.nome} de ${Engine.label(owner)} ativa`);
                Engine.aplicarComReacoes(state, owner, a, opcoes[0]);
            } else {
                Engine.log(state, `${a.nome} de ${Engine.label(owner)} ativa: escolha o alvo`);
                state.pending = { tipo: 'escolha', donoId: owner.id, abilityId: a.id, opcoes };
            }
        }
        if (guard >= 50) {
            state.triggers = [];
            Engine.log(state, 'Limite de gatilhos encadeados atingido');
        }
    },
};
