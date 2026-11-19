// ── Rede: fim de partida: votação de revanche e nova partida ──
// Parte do Rede (modo online). Os métodos são juntados em rede.js; use sempre Rede.nome(...).
import { CONFIG } from '../../motor/config.js';
import { state, teams } from '../../partida/estado.js';
import { atualizarFimDePartida, OPCOES_VOTO } from '../../partida/partida.js';
import { sairDaPartida } from '../../menus/menu-principal.js';
import { gameRunning, startGame } from '../../partida/loop.js';
import { beginMatch } from '../../partida/sorteio.js';
import { entrarSelecaoOnline } from '../menu-online.js';

export default {
    // Anfitrião: fim de jogo → todos voltam à seleção, conectados na mesma sala.
    // Fim de partida online: cada um vota em revanche ou nova partida; acontece quando todos escolhem a mesma.
    votar(opcao) {
        if (!state || !state.winner || !OPCOES_VOTO[opcao]) return;
        if (this.papel === 'anfitriao') {
            this.registrarVoto(1, opcao);
            return;
        }
        this.votos[this.eu] = opcao; // o anfitrião confirma na próxima atualização da sala
        this.enviar({ t: 'voto', opcao });
        atualizarFimDePartida();
    },
    registrarVoto(j, opcao) {
        if (this.papel !== 'anfitriao' || !state || !state.winner || !OPCOES_VOTO[opcao]) return;
        this.votos[j] = opcao;
        if (this.jogadoresSala().every((x) => this.votos[x] === opcao)) {
            this.votos = {};
            if (opcao === 'revanche') beginMatch();
            else this.novaPartida();
            return;
        }
        this.atualizarSala();
        atualizarFimDePartida();
    },
    textoVotos() {
        const js = this.jogadoresSala(),
            L = (j) => CONFIG.players[j].label + (j === this.eu ? ' (você)' : '');
        const partes = Object.keys(OPCOES_VOTO)
            .map((op) => [op, js.filter((j) => this.votos[j] === op)])
            .filter(([, v]) => v.length)
            .map(([op, v]) => `<b class="text-white">${OPCOES_VOTO[op]}:</b> ${v.map(L).join(', ')}`);
        const falta = js.filter((j) => !this.votos[j]);
        if (falta.length) partes.push(`<b class="text-white">Aguardando:</b> ${falta.map(L).join(', ')}`);
        return `Todos precisam escolher a mesma opção.<br>${partes.join(' · ')}`;
    },
    novaPartida() {
        if (this.papel !== 'anfitriao' || !state || !state.winner) return;
        sairDaPartida(null);
        this.iniciando = false;
        this.votos = {};
        entrarSelecaoOnline();
        this.enviar({ t: 'selecao' });
        this.atualizarSala();
    },
    // Anfitrião: começa quando todos estão conectados e com a equipe confirmada.
    tentarIniciar() {
        if (this.papel !== 'anfitriao' || gameRunning || this.iniciando || !this.selecao || !this.conectado()) return;
        if (!this.jogadoresSala().every((j) => (teams[j] || []).length === CONFIG.teamSize)) return;
        this.iniciando = true;
        startGame();
    },
};
