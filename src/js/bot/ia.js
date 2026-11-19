// ── IA do Bot (decisão pura) ──
// Escolhe a jogada de quem decide agora (IA.decisor), testando as opções numa cópia do estado (mover, usar
// habilidade, coletar Renome, encerrar a jogada) e ficando com a de maior pontuação (IA.avaliar).
// Nas simulações, cada ataque vale pela chance de acerto; reações e escolhas do adversário contam como o pior caso.
// Não usa nada da tela: roda na página, no Worker (js/bot/worker.js) e nos testes. Quem joga na partida é o Bot
// (bot.js), que pede a decisão para a IA.
import { CONFIG } from '../motor/config.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';

export const IA = {
    // Níveis (escolhidos no menu "Contra Bots", guardados na partida em state.botNivel):
    //   orcamentoMs: tempo máximo de cálculo por decisão (depois disso as simulações ficam mais simples)
    //   ruido: variação aleatória na pontuação (nem sempre a jogada perfeita)
    //   agressividade: peso das Estrelas inimigas (Vida, abates) em relação às próprias
    //   previsao: { candidatos, amostras, rapido } = as `candidatos` melhores jogadas são testadas jogando o resto do turno
    //     e o turno seguinte do adversário (cada lado com a melhor jogada pela pontuação imediata; dados sorteados
    //     `amostras` vezes); rapido = nessa previsão cada lado decide sem considerar errar/acertar (mais rápido, pior).
    //     null = não prevê.
    niveis: {
        normal:  { nome: 'Normal',  orcamentoMs: 400,  ruido: 1.5, agressividade: 1.35, previsao: null },
        dificil: { nome: 'Difícil', orcamentoMs: 1500, ruido: 0.3, agressividade: 1.35, previsao: { candidatos: 6, amostras: 2, rapido: false } }
    },
    nivelPadrao: 'normal',
    maxPassos: 10,      // passos por jogada de uma Estrela (proteção contra laço)
    aplicando: false,   // simulando uma ação (libera Rules.canSelect para as Estrelas do Bot)
    nivelAtual: null, passos: 0, rapido: false, cortou: false, amostra: 0, amostraBase: 0, cacheAlcance: {}, cacheChance: {},

    nivel() { return this.niveis[this.nivelAtual] || this.niveis[this.nivelPadrao]; },
    get orcamentoMs() { return this.nivel().orcamentoMs; },
    get ruido() { return this.nivel().ruido; },
    get agressividade() { return this.nivel().agressividade; },

    // Quem decide agora: o dono da decisão pendente (reação/escolha/rolagem); senão o jogador da vez.
    decisor(s) {
        if (!s || s.winner) return null;
        const pd = s.pending;
        if (pd) { const p = Rules.pieceById(s, pd.tipo === 'rolagem' ? pd.pieceId : pd.donoId); return p ? p.player : null; }
        const b = Rules.currentBlock(s);
        return b ? b.player : null;
    },

    // Melhor ação para o estado `s` (não altera `s`). opcoes: nivel (id em IA.niveis), passos (passos já dados
    // pela Estrela ativa nesta jogada, para não entrar em laço). Retorna a ação no formato de aplicarAcao, ou null.
    decidir(s, { nivel = null, passos = 0 } = {}) {
        this.nivelAtual = nivel; this.passos = passos;
        const eu = this.decisor(s), modo = CONFIG.rules.attackRoll.mode;
        this.inicio = performance.now(); this.sims = 0;
        this.aplicando = true;
        CONFIG.rules.attackRoll.mode = 'manual'; // simulações: a rolagem fica pendente e vira chance de acerto
        try {
            const raiz = this.clonar(s, true), pd = raiz.pending;
            if (pd) {
                if (pd.tipo === 'rolagem') return { tipo: 'rolagem', hit: Engine.rng() < this.chance(raiz) };
                const opcoes = pd.tipo === 'reacao' ? [false, true] : [...pd.opcoes];
                const prev = this.nivel().previsao;
                let melhor = null;
                for (const o of opcoes) {
                    const c = this.clonar(raiz);
                    this.resolver(c, o);
                    const v = (prev ? this.rodar(c, [], 0, eu, false, 0, f => this.prever(f, eu, prev.amostras)) : this.rodar(c, [], 0, eu)) + this.sorteio();
                    if (!melhor || v > melhor.v) melhor = { v, o };
                }
                return pd.tipo === 'reacao' ? { tipo: 'reacao', usar: melhor.o } : { tipo: 'escolha', targetId: melhor.o };
            }
            const ativa = Rules.activePiece(raiz);
            const pecas = ativa ? [ativa] : Rules.pendingIds(raiz).map(id => Rules.pieceById(raiz, id));
            const lista = [];
            for (const p of pecas) {
                if (!Rules.canSelect(raiz, p)) continue;
                lista.push(...this.melhorPlano(raiz, p, eu, this.passos >= this.maxPassos, true));
            }
            if (!lista.length) return null;
            lista.sort((a, b) => b.v - a.v);
            return this.escolherComPrevisao(raiz, lista, eu).acao;
        } finally {
            CONFIG.rules.attackRoll.mode = modo;
            this.aplicando = false;
        }
    },

    // Planos de uma Estrela: [ação] [ação, mover] [mover] [mover, ação] (sempre terminando a jogada) ou encerrar já.
    // Só o 1º passo do melhor plano é feito; depois o Bot decide de novo com o resultado real (dados, reações).
    // Retorna { v, acao, passos } (passos = o plano inteiro); `todos` = lista com o melhor plano de cada 1º passo.
    melhorPlano(raiz, p, eu, soEncerrar = false, todos = false) {
        const fim = { tipo: 'encerrar', pieceId: p.id };
        let melhor = { v: this.rodar(this.clonar(raiz), [fim], 0, eu) + 0.5 + this.sorteio(), acao: fim, passos: [fim] }; // encerrar: leve preferência no empate
        const lista = [melhor];
        if (soEncerrar) return todos ? lista : melhor;
        const tenta = (v, acao, passos) => {
            v += this.sorteio();
            if (todos && v > -Infinity) lista.push({ v, acao, passos });
            if (v > melhor.v) melhor = { v, acao, passos };
        };
        // Ação no lugar (e depois, se der, um movimento para uma zona melhor)
        for (const ac of this.acoes(raiz, p)) {
            const s2 = this.clonar(raiz);
            if (!this.aplicar(s2, ac)) continue;
            this.finalizar(s2);
            const q = Rules.pieceById(s2, p.id);
            let v = -Infinity, passos = [ac, fim];
            if (!s2.pending && !s2.winner && q && Rules.canSelect(s2, q) && Rules.movementLeft(q) > 0 && !this.estourou()) {
                for (const d of this.destinos(s2, q)) {
                    const mv = { tipo: 'mover', pieceId: p.id, path: d.path }, x = this.rodar(this.clonar(s2), [mv, fim], 0, eu);
                    if (x > v) { v = x; passos = [ac, mv, fim]; }
                }
            }
            const parado = this.rodar(s2, [fim], 0, eu, true);
            if (parado >= v) { v = parado; passos = [ac, fim]; }
            tenta(v, ac, passos);
        }
        // Mover (e depois, se der, uma ação na zona nova)
        for (const d of this.destinos(raiz, p)) {
            const mv = { tipo: 'mover', pieceId: p.id, path: d.path };
            const s1 = this.clonar(raiz);
            if (!this.aplicar(s1, mv)) continue;
            this.finalizar(s1);
            const q = Rules.pieceById(s1, p.id);
            let v = this.rodar(this.clonar(s1), [fim], 0, eu, true) - 0.1, passos = [mv, fim]; // mover à toa: leve custo
            if (!s1.pending && !s1.winner && q && Rules.canSelect(s1, q) && !this.estourou()) {
                for (const ac of this.acoes(s1, q)) {
                    const x = this.rodar(this.clonar(s1), [ac, fim], 0, eu);
                    if (x > v) { v = x; passos = [mv, ac, fim]; }
                }
            }
            tenta(v, mv, passos);
        }
        return todos ? lista : melhor;
    },

    // Nível com previsão: as melhores jogadas (pela pontuação imediata) são jogadas até o fim do turno do adversário
    // e comparadas pelo resultado. Sem previsão (ou sem tempo), fica a melhor pela pontuação imediata.
    escolherComPrevisao(raiz, lista, eu) {
        const prev = this.nivel().previsao;
        if (!prev || lista.length < 2 || this.estourou()) return lista[0];
        const vistos = new Set(), cands = [];
        for (const c of lista) { // um candidato por 1º passo
            const k = JSON.stringify(c.acao);
            if (vistos.has(k)) continue;
            vistos.add(k); cands.push(c);
            if (cands.length >= prev.candidatos) break;
        }
        let melhor = null;
        for (const c of cands) {
            if (this.estourou()) break;
            this.cortou = false;
            const v = this.rodar(this.clonar(raiz), c.passos, 0, eu, false, 0, f => this.prever(f, eu, prev.amostras)) + this.sorteio();
            if (this.cortou) break; // o tempo acabou no meio: a previsão ficou incompleta e não vale para comparar
            if (!melhor || v > melhor.v) melhor = { ...c, v };
        }
        return melhor || lista[0];
    },
    // Joga a partida (numa cópia) até a volta da vez de `eu` depois de um turno do adversário; média de `amostras` sorteios.
    prever(s, eu, amostras) {
        if (s.winner) return this.avaliar(s, eu);
        let soma = 0;
        for (let k = 0; k < amostras; k++) {
            const c = k < amostras - 1 ? this.clonar(s) : s;
            this.amostra = k + this.amostraBase; // mesmos dados para todos os candidatos (comparação mais justa)
            this.simularAte(c, eu);
            soma += this.avaliar(c, eu);
        }
        return soma / amostras;
    },
    // Dado da previsão: sorteio próprio e repetível (não mexe no sorteio da partida). O mesmo ataque (rodada, atacante,
    // alvo, habilidade) tira o mesmo número em todos os candidatos, para a comparação entre eles não depender da sorte.
    dadoPrev(s) {
        const pd = s.pending, k = `${this.amostra}|${s.round}|${pd.pieceId}|${pd.alvos[pd.i]}|${pd.abilityId}|${pd.i}`;
        let h = 2166136261;
        for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
        h = Math.imul(h ^ (h >>> 15), h | 1); h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
        return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
    },
    simularAte(s, eu) {
        const rapido = this.rapido;
        this.rapido = (this.nivel().previsao || {}).rapido !== false; // dentro da previsão, cada lado decide sem ramificar os dados (mais rápido)
        try { this.simularAte_(s, eu); } finally { this.rapido = rapido; }
    },
    simularAte_(s, eu) {
        let viuOutro = false;
        for (let n = 0; n < 16; n++) {
            this.finalizar(s);
            if (s.winner) return;
            if (s.pending) { this.resolverRapido(s); continue; }
            const b = Rules.currentBlock(s);
            if (!b) return;
            if (b.player !== eu) viuOutro = true;
            else if (viuOutro) return;
            const p = Rules.activePiece(s) || Rules.pieceById(s, Rules.pendingIds(s)[0]);
            if (!p || !Rules.canSelect(s, p)) return;
            if (this.estourou()) { this.cortou = true; return; }
            const plano = this.melhorPlano(s, p, b.player);
            for (const ac of plano.passos) {
                this.aplicar(s, ac);
                this.finalizar(s);
                for (let i = 0; s.pending && i < 20; i++) { this.resolverRapido(s); this.finalizar(s); }
                if (s.winner) return;
            }
            const q = Rules.pieceById(s, p.id);
            if (q && Rules.activePiece(s) === q) { Rules.endActivation(s, q); } // proteção: a jogada sempre termina
        }
    },
    // Decisão pendente dentro da previsão: dado sorteado pela chance; reação/escolha = a melhor para o dono.
    resolverRapido(s) {
        const pd = s.pending;
        if (pd.tipo === 'rolagem') { this.resolver(s, this.dadoPrev(s) < this.chance(s)); return; }
        const dono = Rules.pieceById(s, pd.donoId), quem = dono ? dono.player : null;
        const opcoes = pd.tipo === 'reacao' ? [false, true] : [...pd.opcoes];
        let melhor = null;
        if (quem != null && !this.estourou()) for (const o of opcoes) {
            const c = this.clonar(s);
            this.resolver(c, o); this.finalizar(c);
            const v = this.avaliar(c, quem);
            if (!melhor || v > melhor.v) melhor = { v, o };
        }
        this.resolver(s, melhor ? melhor.o : opcoes[0]);
    },

    // Executa os passos numa cópia, resolvendo o que ficar pendente (chance de acerto, melhor/pior escolha).
    // folha: pontuação no fim dos passos (padrão: avaliar; o nível com previsão continua a partida).
    rodar(s, passos, i, eu, jaFinalizado = false, prof = 0, folha = null) {
        if (!jaFinalizado) this.finalizar(s);
        if (s.winner || prof > 25) return this.avaliar(s, eu);
        if (s.pending) return this.ramificar(s, c => this.rodar(c, passos, i, eu, false, prof + 1, folha), eu);
        if (i >= passos.length) return folha ? folha(s) : this.avaliar(s, eu);
        this.aplicar(s, passos[i]); // passo impossível (ex.: a Estrela foi derrotada por uma reação) é ignorado
        return this.rodar(s, passos, i + 1, eu, false, prof + 1, folha);
    },
    // O mesmo que finishChange() faz na partida real.
    finalizar(s) {
        Rules.removeDead(s);
        s.winner = CONFIG.rules.checkVictory(s);
        if (s.winner) { s.pending = null; s.triggers = []; return; }
        if (!s.pending) {
            const act = Rules.activePiece(s);
            if (act) Rules.autoEndIfExhausted(s, act);
            Rules.settle(s);
        }
    },
    aplicar(s, ac) {
        const p = Rules.pieceById(s, ac.pieceId);
        if (!p) return false;
        this.sims++;
        switch (ac.tipo) {
            case 'mover': return Engine.mover(s, p, ac.path.map(h => ({ q: h.q, r: h.r })));
            case 'habilidade': return Engine.use(s, p, ac.abilityId, ac.choice, ac.pagamento);
            case 'coletar': { const ok = Rules.coletarRenome(s, p); if (ok) Engine.resolveQueue(s); return ok; }
            case 'encerrar': if (!Rules.canSelect(s, p)) return false; Rules.endActivation(s, p); return true;
        }
        return false;
    },
    resolver(s, o) {
        const pd = s.pending;
        const ok = pd.tipo === 'reacao' ? Engine.resolveReaction(s, o) : pd.tipo === 'escolha' ? Engine.chooseTarget(s, o) : Engine.resolveRoll(s, o);
        if (!ok && s.pending === pd) s.pending = null; // nunca fica preso na mesma decisão
    },
    ramificar(s, cont, eu) {
        const pd = s.pending;
        const simples = this.estourou();
        if (pd.tipo === 'rolagem') {
            const c = this.chance(s);
            if (simples || this.rapido || c <= 0 || c >= 1) { this.resolver(s, c >= 0.5); return cont(s); }
            const acerto = this.clonar(s);
            this.resolver(acerto, true); this.resolver(s, false);
            return c * cont(acerto) + (1 - c) * cont(s);
        }
        const dono = Rules.pieceById(s, pd.donoId), meu = !!dono && dono.player === eu;
        const opcoes = pd.tipo === 'reacao' ? [false, true] : [...pd.opcoes];
        if (simples) { this.resolver(s, opcoes[0]); return cont(s); }
        let melhor = null;
        for (const o of opcoes) {
            const c = this.clonar(s);
            this.resolver(c, o);
            const v = cont(c);
            if (melhor === null || (meu ? v > melhor : v < melhor)) melhor = v;
        }
        return melhor;
    },
    estourou() { return performance.now() - this.inicio > this.orcamentoMs; },
    sorteio() { return (Engine.rng() - 0.5) * this.ruido; },
    clonar(s, raiz = false) {
        if (!raiz) return JSON.parse(JSON.stringify(s));
        const log = s.log, fx = s.fx;
        s.log = log.slice(-3); s.fx = undefined; // o registro (e o dos efeitos visuais) não importa para a decisão
        try { return JSON.parse(JSON.stringify(s)); } finally { s.log = log; s.fx = fx; }
    },

    // Opções de ação da Estrela agora: coletar Renome e cada habilidade × alvo × forma de pagamento.
    acoes(s, p) {
        const r = [];
        if (Rules.podeColetar(s, p)) r.push({ tipo: 'coletar', pieceId: p.id });
        for (const a of Engine.abilitiesOf(p)) {
            if (!Engine.canUse(s, p, a)) continue;
            const pags = Engine.modosPagamento(p, a), alvo = Engine.alvoDe(p, a);
            let chs = Engine.choices(s, p, alvo, Engine.restrict(s, p, a));
            if (alvo.tipo === 'zona' && !alvo.livre) { // zonas que atingem as mesmas Estrelas dão no mesmo: testa uma só
                const vistos = new Set();
                chs = chs.filter(ch => { const k = Engine.affected(s, p, alvo, ch).sort((x, y) => x - y).join(','); if (vistos.has(k)) return false; vistos.add(k); return true; });
            }
            for (const ch of chs)
                for (const pagamento of pags) r.push({ tipo: 'habilidade', pieceId: p.id, abilityId: a.id, choice: ch, pagamento });
        }
        return r;
    },
    // Zonas alcançáveis com o caminho mais curto (mesma regra de Engine.mover).
    destinos(s, p) {
        const max = Rules.movementLeft(p), r = [];
        const vistos = new Set([`${p.q},${p.r}`]), fila = [[{ q: p.q, r: p.r }]];
        while (fila.length) {
            const path = fila.shift(), ult = path[path.length - 1];
            if (path.length - 1 >= max) continue;
            for (const n of Rules.neighbors(ult.q, ult.r)) {
                const k = `${n.q},${n.r}`;
                if (vistos.has(k) || Engine.bloqueio(s, n)) continue;
                vistos.add(k);
                const novo = [...path, { q: n.q, r: n.r }];
                r.push({ q: n.q, r: n.r, path: novo });
                fila.push(novo);
            }
        }
        return r;
    },

    // Chance de acerto da rolagem pendente (dados do atacante + bônus contra dados do defensor + Esquiva).
    chance(s) {
        const pd = s.pending, cfg = CONFIG.rules.attackRoll;
        const atk = Rules.pieceById(s, pd.pieceId), alvo = Rules.pieceById(s, pd.alvos[pd.i]);
        if (!alvo) return 0;
        const bonusDef = Engine.bonusDefesa(atk, alvo, pd.ignora).bonus, bonusAtk = pd.bonusAtk || 0;
        const fx = pd.fixo || null; // rerolagem de um lado só: o outro total já está fixo
        const k = `${bonusAtk}:${bonusDef}:${fx ? (fx.atk != null ? 'a' + fx.atk : 'd' + fx.def) : ''}`;
        if (this.cacheChance[k] == null) {
            const dist = ({ count, sides }) => {
                let d = { 0: 1 };
                for (let i = 0; i < count; i++) {
                    const n = {};
                    for (const [v, pr] of Object.entries(d)) for (let f = 1; f <= sides; f++) n[+v + f] = (n[+v + f] || 0) + pr / sides;
                    d = n;
                }
                return Object.entries(d).map(([v, pr]) => [+v, pr]);
            };
            let c = 0;
            if (fx && fx.atk != null) { for (const [b, pb] of dist(cfg.defenderDice)) if (cfg.hit(fx.atk, b + bonusDef)) c += pb; }
            else if (fx && fx.def != null) { for (const [a, pa] of dist(cfg.attackerDice)) if (cfg.hit(a + bonusAtk, fx.def)) c += pa; }
            else for (const [a, pa] of dist(cfg.attackerDice)) for (const [b, pb] of dist(cfg.defenderDice)) if (cfg.hit(a + bonusAtk, b + bonusDef)) c += pa * pb;
            this.cacheChance[k] = c;
        }
        return this.cacheChance[k];
    },
    // Alcance de ataque de uma Estrela (maior alcance entre as habilidades que causam dano).
    alcance(p) {
        if (this.cacheAlcance[p.color] == null) {
            const al = Engine.abilitiesOf(p).filter(a => a.tipo !== 'passiva' && Engine.causaDano(a)).map(a => Engine.alcanceBase(Engine.alvoDe(p, a)));
            this.cacheAlcance[p.color] = Math.max(1, ...al);
        }
        const lim = (p.effects || []).filter(e => e.caracteristica === 'alcance' && e.maximo != null).map(e => e.maximo); // ex.: Fumacê
        return lim.length ? Math.max(1, Math.min(this.cacheAlcance[p.color], ...lim)) : this.cacheAlcance[p.color];
    },

    // Pontuação do estado para o jogador `eu`: Estrelas vivas, Vida, Armadura, Âmago, atributos, Renome e posição.
    // agressividade > 1: ferir/derrotar Estrelas inimigas vale mais que proteger as próprias (o Bot busca abates).
    avaliar(s, eu) {
        if (s.winner) return s.winner === eu ? 1e5 : s.winner === 'empate' ? -2e4 : -1e5;
        const meta = Rules.metaRenome(s) || 99;
        const minhas = s.pieces.filter(p => p.player === eu), deles = s.pieces.filter(p => p.player !== eu);
        const marcas = s.renome || [];
        const menor = (p, lista) => lista.length ? Math.min(...lista.map(x => Rules.hexDistance(p, x))) : 0;
        const alcance = p => CONFIG.rules.movementRange(p) + this.alcance(p);
        const valor = p => {
            const st = p.stats, fr = st.vida / Math.max(1, st.vidaMax);
            return 40 + 2.5 * st.vida + 10 * fr + 0.7 * (Rules.stat(p, 'armadura') + Rules.armaduraExtra(p)) + 0.35 * st.amago
                + 1.5 * (Rules.stat(p, 'fisico') + Rules.stat(p, 'magico') + Rules.stat(p, 'agilidade')) + 15 * (p.renome || 0)
                - Object.values(p.objetos || {}).reduce((t, o) => t + (o ? 1.5 + 0.3 * Rules.hexDistance(p, o) : 0), 0)
                + Object.entries(p.recursos || {}).reduce((t, [r, n]) => t + n * ((CONFIG.recursos[r] || {}).valorBot || 0), 0)
                + ((p.effects || []).some(e => e.limiteDano != null && (f => f && Engine.isAlive(f) && Rules.hexDistance(f, p) === 1)(Rules.pieceById(s, e.fonteId))) ? 3 : 0); // Chegada valendo
        };
        let v = 0;
        for (const j of s.jogadores || [1, 2]) {
            const r = Rules.renomeTime(s, j), sinal = j === eu ? 1 : -1;
            v += sinal * (30 * r + (r >= meta - 1 ? 40 : 0));
        }
        for (const p of minhas) {
            const fr = p.stats.vida / Math.max(1, p.stats.vidaMax);
            v += valor(p);
            v -= 0.8 * menor(p, marcas) + 1.5 * menor(p, deles); // prefere ir atrás dos inimigos a ir atrás do Renome
            const ameacas = deles.filter(e => Rules.hexDistance(p, e) <= alcance(e)).length;
            v -= ameacas * (1 + 8 * (1 - fr) + 12 * (p.renome || 0));
        }
        for (const e of deles) {
            const fr = e.stats.vida / Math.max(1, e.stats.vidaMax);
            v -= this.agressividade * valor(e);
            if (minhas.some(p => Rules.hexDistance(p, e) <= alcance(p))) v += 4 + 8 * (1 - fr) + 6 * (e.renome || 0);
        }
        return v;
    }
};
