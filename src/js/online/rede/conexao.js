// ── Rede: conexão PeerJS (criar sala, entrar, reconectar) ──
// Parte do Rede (modo online). Os métodos são juntados em rede.js; use sempre Rede.nome(...).
import { Peer } from 'peerjs';
import { CONFIG } from '../../motor/config.js';
import { botsDoModo } from '../../partida/partida.js';
import { atualizarMenuOnline, mostrarCodigoSala } from '../menu-online.js';
import { SALA_PREFIXO, SALA_TAMANHO, sortearTexto, tokenDaSala } from '../sala.js';
import { $ } from '../../nucleo/dom.js';

export default {
    // PeerJS (pacote npm "peerjs") vai junto no código do jogo: não há o que carregar.
    carregar() {
        return Promise.resolve();
    },
    // Mensagem de erro do PeerJS para o jogador.
    textoErro(err) {
        const t = err && err.type;
        if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed')
            return 'Sem conexão com o servidor de salas. Verifique a internet.';
        if (t === 'browser-incompatible') return 'Este navegador não suporta o modo online.';
        return `Erro de rede (${t || (err && err.message) || 'desconhecido'}).`;
    },
    iniciar(papel, modo = 'duelo') {
        this.encerrar(false);
        this.papel = papel;
        this.modo = CONFIG.modos[modo] && !botsDoModo(modo).length ? modo : 'duelo';
        this.eu = papel === 'anfitriao' ? 1 : 2;
        this.naSala = papel === 'anfitriao';
        this.tentativas = 0;
        // Online as rolagens são sempre automáticas (o anfitrião rola).
        this.rolagemOriginal = CONFIG.rules.attackRoll.mode;
        CONFIG.rules.attackRoll.mode = 'auto';
        $('btn-undo').classList.add('hidden');
        atualizarMenuOnline();
    },
    async criarSala(modo = 'duelo') {
        this.iniciar('anfitriao', modo);
        this.status('Criando sala…');
        try {
            await this.carregar();
        } catch (e) {
            this.falhar(e.message);
            return;
        }
        if (this.papel === 'anfitriao') this.abrirSala();
    },
    abrirSala() {
        const codigo = sortearTexto(SALA_TAMANHO);
        const peer = (this.peer = new Peer(SALA_PREFIXO + codigo));
        peer.on('open', () => {
            if (peer !== this.peer) return;
            this.codigo = codigo;
            mostrarCodigoSala();
            this.atualizarSala();
        });
        peer.on('connection', (c) =>
            c.on('open', () => {
                if (peer !== this.peer) {
                    c.close();
                    return;
                }
                this.ligar(c); // a vaga é definida no 'ola'
            }),
        );
        peer.on('error', (err) => {
            if (peer !== this.peer) return;
            if (err.type === 'unavailable-id') {
                peer.destroy();
                this.abrirSala();
                return;
            } // código já em uso
            this.status(this.textoErro(err));
        });
        peer.on('disconnected', () => {
            if (peer === this.peer && !peer.destroyed) peer.reconnect();
        });
    },
    async entrarSala(codigo) {
        codigo = String(codigo || '')
            .trim()
            .toUpperCase();
        if (!new RegExp(`^[A-Z0-9]{${SALA_TAMANHO}}$`).test(codigo)) {
            this.status(`Digite o código de ${SALA_TAMANHO} letras da sala.`);
            return;
        }
        this.iniciar('convidado');
        this.codigo = codigo;
        this.token = tokenDaSala(codigo);
        this.status(`Conectando à sala ${codigo}…`);
        try {
            await this.carregar();
        } catch (e) {
            this.falhar(e.message);
            return;
        }
        if (this.papel !== 'convidado') return;
        const peer = (this.peer = new Peer());
        peer.on('open', () => {
            if (peer === this.peer) this.conectar();
        });
        peer.on('error', (err) => {
            if (peer !== this.peer) return;
            if (err.type === 'peer-unavailable') {
                if (this.tentativas > 0) this.reconectar();
                else this.status(`Sala ${this.codigo} não encontrada. Confira o código.`);
            } else this.status(this.textoErro(err));
        });
        peer.on('disconnected', () => {
            if (peer === this.peer && !peer.destroyed) peer.reconnect();
        });
    },
    conectar() {
        const c = this.peer.connect(SALA_PREFIXO + this.codigo, { reliable: true });
        c.on('open', () => {
            if (!this.peer || c.peer !== SALA_PREFIXO + this.codigo) return;
            this.tentativas = 0;
            this.ligar(c);
            this.enviar({ t: 'ola', versao: this.versao(), token: this.token });
            this.status('Conectado! Aguardando o anfitrião…');
        });
    },
    // Usa a conexão c (real ou de teste: { open, send(msg), on?, close? }).
    ligar(c) {
        if (this.papel === 'convidado') this.conn = c;
        if (c.on) {
            c.on('data', (msg) => this.receber(msg, c));
            c.on('close', () => this.perdeu(c));
            c.on('error', () => this.perdeu(c));
        }
    },
    perdeu(c) {
        if (!this.ativo()) return;
        if (this.papel === 'convidado') {
            if (c && c !== this.conn) return;
            this.conn = null;
            this.reconectar();
            return;
        }
        const j = this.jogadorDe(c);
        if (!j) return;
        if (this.selecao)
            this.vagas[j].conn = null; // seleção/partida: a vaga fica reservada
        else delete this.vagas[j]; // saguão: libera a vaga
        this.atualizarSala();
    },
    reconectar() {
        clearTimeout(this.timer);
        if (++this.tentativas > 10) {
            this.status('Não foi possível reconectar. Volte ao menu.');
            return;
        }
        this.status(`Conexão perdida — tentando reconectar (${this.tentativas}/10)…`);
        this.timer = setTimeout(() => {
            if (!this.peer || this.papel !== 'convidado' || this.conectado()) return;
            if (this.peer.disconnected) this.peer.reconnect();
            this.conectar();
        }, 3000);
    },
    falhar(msg) {
        this.encerrar(false);
        $('online-status').innerText = msg;
    },
};
