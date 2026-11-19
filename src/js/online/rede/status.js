// ── Rede: textos de situação e lista da sala na tela ──
// Parte do Rede (modo online). Os métodos são juntados em rede.js; use sempre Rede.nome(...).
import { CONFIG } from '../../motor/config.js';
import { state, teams } from '../../partida/estado.js';
import { gameRunning } from '../../partida/loop.js';
import { $ } from '../../nucleo/dom.js';

export default {
    status(texto) {
        document.querySelectorAll('.online-status').forEach((el) => {
            el.innerText = texto || '';
            if (el.id !== 'online-status') el.classList.toggle('hidden', !texto || !this.ativo());
        });
    },
    // Texto padrão conforme a fase: saguão, seleção ou partida.
    statusSala() {
        const L = (j) => CONFIG.players[j].label,
            lista = this.listaSala(),
            total = lista.length;
        if (!total) return 'Conectado! Aguardando o anfitrião…';
        const juntar = (js) => js.map(L).join(' e ');
        const fora = this.ausentes(),
            trio = total > 2;
        const caiu = fora.length
            ? `${juntar(fora)} ${fora.length > 1 ? 'desconectaram' : 'desconectou'} — aguardando reconexão`
            : '';
        let t;
        if (gameRunning && state) t = caiu ? `${caiu} (sala ${this.codigo})` : `Online · você é o ${L(this.eu)}`;
        else if (!this.selecao) {
            const n = lista.filter((x) => x.estado === 'anfitriao' || x.estado === 'conectado').length;
            t =
                this.papel === 'anfitriao'
                    ? `Sala criada (${n}/${total}) — envie o código ${trio ? 'aos outros jogadores' : 'ao adversário'} e aguarde…`
                    : `Você é o ${L(this.eu)} (${n}/${total}) — aguardando os outros jogadores…`;
        } else if (caiu) t = caiu;
        else {
            const falta = lista.filter((x) => !x.pronto && x.jogador !== this.eu).map((x) => x.jogador);
            const euPronto = (teams[this.eu] || []).length === CONFIG.teamSize;
            if (!euPronto)
                t = falta.length
                    ? trio
                        ? `Todos conectados — montem as equipes (${lista.filter((x) => x.pronto).length}/${total} prontas)`
                        : 'Adversário conectado — montem as equipes'
                    : trio
                      ? 'Os outros já escolheram — confirme sua equipe.'
                      : 'O adversário já escolheu — confirme sua equipe.';
            else t = falta.length ? `Aguardando a equipe do ${juntar(falta)}…` : 'Equipes prontas — iniciando…';
        }
        return this.alerta ? `${this.alerta} · ${t}` : t;
    },
    atualizarStatus() {
        if (!this.ativo() || !this.naSala) return;
        if (this.papel === 'convidado' && !this.conectado()) return; // mensagens de reconexão
        this.status(this.statusSala());
    },
    // Anfitrião: avisa todos sobre as vagas e atualiza a própria tela.
    atualizarSala() {
        if (this.papel !== 'anfitriao') return;
        this.enviar({ t: 'sala', sala: this.infoSala(), selecao: this.selecao, votos: this.votos });
        this.renderSala();
        this.atualizarStatus();
    },
    renderSala() {
        const ul = $('sala-jogadores');
        if (!ul) return;
        const lista = this.ativo() && this.naSala ? this.listaSala() : [];
        ul.classList.toggle('hidden', !lista.length);
        ul.classList.toggle('flex', lista.length > 0);
        const txt = (x) =>
            ({
                anfitriao: 'anfitrião',
                livre: 'aguardando…',
                desconectado: 'desconectado',
                conectado: this.selecao ? (x.pronto ? 'equipe pronta ✓' : 'escolhendo…') : 'conectado',
            })[x.estado];
        const cor = (x) =>
            x.estado === 'livre'
                ? 'text-gray-500'
                : x.estado === 'desconectado'
                  ? 'text-red-300'
                  : x.pronto && this.selecao
                    ? 'text-green-300'
                    : 'text-gray-300';
        ul.innerHTML = lista
            .map((x) => {
                const p = CONFIG.players[x.jogador],
                    cheio = x.estado === 'anfitriao' || x.estado === 'conectado';
                return (
                    `<li class="flex items-center gap-2 rounded-xl bg-gray-800/60 border border-gray-700 px-3 py-1.5 text-sm">` +
                    `<span class="w-3 h-3 rounded-full shrink-0" style="border:2px solid ${p.bannerBorder};background:${cheio ? p.bannerBorder : 'transparent'}"></span>` +
                    `<span class="font-bold tracking-wide">${p.label}${x.jogador === this.eu ? ' <span class="text-gray-400 font-normal">(você)</span>' : ''}</span>` +
                    `<span class="ml-auto text-xs font-semibold ${cor(x)}">${txt(x)}</span></li>`
                );
            })
            .join('');
    },
};
