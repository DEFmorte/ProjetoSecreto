// ── Sorteio da ordem dos turnos ──
// Tela com a ordem sorteada antes da 1ª jogada e beginMatch (começa a partida).
import { CONFIG } from '../motor/config.js';
import { definirState, definirUndoStack, state } from './estado.js';
import { Tutorial } from '../menus/tutorial.js';
import { Bot } from '../bot/bot.js';
import { Rede } from '../online/rede.js';
import { newState, snapshot } from './partida.js';
import { afterStateChange } from './acoes.js';
import { ui } from '../interface/ui.js';
import { canvas } from '../render/canvas.js';
import { aplicarMapa } from '../render/tela.js';
import { pixelToHex } from '../render/hex.js';
import { definirGameRunning, gameRunning, startLoop } from './loop.js';
import { VFX } from '../render/vfx.js';
import { fecharPausa } from '../menus/pausa.js';
import { Partida } from '../motor/partida.js';

// ── Sorteio da ordem dos turnos ──
// Ao criar a partida (newState), a ordem de todos os jogadores é sorteada (state.ordem) e vale a partida toda.
// Esta tela mostra o resultado com uma animação curta antes da 1ª jogada; o Bot espera ela fechar.
// Online, cada aparelho mostra a mesma ordem (vem no estado do anfitrião) e a tela fecha sozinha após alguns segundos.
export const Sorteio = {
    el: null,
    timers: [],
    girando: false,
    ordem: [],
    tempo: { giroMin: 55, giroMax: 190, porVaga: 1000, online: 6 }, // ms; online: segundos até fechar sozinha
    sortear(lista) {
        return Partida.sortearOrdem(lista);
    },
    aberto() {
        return !!this.el;
    },
    // Mostra só no começo de verdade: 1ª rodada, ninguém agiu ainda (partida guiada não sorteia).
    deveMostrar(s) {
        return (
            !Tutorial.partida &&
            !!s &&
            Array.isArray(s.ordem) &&
            s.ordem.length > 1 &&
            s.ordem.every((j) => CONFIG.players[j]) &&
            s.round === 1 &&
            s.blockIndex === 0 &&
            !s.winner &&
            s.pieces.every((p) => !p.turn || !p.turn.activated)
        );
    },
    voce(j) {
        return Rede.ativo() ? j === Rede.eu : !Bot.ehBot(j);
    },
    pintar(li, j, fixo) {
        const t = CONFIG.players[j];
        li.style.setProperty('--borda', t.bannerBorder);
        li.style.setProperty('--fundo', t.bannerBg);
        li.style.setProperty('--texto', t.bannerText);
        li.querySelector('.nome').innerHTML = t.label + (this.voce(j) ? ' <span class="voce">(você)</span>' : '');
        li.classList.toggle('girando', !fixo);
        li.classList.toggle('fixo', fixo);
    },
    depois(fn, ms) {
        this.timers.push(setTimeout(fn, ms));
    },
    mostrar(s) {
        this.fechar(false);
        this.ordem = [...s.ordem];
        const tela = document.createElement('div');
        tela.id = 'sorteio-screen';
        tela.className = 'sorteio';
        tela.innerHTML = `<div class="sorteio-caixa" role="dialog" aria-label="Sorteio da ordem dos turnos">
            <p class="sorteio-topo">Antes de começar</p>
            <h2>SORTEIO DA ORDEM</h2>
            <p class="sorteio-sub">A ordem dos turnos foi sorteada e vale para a partida toda.</p>
            <ol class="sorteio-lista">${this.ordem.map((j, i) => `<li><span class="pos">${i + 1}º</span><span class="nome">?</span></li>`).join('')}</ol>
            <p class="sorteio-res">&nbsp;</p>
            <button id="btn-sorteio" class="menu-btn primario"><span>Pular</span><span class="kbd shrink-0">Enter</span></button>
        </div>`;
        tela.querySelector('#btn-sorteio').addEventListener('click', () => this.avancar());
        document.body.appendChild(tela);
        this.el = tela;
        this.girando = true;
        const vagas = [...tela.querySelectorAll('li')];
        const semAnimacao = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (semAnimacao) {
            this.revelar();
            return;
        }
        // Cada vaga "gira" entre os jogadores que sobraram e para no sorteado; a última sai sozinha.
        const vaga = (i) => {
            if (!this.el || !this.girando) return;
            if (i >= this.ordem.length - 1) {
                this.revelar();
                return;
            }
            const resto = this.ordem.slice(i),
                inicio = performance.now();
            let n = 0;
            const girar = () => {
                if (!this.el || !this.girando) return;
                const f = Math.min(1, (performance.now() - inicio) / this.tempo.porVaga);
                if (f >= 1) {
                    this.pintar(vagas[i], this.ordem[i], true);
                    this.depois(() => vaga(i + 1), 260);
                    return;
                }
                this.pintar(vagas[i], resto[n++ % resto.length], false);
                this.depois(girar, this.tempo.giroMin + (this.tempo.giroMax - this.tempo.giroMin) * f * f);
            };
            girar();
        };
        this.depois(() => vaga(0), 250);
        tela.querySelector('#btn-sorteio').focus({ preventScroll: true });
    },
    // Fim da animação: todas as vagas no lugar, mensagem de quem começa e botão Começar.
    revelar() {
        if (!this.el) return;
        this.timers.forEach(clearTimeout);
        this.timers = [];
        this.girando = false;
        const vagas = [...this.el.querySelectorAll('li')];
        this.ordem.forEach((j, i) => {
            if (!vagas[i].classList.contains('fixo')) this.pintar(vagas[i], j, true);
        });
        const j1 = this.ordem[0];
        this.el.querySelector('.sorteio-res').innerText = this.voce(j1)
            ? 'Você começa!'
            : `${CONFIG.players[j1].label} começa!`;
        const rotulo = this.el.querySelector('#btn-sorteio span');
        rotulo.innerText = 'Começar';
        if (Rede.ativo()) {
            // online a partida não espera: fecha sozinha
            let faltam = this.tempo.online;
            const contar = () => {
                if (!this.el) return;
                if (faltam <= 0) {
                    this.fechar();
                    return;
                }
                rotulo.innerText = `Começar (${faltam--})`;
                this.depois(contar, 1000);
            };
            contar();
        }
    },
    avancar() {
        if (this.girando) this.revelar();
        else this.fechar();
    },
    fechar(retomar = true) {
        this.timers.forEach(clearTimeout);
        this.timers = [];
        this.girando = false;
        if (!this.el) return;
        this.el.remove();
        this.el = null;
        if (retomar && gameRunning && state) Bot.agendar();
    },
};

