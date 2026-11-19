// ── Engine: gatilhos e reações ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { CONFIG } from '../config.js';
import { Rules } from '../regras.js';
import { Engine } from '../engine.js';

export default {
    // Habilidades da Estrela com gatilho no evento (tipo opcional: 'passiva' | 'reacao').
    gatilhos(piece, evento, tipo = null) {
        return Engine.abilitiesOf(piece).filter(
            (h) => h.gatilho && h.gatilho.evento === evento && (!tipo || h.tipo === tipo),
        );
    },
    // A Estrela ignora efeitos desse tipo? (característica 'imune' de uma habilidade dela, ex.: Égide da Coroa)
    imune(piece, tipo) {
        return !!piece && Engine.abilitiesOf(piece).some((h) => (h.imune || []).includes(tipo));
    },
    // A reação pode ser oferecida agora? (Estrela viva, sem uso na rodada e com Âmago para o custo)
    reacaoDisponivel(piece, a) {
        return (
            !!piece &&
            !!a &&
            Engine.isAlive(piece) &&
            Engine.podeUsarNaRodada(piece, a) &&
            piece.stats.amago >= Engine.custo(piece, a)
        );
    },
    // Gasta um acionamento de um estado (usos null = ilimitado).
    gastarEstado(state, dono, e) {
        if (e.usos != null && --e.usos <= 0) dono.effects = dono.effects.filter((x) => x !== e);
        Engine.log(state, `${e.origem} de ${Engine.label(dono)} é acionado`);
    },
    // Estrelas atingidas por um uso (only: restringe aos ids listados, ex.: alvos acertados no ataque).
    alvosDoUso(state, source, a, choice, only = null) {
        return Engine.affected(state, source, Engine.alvoDe(source, a), choice)
            .filter((id) => !only || only.includes(id))
            .map((id) => Rules.pieceById(state, id))
            .filter(Boolean);
    },
    // Antes de aplicar uma habilidade que causa dano, abre a janela de reações que alteram esse dano:
    //  - 'aliadoCausaDanoComAtaque' (ex.: Selo do Império): aliados do atacante, se o ataque acertou alguém;
    //  - 'aliadoRecebeDano' (ex.: Cortina D'Água): aliados de cada alvo inimigo da fonte.
    // As reações são perguntadas uma a uma (state.efeitoPendente) e só depois os efeitos são aplicados.
    aplicarComReacoes(state, source, a, choice, only = null, bonusDano = 0) {
        const fila = [];
        // Aliados de `alvo` (vivos, no alcance da reação) com reação ao evento.
        const apoios = (alvo, evento) => {
            for (const o of state.pieces)
                if (o.player === alvo.player && o.id !== alvo.id && Engine.isAlive(o))
                    for (const h of Engine.gatilhos(o, evento, 'reacao'))
                        if (Rules.distancia(o, alvo) <= Engine.caracteristicas(o, h).alcance)
                            fila.push({ donoId: o.id, abilityId: h.id, alvoId: alvo.id });
        };
        if (source && Engine.causaDano(a)) {
            const alvos = Engine.alvosDoUso(state, source, a, choice, only).filter((t) => Engine.isAlive(t));
            if (Engine.ehAtaque(a) && alvos.length) apoios(source, 'aliadoCausaDanoComAtaque');
            for (const t of alvos) if (t.player !== source.player) apoios(t, 'aliadoRecebeDano');
            // Passiva consomeRecurso (Penitente): acertou a Jogada de Ataque → pergunta antes dos apoios, um marcador
            // por vez.
            if (Engine.ehAtaque(a) && alvos.length)
                for (const h of Engine.abilitiesOf(source))
                    if (h.tipo === 'passiva' && h.consomeRecurso && Engine.recurso(source, h.consomeRecurso) > 0)
                        fila.unshift({ donoId: source.id, abilityId: h.id, alvoId: source.id });
        }
        if (!fila.length) {
            Engine.applyEffects(state, source, a, choice, only, bonusDano ? { bonusDano } : null);
            return;
        }
        state.efeitoPendente = { pieceId: source.id, abilityId: a.id, choice, only, bonusDano, reducaoDano: {}, fila };
        Engine.proximoApoio(state);
    },
    proximoApoio(state) {
        const ap = state.efeitoPendente;
        if (!ap) return;
        while (ap.fila.length) {
            const { donoId, abilityId, alvoId } = ap.fila.shift();
            const dono = Rules.pieceById(state, donoId);
            const h = Engine.def(abilityId);
            const alvo = Rules.pieceById(state, alvoId);
            if (h && h.consomeRecurso) {
                const n = dono && Engine.isAlive(dono) ? Engine.recurso(dono, h.consomeRecurso) : 0,
                    cfg = CONFIG.recursos[h.consomeRecurso] || {};
                if (n > 0) {
                    state.pending = {
                        tipo: 'reacao',
                        donoId,
                        abilityId,
                        alvoId,
                        apoio: true,
                        fonteId: ap.pieceId,
                        consumo: true,
                        rotulos: ['Consumir', 'Parar'],
                        pergunta: `${h.nome}: consumir 1 ${cfg.icone || ''} ${cfg.singular || h.consomeRecurso} para +1 de dano neste ataque? (tem ${n}${ap.bonusDano ? `; bônus atual +${ap.bonusDano}` : ''})`,
                    };
                    return;
                }
                continue;
            }
            if (Engine.reacaoDisponivel(dono, h) && alvo && Engine.isAlive(alvo)) {
                state.pending = { tipo: 'reacao', donoId, abilityId, alvoId, apoio: true, fonteId: ap.pieceId };
                return;
            }
        }
        state.efeitoPendente = null;
        const piece = Rules.pieceById(state, ap.pieceId);
        const a = Engine.def(ap.abilityId);
        if (piece)
            Engine.applyEffects(state, piece, a, ap.choice, ap.only, {
                bonusDano: ap.bonusDano,
                reducaoDano: ap.reducaoDano,
            });
    },
    // Resposta a state.pending 'reacao' (use = true: paga o custo e aplica). Reações de apoio (Selo, Cortina) só
    // ajustam o efeito pendente; ao fim, segue para o próximo apoio da fila.
    resolveReaction(state, use) {
        const pd = state.pending;
        if (!pd || pd.tipo !== 'reacao') return false;
        const owner = Rules.pieceById(state, pd.donoId);
        const a = Engine.def(pd.abilityId);
        const alvo = Rules.pieceById(state, pd.alvoId);
        const ap = state.efeitoPendente;
        state.pending = null;

        // Consumo de recurso de uma passiva (Penitente): +1 de dano por marcador, perguntando de novo enquanto houver.
        if (pd.consumo) {
            const r = a && a.consomeRecurso,
                cfg = CONFIG.recursos[r] || {};
            if (use && owner && ap && Engine.recurso(owner, r) > 0) {
                owner.recursos[r]--;
                ap.bonusDano += 1;
                Engine.log(
                    state,
                    `${Engine.label(owner)} consome 1 ${cfg.singular || r} (${a.nome}): +1 de dano (${owner.recursos[r]}/${cfg.max})`,
                );
                if (owner.recursos[r] > 0) ap.fila.unshift({ donoId: owner.id, abilityId: a.id, alvoId: pd.alvoId });
            }
            if (state.efeitoPendente && !state.pending) Engine.proximoApoio(state);
            Engine.resolveQueue(state);
            return true;
        }

        const custo = owner ? Engine.custo(owner, a) : 0;
        // Rerolagem (Desse Daí!): no meio da Jogada de Ataque (state.ataque); depois, o ataque continua.
        if (pd.rerolagem) {
            const at = state.ataque;
            if (at) at.recusou.push(`${pd.donoId}:${pd.abilityId}`);
            if (use && owner && at && Rules.spendAmago(owner, custo)) {
                owner.turn.usos[a.id] = (owner.turn.usos[a.id] || 0) + 1;
                Engine.log(
                    state,
                    `${Engine.label(owner)} usa a reação ${a.nome}: ${Engine.label(alvo)} rola ${pd.rerolagem === 'ataque' ? 'o ataque' : 'a esquiva'} de novo!`,
                );
                Engine.fxHab(state, owner, a, pd.alvoId, alvo ? [alvo.id] : []);
                Engine.emit(state, 'ativouHabilidade', { peca: owner, habilidade: a, custo });
                Engine.gastarDescontos(state, owner, a);
                Engine.rerolar(state, pd.rerolagem);
            }
            Engine.continuarAtaque(state);
            Engine.resolveQueue(state);
            return true;
        }
        if (use && owner && Rules.spendAmago(owner, custo)) {
            owner.turn.usos[a.id] = (owner.turn.usos[a.id] || 0) + 1;
            Engine.log(state, `${Engine.label(owner)} usa a reação ${a.nome}!`);
            Engine.fxHab(state, owner, a, pd.alvoId, alvo ? [alvo.id] : []);
            Engine.emit(state, 'ativouHabilidade', { peca: owner, habilidade: a, custo });
            Engine.gastarDescontos(state, owner, a);
            if (a.concede) {
                owner.turn.extra = { tipo: a.concede.tipo, alvoId: pd.alvoId };
                Engine.log(
                    state,
                    `${Engine.label(owner)} ganha um uso extra de ${a.concede.tipo} contra ${Engine.label(alvo)}`,
                );
            } else if (a.efeitoReacao === 'reducaoDano') {
                if (ap) {
                    const r = ap.reducaoDano[pd.alvoId] || (ap.reducaoDano[pd.alvoId] = { valor: 0, nome: a.nome });
                    r.valor += a.reducao || 1;
                    Engine.log(state, `${a.nome}: ${Engine.label(alvo)} sofrerá -${a.reducao || 1} de dano`);
                }
            } else if (a.efeitoReacao === 'bonusDano') {
                if (ap) {
                    ap.bonusDano += a.bonus || 1;
                    Engine.log(state, `${a.nome}: ataque de ${Engine.label(alvo)} recebe +${a.bonus || 1} de dano`);
                }
            } else if (a.efeitoReacao === 'ataque') {
                Engine.realizarAtaque(state, owner, a, pd.alvoId, [pd.alvoId]);
            } else {
                Engine.aplicarComReacoes(state, owner, a, pd.alvoId);
            }
        }
        if (pd.apoio && state.efeitoPendente && !state.pending) Engine.proximoApoio(state);
        Engine.resolveQueue(state);
        return true;
    },
    chooseTarget(state, targetId) {
        const pd = state.pending;
        if (!pd || pd.tipo !== 'escolha' || !pd.opcoes.includes(targetId)) return false;
        const owner = Rules.pieceById(state, pd.donoId);
        const a = Engine.def(pd.abilityId);
        state.pending = null;
        if (owner && targetId === null && pd.opcional) Engine.log(state, `${Engine.label(owner)} não usa ${a.nome}`);
        else if (owner) Engine.aplicarComReacoes(state, owner, a, targetId);
        Engine.resolveQueue(state);
        return true;
    },
};
