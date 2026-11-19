// ── Contra Bots (modos locais com `bots`: CONFIG.modos.bot, CONFIG.modos.bots2) ──
// O Bot joga pelos jogadores indicados em CONFIG.modos[modo].bots (cada um por si): quando é a vez dele, pede a
// jogada para a IA (ia.js) — em segundo plano, pelo BotWorker — e aplica. As rolagens da partida contra o Bot são
// automáticas. Ele espera alguns instantes entre as jogadas para dar para acompanhar.
import { CONFIG } from '../motor/config.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';
import { state } from '../partida/estado.js';
import { IA } from './ia.js';
import { BotWorker } from './bot-worker.js';
import { Rede } from '../online/rede.js';
import { botsDoModo } from '../partida/partida.js';
import { afterStateChange, aplicarAcao } from '../partida/acoes.js';
import { gameRunning } from '../partida/loop.js';
import { Sorteio } from '../partida/sorteio.js';
import { VFX } from '../render/vfx.js';
import { ajudaAberta, pausaAberta } from '../menus/pausa.js';

export const Bot = {
    // Níveis de dificuldade: ver IA.niveis (ia.js).
    get niveis() {
        return IA.niveis;
    },
    get nivelPadrao() {
        return IA.nivelPadrao;
    },
    espera: { primeira: 1000, passo: 800, pausa: 400 }, // ms: início da vez, entre passos, checagem com a pausa aberta
    aplicando: false, // o Bot está aplicando uma ação (libera Rules.canSelect para as Estrelas dele)
    timer: null,
    texto: '',
    ativacao: null,
    passos: 0,
    falhas: 0,
    segundoPlano: true, // pensa num Web Worker (BotWorker), sem travar a tela; false = na própria página (testes)
    pedido: null, // jogada sendo pensada em segundo plano: { estado, acao, falhou, aguardando }
    rotulosBase: null,
    rolagemOriginal: null,

    // Nível da partida (Bot.niveis); `nivelForcado` = testes.
    nivelId(s = state) {
        const n = this.nivelForcado || (s && s.botNivel);
        return this.niveis[n] ? n : this.nivelPadrao;
    },
    nivel(s = state) {
        return this.niveis[this.nivelId(s)];
    },

    // Jogadores controlados pelo Bot na partida ([] = não é partida contra Bots; online nunca é).
    jogadores(s = state) {
        if (!s || Rede.ativo()) return [];
        return botsDoModo(s.modo);
    },
    ehBot(jogador, s = state) {
        return jogador != null && this.jogadores(s).includes(jogador);
    },
    ativo(s = state) {
        return this.jogadores(s).length > 0;
    },
    decisor(s = state) {
        return IA.decisor(s);
    },
    vez(s = state) {
        return this.ehBot(this.decisor(s), s);
    },

    // Nomes na tela: contra Bots, o jogador do Bot aparece como BOT (com 2 Bots: BOT 1 e BOT 2) na seleção, faixa do
    // turno, registro e vitória.
    rotulos(modo) {
        if (!this.rotulosBase)
            this.rotulosBase = Object.fromEntries(Object.entries(CONFIG.players).map(([j, t]) => [j, t.label]));
        const bots = botsDoModo(modo);
        for (const [j, t] of Object.entries(CONFIG.players)) {
            const i = bots.indexOf(Number(j));
            t.label = i < 0 ? this.rotulosBase[j] : bots.length > 1 ? `BOT ${i + 1}` : 'BOT';
        }
    },
    // Início/fim de partida: rótulos, rolagem automática e o relógio do Bot.
    prepararPartida() {
        this.parar();
        this.rotulos(Rede.ativo() ? null : state && state.modo);
        if (this.ativo()) {
            if (CONFIG.rules.attackRoll.mode !== 'auto') {
                this.rolagemOriginal = CONFIG.rules.attackRoll.mode;
                CONFIG.rules.attackRoll.mode = 'auto';
            }
        } else this.restaurarRolagem();
    },
    encerrarPartida() {
        this.parar();
        this.restaurarRolagem();
        this.rotulos(null);
    },
    restaurarRolagem() {
        if (this.rolagemOriginal && !Rede.ativo()) CONFIG.rules.attackRoll.mode = this.rolagemOriginal;
        this.rolagemOriginal = null;
    },
    parar() {
        clearTimeout(this.timer);
        this.timer = null;
        this.texto = '';
        this.ativacao = null;
        this.passos = 0;
        if (this.pedido) {
            this.pedido = null;
            BotWorker.cancelar();
        }
    },

    // Chamado a cada mudança do estado: se for a vez do Bot, agenda o próximo passo.
    // A jogada começa a ser pensada já (em segundo plano), enquanto corre a espera para dar para acompanhar.
    agendar() {
        clearTimeout(this.timer);
        this.timer = null;
        if (!gameRunning || !state || !this.vez()) {
            if (!this.vez()) this.texto = '';
            return;
        }
        const inicioDaVez = !state.pending && state.activeId == null && !this.texto;
        const espera = inicioDaVez ? this.espera.primeira : this.espera.passo;
        // Com esperas reais (não nas simulações), deixa os efeitos visuais da jogada anterior terminarem.
        this.timer = setTimeout(
            () => this.passo(),
            this.espera.passo > 0 ? Math.max(espera, Math.min(1800, VFX.restante())) : espera,
        );
        this.novaAtivacao();
        this.pedirJogada();
    },
    novaAtivacao() {
        if (state.activeId !== this.ativacao) {
            this.ativacao = state.activeId;
            this.passos = 0;
        }
    },
    // Estado que vai para o Worker (o registro não importa para a decisão). Também identifica a jogada pensada.
    estadoParaPensar() {
        const log = state.log,
            fx = state.fx;
        state.log = log.slice(-3);
        state.fx = undefined; // registro e efeitos visuais não importam para a decisão
        try {
            return JSON.stringify(state);
        } finally {
            state.log = log;
            state.fx = fx;
        }
    },
    // Pede a jogada ao BotWorker. false = pensar aqui mesmo (sem Worker, ou rolagem de dados, que é instantânea).
    pedirJogada() {
        if (!this.segundoPlano || (state.pending && state.pending.tipo === 'rolagem') || !BotWorker.iniciar())
            return false;
        const estado = this.estadoParaPensar();
        if (this.pedido && this.pedido.estado === estado) return true; // já pensando (ou pronta) para este estado
        const pedido = (this.pedido = { estado, acao: undefined, falhou: false, aguardando: false });
        const fim = (acao, falhou) => {
            if (this.pedido !== pedido) return; // o estado mudou (desfazer, nova partida…): resposta velha
            pedido.acao = acao;
            pedido.falhou = falhou;
            if (pedido.aguardando) this.passo();
        };
        BotWorker.pedir({
            estado,
            mapa: state.mapa || 'classico',
            niveis: this.niveis,
            nivel: this.nivelId(),
            passos: this.passos,
        }).then(
            (acao) => fim(acao, false),
            () => fim(null, true),
        );
        return true;
    },
    passo() {
        this.timer = null;
        if (!gameRunning || !state || !this.vez()) return;
        if (pausaAberta() || ajudaAberta() || Sorteio.aberto()) {
            this.timer = setTimeout(() => this.passo(), this.espera.pausa);
            return;
        }
        this.novaAtivacao();
        let acao = null;
        if (this.pedirJogada()) {
            const pd = this.pedido;
            if (pd.acao === undefined && !pd.falhou) {
                pd.aguardando = true;
                return;
            } // ainda pensando: joga assim que terminar
            this.pedido = null;
            acao = pd.falhou ? this.decidirAqui() : pd.acao;
        } else acao = this.decidirAqui();
        if (acao && this.executar(acao)) {
            this.falhas = 0;
            return;
        }
        // Não conseguiu jogar (não deveria acontecer): resolve o mínimo para a partida não travar.
        if (++this.falhas > 3) return;
        const pd = state.pending,
            p = Rules.activePiece(state) || Rules.pieceById(state, Rules.pendingIds(state)[0]);
        if (pd)
            this.executar(
                pd.tipo === 'reacao'
                    ? { tipo: 'reacao', usar: false }
                    : pd.tipo === 'escolha'
                      ? { tipo: 'escolha', targetId: pd.opcoes[0] }
                      : { tipo: 'rolagem', hit: false },
            );
        else if (p) this.executar({ tipo: 'encerrar', pieceId: p.id });
    },
    decidirAqui() {
        try {
            return IA.decidir(state, { nivel: this.nivelId(), passos: this.passos });
        } catch (e) {
            console.error('Bot:', e);
            return null;
        }
    },
    executar(acao) {
        const p = Rules.pieceById(state, acao.pieceId),
            nome = p ? p.stats.nome : '';
        const a = acao.abilityId && Engine.def(acao.abilityId);
        this.texto =
            acao.tipo === 'mover'
                ? `${nome} se move`
                : acao.tipo === 'habilidade'
                  ? `${nome} usa ${a ? a.nome : 'uma habilidade'}`
                  : acao.tipo === 'coletar'
                    ? `${nome} coleta Renome`
                    : acao.tipo === 'encerrar'
                      ? `${nome} encerra a jogada`
                      : acao.tipo === 'reacao'
                        ? acao.usar
                            ? `usa a reação ${Engine.def(state.pending.abilityId).nome}`
                            : 'não reage'
                        : 'escolhe o alvo';
        this.passos++;
        let ok = false;
        this.aplicando = true;
        try {
            ok = aplicarAcao(acao);
        } finally {
            this.aplicando = false;
        }
        afterStateChange();
        return ok;
    },
};
