// ── Rede: mensagens recebidas ──
// Parte do Rede (modo online). Os métodos são juntados em rede.js; use sempre Rede.nome(...).
import { CONFIG } from '../../motor/config.js';
import { definirState, state, teams } from '../../partida/estado.js';
import { atualizarFimDePartida, botsDoModo, OPCOES_VOTO, snapshot } from '../../partida/partida.js';
import { afterStateChange, executar } from '../../partida/acoes.js';
import { definirSelectedColorsForMenu, updateSelectionUI } from '../../menus/escolha-equipe.js';
import { sairDaPartida } from '../../menus/menu-principal.js';
import { gameRunning, startGame } from '../../partida/loop.js';
import { beginMatch } from '../../partida/sorteio.js';
import {
    atualizarMenuOnline,
    dicaEquipeConfirmada,
    emSelecaoOnline,
    entrarSelecaoOnline,
    mostrarCodigoSala,
} from '../menu-online.js';
import { $ } from '../../nucleo/dom.js';

export default {
    // c: conexão de origem (o anfitrião usa para saber qual jogador mandou).
    receber(msg, c) {
        if (!msg || typeof msg !== 'object' || !this.ativo()) return;
        const anfitriao = this.papel === 'anfitriao';
        if (!anfitriao && c && c !== this.conn) return;
        const j = anfitriao ? this.jogadorDe(c) : 0;
        switch (msg.t) {
            case 'ola': {
                if (!anfitriao || !c) return;
                const vaga = this.ocuparVaga(
                    c,
                    typeof msg.token === 'string' && /^[a-z0-9]{1,64}$/.test(msg.token) ? msg.token : null,
                );
                if (!vaga) {
                    this.enviarPara(c, { t: 'cheia' });
                    setTimeout(() => {
                        try {
                            c.close && c.close();
                        } catch (e) {}
                    }, 300);
                    return;
                }
                this.enviarPara(c, { t: 'bemvindo', jogador: vaga, modo: this.modo });
                if (msg.versao !== this.versao()) {
                    this.alerta = 'Atenção: versões diferentes do jogo';
                    this.enviarPara(c, { t: 'aviso', texto: `${this.alerta}.` });
                }
                if (this.selecao) this.enviarFase(vaga);
                else if (this.conectado()) {
                    this.selecao = true;
                    entrarSelecaoOnline();
                    this.enviar({ t: 'selecao' });
                }
                this.atualizarSala();
                if (this.selecao) this.tentarIniciar();
                return;
            }
            case 'equipe': {
                if (!anfitriao || !j || gameRunning || !this.selecao) return;
                const cores = Array.isArray(msg.cores) ? msg.cores.filter((c) => CONFIG.estrelas[c]) : [];
                if (cores.length !== CONFIG.teamSize || new Set(cores).size !== cores.length) return;
                teams[j] = cores;
                this.atualizarSala();
                this.tentarIniciar();
                return;
            }
            case 'acao':
                if (anfitriao && j && gameRunning) {
                    const acao = this.normalizarAcao(msg.acao);
                    // recusada: volta ao estado certo
                    if (!acao || !executar(acao, j)) this.enviarPara(c, { t: 'estado', estado: snapshot() });
                }
                return;
            case 'voto':
                if (anfitriao && j) this.registrarVoto(j, msg.opcao);
                return;
            case 'tchau':
                if (anfitriao) {
                    this.perdeu(c);
                    try {
                        c && c.close && c.close();
                    } catch (e) {}
                    return;
                }
                this.conn = null;
                this.status('O anfitrião encerrou a sala. Volte ao menu.');
                return;
        }
        if (anfitriao) return;
        // Mensagens do anfitrião para o convidado.
        switch (msg.t) {
            case 'bemvindo':
                if (!CONFIG.players[msg.jogador]) return;
                this.eu = +msg.jogador;
                this.modo = CONFIG.modos[msg.modo] && !botsDoModo(msg.modo).length ? msg.modo : 'duelo';
                this.naSala = true;
                mostrarCodigoSala();
                atualizarMenuOnline();
                this.renderSala();
                this.atualizarStatus();
                return;
            case 'cheia':
                this.falhar(`A sala ${this.codigo} está cheia.`);
                return;
            case 'sala':
                this.sala = Array.isArray(msg.sala) ? msg.sala.filter((x) => x && CONFIG.players[x.jogador]) : [];
                this.selecao = !!msg.selecao;
                this.votos = {};
                if (msg.votos && typeof msg.votos === 'object')
                    for (const [k, v] of Object.entries(msg.votos))
                        if (CONFIG.players[k] && OPCOES_VOTO[v]) this.votos[k] = v;
                atualizarFimDePartida();
                this.renderSala();
                this.atualizarStatus();
                return;
            case 'selecao': {
                this.selecao = true;
                this.votos = {};
                const nova = gameRunning || !!state; // nova partida: sai do tabuleiro e escolhe de novo
                if (nova) sairDaPartida(null);
                if (nova || !emSelecaoOnline()) entrarSelecaoOnline();
                const eq = Array.isArray(msg.equipe) ? msg.equipe.filter((c) => CONFIG.estrelas[c]) : [];
                if (eq.length === CONFIG.teamSize) {
                    // reconectou: a equipe já confirmada continua valendo
                    teams[this.eu] = [...eq];
                    definirSelectedColorsForMenu([...eq]);
                    updateSelectionUI();
                    $('selection-hint').innerText = dicaEquipeConfirmada();
                } else if (teams[this.eu].length) this.enviar({ t: 'equipe', cores: teams[this.eu] });
                this.atualizarStatus();
                return;
            }
            case 'inicio': {
                const est = this.estadoSeguro(msg.estado);
                if (!est) return;
                this.votos = {};
                if (gameRunning) beginMatch(JSON.stringify(est));
                else startGame(JSON.stringify(est));
                return;
            }
            case 'estado': {
                const est = gameRunning && this.estadoSeguro(msg.estado);
                if (!est) return;
                definirState(est);
                afterStateChange();
                return;
            }
            case 'aviso':
                this.status(String(msg.texto || ''));
                return;
        }
    },
};