// Começa a partida (ou retoma).
// estadoJson: estado inicial vindo do anfitrião (convidado online).
// desfazer: pilha de desfazer restaurada (Continuar partida).
export function beginMatch(estadoJson = null, desfazer = null) {
    ui.pinId = ui.hoverId = null; // ids se repetem entre partidas
    definirUndoStack(Array.isArray(desfazer) ? [...desfazer] : []);
    definirState(typeof estadoJson === 'string' ? JSON.parse(estadoJson) : newState());
    if (!Array.isArray(state.fx)) state.fx = []; // partidas salvas antes dos efeitos visuais
    aplicarMapa(state.mapa || 'classico', true);
    Bot.prepararPartida();
    definirGameRunning(true);
    ui.vis = null;
    ui.floats = [];
    ui.anims = {};
    ui.vitoriaVista = null;
    VFX.limpar();
    fecharPausa();
    afterStateChange();
    startLoop();
    // Partida nova (ou convidado online recebendo o início): mostra o sorteio. "Continuar partida" não repete.
    if ((!estadoJson || Rede.ativo()) && Sorteio.deveMostrar(state)) Sorteio.mostrar(state);
    else Sorteio.fechar(false);
    if (Rede.papel === 'anfitriao') {
        Rede.votos = {};
        Rede.enviar({ t: 'inicio', estado: snapshot() });
    }
    Rede.iniciando = false;
    Rede.atualizarStatus();
}

export function eventHex(e) {
    const rect = canvas.getBoundingClientRect();
    return pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
}
