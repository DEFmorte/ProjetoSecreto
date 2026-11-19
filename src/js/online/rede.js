// ── Online (P2P via WebRTC com PeerJS) ──
// O anfitrião (Jogador 1) é a autoridade: guarda o estado, aplica as ações dos dois jogadores e envia o estado ao convidado
// (Jogador 2), que só desenha. Mensagens: convidado → {ola, equipe, acao, revanche, tchau}; anfitrião → {selecao, inicio, estado, aviso, tchau}.
const SALA_PREFIXO = 'testez-';
const SALA_LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SALA_TAMANHO = 6; // 32^6 ≈ 1 bilhão de códigos: inviável adivinhar uma sala
// Sorteio criptográfico (não previsível como Math.random). n caracteres de `letras`.
function sortearTexto(n, letras = SALA_LETRAS) {
    const v = new Uint32Array(n);
    crypto.getRandomValues(v);
    return Array.from(v, x => letras[x % letras.length]).join('');
}

const Rede = {
    papel: null,        // null (local) | 'anfitriao' | 'convidado'
    eu: 1,
    modo: 'duelo',      // modo da sala (definido pelo anfitrião ao criar)
    codigo: null,
    peer: null,
    conn: null,         // convidado: conexão com o anfitrião
    vagas: {},          // anfitrião: { jogador: { token, conn } } — conn null = desconectado (vaga reservada)
    token: null,        // convidado: identifica a própria vaga ao reconectar
    sala: [],           // convidado: última lista de jogadores enviada pelo anfitrião
    selecao: false,     // a sala já encheu (seleção/partida): quem cai mantém a vaga
    naSala: false,      // anfitrião com sala criada / convidado aceito numa vaga
    iniciando: false,
    alerta: null,       // versões diferentes do jogo
    votos: {},          // fim de partida: jogador → 'revanche' | 'nova' (todos precisam concordar)
    aplicando: false,   // anfitrião aplicando uma ação (libera Rules.canSelect para todas as equipes)
    tentativas: 0,
    timer: null,
    rolagemOriginal: null,

    ativo() { return this.papel !== null; },
    aberta(c) { return !!(c && c.open); },
    jogadoresSala() { return CONFIG.modos[this.modo].jogadores; },
    convidados() { return this.jogadoresSala().filter(j => j !== 1); },
    // Convidado: ligado ao anfitrião. Anfitrião: todas as vagas com conexão aberta.
    conectado() {
        if (this.papel === 'anfitriao') return this.convidados().every(j => this.vagas[j] && this.aberta(this.vagas[j].conn));
        return this.aberta(this.conn);
    },
    jogadorDe(c) { return +(Object.keys(this.vagas).find(j => c && this.vagas[j].conn === c) || 0); },
    // Situação de cada vaga: anfitriao | livre | conectado | desconectado (+ equipe pronta).
    infoSala() {
        return this.jogadoresSala().map(j => ({
            jogador: j,
            estado: j === 1 ? 'anfitriao' : !this.vagas[j] ? 'livre' : this.aberta(this.vagas[j].conn) ? 'conectado' : 'desconectado',
            pronto: (teams[j] || []).length === CONFIG.teamSize
        }));
    },
    listaSala() { return this.papel === 'anfitriao' ? this.infoSala() : this.sala; },
    ausentes() { return this.listaSala().filter(x => x.estado === 'desconectado').map(x => x.jogador); },
    // Identifica a versão do jogo (todos precisam do mesmo código). A impressão digital do código vem na
    // <meta name="versao-jogo">, que o servidor de desenvolvimento e o build preenchem (ferramentas/projeto.mjs).
    versao() {
        const m = document.querySelector('meta[name="versao-jogo"]');
        return `${Object.keys(CONFIG.estrelas).length}:${m ? m.content : 'sem-versao'}`;
    },

    status(texto) {
        document.querySelectorAll('.online-status').forEach(el => {
            el.innerText = texto || '';
            if (el.id !== 'online-status') el.classList.toggle('hidden', !texto || !this.ativo());
        });
    },

    // Texto padrão conforme a fase: saguão, seleção ou partida.
    statusSala() {
        const L = j => CONFIG.players[j].label, lista = this.listaSala(), total = lista.length;
        if (!total) return 'Conectado! Aguardando o anfitrião…';
        const juntar = js => js.map(L).join(' e ');
        const fora = this.ausentes(), trio = total > 2;
        const caiu = fora.length ? `${juntar(fora)} ${fora.length > 1 ? 'desconectaram' : 'desconectou'} — aguardando reconexão` : '';
        let t;
        if (gameRunning && state) t = caiu ? `${caiu} (sala ${this.codigo})` : `Online · você é o ${L(this.eu)}`;
        else if (!this.selecao) {
            const n = lista.filter(x => x.estado === 'anfitriao' || x.estado === 'conectado').length;
            t = this.papel === 'anfitriao'
                ? `Sala criada (${n}/${total}) — envie o código ${trio ? 'aos outros jogadores' : 'ao adversário'} e aguarde…`
                : `Você é o ${L(this.eu)} (${n}/${total}) — aguardando os outros jogadores…`;
        } else if (caiu) t = caiu;
        else {
            const falta = lista.filter(x => !x.pronto && x.jogador !== this.eu).map(x => x.jogador);
            const euPronto = (teams[this.eu] || []).length === CONFIG.teamSize;
            if (!euPronto) t = falta.length ? (trio ? `Todos conectados — montem as equipes (${lista.filter(x => x.pronto).length}/${total} prontas)` : 'Adversário conectado — montem as equipes')
                : (trio ? 'Os outros já escolheram — confirme sua equipe.' : 'O adversário já escolheu — confirme sua equipe.');
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
        const txt = x => ({
            anfitriao: 'anfitrião', livre: 'aguardando…', desconectado: 'desconectado',
            conectado: this.selecao ? (x.pronto ? 'equipe pronta ✓' : 'escolhendo…') : 'conectado'
        })[x.estado];
        const cor = x => x.estado === 'livre' ? 'text-gray-500' : x.estado === 'desconectado' ? 'text-red-300' : x.pronto && this.selecao ? 'text-green-300' : 'text-gray-300';
        ul.innerHTML = lista.map(x => {
            const p = CONFIG.players[x.jogador], cheio = x.estado === 'anfitriao' || x.estado === 'conectado';
            return `<li class="flex items-center gap-2 rounded-xl bg-gray-800/60 border border-gray-700 px-3 py-1.5 text-sm">`
                + `<span class="w-3 h-3 rounded-full shrink-0" style="border:2px solid ${p.bannerBorder};background:${cheio ? p.bannerBorder : 'transparent'}"></span>`
                + `<span class="font-bold tracking-wide">${p.label}${x.jogador === this.eu ? ' <span class="text-gray-400 font-normal">(você)</span>' : ''}</span>`
                + `<span class="ml-auto text-xs font-semibold ${cor(x)}">${txt(x)}</span></li>`;
        }).join('');
    },

    // PeerJS vem embutido no arquivo (último <script>).
    carregar() {
        // O PeerJS vem embutido no fim da página; se ainda não foi lido (ex.: link ?sala=), espera o carregamento.
        if (window.Peer) return Promise.resolve();
        return new Promise((ok, erro) => {
            const conferir = () => window.Peer ? ok() : erro(new Error('Módulo online indisponível.'));
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', conferir, { once: true });
            else conferir();
        });
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
        try { await this.carregar(); } catch (e) { this.falhar(e.message); return; }
        if (this.papel === 'anfitriao') this.abrirSala();
    },

    abrirSala() {
        const codigo = sortearTexto(SALA_TAMANHO);
        const peer = this.peer = new window.Peer(SALA_PREFIXO + codigo);
        peer.on('open', () => {
            if (peer !== this.peer) return;
            this.codigo = codigo;
            mostrarCodigoSala();
            this.atualizarSala();
        });
        peer.on('connection', c => c.on('open', () => {
            if (peer !== this.peer) { c.close(); return; }
            this.ligar(c); // a vaga é definida no 'ola'
        }));
        peer.on('error', err => {
            if (peer !== this.peer) return;
            if (err.type === 'unavailable-id') { peer.destroy(); this.abrirSala(); return; } // código já em uso
            this.status(this.textoErro(err));
        });
        peer.on('disconnected', () => { if (peer === this.peer && !peer.destroyed) peer.reconnect(); });
    },

    async entrarSala(codigo) {
        codigo = String(codigo || '').trim().toUpperCase();
        if (!new RegExp(`^[A-Z0-9]{${SALA_TAMANHO}}$`).test(codigo)) { this.status(`Digite o código de ${SALA_TAMANHO} letras da sala.`); return; }
        this.iniciar('convidado');
        this.codigo = codigo;
        this.token = tokenDaSala(codigo);
        this.status(`Conectando à sala ${codigo}…`);
        try { await this.carregar(); } catch (e) { this.falhar(e.message); return; }
        if (this.papel !== 'convidado') return;
        const peer = this.peer = new window.Peer();
        peer.on('open', () => { if (peer === this.peer) this.conectar(); });
        peer.on('error', err => {
            if (peer !== this.peer) return;
            if (err.type === 'peer-unavailable') {
                if (this.tentativas > 0) this.reconectar();
                else this.status(`Sala ${this.codigo} não encontrada. Confira o código.`);
            } else this.status(this.textoErro(err));
        });
        peer.on('disconnected', () => { if (peer === this.peer && !peer.destroyed) peer.reconnect(); });
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
            c.on('data', msg => this.receber(msg, c));
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
        if (this.selecao) this.vagas[j].conn = null; // seleção/partida: a vaga fica reservada
        else delete this.vagas[j];                    // saguão: libera a vaga
        this.atualizarSala();
    },

    reconectar() {
        clearTimeout(this.timer);
        if (++this.tentativas > 10) { this.status('Não foi possível reconectar. Volte ao menu.'); return; }
        this.status(`Conexão perdida — tentando reconectar (${this.tentativas}/10)…`);
        this.timer = setTimeout(() => {
            if (!this.peer || this.papel !== 'convidado' || this.conectado()) return;
            if (this.peer.disconnected) this.peer.reconnect();
            this.conectar();
        }, 3000);
    },

    falhar(msg) { this.encerrar(false); $('online-status').innerText = msg; },

    // Convidado: para o anfitrião. Anfitrião: para todos os convidados conectados.
    enviar(msg) {
        if (this.papel === 'anfitriao') {
            let ok = false;
            for (const j of this.convidados()) if (this.enviarPara(j, msg)) ok = true;
            return ok;
        }
        if (!this.conectado()) return false;
        try { this.conn.send(msg); return true; } catch (e) { return false; }
    },

    // Anfitrião: para um convidado (número do jogador ou conexão).
    enviarPara(alvo, msg) {
        const c = typeof alvo === 'number' ? this.vagas[alvo] && this.vagas[alvo].conn : alvo;
        if (!this.aberta(c)) return false;
        try { c.send(msg); return true; } catch (e) { return false; }
    },

    enviarEstado() { if (this.papel === 'anfitriao') this.enviar({ t: 'estado', estado: snapshot() }); },

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
        let j = this.jogadorDe(c)
            || (token && js.find(j => this.vagas[j] && this.vagas[j].token === token))
            || js.find(j => !this.vagas[j])
            || js.find(j => !this.aberta(this.vagas[j].conn));
        if (!j) return 0;
        const v = this.vagas[j];
        if (v && v.conn && v.conn !== c) try { v.conn.close(); } catch (e) { }
        if (v && v.token !== token && !gameRunning && !this.iniciando) teams[j] = []; // outra pessoa: monta a própria equipe
        this.vagas[j] = { token, conn: c };
        return j;
    },

    encerrar(avisar = true) {
        clearTimeout(this.timer);
        if (avisar) this.enviar({ t: 'tchau' });
        const conns = [this.conn, ...Object.values(this.vagas).map(v => v.conn)], peer = this.peer;
        this.conn = this.peer = null;
        setTimeout(() => {
            for (const c of conns) try { c && c.close && c.close(); } catch (e) { }
            try { peer && peer.destroy(); } catch (e) { }
        }, avisar ? 200 : 0);
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

    // Quem pode fazer a ação: dono da decisão pendente (escolha/reação), atacante na rolagem, senão o dono da Estrela.
    podeAgir(acao, jogador) {
        if (!state || state.winner || !acao) return false;
        const pd = state.pending;
        const dono = id => { const p = Rules.pieceById(state, id); return p ? p.player : null; };
        if (acao.tipo === 'escolha' || acao.tipo === 'reacao') return !!pd && pd.tipo === acao.tipo && dono(pd.donoId) === jogador;
        if (acao.tipo === 'rolagem') return !!pd && pd.tipo === 'rolagem' && dono(pd.pieceId) === jogador;
        return !pd && dono(acao.pieceId) === jogador;
    },

    // ── Segurança: nada que chega pela rede vira código ──
    // Convidado: o estado vem do anfitrião, que pode ter um jogo adulterado. Textos perdem os caracteres que formam HTML
    // (< > " `), nomes e habilidades das Estrelas são refeitos a partir do CONFIG local e números são conferidos.
    estadoSeguro(json) {
        if (typeof json !== 'string' || json.length > 2e6) return null;
        let s;
        try { s = JSON.parse(json); } catch (e) { return null; }
        const proibidas = new Set(['__proto__', 'constructor', 'prototype']);
        const limpar = (v, prof) => {
            if (prof > 30) return null;
            if (typeof v === 'string') return v.replace(/[<>"`]/g, '');
            if (Array.isArray(v)) return v.map(x => limpar(x, prof + 1));
            if (v && typeof v === 'object') {
                const o = {};
                for (const [k, x] of Object.entries(v)) if (!proibidas.has(k)) o[k.replace(/[<>"`]/g, '')] = limpar(x, prof + 1);
                return o;
            }
            return typeof v === 'number' ? (Number.isFinite(v) ? v : 0) : v; // números, booleanos e null
        };
        s = limpar(s, 0);
        if (!s || typeof s !== 'object' || Array.isArray(s) || !Array.isArray(s.pieces)) return null;
        const tem = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
        const num = v => (typeof v === 'number' ? v : 0);
        s.pieces = s.pieces.filter(p => p && typeof p === 'object' && tem(CONFIG.estrelas, p.color) && p.stats && typeof p.stats === 'object');
        for (const p of s.pieces) {
            ['id', 'player', 'q', 'r', 'renome'].forEach(k => { p[k] = num(p[k]); });
            for (const k of Object.keys(p.stats)) if (k !== 'nome') p.stats[k] = num(p.stats[k]);
            p.stats.nome = CONFIG.estrelas[p.color].nome;
            p.habilidades = (Array.isArray(p.habilidades) ? p.habilidades : CONFIG.estrelas[p.color].habilidades || []).filter(id => tem(CONFIG.abilities, id));
            if (!Array.isArray(p.effects)) p.effects = [];
            // Objetos (shuriken): só os da Estrela, com posição numérica ou null (com ela).
            const objs = CONFIG.estrelas[p.color].objetos;
            if (objs) p.objetos = Object.fromEntries(objs.map(o => { const v = p.objetos && p.objetos[o]; return [o, v && typeof v === 'object' ? { q: num(v.q), r: num(v.r) } : null]; }));
            else delete p.objetos;
        }
        if (!Array.isArray(s.log)) s.log = [];
        s.log = s.log.map(l => String(l ?? ''));
        // Efeitos visuais: só eventos conhecidos, números e habilidades do CONFIG local.
        const par = x => (Array.isArray(x) ? x.slice(0, 3).map(num) : null);
        s.fx = (Array.isArray(s.fx) ? s.fx.slice(-60) : []).filter(e => e && typeof e === 'object' && ['hab', 'rol', 'dano', 'mov', 'renome'].includes(e.k)).map(e => {
            const o = { k: e.k };
            for (const k of ['n', 'de', 'para', 'id', 'q', 'r', 'v', 'abs', 'vida', 'ok', 'f', 'p']) if (k in e) o[k] = e[k] === null || !Number.isFinite(Number(e[k])) ? null : num(e[k]);
            for (const k of ['al', 'cam', 'z']) if (Array.isArray(e[k])) o[k] = e[k].slice(0, 40).map(par).filter(Boolean);
            if (tem(CONFIG.abilities, e.h)) o.h = e.h;
            return o;
        });
        s.fxN = num(s.fxN);
        if ('ordem' in s && !(Array.isArray(s.ordem) && s.ordem.every(j => typeof j === 'number' && tem(CONFIG.players, String(j))))) delete s.ordem;
        return s;
    },

    // Anfitrião: ação do convidado refeita só com campos conhecidos e tipos esperados (o motor ainda valida as regras).
    normalizarAcao(a) {
        if (!a || typeof a !== 'object') return null;
        const inteiro = v => Number.isInteger(v) && Math.abs(v) < 1e6;
        const tipos = ['mover', 'habilidade', 'escolha', 'rolagem', 'reacao', 'coletar', 'encerrar'];
        if (!tipos.includes(a.tipo)) return null;
        const out = { tipo: a.tipo };
        if (a.pieceId !== undefined) { if (!inteiro(a.pieceId)) return null; out.pieceId = a.pieceId; }
        if (a.tipo === 'mover') {
            if (!Array.isArray(a.path) || a.path.length > 64 || !a.path.every(h => h && inteiro(h.q) && inteiro(h.r))) return null;
            out.path = a.path.map(h => ({ q: h.q, r: h.r }));
        }
        if (a.tipo === 'habilidade') {
            if (typeof a.abilityId !== 'string' || !Object.prototype.hasOwnProperty.call(CONFIG.abilities, a.abilityId)) return null;
            out.abilityId = a.abilityId;
            const ch = a.choice;
            if (ch === undefined || ch === null) out.choice = null;
            // inteiro (Estrela/direção/opção) | avanço "dir:passos:q,r" | trajeto "dir:passos" | zona "q,r" | várias Estrelas "id" / "id1,id2" | salto "id:q,r"
            else if (inteiro(ch) || (typeof ch === 'string' && /^(-?\d{1,3}:-?\d{1,3}:-?\d{1,3},-?\d{1,3}|\d{1,2}:\d{1,2}|-?\d{1,3},-?\d{1,3}|\d{1,6}(,\d{1,6})?|\d{1,6}:-?\d{1,3},-?\d{1,3})$/.test(ch))) out.choice = ch;
            else return null;
            if (a.pagamento !== undefined && a.pagamento !== null) {
                if (a.pagamento !== 'amago' && a.pagamento !== 'alternativo') return null;
                out.pagamento = a.pagamento;
            }
        }
        // escolha: Estrela (inteiro), zona "q,r" (Dar no Pé) ou null (não usar uma passiva opcional)
        if (a.tipo === 'escolha') { if (a.targetId !== null && !inteiro(a.targetId) && !(typeof a.targetId === 'string' && /^-?\d{1,3},-?\d{1,3}$/.test(a.targetId))) return null; out.targetId = a.targetId; }
        if (a.tipo === 'rolagem') out.hit = a.hit === true;
        if (a.tipo === 'reacao') out.usar = a.usar === true;
        return out;
    },

    // c: conexão de origem (o anfitrião usa para saber qual jogador mandou).
    receber(msg, c) {
        if (!msg || typeof msg !== 'object' || !this.ativo()) return;
        const anfitriao = this.papel === 'anfitriao';
        if (!anfitriao && c && c !== this.conn) return;
        const j = anfitriao ? this.jogadorDe(c) : 0;
        switch (msg.t) {
            case 'ola': {
                if (!anfitriao || !c) return;
                const vaga = this.ocuparVaga(c, typeof msg.token === 'string' && /^[a-z0-9]{1,64}$/.test(msg.token) ? msg.token : null);
                if (!vaga) {
                    this.enviarPara(c, { t: 'cheia' });
                    setTimeout(() => { try { c.close && c.close(); } catch (e) { } }, 300);
                    return;
                }
                this.enviarPara(c, { t: 'bemvindo', jogador: vaga, modo: this.modo });
                if (msg.versao !== this.versao()) {
                    this.alerta = 'Atenção: versões diferentes do jogo';
                    this.enviarPara(c, { t: 'aviso', texto: `${this.alerta}.` });
                }
                if (this.selecao) this.enviarFase(vaga);
                else if (this.conectado()) { this.selecao = true; entrarSelecaoOnline(); this.enviar({ t: 'selecao' }); }
                this.atualizarSala();
                if (this.selecao) this.tentarIniciar();
                return;
            }
            case 'equipe': {
                if (!anfitriao || !j || gameRunning || !this.selecao) return;
                const cores = Array.isArray(msg.cores) ? msg.cores.filter(c => CONFIG.estrelas[c]) : [];
                if (cores.length !== CONFIG.teamSize || new Set(cores).size !== cores.length) return;
                teams[j] = cores;
                this.atualizarSala();
                this.tentarIniciar();
                return;
            }
            case 'acao':
                if (anfitriao && j && gameRunning) {
                    const acao = this.normalizarAcao(msg.acao);
                    if (!acao || !executar(acao, j)) this.enviarPara(c, { t: 'estado', estado: snapshot() }); // recusada: volta ao estado certo
                }
                return;
            case 'voto':
                if (anfitriao && j) this.registrarVoto(j, msg.opcao);
                return;
            case 'tchau':
                if (anfitriao) { this.perdeu(c); try { c && c.close && c.close(); } catch (e) { } return; }
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
                this.sala = Array.isArray(msg.sala) ? msg.sala.filter(x => x && CONFIG.players[x.jogador]) : [];
                this.selecao = !!msg.selecao;
                this.votos = {};
                if (msg.votos && typeof msg.votos === 'object')
                    for (const [k, v] of Object.entries(msg.votos)) if (CONFIG.players[k] && OPCOES_VOTO[v]) this.votos[k] = v;
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
                const eq = Array.isArray(msg.equipe) ? msg.equipe.filter(c => CONFIG.estrelas[c]) : [];
                if (eq.length === CONFIG.teamSize) { // reconectou: a equipe já confirmada continua valendo
                    teams[this.eu] = [...eq];
                    selectedColorsForMenu = [...eq];
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
                state = est;
                afterStateChange();
                return;
            }
            case 'aviso':
                this.status(String(msg.texto || ''));
                return;
        }
    },

    // Anfitrião: fim de jogo → todos voltam à seleção, conectados na mesma sala.
    // Fim de partida online: cada um vota em revanche ou nova partida; acontece quando todos escolhem a mesma.
    votar(opcao) {
        if (!state || !state.winner || !OPCOES_VOTO[opcao]) return;
        if (this.papel === 'anfitriao') { this.registrarVoto(1, opcao); return; }
        this.votos[this.eu] = opcao; // o anfitrião confirma na próxima atualização da sala
        this.enviar({ t: 'voto', opcao });
        atualizarFimDePartida();
    },

    registrarVoto(j, opcao) {
        if (this.papel !== 'anfitriao' || !state || !state.winner || !OPCOES_VOTO[opcao]) return;
        this.votos[j] = opcao;
        if (this.jogadoresSala().every(x => this.votos[x] === opcao)) {
            this.votos = {};
            if (opcao === 'revanche') beginMatch(); else this.novaPartida();
            return;
        }
        this.atualizarSala();
        atualizarFimDePartida();
    },

    textoVotos() {
        const js = this.jogadoresSala(), L = j => CONFIG.players[j].label + (j === this.eu ? ' (você)' : '');
        const partes = Object.keys(OPCOES_VOTO).map(op => [op, js.filter(j => this.votos[j] === op)]).filter(([, v]) => v.length)
            .map(([op, v]) => `<b class="text-white">${OPCOES_VOTO[op]}:</b> ${v.map(L).join(', ')}`);
        const falta = js.filter(j => !this.votos[j]);
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
        if (!this.jogadoresSala().every(j => (teams[j] || []).length === CONFIG.teamSize)) return;
        this.iniciando = true;
        startGame();
    }
};

// Convidado: token guardado na aba para recuperar a mesma vaga ao reconectar/recarregar.
function tokenDaSala(codigo) {
    const chave = 'testez_token_' + codigo;
    let t = null;
    try { t = sessionStorage.getItem(chave); } catch (e) { }
    if (!t) {
        t = sortearTexto(24, 'abcdefghijklmnopqrstuvwxyz0123456789');
        try { sessionStorage.setItem(chave, t); } catch (e) { }
    }
    return t;
}

function mostrarCodigoSala() {
    if (!Rede.codigo) return;
    $('sala-codigo').innerText = Rede.codigo;
    $('sala-box').classList.replace('hidden', 'flex');
}

// Menu online: dentro de uma sala some a parte de criar/entrar e o botão vira "Sair da sala".
function atualizarMenuOnline() {
    const dentro = Rede.ativo() && Rede.naSala;
    $('online-entrada').classList.toggle('hidden', dentro);
    $('online-entrada').classList.toggle('flex', !dentro);
    $('btn-online-back').innerHTML = `${dentro ? '← Sair da sala' : '← Menu'} <span class="kbd">Esc</span>`;
}

const dicaEquipeConfirmada = () => `EQUIPE CONFIRMADA — AGUARDANDO ${Rede.jogadoresSala().length > 2 ? 'OS OUTROS JOGADORES' : 'O ADVERSÁRIO'}…`;

function montarBotoesCriarSala() {
    const box = $('criar-sala-botoes');
    box.innerHTML = '';
    Object.entries(CONFIG.modos).filter(([id]) => !botsDoModo(id).length).forEach(([id, md], i) => {
        const b = document.createElement('button');
        b.id = i === 0 ? 'btn-criar-sala' : `btn-criar-sala-${id}`;
        b.dataset.modo = id;
        b.className = 'pointer-events-auto menu-btn primario';
        b.innerHTML = `<span class="text-left"><span class="block">Criar sala · ${md.nome}</span><span class="block text-[10px] font-semibold normal-case tracking-normal text-blue-100">${md.desc} · mapa ${CONFIG.mapas[md.mapa].nome}</span></span>`;
        b.addEventListener('click', () => Rede.criarSala(id));
        box.appendChild(b);
    });
}

// Online, cada jogador só seleciona/age com as próprias Estrelas (o anfitrião libera as duas ao aplicar ações).
// Contra o Bot, o mesmo vale para as Estrelas do Bot.
{
    const base = Rules.canSelect;
    Rules.canSelect = function (state, piece) {
        return base.call(this, state, piece) && (!Rede.ativo() || Rede.aplicando || piece.player === Rede.eu)
            && (Bot.aplicando || IA.aplicando || !Bot.ehBot(piece.player, state)); // contra Bots: as Estrelas deles só agem pelo Bot
    };
}

function mostrarPainelMenu(id) {
    ['main-menu', 'modo-menu', 'online-menu', 'selection-menu'].forEach(x => {
        const el = $(x);
        el.classList.toggle('hidden', x !== id);
        if (x !== 'main-menu') el.classList.toggle('flex', x === id);
    });
}

function abrirMenuOnline() {
    mostrarPainelMenu('online-menu');
    if (!Rede.ativo()) Rede.status('');
    $('input-codigo').focus();
}

function sairMenuOnline() {
    Rede.encerrar();
    mostrarPainelMenu('main-menu');
}

const emSelecaoOnline = () => Rede.ativo() && !$('selection-menu').classList.contains('hidden');

// Seleção online: cada jogador monta a própria equipe ao mesmo tempo.
function entrarSelecaoOnline() {
    teams = equipesVazias();
    selectedColorsForMenu = [];
    currentSelectingPlayer = Rede.eu;
    const menu = $('menu-screen');
    menu.style.display = 'flex';
    menu.classList.remove('hidden-menu');
    mostrarPainelMenu('selection-menu');
    renderSelectionTitle();
    updateSelectionUI();
    Rede.atualizarStatus();
}

function copiarLinkSala() {
    if (!Rede.codigo) return;
    const link = `${location.href.split(/[?#]/)[0]}?sala=${Rede.codigo}`;
    const ok = () => Rede.status(location.protocol === 'file:' ? 'Link copiado (só funciona com o jogo hospedado na internet).' : `Link copiado! Envie ${Rede.jogadoresSala().length > 2 ? 'aos outros jogadores' : 'ao adversário'}.`);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(ok, () => prompt('Copie o link:', link));
    else prompt('Copie o link:', link);
}
