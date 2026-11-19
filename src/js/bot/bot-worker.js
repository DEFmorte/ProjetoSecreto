// ── Bot em segundo plano (Web Worker) ──
// O Bot pensa numa cópia do motor (CONFIG, Rules, Engine e o próprio Bot) que roda em paralelo (worker.js): a tela
// continua fluida enquanto ele calcula. Se o navegador não deixar criar o Worker, ou ele falhar, o Bot volta a pensar
// na própria página (como antes, com pequenas pausas na animação).
const BotWorker = {
    w: null, url: null, falhou: false, seq: 0, espera: null, timer: null,
    limiteMs: 15000, // sem resposta nesse tempo: desiste do Worker
    // Endereço do Worker. Em desenvolvimento, é o arquivo js/bot/worker.js. No build (arquivo único), o worker.js vem
    // embutido como texto (<script type="text/plain" id="fonte-bot-worker">) e o lugar do importScripts (/*@motor@*/)
    // recebe o código dos scripts do motor desta página (marcados com data-worker).
    endereco() {
        const embutido = document.getElementById('fonte-bot-worker');
        if (!embutido) return 'js/bot/worker.js';
        const motor = [...document.querySelectorAll('script[data-worker]')].map(s => s.textContent).join('\n');
        const src = embutido.textContent.replace('/*@motor@*/', () => motor);
        return URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    },
    // Cria o Worker na primeira vez (true = disponível).
    iniciar() {
        if (this.w) return true;
        if (this.falhou) return false;
        try {
            if (typeof Worker !== 'function' || typeof Blob !== 'function') throw new Error('navegador sem Worker');
            if (!this.url) this.url = this.endereco();
            this.w = new Worker(this.url);
            this.w.onmessage = (e) => this.resposta(e.data);
            this.w.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); this.desistir(e && e.message || 'erro no Worker'); };
        } catch (e) { this.desistir(e && e.message || e); }
        return !!this.w;
    },
    desistir(motivo) {
        console.warn('[TESTE Z] Bot em segundo plano indisponível, pensando na página:', motivo);
        this.falhou = true;
        this.encerrar();
    },
    encerrar() {
        clearTimeout(this.timer); this.timer = null;
        if (this.w) { this.w.terminate(); this.w = null; }
        const e = this.espera; this.espera = null;
        if (e) e.nao('cancelado');
    },
    // Uma pergunta por vez: uma nova cancela a anterior (o Worker é recriado, para não esperar a conta velha).
    pedir(dados) {
        if (this.espera) this.encerrar();
        if (!this.iniciar()) return Promise.reject(new Error('sem Worker'));
        const id = ++this.seq;
        return new Promise((sim, nao) => {
            this.espera = { id, sim, nao };
            this.timer = setTimeout(() => this.desistir('sem resposta'), this.limiteMs);
            this.w.postMessage({ id, ...dados });
        });
    },
    resposta(m) {
        const e = this.espera;
        if (!e || !m || m.id !== e.id) return;
        clearTimeout(this.timer); this.timer = null;
        this.espera = null;
        this.ultimoMs = m.ms;
        if (m.erro) { console.error('Bot (Worker):', m.erro); e.nao(new Error(m.erro)); }
        else e.sim(m.acao || null);
    },
    cancelar() { if (this.espera) this.encerrar(); }
};
