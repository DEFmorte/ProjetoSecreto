// ── Engine: Jogadas de Ataque e dados ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { CONFIG } from '../config.js';
import { Rules } from '../regras.js';
import { Engine } from '../engine.js';

export default {
    // Jogada de Ataque (habilidade 'ataque' ou reação que ataca): eventos/modificadores do uso e rolagem contra cada
    // alvo. Manual: abre state.pending 'rolagem' (ver resolveRoll). Automático: o atacante rola uma vez para todos os
    // alvos. O andamento fica em state.ataque (um alvo por vez): depois de cada rolagem, aliados podem pedir uma
    // rerolagem (ex.: Desse Daí!) antes do resultado valer. Bônus de ataque e Esquiva Ignorada são lidos e gastos no
    // início.
    realizarAtaque(state, piece, a, choice, alvos) {
        const ignora = Rules.stat(piece, 'ignora_esquiva') > 0;
        Engine.emit(state, 'usouAtaque', { peca: piece, habilidade: a });
        const modDano = Engine.consumirModDanoAtaque(state, piece);
        const bonusAtk = Engine.bonusAtaque(piece);
        if (ignora) Engine.consumeIgnoraEsquiva(piece);
        Engine.consumeBonusAtaque(piece);
        state.ataque = {
            pieceId: piece.id,
            abilityId: a.id,
            choice,
            alvos: [...alvos],
            i: 0,
            acertos: [],
            ignora,
            modDano,
            bonusAtk,
            atkDice: null,
            r: null,
            fixo: null,
            recusou: [],
        };
        Engine.continuarAtaque(state);
    },
    // Rola (automático) ou pede a rolagem (manual) do alvo atual, oferece rerolagens e fecha o resultado; no fim
    // aplica.
    continuarAtaque(state) {
        const at = state.ataque;
        if (!at) return;
        const piece = Rules.pieceById(state, at.pieceId),
            a = Engine.def(at.abilityId);
        const manual = CONFIG.rules.attackRoll.mode === 'manual';
        while (piece && at.i < at.alvos.length) {
            const id = at.alvos[at.i],
                t = Rules.pieceById(state, id);
            if (!t) {
                at.i++;
                at.r = null;
                at.fixo = null;
                at.recusou = [];
                continue;
            }
            if (!at.r) {
                if (manual) {
                    state.pending = {
                        tipo: 'rolagem',
                        pieceId: at.pieceId,
                        abilityId: at.abilityId,
                        choice: at.choice,
                        alvos: at.alvos,
                        i: at.i,
                        acertos: at.acertos,
                        ignora: at.ignora,
                        modDano: at.modDano,
                        bonusAtk: at.bonusAtk,
                        ...(at.fixo ? { fixo: at.fixo } : {}),
                    };
                    return;
                }
                at.r = Engine.rollAttack(piece, t, at.atkDice, null, at);
                if (!at.atkDice) at.atkDice = at.r.atkDice; // o atacante rola uma vez para todos os alvos
                Engine.log(
                    state,
                    `Ataque em ${Engine.label(t)}: ${Engine.describeRoll(at.r)} → ${at.r.hit ? 'ACERTO' : 'ESQUIVA'}`,
                );
            }
            const rr = Engine.rerolagemDisponivel(state, at, piece, t);
            if (rr) {
                state.pending = rr;
                return;
            }
            Engine.fx(state, { k: 'rol', de: piece.id, para: id, ok: at.r.hit ? 1 : 0 });
            if (at.r.hit) {
                at.acertos.push(id);
                Engine.queueHitTriggers(state, piece, id);
            } else Engine.queueMissTriggers(state, piece, id);
            at.i++;
            at.r = null;
            at.fixo = null;
            at.recusou = [];
        }
        state.ataque = null;
        if (piece) Engine.aplicarComReacoes(state, piece, a, at.choice, at.acertos, at.modDano || 0);
    },
    // Reação de rerolagem de um aliado de quem ficou com o resultado ruim (errou o ataque ou foi atingido).
    rerolagemDisponivel(state, at, atacante, defensor) {
        const r = at.r;
        if (!r || !atacante || !defensor || atacante.player === defensor.player) return null;
        const quem = r.hit ? defensor : atacante,
            lado = r.hit ? 'defesa' : 'ataque';
        for (const o of state.pieces) {
            if (o.player !== quem.player || o.id === quem.id || !Engine.isAlive(o)) continue;
            for (const h of Engine.gatilhos(o, 'rolagemAliado', 'reacao')) {
                if (at.recusou.includes(`${o.id}:${h.id}`) || !Engine.reacaoDisponivel(o, h)) continue;
                if (Rules.distancia(o, quem) > Engine.caracteristicas(o, h).alcance) continue;
                const res = r.atk != null ? ` (${r.atk} contra ${r.def})` : '';
                const pergunta =
                    lado === 'ataque'
                        ? `${h.nome}: ${o.stats.nome} pode fazer ${quem.stats.nome} rolar o ataque de novo — errou ${defensor.stats.nome}${res}. Custo: ${Engine.custo(o, h)} Âmago`
                        : `${h.nome}: ${o.stats.nome} pode fazer ${quem.stats.nome} rolar a esquiva de novo — foi atingida por ${atacante.stats.nome}${res}. Custo: ${Engine.custo(o, h)} Âmago`;
                return { tipo: 'reacao', donoId: o.id, abilityId: h.id, alvoId: quem.id, rerolagem: lado, pergunta };
            }
        }
        return null;
    },
    // Rerolagem de um lado da rolagem atual (o outro lado mantém os dados). Manual: a rolagem é pedida de novo.
    rerolar(state, lado) {
        const at = state.ataque;
        if (!at) return;
        const piece = Rules.pieceById(state, at.pieceId),
            t = Rules.pieceById(state, at.alvos[at.i]);
        if (CONFIG.rules.attackRoll.mode === 'manual' || !at.r || !at.r.atkDice || !piece || !t) {
            at.fixo = at.r && at.r.atkDice ? (lado === 'ataque' ? { def: at.r.def } : { atk: at.r.atk }) : null;
            at.r = null;
            return;
        }
        at.r = Engine.rollAttack(
            piece,
            t,
            lado === 'ataque' ? null : at.r.atkDice,
            lado === 'defesa' ? null : at.r.defDice,
            at,
        );
        Engine.log(
            state,
            `Nova rolagem ${lado === 'ataque' ? 'de ataque' : 'de esquiva'} em ${Engine.label(t)}: ${Engine.describeRoll(at.r)} → ${at.r.hit ? 'ACERTO' : 'ESQUIVA'}`,
        );
    },
    // Reações de quem foi alvo de uma Jogada de Ataque que errou (ex.: Retribuição): inimigo adjacente.
    queueMissTriggers(state, piece, targetId) {
        const alvo = Rules.pieceById(state, targetId);
        if (!alvo || !piece || alvo.player === piece.player || !Engine.isAlive(alvo)) return;
        for (const h of Engine.gatilhos(alvo, 'errouAtaqueContra', 'reacao'))
            if (
                Rules.hexDistance(alvo, piece) <= Engine.caracteristicas(alvo, h).alcance &&
                Engine.reacaoDisponivel(alvo, h)
            )
                state.triggers.push({ donoId: alvo.id, abilityId: h.id, origemId: piece.id });
    },
    queueHitTriggers(state, piece, targetId) {
        const alvo = Rules.pieceById(state, targetId);
        if (!alvo) return;
        for (const h of Engine.gatilhos(piece, 'acertouAtaque')) {
            if (Engine.matchesWho(piece, alvo, h.gatilho.quem || 'todos'))
                state.triggers.push({ donoId: piece.id, abilityId: h.id, origemId: targetId });
        }
    },
    consumeBonusAtaque(piece) {
        if (piece.effects.some((e) => e.stat === 'bonus_ataque'))
            piece.effects = piece.effects.filter((e) => e.stat !== 'bonus_ataque');
    },
    consumeIgnoraEsquiva(piece) {
        piece.effects = piece.effects.filter((e) => e.stat !== 'ignora_esquiva');
    },
    rollDice({ count, sides }) {
        return Array.from({ length: count }, () => 1 + Math.floor(Engine.rng() * sides));
    },
    // atkDice opcional: reutiliza a rolagem do atacante (ataques com vários alvos); cada defensor rola a própria
    // esquiva. Bônus do defensor na rolagem (Esquiva), a menos que o atacante a ignore.
    bonusDefesa(attacker, defender, ignora = null) {
        const stat = CONFIG.rules.attackRoll.defenderAddsStat;
        const ignoraEsquiva = ignora ?? (!!attacker && Rules.stat(attacker, 'ignora_esquiva') > 0);
        return { ignoraEsquiva, bonus: stat && !ignoraEsquiva ? Rules.stat(defender, stat) : 0 };
    },
    // defDice opcional: reutiliza a esquiva já rolada (rerolagem só do ataque). opts { ignora, bonusAtk }: valores
    // lidos no início do ataque (state.ataque); sem opts, lidos da Estrela agora.
    rollAttack(attacker, defender, atkDice = null, defDice = null, opts = null) {
        const cfg = CONFIG.rules.attackRoll;
        const sum = (arr) => arr.reduce((a, b) => a + b, 0);
        atkDice = atkDice || Engine.rollDice(cfg.attackerDice);
        defDice = defDice || Engine.rollDice(cfg.defenderDice);
        const { ignoraEsquiva, bonus } = Engine.bonusDefesa(attacker, defender, opts ? opts.ignora : null);
        // ex.: Revigorar pago com Penas, Consagração
        const bonusAtk = opts && opts.bonusAtk != null ? opts.bonusAtk : Engine.bonusAtaque(attacker);
        const atk = sum(atkDice) + bonusAtk,
            def = sum(defDice) + bonus;
        return { atkDice, defDice, bonus, bonusAtk, atk, def, hit: cfg.hit(atk, def), ignoraEsquiva };
    },
    describeRoll(r) {
        const cfg = CONFIG.rules.attackRoll;
        const ignoraText = r.ignoraEsquiva ? ' (Esquiva Ignorada)' : '';
        const stat =
            cfg.defenderAddsStat && r.bonus > 0
                ? ` + ${cfg.defenderAddsStat.slice(0, 3).toUpperCase()} ${r.bonus}`
                : ignoraText;
        return (
            `${cfg.attackerDice.count}D${cfg.attackerDice.sides} [${r.atkDice.join('+')}]${r.bonusAtk ? ` + ${r.bonusAtk}` : ''} = ${r.atk} contra ` +
            `${cfg.defenderDice.count}D${cfg.defenderDice.sides} [${r.defDice.join('+')}]${stat} = ${r.def}`
        );
    },
    resolveRoll(state, hit) {
        const pd = state.pending;
        if (!pd || pd.tipo !== 'rolagem') return false;
        state.pending = null;
        const at =
            state.ataque ||
            (state.ataque = {
                pieceId: pd.pieceId,
                abilityId: pd.abilityId,
                choice: pd.choice,
                alvos: pd.alvos,
                i: pd.i,
                acertos: pd.acertos || [],
                ignora: pd.ignora,
                modDano: pd.modDano || 0,
                bonusAtk: pd.bonusAtk || 0,
                atkDice: null,
                r: null,
                fixo: null,
                recusou: [],
            }); // partida salva antes das rerolagens
        const t = Rules.pieceById(state, at.alvos[at.i]);
        Engine.log(state, `Ataque em ${Engine.label(t)} (rolagem manual): ${hit ? 'ACERTO' : 'ESQUIVA'}`);
        at.r = { hit: !!hit, manual: true };
        at.fixo = null;
        Engine.continuarAtaque(state);
        Engine.resolveQueue(state);
        return true;
    },
    // Jogadas de Ataque (habilidades 'ataque' e reações que atacam).
    ehAtaque(a) {
        return !!a && (a.tipo === 'ataque' || a.efeitoReacao === 'ataque' || !!a.jogadaDeAtaque);
    },
    // Passivas com imutavel: status (chave | categoria | lista) que não podem ser alterados (ex.: Véu do Luar).
    imutavel(piece, k) {
        return (
            Engine.abilitiesOf(piece).find(
                (a) => a.tipo === 'passiva' && a.imutavel && Rules.expandStats(a.imutavel).includes(k),
            ) || null
        );
    },
    causaDano(a) {
        return (a.efeitos || []).some(
            (ef) => ef.tipo === 'dano' || (ef.aoColidir || []).some((x) => x.tipo === 'dano'),
        );
    },
    // Modificadores de dano da próxima Jogada de Ataque (ex.: Recompensa da Lua): somados e gastos ao usar o ataque.
    consumirModDanoAtaque(state, piece) {
        const mods = piece.effects.filter((e) => e.tipo === 'estado' && e.danoAtaque);
        if (!mods.length) return 0;
        piece.effects = piece.effects.filter((e) => !mods.includes(e));
        const total = mods.reduce((t, e) => t + e.danoAtaque, 0);
        Engine.log(
            state,
            `${mods.map((e) => e.origem).join(', ')}: dano deste ataque de ${Engine.label(piece)} ${total > 0 ? '+' : ''}${total}`,
        );
        return total;
    },
};
