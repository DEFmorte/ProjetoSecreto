// ── Engine: movimento e bloqueio ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { Rules } from '../regras.js';
import { Engine } from '../engine.js';

export default {
    // O que impede uma Estrela de entrar na zona (null = livre).
    bloqueio(state, hex) {
        if (!Rules.isHexOnBoard(hex.q, hex.r)) return { tipo: 'terreno' };
        const p = Rules.pieceAt(state, hex.q, hex.r);
        return p ? { tipo: 'estrela', peca: p } : null;
    },
    // Move uma Estrela e registra a trilha do turno (usada por gatilhos de movimento, ex.: Impulso Bestial).
    // semGatilhos (Dar no Pé): anda normalmente na tela, mas não conta como movimento voluntário (nem para a trilha).
    moveTo(state, piece, hex, { caminho, forcado = false, semGatilhos = false } = {}) {
        const path = caminho || [
            { q: piece.q, r: piece.r },
            { q: hex.q, r: hex.r },
        ];
        piece.q = hex.q;
        piece.r = hex.r;
        Engine.fx(state, { k: 'mov', id: piece.id, cam: path.map((h) => [h.q, h.r]), f: forcado ? 1 : 0 });
        const t = piece.turn;
        let trilha = [],
            trilhaAntes = [];
        if (t && !forcado && !semGatilhos) {
            t.moveuVoluntario = true;
            Engine.checkLeaveTriggers(state, piece, path);
            Engine.checkEnterTriggers(state, piece, path);
            const last = t.trilha && t.trilha[t.trilha.length - 1];
            trilhaAntes = last && last.q === path[0].q && last.r === path[0].r ? t.trilha : [path[0]];
            trilha = [...trilhaAntes, ...path.slice(1)];
            t.trilha = trilha;
        } else if (t) {
            t.trilha = null;
        }
        Engine.emit(state, 'moveu', {
            peca: piece,
            caminho: path,
            trilha,
            trilhaAntes,
            forcado: forcado || semGatilhos,
        });
    },
    // Movimento voluntário pelo caminho (zonas adjacentes, livres, dentro do movimento restante).
    mover(state, piece, path) {
        if (!piece || !Rules.canSelect(state, piece) || !path || path.length < 2) return false;
        if (path[0].q !== piece.q || path[0].r !== piece.r) return false;
        if (path.length - 1 > Rules.movementLeft(piece)) return false;
        for (let i = 1; i < path.length; i++) {
            if (Rules.hexDistance(path[i - 1], path[i]) !== 1 || Engine.bloqueio(state, path[i])) return false;
        }
        // Reação 'inimigoEntrouNosArredores' disponível (ex.: Compelir): o movimento para na zona em que entrou nos
        // arredores.
        const corte = Engine.paradaPorReacao(state, piece, path);
        if (corte < path.length - 1) path = path.slice(0, corte + 1);
        const cost = path.length - 1;
        Rules.beginActivation(state, piece);
        Engine.novoGrupoLog(state);
        piece.turn.moveSpent += cost;
        const fim = path[path.length - 1];
        Engine.log(state, `${Engine.label(piece)} se move ${cost} zona(s) até (${fim.q}, ${fim.r})`);
        Engine.moveTo(state, piece, fim, { caminho: path.map((h) => ({ q: h.q, r: h.r })) });
        Engine.resolveQueue(state);
        return true;
    },
    // Estrelas inimigas de `piece` ainda em jogo.
    inimigosVivos(state, piece) {
        return state.pieces.filter((o) => o.player !== piece.player && Engine.isAlive(o));
    },
    // Reações do tipo 'inimigoSaiuDosArredores' (ex.: Machadada): o movimento voluntário sai da adjacência do dono.
    checkLeaveTriggers(state, piece, path) {
        for (const dono of Engine.inimigosVivos(state, piece)) {
            const saiu = path.some(
                (h, i) => i > 0 && Rules.hexDistance(path[i - 1], dono) === 1 && Rules.hexDistance(h, dono) > 1,
            );
            if (!saiu) continue;
            for (const a of Engine.gatilhos(dono, 'inimigoSaiuDosArredores'))
                state.triggers.push({ donoId: dono.id, abilityId: a.id, origemId: piece.id });
        }
    },
    // Inimigos que `piece` passa a ter adjacentes ao percorrer o caminho (entrou nos arredores deles).
    entrouNosArredores(path, dono, ate = path.length - 1) {
        for (let i = 1; i <= ate; i++)
            if (Rules.hexDistance(path[i - 1], dono) > 1 && Rules.hexDistance(path[i], dono) === 1) return i;
        return -1;
    },
    // Índice da 1ª zona do caminho em que o movimento é interrompido por uma reação disponível de entrada nos
    // arredores.
    paradaPorReacao(state, piece, path) {
        let corte = path.length - 1;
        for (const dono of Engine.inimigosVivos(state, piece)) {
            if (
                !Engine.gatilhos(dono, 'inimigoEntrouNosArredores', 'reacao').some((a) =>
                    Engine.reacaoDisponivel(dono, a),
                )
            )
                continue;
            const i = Engine.entrouNosArredores(path, dono, corte);
            if (i > 0) corte = i;
        }
        return corte;
    },
    // Reações do tipo 'inimigoEntrouNosArredores' (ex.: Compelir): o movimento voluntário entra na adjacência do dono.
    checkEnterTriggers(state, piece, path) {
        for (const dono of Engine.inimigosVivos(state, piece)) {
            if (Engine.entrouNosArredores(path, dono) < 0) continue;
            for (const a of Engine.gatilhos(dono, 'inimigoEntrouNosArredores'))
                state.triggers.push({ donoId: dono.id, abilityId: a.id, origemId: piece.id });
        }
    },
    forcedMove(state, source, target, ef, ability, ctx = {}) {
        if (Engine.imune(target, 'movimentoInvoluntario')) {
            const h = Engine.abilitiesOf(target).find((x) => (x.imune || []).includes('movimentoInvoluntario'));
            Engine.log(state, `${Engine.label(target)} é imune a movimentação involuntária (${h.nome})`);
            return;
        }
        const di = Rules.directionTo(source, target);
        if (di < 0) return;
        const d = Rules.DIRS[di];
        const n = ef.distancia ?? 1;
        const inicio = { q: target.q, r: target.r };
        let colisao = null;
        if (ef.direcao === 'atravessar') {
            const dest = { q: source.q - d.q * n, r: source.r - d.r * n };
            colisao = Engine.bloqueio(state, dest);
            if (!colisao) Engine.moveTo(state, target, dest, { forcado: true });
        } else {
            const sinal = ef.direcao === 'aproximar' ? -1 : 1;
            const caminho = [inicio];
            for (let i = 0; i < n; i++) {
                const next = { q: target.q + d.q * sinal, r: target.r + d.r * sinal };
                colisao = Engine.bloqueio(state, next);
                if (colisao) break;
                target.q = next.q;
                target.r = next.r;
                caminho.push(next);
            }
            if (caminho.length > 1) {
                target.q = inicio.q;
                target.r = inicio.r;
                Engine.moveTo(state, target, caminho[caminho.length - 1], { caminho, forcado: true });
            }
        }
        if (target.q !== inicio.q || target.r !== inicio.r) {
            Engine.log(state, `${Engine.label(target)} é deslocado para (${target.q}, ${target.r}) (${ability.nome})`);
        }
        if (colisao) {
            Engine.log(
                state,
                `${Engine.label(target)} colide com ${colisao.tipo === 'terreno' ? 'o terreno' : Engine.label(colisao.peca)}`,
            );
            if (ef.aoColidir)
                Engine.runEffects(state, source, { ...ability, efeitos: ef.aoColidir }, [target], null, {
                    bonusDano: ctx.bonusDano,
                    reducaoDano: ctx.reducaoDano,
                });
            Engine.emit(state, 'colisao', { peca: target, fonte: source, habilidade: ability, com: colisao });
        }
    },
};
