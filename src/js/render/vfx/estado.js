// ── VFX: estado e controle (níveis, liga/desliga, reiniciar) ──
// Parte do VFX (efeitos visuais). Os métodos são juntados em vfx.js; use sempre VFX.nome(...).
import { Rules } from '../../motor/regras.js';
import { state } from '../../partida/estado.js';

export default {
    NIVEIS: ['completo', 'reduzido', 'desligado'],
    NOMES: { completo: 'Completos', reduzido: 'Reduzidos', desligado: 'Desligados' },
    MAX_PARTS: 450,
    nivel: 'completo',
    visto: 0,
    ocupado: 0,
    ultimoHab: false,
    vez: null,
    vencedor: null,
    itens: [],
    parts: [],
    tremores: [],
    flashes: {},
    desvios: {},
    fantasmas: [],
    segura: {},
    barras: {},
    ocultos: {},
    pilha: {},
    sprites: {},
    iniciar() {
        let n = null;
        try {
            n = localStorage.getItem('testez_vfx');
        } catch (e) {
            /* sem armazenamento */
        }
        const reduz = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.nivel = this.NIVEIS.includes(n) ? n : reduz ? 'reduzido' : 'completo';
    },
    alternar() {
        this.nivel = this.NIVEIS[(this.NIVEIS.indexOf(this.nivel) + 1) % this.NIVEIS.length];
        try {
            localStorage.setItem('testez_vfx', this.nivel);
        } catch (e) {
            /* sem armazenamento */
        }
        if (!this.ligado()) this.limpar();
    },
    ligado() {
        return this.nivel !== 'desligado';
    },
    completo() {
        return this.nivel === 'completo';
    },
    limpar() {
        this.itens = [];
        this.parts = [];
        this.tremores = [];
        this.flashes = {};
        this.desvios = {};
        this.fantasmas = [];
        this.segura = {};
        this.barras = {};
        this.ocultos = {};
        this.pilha = {};
        this.ocupado = 0;
    },
    // Partida nova, desfazer, carregar: nada do que já aconteceu é reanimado.
    reiniciar() {
        this.limpar();
        this.visto = (state && state.fxN) || 0;
        this.vez = this.chaveVez();
        this.vencedor = state ? state.winner : null;
        this.ultimoHab = false;
    },
    restante(t = performance.now()) {
        return this.ligado() ? Math.max(0, this.ocupado - t) : 0;
    },
    // Fim de partida: a tela de vitória espera os efeitos (só quando a jogada final foi uma habilidade).
    esperaVitoria() {
        return this.ligado() && this.ultimoHab ? Math.min(2200, this.restante() + 700) : 0;
    },
    chaveVez() {
        if (!state || state.winner) return null;
        const b = Rules.currentBlock(state);
        return b ? `${state.round}:${b.player}` : null;
    },
};
