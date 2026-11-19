// ── Rede: envio de mensagens, vagas e saída da sala ──
// Parte do Rede (modo online). Os métodos são juntados em rede.js; use sempre Rede.nome(...).
import { CONFIG } from '../../motor/config.js';
import { state, teams } from '../../partida/estado.js';
import { snapshot } from '../../partida/partida.js';
import { gameRunning } from '../../partida/loop.js';
import { atualizarMenuOnline, emSelecaoOnline, entrarSelecaoOnline } from '../menu-online.js';
import { $ } from '../../nucleo/dom.js';

export default {
    // Convidado: para o anfitrião. Anfitrião: para todos os convidados conectados.
    enviar(msg) {
        if (this.papel === 'anfitriao') {
            let ok = false;
            for (const j of this.convidados()) if (this.enviarPara(j, msg)) ok = true;
            return ok;
        }
        if (!this.conectado()) return false;
        try {
            this.conn.send(msg);
            return true;
        } catch (e) {
            return false;
        }
    },
    // Anfitrião: para um convidado (número do jogador ou conexão).
    enviarPara(alvo, msg) {
        const c = typeof alvo === 'number' ? this.vagas[alvo] && this.vagas[alvo].conn : alvo;
        if (!this.aberta(c)) return false;
        try {
            c.send(msg);
            return true;
        } catch (e) {
            return false;
        }
    },
    enviarEstado() {
        if (this.papel === 'anfitriao') this.enviar({ t: 'estado', estado: snapshot() });
    },
    // Fase atual para quem (re)entrou: partida em andamento ou seleção (com a equipe já confirmada).
    enviarFase(j) {
        if (gameRunning && state) this.enviarPara(j, { t: 'inicio', estado: snapshot() });
        else {
            if (!emSelecaoOnline()) entrarSelecaoOnline();
            this.enviarPara(j, { t: 'selecao', equipe: teams[j] || [] });
        }
    },
    // Anfitrião: vaga para quem chegou — a própria (mesmo token), uma livre ou a de quem caiu.
    ocuparVaga(c, token) {
        const js = this.convidados();
        let j =
            this.jogadorDe(c) ||
            (token && js.find((j) => this.vagas[j] && this.vagas[j].token === token)) ||
            js.find((j) => !this.vagas[j]) ||
            js.find((j) => !this.aberta(this.vagas[j].conn));
        if (!j) return 0;
        const v = this.vagas[j];
        if (v && v.conn && v.conn !== c)
            try {
                v.conn.close();
            } catch (e) {}
        // outra pessoa: monta a própria equipe
        if (v && v.token !== token && !gameRunning && !this.iniciando) teams[j] = [];
        this.vagas[j] = { token, conn: c };
        return j;
    },
    encerrar(avisar = true) {
        clearTimeout(this.timer);
        if (avisar) this.enviar({ t: 'tchau' });
        const conns = [this.conn, ...Object.values(this.vagas).map((v) => v.conn)],
            peer = this.peer;
        this.conn = this.peer = null;
        setTimeout(
            () => {
                for (const c of conns)
                    try {
                        c && c.close && c.close();
                    } catch (e) {}
                try {
                    peer && peer.destroy();
                } catch (e) {}
            },
            avisar ? 200 : 0,
        );
        if (this.rolagemOriginal) CONFIG.rules.attackRoll.mode = this.rolagemOriginal;
        this.rolagemOriginal = null;
        this.papel = null;
        this.eu = 1;
        this.modo = 'duelo';
        this.codigo = this.token = this.alerta = null;
        this.vagas = {};
        this.sala = [];
        this.votos = {};
        this.selecao = this.naSala = this.iniciando = this.aplicando = false;
        $('btn-undo').classList.remove('hidden');
        $('sala-box').classList.replace('flex', 'hidden');
        this.status('');
        this.renderSala();
        atualizarMenuOnline();
    },
};
