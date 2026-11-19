// ── Rede: estado da sala e dos jogadores ──
// Parte do Rede (modo online). Os métodos são juntados em rede.js; use sempre Rede.nome(...).
import { CONFIG } from '../../motor/config.js';
import { teams } from '../../partida/estado.js';

export default {
    papel: null, // null (local) | 'anfitriao' | 'convidado'
    eu: 1,
    modo: 'duelo', // modo da sala (definido pelo anfitrião ao criar)
    codigo: null,
    peer: null,
    conn: null, // convidado: conexão com o anfitrião
    vagas: {}, // anfitrião: { jogador: { token, conn } } — conn null = desconectado (vaga reservada)
    token: null, // convidado: identifica a própria vaga ao reconectar
    sala: [], // convidado: última lista de jogadores enviada pelo anfitrião
    selecao: false, // a sala já encheu (seleção/partida): quem cai mantém a vaga
    naSala: false, // anfitrião com sala criada / convidado aceito numa vaga
    iniciando: false,
    alerta: null, // versões diferentes do jogo
    votos: {}, // fim de partida: jogador → 'revanche' | 'nova' (todos precisam concordar)
    aplicando: false, // anfitrião aplicando uma ação (libera Rules.canSelect para todas as equipes)
    tentativas: 0,
    timer: null,
    rolagemOriginal: null,
    ativo() {
        return this.papel !== null;
    },
    aberta(c) {
        return !!(c && c.open);
    },
    jogadoresSala() {
        return CONFIG.modos[this.modo].jogadores;
    },
    convidados() {
        return this.jogadoresSala().filter((j) => j !== 1);
    },
    // Convidado: ligado ao anfitrião. Anfitrião: todas as vagas com conexão aberta.
    conectado() {
        if (this.papel === 'anfitriao')
            return this.convidados().every((j) => this.vagas[j] && this.aberta(this.vagas[j].conn));
        return this.aberta(this.conn);
    },
    jogadorDe(c) {
        return +(Object.keys(this.vagas).find((j) => c && this.vagas[j].conn === c) || 0);
    },
    // Situação de cada vaga: anfitriao | livre | conectado | desconectado (+ equipe pronta).
    infoSala() {
        return this.jogadoresSala().map((j) => ({
            jogador: j,
            estado:
                j === 1
                    ? 'anfitriao'
                    : !this.vagas[j]
                      ? 'livre'
                      : this.aberta(this.vagas[j].conn)
                        ? 'conectado'
                        : 'desconectado',
            pronto: (teams[j] || []).length === CONFIG.teamSize,
        }));
    },
    listaSala() {
        return this.papel === 'anfitriao' ? this.infoSala() : this.sala;
    },
    ausentes() {
        return this.listaSala()
            .filter((x) => x.estado === 'desconectado')
            .map((x) => x.jogador);
    },
    // Identifica a versão do jogo (todos precisam do mesmo código). A impressão digital do código vem na
    // <meta name="versao-jogo">, que o servidor de desenvolvimento e o build preenchem (ferramentas/projeto.mjs).
    versao() {
        const m = document.querySelector('meta[name="versao-jogo"]');
        return `${Object.keys(CONFIG.estrelas).length}:${m ? m.content : 'sem-versao'}`;
    },
};
