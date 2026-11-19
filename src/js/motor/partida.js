// ── Partida (lógica pura) ──
// Criar uma partida, aplicar ações e fechar cada jogada, sem nada de tela. Usado pela página (partida/), pela IA
// do Bot, pelos testes e pelo simulador (npm run simular). A página acrescenta só o que é de tela: desfazer,
// redesenhar, salvar, vez do Bot.
import { CONFIG } from './config.js';
import { Rules } from './regras.js';
import { Engine } from './engine.js';

export const Partida = {
    // Estado inicial de uma partida.
    //   modo: id em CONFIG.modos · equipes: { jogador: [cores das Estrelas] }
    //   ordem: ordem dos turnos (padrão: sorteada) · botNivel: nível dos Bots (só partidas contra Bots)
    //   mensagem: primeira linha do registro
    criar({ modo, equipes, ordem = null, botNivel = null, mensagem = 'Partida iniciada' }) {
        const def = CONFIG.modos[modo];
        if (!def) throw new Error(`Modo de jogo desconhecido: ${modo}`);
        Rules.usarMapa(def.mapa);
        const s = {
            modo,
            mapa: def.mapa,
            jogadores: [...def.jogadores],
            pieces: Rules.createPieces(Object.fromEntries(def.jogadores.map((j) => [j, equipes[j] || []]))),
            round: 1,
            blocks: [],
            blockIndex: 0,
            activeId: null,
            pending: null,
            triggers: [],
            efeitoPendente: null,
            fx: [],
            fxN: 0, // eventos para os efeitos visuais (ver Engine.fx)
            log: [mensagem],
            winner: null,
        };
        if (botNivel) s.botNivel = botNivel;
        // Ordem dos turnos sorteada antes da partida (vale a partida toda).
        s.ordem = ordem || Partida.sortearOrdem(def.jogadores);
        s.log.push(`Sorteio da ordem: ${s.ordem.map((j, i) => `${i + 1}º ${CONFIG.players[j].label}`).join(', ')}`);
        Rules.initMatch(s);
        return s;
    },

    // Embaralha a lista (Fisher–Yates) usando o sorteio do motor (Engine.rng).
    sortearOrdem(lista) {
        const a = [...lista];
        for (let i = a.length - 1; i > 0; i--) {
            const k = Math.floor(Engine.rng() * (i + 1));
            [a[i], a[k]] = [a[k], a[i]];
        }
        return a;
    },

    // Aplica uma ação ao estado `s` (altera `s`). Retorna false se a ação não for válida agora (aí `s` não muda).
    // Ações: { tipo: 'mover', pieceId, path } · { tipo: 'habilidade', pieceId, abilityId, choice, pagamento }
    //        { tipo: 'coletar', pieceId } · { tipo: 'encerrar', pieceId } · { tipo: 'escolha', targetId }
    //        { tipo: 'rolagem', hit } · { tipo: 'reacao', usar }
    aplicar(s, a) {
        const p = a && a.pieceId != null ? Rules.pieceById(s, a.pieceId) : null;
        let ok = false;
        switch (a && a.tipo) {
            case 'mover':
                ok = !!p && !!Engine.mover(s, p, a.path);
                break;
            case 'habilidade':
                ok = !!p && !!Engine.use(s, p, a.abilityId, a.choice, a.pagamento);
                break;
            case 'escolha':
                ok = !!Engine.chooseTarget(s, a.targetId);
                break;
            case 'rolagem':
                ok = !!Engine.resolveRoll(s, a.hit);
                break;
            case 'reacao':
                ok = !s.winner && !!Engine.resolveReaction(s, a.usar);
                break;
            case 'coletar':
                ok = !!p && Rules.podeColetar(s, p);
                if (ok) {
                    Rules.coletarRenome(s, p);
                    Engine.resolveQueue(s);
                }
                break;
            case 'encerrar':
                ok = !!p && Rules.canSelect(s, p);
                if (ok) Rules.endActivation(s, p);
                break;
        }
        if (ok) Partida.finalizarJogada(s);
        return ok;
    },

    // Depois de cada ação: tira as Estrelas derrotadas, confere a vitória e, sem decisão pendente, encerra a
    // jogada de quem não pode fazer mais nada e avança o turno/rodada.
    finalizarJogada(s) {
        Rules.removeDead(s);
        s.winner = CONFIG.rules.checkVictory(s);
        if (s.winner) {
            s.pending = null;
            s.triggers = [];
            return;
        }
        if (!s.pending) {
            const act = Rules.activePiece(s);
            if (act) Rules.autoEndIfExhausted(s, act);
            Rules.settle(s);
        }
    },

    // Sorteios repetíveis: a mesma semente gera a mesma partida (testes e simulador). null = volta ao Math.random.
    semente(n) {
        if (n == null) {
            Engine.rng = Math.random;
            return;
        }
        // mulberry32
        let a = n >>> 0;
        Engine.rng = () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    },
};
