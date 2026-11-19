// ── Efeitos visuais (VFX) ──
// O motor registra o que aconteceu em state.fx (usos de habilidade, rolagens, dano, movimentos, coleta de Renome).
// Cada lote novo vira uma sequência com tempo — lançamento → trajeto → impacto — e os números e barras esperam o impacto.
// Coordenadas "de mundo" em raios de zona (x = 1,5q; y = √3(q/2 + r)): acompanham o arrasto e o tamanho da tela.
// Estilo por habilidade: e = entrega (projetil, feixe, corpo, giro, onda, pilares, leque, investida, salto, volta, apoio,
// proprio, direto, nada), f = forma, c = cor, i = impacto (corte, pesado, cristal, energia, explosao, brilho), x = extra.
const VFX_ESTILOS = {
    diamante_reflexo: { e: 'projetil', f: 'cristal', c: '#67e8f9', i: 'cristal' },
    diamante_punho: { e: 'corpo', f: 'soco', c: '#67e8f9', i: 'cristal' },
    diamante_soco_chao: { e: 'pilares', c: '#67e8f9', i: 'cristal', onda: 1 },
    diamante_pisao: { e: 'pilares', c: '#67e8f9', i: 'cristal' },
    lorena_flecha: { e: 'projetil', f: 'flecha', c: '#f9a8d4', i: 'corte' },
    lorena_preciso: { e: 'projetil', f: 'flecha', c: '#f472b6', i: 'energia', forte: 1 },
    lorena_cadeia: { e: 'proprio', c: '#f472b6', x: 'aura' },
    lorena_ignora_esquiva: { e: 'proprio', c: '#f9a8d4', x: 'mira' },
    alex_marca: { e: 'nada' },
    alex_adaga: { e: 'projetil', f: 'adaga', c: '#fdba74', i: 'corte' },
    alex_mergulhar: { e: 'investida', c: '#fb923c', i: 'corte' },
    alex_avante: { e: 'investida', c: '#fb923c', i: 'corte' },
    toppich_impulso: { e: 'proprio', c: '#bef264', x: 'aura' },
    toppich_martelada: { e: 'corpo', f: 'martelo', c: '#bef264', i: 'pesado' },
    toppich_projecao: { e: 'corpo', f: 'soco', c: '#bef264', i: 'pesado' },
    toppich_trinvestida: { e: 'corpo', f: 'soco', c: '#bef264', i: 'pesado' },
    rato_bananation: { e: 'proprio', c: '#fde047', x: 'aura' },
    rato_bananada: { e: 'projetil', f: 'dinamite', c: '#fbbf24', i: 'explosao', arco: 1 },
    rato_cacho: { e: 'projetil', f: 'dinamite', c: '#fbbf24', i: 'explosao', arco: 1, multi: 1 },
    rato_bananeira: { e: 'proprio', c: '#f59e0b', x: 'cinto' },
    rato_bananeira_explosao: { e: 'direto', c: '#f97316', i: 'explosao' },
    garyn_defesa: { e: 'proprio', c: '#cbd5e1', x: 'escudo' },
    garyn_machadada: { e: 'corpo', f: 'martelo', c: '#fca5a5', i: 'pesado' },
    garyn_investida: { e: 'investida', c: '#f87171', i: 'pesado' },
    garyn_circular: { e: 'giro', c: '#fca5a5', i: 'corte' },
    amina_selo: { e: 'apoio', c: '#e9d5ff', x: 'selo' },
    amina_luz: { e: 'feixe', c: '#c084fc', i: 'energia' },
    amina_pulso: { e: 'proprio', c: '#d8b4fe', x: 'anel' },
    amina_pulso_cura: { e: 'apoio', c: '#86efac', x: 'cura' },
    amina_benevolencia: { e: 'apoio', f: 'feixe', c: '#f5d0fe', x: 'selo' },
    amina_benevolencia_cura: { e: 'apoio', c: '#86efac', x: 'cura' },
    vitoria_cortina: { e: 'apoio', c: '#7dd3fc', x: 'agua' },
    vitoria_recompensa: { e: 'feixe', c: '#c7d2fe', i: 'energia' },
    vitoria_presente: { e: 'apoio', c: '#a5b4fc', x: 'cura' },
    vitoria_presente_extra: { e: 'apoio', c: '#a5b4fc', x: 'cura' },
    nairrun_reator: { e: 'proprio', c: '#6ee7b7', x: 'aura' },
    nairrun_pancada: { e: 'corpo', f: 'soco', c: '#6ee7b7', i: 'energia' },
    nairrun_projecao: { e: 'proprio', c: '#34d399', x: 'cupula' },
    nairrun_sobrecarga: { e: 'proprio', c: '#6ee7b7', x: 'escudo' },
    siff_aura: { e: 'apoio', c: '#f5d0fe', x: 'buff' },
    siff_vento: { e: 'projetil', f: 'vento', c: '#f5d0fe', i: 'brilho' },
    siff_vento_cura: { e: 'apoio', c: '#86efac', x: 'cura' },
    siff_correcao: { e: 'apoio', c: '#86efac', x: 'cura' },
    siff_poder: { e: 'apoio', c: '#f0abfc', x: 'buff' },
    shou_graciosa: { e: 'projetil', f: 'pena', c: '#f1f5f9', i: 'brilho' },
    shou_confianca: { e: 'corpo', f: 'estocada', c: '#e2e8f0', i: 'corte' },
    shou_comando: { e: 'projetil', f: 'pena', c: '#f8fafc', i: 'brilho' },
    shou_garca: { e: 'leque', c: '#e2e8f0', i: 'corte' },
    icnoyotl_penas: { e: 'proprio', c: '#fcd34d', x: 'aura' },
    icnoyotl_revigorar: { e: 'apoio', f: 'pena', c: '#fcd34d', x: 'cura' },
    icnoyotl_vivacidade: { e: 'apoio', f: 'orbe', c: '#fde68a', x: 'cura' },
    icnoyotl_doacao: { e: 'projetil', f: 'orbe', c: '#f59e0b', i: 'energia', arco: 1 },
    cassandra_punir: { e: 'corpo', f: 'corte', c: '#93c5fd', i: 'corte' },
    cassandra_compelir: { e: 'feixe', c: '#60a5fa', i: 'energia', corrente: 1 },
    cassandra_tenente: { e: 'proprio', c: '#93c5fd', x: 'escudo' },
    ricardinho_shuriken: { e: 'projetil', f: 'shuriken', c: '#cbd5e1', i: 'corte', objeto: 'shuriken' },
    ricardinho_mortal: { e: 'salto', c: '#cbd5e1', i: 'corte' },
    ricardinho_pegar: { e: 'proprio', c: '#cbd5e1', x: 'aura' },
    ricardinho_sasuke: { e: 'volta', f: 'shuriken', c: '#cbd5e1', i: 'corte' },
    // disparo: clarão no cano e tiros rápidos; chumbo: espingarda (3 balas e tranco).
    billy_pe: { e: 'proprio', c: '#d6b38a', x: 'aura' },
    billy_coceira: { e: 'projetil', f: 'bala', c: '#fde68a', i: 'tiro', disparo: 1 },
    billy_fumace: { e: 'nuvem', f: 'bomba', c: '#cbd5e1' },
    billy_sentenca: { e: 'projetil', f: 'bala', c: '#fcd34d', i: 'pesado', disparo: 1, chumbo: 1, forte: 1 },
    tico_chegada: { e: 'apoio', c: '#fda4af', x: 'escudo' },
    tico_folga: { e: 'apoio', c: '#fb7185', x: 'buff' },
    tico_desse: { e: 'apoio', c: '#fda4af', x: 'mira' },
    tico_pulguento: { e: 'salto', c: '#fb7185', i: 'pesado' },
    aurora_nucleo: { e: 'proprio', c: '#5eead4', x: 'aura' },
    aurora_disparo: { e: 'feixe', c: '#5eead4', i: 'energia' },
    aurora_absorver: { e: 'proprio', c: '#99f6e4', x: 'anel' },
    aurora_descarga: { e: 'pilares', c: '#2dd4bf', i: 'energia' },
    angela_penitente: { e: 'proprio', c: '#fca5a5', x: 'aura' },
    angela_retribuicao: { e: 'corpo', f: 'estocada', c: '#fde68a', i: 'corte' },
    angela_expiacao: { e: 'corpo', f: 'estocada', c: '#fde68a', i: 'corte' },
    angela_consagracao: { e: 'proprio', c: '#fde68a', x: 'selo' }
};

const VFX = {
    NIVEIS: ['completo', 'reduzido', 'desligado'],
    NOMES: { completo: 'Completos', reduzido: 'Reduzidos', desligado: 'Desligados' },
    MAX_PARTS: 450,
    nivel: 'completo',
    visto: 0, ocupado: 0, ultimoHab: false, vez: null, vencedor: null,
    itens: [], parts: [], tremores: [], flashes: {}, desvios: {}, fantasmas: [], segura: {}, barras: {}, ocultos: {}, pilha: {}, sprites: {},

    iniciar() {
        let n = null;
        try { n = localStorage.getItem('testez_vfx'); } catch (e) { /* sem armazenamento */ }
        const reduz = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.nivel = this.NIVEIS.includes(n) ? n : (reduz ? 'reduzido' : 'completo');
    },
    alternar() {
        this.nivel = this.NIVEIS[(this.NIVEIS.indexOf(this.nivel) + 1) % this.NIVEIS.length];
        try { localStorage.setItem('testez_vfx', this.nivel); } catch (e) { /* sem armazenamento */ }
        if (!this.ligado()) this.limpar();
    },
    ligado() { return this.nivel !== 'desligado'; },
    completo() { return this.nivel === 'completo'; },
    limpar() {
        this.itens = []; this.parts = []; this.tremores = []; this.flashes = {}; this.desvios = {}; this.fantasmas = [];
        this.segura = {}; this.barras = {}; this.ocultos = {}; this.pilha = {}; this.ocupado = 0;
    },
    // Partida nova, desfazer, carregar: nada do que já aconteceu é reanimado.
    reiniciar() {
        this.limpar();
        this.visto = (state && state.fxN) || 0;
        this.vez = this.chaveVez();
        this.vencedor = state ? state.winner : null;
        this.ultimoHab = false;
    },
    restante(t = performance.now()) { return this.ligado() ? Math.max(0, this.ocupado - t) : 0; },
    // Fim de partida: a tela de vitória espera os efeitos (só quando a jogada final foi uma habilidade).
    esperaVitoria() { return this.ligado() && this.ultimoHab ? Math.min(2200, this.restante() + 700) : 0; },
    chaveVez() {
        if (!state || state.winner) return null;
        const b = Rules.currentBlock(state);
        return b ? `${state.round}:${b.player}` : null;
    },

    // ── utilidades ──
    w(q, r) { return { x: 1.5 * q, y: Math.sqrt(3) * (q / 2 + r) }; },
    px(x, y) { return { x: view.originX + x * view.hexR, y: view.originY + y * view.hexR }; },
    rgba(hex, a) {
        if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
        const n = parseInt(hex.slice(1), 16);
        return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${a})`;
    },
    sai: k => 1 - Math.pow(1 - k, 3),
    vaiVem: k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
    estoura: k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
    some: (k, de = 0.7) => k > de ? (1 - k) / (1 - de) : 1,
    sprite(cor) {
        let c = this.sprites[cor];
        if (c) return c;
        c = this.sprites[cor] = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gr.addColorStop(0.22, this.rgba(cor, 0.9));
        gr.addColorStop(0.55, this.rgba(cor, 0.3));
        gr.addColorStop(1, this.rgba(cor, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return c;
    },
    aoLongo(pts, e) {
        if (pts.length < 2) return pts[0];
        const seg = [];
        let tot = 0;
        for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); tot += d; }
        let resto = Math.max(0, Math.min(1, e)) * tot;
        for (let i = 0; i < seg.length; i++) {
            if (resto <= seg[i] || i === seg.length - 1) {
                const f = seg[i] ? Math.min(1, resto / seg[i]) : 1;
                return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f };
            }
            resto -= seg[i];
        }
        return pts[pts.length - 1];
    },
    dir(A, B) { const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d, d }; },
    // Posição desenhada: segue a Estrela (com animação e desvios) ou um ponto fixo.
    onde(it, t) {
        const p = it.id != null && state ? state.pieces.find(x => x.id === it.id) : null;
        return p ? posPeca(p, t) : this.px(it.x, it.y);
    },

    // ── agendamento ──
    item(o) { this.itens.push(Object.assign({ camada: 'alto' }, o)); return o; },
    part(o) {
        if (this.parts.length >= this.MAX_PARTS) return;
        this.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, arr: 0, rot: 0, vr: 0, tipo: 'brilho', tam: 0.1, vida: 500 }, o));
    },
    jorro(t0, x, y, n, cor, o = {}) {
        n = Math.max(1, Math.round(n * (this.completo() ? 1 : 0.4)));
        for (let i = 0; i < n; i++) {
            const a = o.ang != null ? o.ang + (Math.random() - 0.5) * (o.abre ?? 1) : Math.random() * 6.283;
            const v = (o.v ?? 2.5) * (0.4 + Math.random() * 0.8);
            this.part({
                t0: t0 + Math.random() * (o.espalha || 0), tela: o.tela,
                x: x + (Math.random() - 0.5) * (o.raio || 0), y: y + (Math.random() - 0.5) * (o.raio || 0),
                vx: Math.cos(a) * v, vy: Math.sin(a) * v + (o.sobe || 0), g: o.g ?? 0, arr: o.arr ?? 3,
                tam: (o.tam ?? 0.12) * (0.6 + Math.random() * 0.8), cor: Array.isArray(cor) ? cor[i % cor.length] : cor,
                tipo: o.tipo || 'faisca', vida: (o.vida ?? 500) * (0.7 + Math.random() * 0.6),
                rot: Math.random() * 6.283, vr: (Math.random() - 0.5) * (o.vr ?? 8)
            });
        }
    },
    tremer(t0, dur, forca) { if (this.completo()) this.tremores.push({ t0, dur, forca }); },
    piscar(id, t0, cor = '#ffffff', dur = 170) { this.flashes[id] = { t0, dur, cor }; },
    desviar(id, dx, dy, t0, dur, forma, treme = 0) { (this.desvios[id] = this.desvios[id] || []).push({ dx, dy, t0, dur, forma, treme }); },
    texto(id, txt, cor, t0, pq, pos) {
        const pl = this.pilha[id];
        const n = pl && pl.ate > t0 ? pl.n + 1 : 0;
        const dur = pq ? 1000 : 1250;
        this.pilha[id] = { ate: t0 + 500, n };
        this.item({ tipo: 'texto', id, x: pos.x, y: pos.y, txt, cor, t0, dur, pq, dy: Math.min(n, 3) * 22 });
    },
    estilo(h, cor) {
        if (VFX_ESTILOS[h]) return VFX_ESTILOS[h];
        const a = Engine.def(h) || {}, alvo = a.alvo || {}, dano = Engine.causaDano(a);
        const e = alvo.tipo === 'avanco' ? 'investida' : alvo.tipo === 'ao-redor' ? 'onda' : alvo.tipo === 'arco' ? 'leque'
            : alvo.tipo === 'linha' ? 'pilares' : alvo.tipo === 'trajeto' ? 'projetil' : (!alvo.tipo || alvo.tipo === 'proprio') ? 'proprio'
            : alvo.quem === 'aliados' ? 'apoio' : (alvo.alcance ?? 1) <= 1 ? 'corpo' : a.magico ? 'feixe' : 'projetil';
        const cura = (a.efeitos || []).some(ef => ef.tipo === 'alterarStatus' && ef.stat === 'vida');
        return { e, f: e === 'corpo' ? 'soco' : 'orbe', c: cor || '#e5e7eb', i: dano ? (a.magico ? 'energia' : 'corte') : 'brilho', x: cura ? 'cura' : 'aura' };
    },

    // ── lote: transforma os eventos novos em uma sequência ──
    planejar(antes, agora, t) {
        const evs = (state.fx || []).filter(e => e && e.n > this.visto);
        // Uso esperando rolagem manual ou reações de apoio: fica para quando resolver (aí aparece completo).
        const pd = state.pending, ap = state.efeitoPendente;
        const espera = pd && pd.tipo === 'rolagem' ? pd.pieceId : (pd && state.ataque) ? state.ataque.pieceId : ap ? ap.pieceId : null;
        let lote = evs;
        if (espera != null) {
            for (let j = evs.length - 1; j >= 0; j--) if (evs[j].k === 'hab' && evs[j].de === espera && !evs[j].p) { lote = evs.slice(0, j); break; }
        }
        this.visto = lote === evs ? (state.fxN || 0) : lote.length ? lote[lote.length - 1].n : this.visto;
        const base = Math.max(t, Math.min(this.ocupado, t + 1200));
        const P = { base, quando: {}, imp: {}, lanc: {}, moveu: new Set(), esquivas: [], abates: {}, posEm: {}, teveHab: false, explodiu: {} };
        this.ultimoHab = false;
        if (!lote.length) return P;
        const posDe = id => { if (P.posEm[id]) return P.posEm[id]; const v = antes.get(id) || agora.get(id); return v ? { q: v.q, r: v.r } : null; };
        let c = base, fim = base, atual = null;
        const usados = new Set();
        for (let i = 0; i < lote.length; i++) {
            const e = lote[i];
            if (e.k === 'hab') {
                if (!e.p) P.teveHab = true;
                const ini = Math.max(c, P.quando[e.de] ?? 0);
                let mi = -1;
                for (let j = i + 1; j < lote.length && lote[j].k !== 'hab'; j++) if (lote[j].k === 'mov' && lote[j].id === e.de && !lote[j].f) { mi = j; break; }
                if (P.lanc[e.de] == null) P.lanc[e.de] = ini + 150;
                atual = e;
                const r = this.uso(e, ini, mi >= 0 ? lote[mi] : null, P, posDe);
                if (mi >= 0 && r.moveu) { usados.add(mi); P.moveu.add(e.de); const cam = lote[mi].cam; if (cam && cam.length) P.posEm[e.de] = { q: cam[cam.length - 1][0], r: cam[cam.length - 1][1] }; }
                c = ini + (e.p ? 80 : 180);
                fim = Math.max(fim, r.fim);
            } else if (e.k === 'rol') {
                if (!e.ok) {
                    const tq = P.imp[e.para] ?? c;
                    P.esquivas.push({ id: e.para, t: tq });
                    const A = posDe(e.de), B = posDe(e.para);
                    if (A && B) { const d = this.dir(this.w(A.q, A.r), this.w(B.q, B.r)); this.desviar(e.para, -d.y * 0.38, d.x * 0.38, tq - 90, 340, 'esquiva'); }
                    fim = Math.max(fim, tq + 300);
                }
            } else if (e.k === 'dano') {
                const tq = P.imp[e.para] ?? c;
                if (P.quando[e.para] == null) P.quando[e.para] = tq;
                if (!agora.has(e.para) && e.de != null) P.abates[e.para] = e.de;
                this.impacto(e, tq, posDe(e.para), e.de != null ? posDe(e.de) : null, P);
                fim = Math.max(fim, tq + 250);
            } else if (e.k === 'mov') {
                const cam = (e.cam || []).filter(Array.isArray);
                if (cam.length) P.posEm[e.id] = { q: cam[cam.length - 1][0], r: cam[cam.length - 1][1] };
                if (usados.has(i)) continue;
                let tipo = 'andar', t0 = c;
                if (e.f) {
                    t0 = P.imp[e.id] ?? c;
                    tipo = 'empurrao';
                    const fonte = atual && posDe(atual.de);
                    if (fonte && cam.length === 2 && Rules.hexDistance({ q: cam[0][0], r: cam[0][1] }, { q: cam[1][0], r: cam[1][1] }) === 2
                        && Rules.hexDistance(fonte, { q: cam[0][0], r: cam[0][1] }) === 1 && Rules.hexDistance(fonte, { q: cam[1][0], r: cam[1][1] }) === 1) tipo = 'arremesso';
                } else if (atual && atual.de === e.id && c - (P.lanc[e.id] ?? -1e9) < 400) tipo = 'investida';
                const d = this.animarMov(e, t0, tipo);
                P.moveu.add(e.id);
                if (e.f) P.imp[e.id] = d; // dano de colisão/arremesso aparece no fim do empurrão
                else c = d;
                fim = Math.max(fim, d);
            } else if (e.k === 'renome') {
                const p = posDe(e.id);
                if (p) {
                    const W = this.w(p.q, p.r);
                    this.item({ tipo: 'anel', x: W.x, y: W.y, cor: '#facc15', t0: c, dur: 600, r0: 0.3, r1: 1.2, larg: 0.12 });
                    this.jorro(c, W.x, W.y, 14, ['#facc15', '#fde68a', '#ffffff'], { tipo: 'estrela', v: 1.6, sobe: -1.2, arr: 2, vida: 900, tam: 0.18 });
                }
                P.quando[e.id] = P.quando[e.id] ?? c;
                fim = Math.max(fim, c + 600);
            }
        }
        this.ultimoHab = P.teveHab;
        this.ocupado = Math.max(this.ocupado, fim);
        return P;
    },

    // Um uso de habilidade: nome, lançamento e entrega; registra em P.imp quando cada alvo é atingido.
    uso(e, ini, mov, P, posDe) {
        const a = Engine.def(e.h);
        const dono = state.pieces.find(p => p.id === e.de);
        if (!a || typeof e.q !== 'number') return { fim: ini };
        const st = this.estilo(e.h, dono && dono.color);
        if (st.e === 'nada') return { fim: ini };
        const passiva = !!e.p, cor = st.c, C = this.w(e.q, e.r), imp = P.imp;
        const alvos = (e.al || []).map(([id, q, r]) => ({ id, q, r, ...this.w(q, r) }));
        const z = (e.z || []).map(([q, r]) => ({ q, r, ...this.w(q, r) }));
        const voo = (A, B) => Math.max(220, Math.min(650, 140 + 55 * Math.hypot(B.x - A.x, B.y - A.y))) + (st.arco ? 120 : 0);
        let fim = ini + 400, moveu = false;
        this.texto(e.de, a.nome, cor, ini, passiva, C);
        if (!passiva) {
            this.item({ tipo: 'aura', id: e.de, x: C.x, y: C.y, cor, t0: ini, dur: 520, camada: 'chao' });
            this.jorro(ini, C.x, C.y + 0.3, 6, cor, { tipo: 'brilho', v: 0.4, sobe: -1.3, arr: 1, vida: 650, tam: 0.13, raio: 0.8 });
        }
        const L = ini + (passiva ? 70 : 170);
        switch (st.e) {
            case 'projetil': {
                const primeiro = alvos[0] || z[z.length - 1];
                if (primeiro) { const d = this.dir(C, primeiro); this.desviar(e.de, d.x * 0.16, d.y * 0.16, L - 70, 240, 'bote'); }
                if (st.multi && z.length) {
                    z.forEach((h, i) => {
                        const t0 = L + i * 120, du = voo(C, h), tq = t0 + du;
                        this.item({ tipo: 'projetil', pts: [C, h], forma: st.f, cor, t0, dur: du, arco: 0.9 + i * 0.15 });
                        this.impactoVisual(st.i, h, tq, cor, 1, null);
                        for (const al of alvos) if (al.q === h.q && al.r === h.r) { imp[al.id] = tq; P.explodiu[al.id] = 1; }
                        fim = Math.max(fim, tq + 300);
                    });
                } else if (z.length) {
                    const o = st.objeto && dono && dono.objetos && dono.objetos[st.objeto];
                    const E = o ? this.w(o.q, o.r) : z[z.length - 1], du = voo(C, E) + 80, dist = Math.hypot(E.x - C.x, E.y - C.y) || 1;
                    this.item({ tipo: 'projetil', pts: [C, E], forma: st.f, cor, t0: L, dur: du, corDono: dono && dono.color });
                    for (const al of alvos) imp[al.id] = L + du * Math.min(1, Math.hypot(al.x - C.x, al.y - C.y) / dist);
                    if (st.objeto) this.ocultos[`${e.de}:${st.objeto}`] = L + du;
                    this.jorro(L + du, E.x, E.y, 8, ['#e5e7eb', cor], { tipo: 'faisca', v: 2.2, vida: 350, tam: 0.1 });
                    this.item({ tipo: 'anel', x: E.x, y: E.y, cor: '#e5e7eb', t0: L + du, dur: 350, r0: 0.15, r1: 0.6, larg: 0.08, camada: 'chao' });
                    fim = Math.max(fim, L + du + 250);
                } else alvos.forEach((al, i) => {
                    const t0 = L + i * (st.disparo ? 170 : 70), du = st.disparo ? Math.max(130, voo(C, al) * 0.45) : voo(C, al);
                    if (st.disparo) this.disparo(e.de, C, al, t0, !!st.chumbo);
                    const d = this.dir(C, al);
                    for (const o of st.chumbo ? [-0.2, 0, 0.2] : [0])
                        this.item({ tipo: 'projetil', pts: [C, o ? { x: al.x - d.y * o, y: al.y + d.x * o } : al], forma: st.f, cor, t0, dur: du, arco: st.arco ? 0.9 : 0, forte: st.forte });
                    imp[al.id] = t0 + du;
                    fim = Math.max(fim, t0 + du + 250);
                });
                break;
            }
            case 'volta': {
                const S = z[z.length - 1];
                if (!S) break;
                const du = voo(S, C) + 80, dist = Math.hypot(S.x - C.x, S.y - C.y) || 1;
                this.item({ tipo: 'projetil', pts: [S, C], forma: st.f, cor, t0: L, dur: du, corDono: dono && dono.color });
                for (const al of alvos) imp[al.id] = L + du * Math.min(1, Math.hypot(al.x - S.x, al.y - S.y) / dist);
                const d = this.dir(S, C);
                this.desviar(e.de, d.x * 0.15, d.y * 0.15, L + du - 40, 260, 'recuo');
                this.jorro(L + du, C.x, C.y, 8, ['#ffffff', cor], { tipo: 'estrela', v: 1.4, vida: 500, tam: 0.14 });
                fim = Math.max(fim, L + du + 250);
                break;
            }
            case 'nuvem': { // bomba de fumaça (Fumacê): voa em arco até a zona escolhida e espalha fumaça pela área
                const Z = z[0] || alvos[0];
                if (!Z) break;
                const d0 = this.dir(C, Z);
                this.desviar(e.de, d0.x * 0.16, d0.y * 0.16, L - 70, 240, 'bote');
                const du = voo(C, Z) + 140, tq = L + du;
                this.item({ tipo: 'projetil', pts: [C, Z], forma: st.f || 'bomba', cor, t0: L, dur: du, arco: 1.1 });
                this.item({ tipo: 'anel', x: Z.x, y: Z.y, cor: '#e5e7eb', t0: tq, dur: 560, r0: 0.2, r1: 2.0, larg: 0.16, camada: 'chao' });
                this.jorro(tq, Z.x, Z.y, 8, ['#fde047', '#ffffff'], { tipo: 'faisca', v: 2.2, vida: 260, tam: 0.08 });
                (z.length ? z : [Z]).forEach(h => {
                    const t0 = tq + Rules.hexDistance(Z, h) * 110;
                    this.jorro(t0, h.x, h.y, 8, ['#9ca3af', '#d1d5db', '#6b7280', '#e5e7eb'], { tipo: 'fumaca', v: 0.55, sobe: -0.2, vida: 1800, tam: 0.45, raio: 0.8, espalha: 350 });
                    for (const al of alvos) if (al.q === h.q && al.r === h.r) imp[al.id] = t0 + 150;
                });
                fim = Math.max(fim, tq + 1000);
                break;
            }
            case 'feixe':
                alvos.forEach((al, i) => {
                    const t0 = L + i * 90;
                    this.item({ tipo: 'feixe', x: C.x, y: C.y, x2: al.x, y2: al.y, cor, t0, dur: 560, corrente: st.corrente });
                    imp[al.id] = t0 + 150;
                    fim = Math.max(fim, t0 + 560);
                });
                break;
            case 'corpo':
            case 'investida':
            case 'salto': {
                let feito = false;
                if (st.e === 'investida' && mov && (mov.cam || []).length > 1) {
                    const cam = mov.cam, n = cam.length - 1, S = ini + 130, per = 70;
                    const end = this.animarMov(mov, S, 'investida', per);
                    moveu = true; feito = true;
                    for (const al of alvos) {
                        let j = cam.findIndex(h => h[0] === al.q && h[1] === al.r);
                        if (j < 0) j = cam.findIndex(h => Rules.hexDistance({ q: h[0], r: h[1] }, al) === 1);
                        imp[al.id] = S + per * (j < 1 ? n : j);
                    }
                    fim = Math.max(fim, end + 250);
                } else if (st.e === 'salto' && mov && (mov.cam || []).length > 1) {
                    const S = ini + 110, end = this.animarMov(mov, S, 'salto');
                    moveu = true; feito = true;
                    for (const al of alvos) imp[al.id] = S + 240;
                    fim = Math.max(fim, end + 250);
                }
                if (feito) break;
                alvos.forEach((al, i) => {
                    const d = this.dir(C, al), t0 = ini + 100 + i * 140, tq = t0 + 110;
                    this.desviar(e.de, d.x * 0.42, d.y * 0.42, t0, 320, 'bote');
                    if (st.f === 'martelo') this.item({ tipo: 'martelo', id: e.de, x: C.x, y: C.y, ang: Math.atan2(d.y, d.x), cor, t0: tq - 190, dur: 280 });
                    if (st.f === 'estocada') this.item({ tipo: 'estocada', x: C.x, y: C.y, x2: al.x, y2: al.y, cor, t0: tq - 60, dur: 260 });
                    imp[al.id] = tq;
                    fim = Math.max(fim, tq + 260);
                });
                if (mov && (mov.cam || []).length > 1) { // Trinvestida: depois do empurrão, ocupa a zona do alvo
                    const t0 = Math.max(ini + 220, ...alvos.map(al => imp[al.id] || 0)) + 120;
                    fim = Math.max(fim, this.animarMov(mov, t0, 'investida') + 200);
                    moveu = true;
                }
                break;
            }
            case 'giro': {
                const ang0 = Math.random() * 6.283, t0 = ini + 130, dur = 440;
                this.item({ tipo: 'giro', id: e.de, x: C.x, y: C.y, cor, t0, dur, ang0 });
                for (const al of alvos) {
                    let f = (Math.atan2(al.y - C.y, al.x - C.x) - ang0) % 6.283;
                    if (f < 0) f += 6.283;
                    imp[al.id] = t0 + dur * Math.min(0.95, f / (Math.PI * 2.2));
                }
                fim = Math.max(fim, t0 + dur + 200);
                break;
            }
            case 'onda':
                this.item({ tipo: 'anel', x: C.x, y: C.y, cor, t0: ini + 120, dur: 480, r0: 0.4, r1: 2.3, larg: 0.2, camada: 'chao' });
                for (const al of alvos) imp[al.id] = ini + 260;
                fim = Math.max(fim, ini + 600);
                break;
            case 'pilares': {
                const zonas = z.length ? z : alvos;
                if (st.onda) {
                    this.item({ tipo: 'anel', x: C.x, y: C.y, cor, t0: ini + 120, dur: 460, r0: 0.3, r1: 2.0, larg: 0.18, camada: 'chao' });
                    this.desviar(e.de, 0, 0.12, ini + 60, 220, 'bote');
                }
                zonas.forEach(h => {
                    const dd = Math.max(1, Rules.hexDistance({ q: e.q, r: e.r }, h));
                    const t0 = ini + 150 + (dd - 1) * 110 + (st.onda ? Math.random() * 60 : 0);
                    this.item({ tipo: 'pilar', x: h.x, y: h.y, cor, t0, dur: 700 });
                    this.jorro(t0, h.x, h.y + 0.25, 6, [cor, '#ffffff'], { tipo: 'caco', v: 2.4, sobe: -1.5, g: 7, arr: 0.8, vida: 600, tam: 0.1 });
                    this.jorro(t0, h.x, h.y + 0.4, 3, '#94a3b8', { tipo: 'fumaca', v: 0.6, vida: 500, tam: 0.22 });
                    for (const al of alvos) if (al.q === h.q && al.r === h.r) imp[al.id] = t0 + 70;
                    fim = Math.max(fim, t0 + 500);
                });
                this.tremer(ini + 150, 280, 3);
                break;
            }
            case 'leque': {
                const ref = z.length ? z : alvos;
                let sx = 0, sy = 0;
                for (const h of ref) { sx += h.x - C.x; sy += h.y - C.y; }
                const ang = Math.atan2(sy, sx), t0 = ini + 130;
                this.desviar(e.de, Math.cos(ang) * 0.25, Math.sin(ang) * 0.25, ini + 80, 300, 'bote');
                this.item({ tipo: 'leque', x: C.x, y: C.y, ang, abre: 2.1, cor, t0, dur: 400 });
                alvos.forEach((al, i) => { imp[al.id] = t0 + 150 + i * 50; });
                fim = Math.max(fim, t0 + 450);
                break;
            }
            case 'apoio':
                alvos.forEach((al, i) => {
                    const t0 = L + i * 90;
                    let tq;
                    if (al.id === e.de) tq = ini + 220;
                    else if (st.f === 'feixe') { this.item({ tipo: 'feixe', x: C.x, y: C.y, x2: al.x, y2: al.y, cor, t0, dur: 480, larg: 0.12 }); tq = t0 + 150; }
                    else { const du = voo(C, al); this.item({ tipo: 'projetil', pts: [C, al], forma: st.f || 'orbe', cor, t0, dur: du, arco: 0.5 }); tq = t0 + du; }
                    imp[al.id] = tq;
                    this.extra(st.x, al.id, al, cor, tq);
                    fim = Math.max(fim, tq + 400);
                });
                break;
            case 'direto':
                this.jorro(ini + 40, C.x, C.y, 8, ['#fde047', '#f97316'], { tipo: 'faisca', v: 2.5, vida: 350, tam: 0.1 });
                for (const al of alvos) { imp[al.id] = ini + 100; }
                fim = Math.max(fim, ini + 500);
                break;
            default: // 'proprio'
                imp[e.de] = imp[e.de] ?? ini + 160;
                this.extra(st.x, e.de, C, cor, ini + 120);
                fim = Math.max(fim, ini + 600);
        }
        // Alvos inimigos de habilidades sem dano (Marcas, Compelir): brilho no momento em que são atingidos.
        if (!Engine.causaDano(a) && st.e !== 'apoio' && st.e !== 'proprio' && st.e !== 'nuvem')
            for (const al of alvos) if (imp[al.id] != null && al.id !== e.de) this.impactoVisual('brilho', al, imp[al.id], cor, 0.8, null);
        return { fim, moveu };
    },

    // Clarão do cano (Billy): faíscas e fumacinha na direção do tiro, com tranco; chumbo = espingarda (mais forte).
    disparo(id, C, al, t0, chumbo) {
        const d = this.dir(C, al), x = C.x + d.x * 0.38, y = C.y + d.y * 0.38, ang = Math.atan2(d.y, d.x);
        this.item({ tipo: 'golpe', x, y, cor: '#fde047', t0, dur: 140, tam: chumbo ? 0.5 : 0.35 });
        this.jorro(t0, x, y, chumbo ? 12 : 7, ['#fde047', '#fb923c', '#ffffff'], { tipo: 'faisca', v: 3.4, ang, abre: chumbo ? 1.1 : 0.7, vida: 200, tam: 0.09 });
        this.jorro(t0 + 40, x, y, chumbo ? 4 : 2, '#9ca3af', { tipo: 'fumaca', v: 0.5, sobe: -0.4, vida: 600, tam: 0.2 });
        this.desviar(id, -d.x * (chumbo ? 0.2 : 0.1), -d.y * (chumbo ? 0.2 : 0.1), t0, 220, 'recuo');
        if (chumbo) this.tremer(t0, 160, 2);
    },

    // Efeito de apoio/próprio no alvo: escudo, mira, selo, água, cúpula, cura…
    extra(x, id, W, cor, t0) {
        switch (x) {
            case 'escudo': this.item({ tipo: 'escudo', id, x: W.x, y: W.y, cor, t0, dur: 900 }); break;
            case 'mira': this.item({ tipo: 'mira', id, x: W.x, y: W.y, cor, t0, dur: 900 }); break;
            case 'selo': this.item({ tipo: 'selo', id, x: W.x, y: W.y, cor, t0, dur: 1000 }); break;
            case 'agua':
                this.item({ tipo: 'agua', id, x: W.x, y: W.y, cor, t0, dur: 1000 });
                this.jorro(t0 + 950, W.x, W.y, 12, ['#7dd3fc', '#e0f2fe'], { tipo: 'brilho', v: 2, g: 4, vida: 450, tam: 0.1 });
                break;
            case 'cupula':
                this.item({ tipo: 'anel', id, x: W.x, y: W.y, cor, t0, dur: 900, r0: 0.5, r1: 1.9, larg: 0.1, cheio: 1, camada: 'chao' });
                this.item({ tipo: 'anel', id, x: W.x, y: W.y, cor: '#ffffff', t0: t0 + 150, dur: 700, r0: 0.4, r1: 1.7, larg: 0.05, camada: 'chao' });
                break;
            case 'anel':
                this.item({ tipo: 'anel', id, x: W.x, y: W.y, cor, t0, dur: 600, r0: 0.3, r1: 1.4, larg: 0.12, camada: 'chao' });
                this.item({ tipo: 'anel', id, x: W.x, y: W.y, cor, t0: t0 + 180, dur: 600, r0: 0.3, r1: 1.4, larg: 0.08, camada: 'chao' });
                break;
            case 'cinto':
                this.item({ tipo: 'aura', id, x: W.x, y: W.y, cor, t0, dur: 800, camada: 'chao' });
                this.jorro(t0, W.x, W.y, 14, ['#fde047', '#f97316', '#ef4444'], { tipo: 'faisca', v: 1.8, vida: 500, tam: 0.1, espalha: 400 });
                break;
            case 'cura':
                this.item({ tipo: 'aura', id, x: W.x, y: W.y, cor: '#4ade80', t0, dur: 700, camada: 'chao' });
                this.jorro(t0, W.x, W.y, 10, [cor, '#ffffff'], { tipo: 'brilho', v: 1.2, vida: 500, tam: 0.12 });
                break;
            default: // aura / buff
                this.item({ tipo: 'aura', id, x: W.x, y: W.y, cor, t0, dur: 700, camada: 'chao' });
                this.jorro(t0, W.x, W.y + 0.3, 10, [cor, '#ffffff'], { tipo: 'estrela', v: 0.5, sobe: -1.4, arr: 1, vida: 800, tam: 0.15, raio: 0.9 });
        }
    },

    // Impacto de dano: forma conforme a habilidade, brilho na Estrela, empurrãozinho e tremor da tela.
    impacto(e, tq, alvo, fonte, P) {
        if (!alvo) return;
        const W = this.w(alvo.q, alvo.r), F = fonte ? this.w(fonte.q, fonte.r) : null;
        const st = e.h ? this.estilo(e.h) : { i: 'golpe', c: '#f87171' };
        const d = F && (F.x !== W.x || F.y !== W.y) ? this.dir(F, W) : { x: 0, y: -1 };
        const forca = Math.min(3, 1 + (e.vida || 0) * 0.35);
        if (!P.explodiu[e.para]) this.impactoVisual(st.i, W, tq, st.c, forca, d);
        else delete P.explodiu[e.para];
        if (e.abs && !e.vida) this.jorro(tq, W.x, W.y, 8, [COR.armadura || '#94a3b8', '#e2e8f0'], { tipo: 'faisca', v: 2.6, vida: 300, tam: 0.09 });
        this.piscar(e.para, tq);
        this.desviar(e.para, d.x * 0.18 * forca, d.y * 0.18 * forca, tq, 300, 'recuo', 0.05);
        const pesado = st.i === 'pesado' || st.i === 'explosao';
        if (e.vida) this.tremer(tq, pesado ? 320 : 220, Math.min(10, (pesado ? 3 : 1.5) + e.vida * (pesado ? 1.3 : 0.8)));
    },
    impactoVisual(tipo, W, tq, cor, forca, d) {
        const ang = d ? Math.atan2(d.y, d.x) : -Math.PI / 2;
        switch (tipo) {
            case 'corte':
                this.item({ tipo: 'corte', x: W.x, y: W.y, ang: ang + (Math.random() < 0.5 ? 0.5 : -0.5), cor, t0: tq - 30, dur: 300 });
                this.jorro(tq, W.x, W.y, 9 * forca, ['#ffffff', cor], { tipo: 'faisca', v: 3.2, ang, abre: 2.2, vida: 320, tam: 0.1 });
                break;
            case 'pesado':
                this.item({ tipo: 'golpe', x: W.x, y: W.y, cor, t0: tq, dur: 380, tam: 0.75 + 0.1 * forca });
                this.jorro(tq, W.x, W.y + 0.2, 8 * forca, ['#a8a29e', '#78716c', cor], { tipo: 'caco', v: 3, sobe: -1.5, g: 8, arr: 0.6, vida: 650, tam: 0.09 });
                this.jorro(tq, W.x, W.y + 0.35, 5, '#a8a29e', { tipo: 'fumaca', v: 0.9, vida: 650, tam: 0.25 });
                break;
            case 'cristal':
                this.item({ tipo: 'golpe', x: W.x, y: W.y, cor, t0: tq, dur: 340, tam: 0.65 });
                this.jorro(tq, W.x, W.y, 10 * forca, [cor, '#ffffff', '#a5f3fc'], { tipo: 'caco', v: 3.4, sobe: -1, g: 6, arr: 0.8, vida: 600, tam: 0.11 });
                break;
            case 'energia':
                this.item({ tipo: 'anel', x: W.x, y: W.y, cor, t0: tq, dur: 420, r0: 0.2, r1: 1.0, larg: 0.14 });
                this.item({ tipo: 'golpe', x: W.x, y: W.y, cor, t0: tq, dur: 300, tam: 0.55 });
                this.jorro(tq, W.x, W.y, 12 * forca, [cor, '#ffffff'], { tipo: 'faisca', v: 3, vida: 380, tam: 0.1 });
                break;
            case 'explosao':
                this.item({ tipo: 'explosao', x: W.x, y: W.y, t0: tq, dur: 520, tam: 0.85 + 0.12 * forca });
                this.jorro(tq, W.x, W.y, 14 * forca, ['#fde047', '#f97316', '#ffffff'], { tipo: 'faisca', v: 4, vida: 420, tam: 0.11 });
                this.jorro(tq + 60, W.x, W.y, 6, ['#57534e', '#78716c'], { tipo: 'fumaca', v: 0.8, sobe: -0.6, vida: 900, tam: 0.32 });
                this.jorro(tq, W.x, W.y, 6, ['#44403c', '#facc15'], { tipo: 'caco', v: 3.2, sobe: -1.5, g: 8, arr: 0.6, vida: 600, tam: 0.08 });
                this.tremer(tq, 300, 4);
                break;
            case 'brilho':
                this.item({ tipo: 'anel', x: W.x, y: W.y, cor, t0: tq, dur: 400, r0: 0.2, r1: 0.9, larg: 0.08 });
                this.jorro(tq, W.x, W.y, 10 * forca, [cor, '#ffffff'], { tipo: 'estrela', v: 1.8, vida: 550, tam: 0.15 });
                break;
            default:
                this.item({ tipo: 'golpe', x: W.x, y: W.y, cor: cor || '#f87171', t0: tq, dur: 300, tam: 0.55 });
                this.jorro(tq, W.x, W.y, 8, ['#ffffff', '#fca5a5'], { tipo: 'faisca', v: 2.8, vida: 320, tam: 0.1 });
        }
    },

    // Animação do movimento pelo caminho: andar (passinhos com poeira), investida (rastro), salto/arremesso (arco), empurrão.
    animarMov(e, t0, tipo, per) {
        const cam = (e.cam || []).filter(Array.isArray);
        if (cam.length < 2) return t0;
        const pts = cam.map(([q, r]) => this.w(q, r)), n = cam.length - 1;
        const dur = tipo === 'salto' ? 480 : tipo === 'arremesso' ? 520
            : (per || (tipo === 'andar' ? 150 : tipo === 'investida' ? 70 : 110)) * n + 40;
        ui.anims[e.id] = { q: cam[0][0], r: cam[0][1], t0, dur, cam: pts, tipo, n };
        const fimP = pts[n];
        if (tipo === 'andar') for (let i = 1; i <= n; i++) this.jorro(t0 + i * (dur - 40) / n - 30, pts[i].x, pts[i].y + 0.42, 2, '#9ca3af', { tipo: 'fumaca', v: 0.5, vida: 450, tam: 0.13 });
        else if (tipo === 'investida') {
            this.jorro(t0, pts[0].x, pts[0].y + 0.4, 5, '#a8a29e', { tipo: 'fumaca', v: 0.9, vida: 500, tam: 0.18 });
        } else if (tipo === 'salto' || tipo === 'arremesso') {
            this.jorro(t0 + dur - 20, fimP.x, fimP.y + 0.4, 7, '#a8a29e', { tipo: 'fumaca', v: 1.2, vida: 550, tam: 0.2 });
            this.item({ tipo: 'anel', x: fimP.x, y: fimP.y + 0.15, cor: '#d6d3d1', t0: t0 + dur, dur: 350, r0: 0.3, r1: 0.9, larg: 0.07, camada: 'chao' });
            if (tipo === 'arremesso') this.tremer(t0 + dur, 260, 5);
        } else this.jorro(t0, pts[0].x, pts[0].y + 0.4, 4, '#a8a29e', { tipo: 'fumaca', v: 0.7, vida: 450, tam: 0.16, espalha: dur });
        return t0 + dur;
    },
    // Posição numa animação de caminho (ver posPeca).
    posAnim(an, k) {
        const R = view.hexR;
        let e;
        switch (an.tipo) {
            case 'andar': e = 0.5 * k + 0.5 * (k * k * (3 - 2 * k)); break;
            case 'investida': e = k * k * (2.2 - 1.2 * k); break;
            case 'empurrao': e = this.sai(k); break;
            default: e = k;
        }
        const pt = this.aoLongo(an.cam, e), s = this.px(pt.x, pt.y);
        if (an.tipo === 'salto' || an.tipo === 'arremesso') {
            const alt = Math.sin(Math.PI * k) * R * (an.tipo === 'arremesso' ? 1.3 : 0.95);
            return { x: s.x, y: s.y - alt, chao: s.y, alt };
        }
        if (an.tipo === 'andar') return { x: s.x, y: s.y - Math.abs(Math.sin(Math.PI * e * an.n)) * R * 0.08 };
        return s;
    },

    // Mudanças da foto anterior para a atual: cura, Âmago, Armadura, Buffs/Debuffs, Marcas.
    mudancas(id, a, b, tq) {
        const W = this.w(b.q, b.r);
        if (b.vida > a.vida) {
            this.item({ tipo: 'aura', id, x: W.x, y: W.y, cor: '#4ade80', t0: tq, dur: 800, camada: 'chao' });
            this.jorro(tq, W.x, W.y + 0.2, 9, ['#4ade80', '#bbf7d0'], { tipo: 'mais', v: 0.3, sobe: -1.3, arr: 1, vida: 950, tam: 0.17, raio: 0.9, espalha: 250 });
        }
        if (b.amago > a.amago) this.jorro(tq, W.x, W.y, 7, ['#38bdf8', '#e0f2fe'], { tipo: 'brilho', v: 0.6, sobe: -1, arr: 1, vida: 700, tam: 0.12, raio: 0.7 });
        if (b.arm > a.arm) this.item({ tipo: 'escudo', id, x: W.x, y: W.y, cor: COR.armadura || '#94a3b8', t0: tq, dur: 800 });
        if (b.bons > a.bons) this.jorro(tq, W.x, W.y + 0.2, 4, '#4ade80', { tipo: 'seta', v: 0.15, sobe: -1.1, arr: 1, vida: 900, tam: 0.2, raio: 0.8, espalha: 200, vr: 0 });
        if (b.ruins > a.ruins) {
            this.jorro(tq, W.x, W.y - 0.3, 4, '#f87171', { tipo: 'setaBaixo', v: 0.15, sobe: 0.9, arr: 1, vida: 900, tam: 0.2, raio: 0.8, espalha: 200, vr: 0 });
            this.jorro(tq, W.x, W.y, 5, ['#7e22ce', '#3b0764'], { tipo: 'fumaca', v: 0.5, sobe: -0.3, vida: 800, tam: 0.25 });
        }
        for (const [m, n] of Object.entries(b.mk || {})) if (n > ((a.mk || {})[m] || 0) && CONFIG.marks[m])
            this.item({ tipo: 'selo', id, x: W.x, y: W.y, cor: CONFIG.marks[m].cor || '#ffffff', t0: tq, dur: 800 });
    },
    contagens(p) {
        let bons = 0, ruins = 0;
        for (const e of p.effects || []) { if (e.tipo === 'marca') continue; if (Engine.isDebuff(e)) ruins++; else if (e.buff || e.delta > 0 || e.tipo === 'escudo') bons++; }
        const mk = {};
        for (const id of Object.keys(CONFIG.marks)) { const n = Rules.marks(p, id); if (n) mk[id] = n; }
        return { bons, ruins, mk };
    },
    // Derrota: a Estrela continua desenhada até o golpe e se estilhaça; o Renome voa para quem derrotou.
    derrota(id, a, pos, ate, quem) {
        const W = this.w(pos.q, pos.r), cor = (a.ref && a.ref.color) || '#ffffff';
        this.fantasmas.push({ p: a.ref, pos: { id, q: pos.q, r: pos.r }, ate });
        this.piscar(id, ate - 140, '#ffffff', 160);
        this.jorro(ate, W.x, W.y, 18, [cor, '#ffffff', '#1f2937'], { tipo: 'caco', v: 3.6, sobe: -1, g: 7, arr: 0.6, vida: 800, tam: 0.14 });
        this.jorro(ate, W.x, W.y, 10, [cor, '#ffffff'], { tipo: 'faisca', v: 4, vida: 450, tam: 0.12 });
        this.jorro(ate + 40, W.x, W.y, 6, '#6b7280', { tipo: 'fumaca', v: 0.8, sobe: -0.5, vida: 900, tam: 0.3 });
        this.item({ tipo: 'anel', x: W.x, y: W.y, cor: '#ffffff', t0: ate, dur: 500, r0: 0.4, r1: 1.6, larg: 0.12 });
        this.tremer(ate, 380, 8);
        if (quem == null) return ate;
        const k = state.pieces.find(p => p.id === quem);
        if (!k) return ate;
        const K = this.w(k.q, k.r);
        let chega = ate;
        for (let i = 0; i < 5; i++) {
            const t0 = ate + 150 + i * 60, du = 520 + Math.random() * 120;
            this.item({ tipo: 'projetil', pts: [W, K], forma: 'renome', cor: '#facc15', t0, dur: du, arco: 0.6 + Math.random() * 0.8 });
            chega = Math.max(chega, t0 + du);
        }
        this.jorro(chega, K.x, K.y, 12, ['#facc15', '#fde68a', '#ffffff'], { tipo: 'estrela', v: 1.6, vida: 700, tam: 0.17 });
        this.item({ tipo: 'anel', id: quem, x: K.x, y: K.y, cor: '#facc15', t0: chega, dur: 500, r0: 0.3, r1: 1.1, larg: 0.1 });
        return chega;
    },
    faixa(t0, round, player, novaRodada) {
        const th = CONFIG.players[player];
        if (!th) return;
        this.item({ tipo: 'faixa', camada: 'tela', t0, dur: this.completo() ? 1300 : 1000, txt: `VEZ DO ${th.label}`, sub: novaRodada ? `RODADA ${round}` : '', cor: th.bannerBg, borda: th.bannerBorder, texto: th.bannerText, desliza: this.completo() });
        // Bots esperam a faixa passar antes de agir (fica melhor em vídeo).
        this.ocupado = Math.max(this.ocupado, t0 + (this.completo() ? 800 : 500));
    },
    festa(t0) {
        const W = view.width, H = view.height, cores = ['#facc15', '#f472b6', '#60a5fa', '#4ade80', '#f97316', '#c084fc', '#ffffff'];
        for (const lado of [-1, 1]) this.jorro(t0, lado < 0 ? 0 : W, H, 70, cores, {
            tela: true, tipo: 'confete', ang: lado < 0 ? -1.1 : -2.04, abre: 0.7, v: Math.max(700, H * 1.5), g: 900, arr: 1.2, tam: 9, vida: 2800, espalha: 350, vr: 12
        });
        this.item({ tipo: 'clarao', camada: 'tela', t0, dur: 450, cor: '#ffffff', a: 0.3 });
    },

    // ── desenho ──
    tremor(t) {
        if (!this.tremores.length) return null;
        let f = 0;
        this.tremores = this.tremores.filter(s => t < s.t0 + s.dur);
        for (const s of this.tremores) { const k = (t - s.t0) / s.dur; if (k >= 0) f = Math.max(f, s.forca * (1 - k) * (1 - k)); }
        return f > 0.3 ? { x: (Math.random() * 2 - 1) * f, y: (Math.random() * 2 - 1) * f } : null;
    },
    desvio(id, t) {
        const l = this.desvios[id];
        if (!l) return null;
        let x = 0, y = 0, vivo = false;
        for (const d of l) {
            const k = (t - d.t0) / d.dur;
            if (k >= 1) continue;
            vivo = true;
            if (k < 0) continue;
            const env = d.forma === 'bote' ? (k < 0.35 ? this.sai(k / 0.35) : 1 - this.vaiVem((k - 0.35) / 0.65))
                : d.forma === 'recuo' ? (k < 0.15 ? k / 0.15 : Math.pow(1 - (k - 0.15) / 0.85, 2)) : Math.sin(Math.PI * k);
            x += d.dx * env + (d.treme ? Math.sin(k * 70) * d.treme * (1 - k) : 0);
            y += d.dy * env;
        }
        if (!vivo) { delete this.desvios[id]; return null; }
        return { x: x * view.hexR, y: y * view.hexR };
    },
    oculto(dono, o, t) {
        const ate = this.ocultos[`${dono}:${o}`];
        if (ate == null) return false;
        if (t < ate) return true;
        delete this.ocultos[`${dono}:${o}`];
        return false;
    },
    segurado(p, t) {
        const s = this.segura[p.id];
        if (!s) return null;
        if (t >= s.ate) { delete this.segura[p.id]; return null; }
        return s;
    },
    barraFantasma(id, t) {
        const b = this.barras[id];
        if (!b) return null;
        const k = (t - b.t0) / 650;
        if (k >= 1) { delete this.barras[id]; return null; }
        if (k < 0) return null;
        return b.para + (b.de - b.para) * (k < 0.3 ? 1 : 1 - this.vaiVem((k - 0.3) / 0.7));
    },
    // Antes de desenhar a Estrela: sombra no salto e rastro na investida.
    antesDaPeca(p, pos, t) {
        const R = view.hexR, an = ui.anims[p.id];
        if (pos.chao != null) {
            ctx.save();
            ctx.globalAlpha = 0.35 * (1 - Math.min(0.6, pos.alt / (R * 1.6)));
            ctx.beginPath(); ctx.ellipse(pos.x, pos.chao + R * 0.35, R * 0.5, R * 0.18, 0, 0, 2 * Math.PI);
            ctx.fillStyle = '#000000'; ctx.fill();
            ctx.restore();
        }
        if (an && an.cam && (an.tipo === 'investida' || an.tipo === 'empurrao')) {
            const k = (t - an.t0) / an.dur;
            if (k <= 0 || k >= 1) return;
            ctx.save();
            for (let i = 3; i >= 1; i--) {
                const q = this.posAnim(an, Math.max(0, k - i * 0.07));
                ctx.globalAlpha = 0.28 / i;
                ctx.beginPath(); ctx.arc(q.x, q.y, R * 0.58, 0, 2 * Math.PI);
                ctx.fillStyle = p.color; ctx.fill();
            }
            ctx.restore();
        }
    },
    // Brilho branco sobre o retrato no instante do golpe.
    brilhoPeca(p, x, y, R, t) {
        const f = this.flashes[p.id];
        if (!f) return;
        const k = (t - f.t0) / f.dur;
        if (k >= 1) { delete this.flashes[p.id]; return; }
        if (k < 0) return;
        ctx.save();
        ctx.globalAlpha = 0.8 * (1 - k);
        ctx.beginPath(); ctx.arc(x, y, R * 0.6, 0, 2 * Math.PI);
        ctx.fillStyle = f.cor; ctx.fill();
        ctx.restore();
    },
    desenharFantasmas(t, R) {
        if (!this.fantasmas.length) return;
        this.fantasmas = this.fantasmas.filter(g => t < g.ate && g.p && g.p.stats);
        for (const g of this.fantasmas) {
            const { x, y } = posPeca(g.pos, t);
            const img = retrato(g.p.stats.nome), th = CONFIG.players[g.p.player] || {};
            ctx.beginPath(); ctx.arc(x, y, R * 0.6, 0, 2 * Math.PI);
            ctx.fillStyle = g.p.color; ctx.fill();
            if (img) { ctx.save(); ctx.clip(); ctx.drawImage(img, x - R * 0.6, y - R * 0.6, R * 1.2, R * 1.2); ctx.restore(); }
            ctx.lineWidth = 3; ctx.strokeStyle = th.bannerBorder || '#ffffff'; ctx.stroke();
            this.brilhoPeca({ id: g.pos.id }, x, y, R, t);
            drawContadores(g.p, x, y, R, { bons: 0, ruins: 0 }, t, g.pos.id);
        }
    },
    desenhar(t, camada) {
        const R = view.hexR;
        let n = 0;
        for (const it of this.itens) {
            const k = (t - it.t0) / it.dur;
            if (k >= 1) continue;
            this.itens[n++] = it;
            if (k < 0 || it.camada !== camada) continue;
            const f = this.D[it.tipo];
            if (!f) continue;
            ctx.save();
            try { f.call(this, it, k, t, R); } finally { ctx.restore(); }
        }
        this.itens.length = n;
        if (camada === 'alto') this.desenharParts(t, false);
        if (camada === 'tela') this.desenharParts(t, true);
    },
    desenharParts(t, tela) {
        const R = view.hexR;
        let n = 0;
        for (const p of this.parts) {
            const k = (t - p.t0) / p.vida;
            if (k >= 1) continue;
            this.parts[n++] = p;
            if (k < 0 || !!p.tela !== tela) continue;
            const s = (t - p.t0) / 1000, f = p.arr ? (1 - Math.exp(-p.arr * s)) / p.arr : s;
            const wx = p.x + p.vx * f, wy = p.y + p.vy * f + 0.5 * p.g * s * s;
            const { x, y } = tela ? { x: wx, y: wy } : this.px(wx, wy);
            const tam = (tela ? 1 : R) * p.tam;
            ctx.save();
            switch (p.tipo) {
                case 'brilho': {
                    const r = tam * (1 - k * 0.5);
                    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
                    ctx.drawImage(this.sprite(p.cor), x - r * 2, y - r * 2, r * 4, r * 4);
                    break;
                }
                case 'faisca': {
                    const amort = p.arr ? Math.exp(-p.arr * s) : 1, vx = p.vx * amort, vy = p.vy * amort + p.g * s;
                    const v = Math.hypot(vx, vy) || 1, l = tam * 2.5 * (1 - k) + tam;
                    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
                    ctx.strokeStyle = p.cor; ctx.lineWidth = Math.max(1, tam * 0.5); ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx / v * l, y - vy / v * l); ctx.stroke();
                    break;
                }
                case 'caco': {
                    ctx.globalAlpha = 1 - k * k;
                    ctx.translate(x, y); ctx.rotate(p.rot + p.vr * s);
                    ctx.beginPath(); ctx.moveTo(0, -tam); ctx.lineTo(tam * 0.6, 0); ctx.lineTo(0, tam * 0.8); ctx.lineTo(-tam * 0.5, 0); ctx.closePath();
                    ctx.fillStyle = p.cor; ctx.fill();
                    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'; ctx.stroke();
                    break;
                }
                case 'fumaca':
                    ctx.globalAlpha = 0.38 * (1 - k);
                    ctx.beginPath(); ctx.arc(x, y, tam * (0.6 + k * 1.3), 0, 2 * Math.PI);
                    ctx.fillStyle = p.cor; ctx.fill();
                    break;
                case 'mais':
                    ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
                    ctx.strokeStyle = p.cor; ctx.lineWidth = Math.max(2, tam * 0.38); ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(x - tam * 0.5, y); ctx.lineTo(x + tam * 0.5, y); ctx.moveTo(x, y - tam * 0.5); ctx.lineTo(x, y + tam * 0.5); ctx.stroke();
                    break;
                case 'seta':
                case 'setaBaixo': {
                    const sg = p.tipo === 'seta' ? -1 : 1;
                    ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
                    ctx.strokeStyle = p.cor; ctx.lineWidth = Math.max(2, tam * 0.3); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                    ctx.beginPath(); ctx.moveTo(x - tam * 0.5, y - sg * tam * 0.25); ctx.lineTo(x, y + sg * tam * 0.25); ctx.lineTo(x + tam * 0.5, y - sg * tam * 0.25); ctx.stroke();
                    break;
                }
                case 'estrela': {
                    const r = tam * Math.sin(Math.PI * Math.min(1, k * 1.2));
                    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k * 0.5;
                    ctx.translate(x, y); ctx.rotate(p.rot + p.vr * s * 0.3);
                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.28 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
                    ctx.closePath(); ctx.fillStyle = p.cor; ctx.fill();
                    break;
                }
                case 'confete':
                    ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
                    ctx.translate(x, y); ctx.rotate(p.rot + p.vr * s);
                    ctx.scale(1, Math.abs(Math.cos(p.rot + s * 9)));
                    ctx.fillStyle = p.cor; ctx.fillRect(-tam / 2, -tam / 4, tam, tam / 2);
                    break;
            }
            ctx.restore();
        }
        this.parts.length = n;
    },
    // Efeitos na tela (sem tremor): faixa de turno, clarão, confete.
    desenharTela(t) {
        if (this.itens.length || this.parts.length) this.desenhar(t, 'tela');
    },

    D: {
        texto(it, k, t, R) {
            const p = this.onde(it, t), ent = Math.min(1, k * it.dur / 180);
            const esc = 0.6 + 0.4 * this.estoura(ent), fs = it.pq ? 10 : 13;
            ctx.globalAlpha = this.some(k, 0.75);
            ctx.translate(p.x, p.y - R * 1.12 - it.dy - (1 - ent) * 6 - k * 8);
            ctx.scale(esc, esc);
            const font = `bold ${fs}px Inter`;
            ctx.font = font;
            const w = ctx.measureText(it.txt).width + 14, h = fs + 9;
            caminhoArredondado(-w / 2, -h / 2, w, h, h / 2);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; ctx.fill();
            ctx.lineWidth = 1.5; ctx.strokeStyle = it.cor; ctx.stroke();
            drawLabel(it.txt, 0, 0.5, font, it.pq ? it.cor : '#ffffff');
        },
        projetil(it, k, t, R) {
            const e = k, a = this.aoLongo(it.pts, e), b = this.aoLongo(it.pts, Math.max(0, e - 0.04));
            const alt = it.arco ? Math.sin(Math.PI * e) * it.arco : 0, altB = it.arco ? Math.sin(Math.PI * Math.max(0, e - 0.04)) * it.arco : 0;
            const P = this.px(a.x, a.y - alt), Q = this.px(b.x, b.y - altB);
            const ang = P.x === Q.x && P.y === Q.y ? Math.atan2(it.pts[1].y - it.pts[0].y, it.pts[1].x - it.pts[0].x) : Math.atan2(P.y - Q.y, P.x - Q.x);
            if (this.completo() || Math.random() < 0.5) this.part({ t0: t, vida: it.forma === 'renome' ? 300 : 260, x: a.x, y: a.y - alt, tam: it.forte ? 0.3 : 0.2, cor: it.cor, tipo: 'brilho' });
            if (it.arco) {
                const S = this.px(a.x, a.y);
                ctx.save(); ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.ellipse(S.x, S.y + R * 0.2, R * 0.18, R * 0.07, 0, 0, 2 * Math.PI); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
            }
            if (it.forma === 'shuriken') { drawShuriken(P.x, P.y, R * 0.32, t * 6, it.corDono || '#64748b'); return; }
            ctx.translate(P.x, P.y);
            const glow = (s, cor = it.cor) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(this.sprite(cor), -s, -s, 2 * s, 2 * s); ctx.restore(); };
            switch (it.forma) {
                case 'flecha':
                    glow(R * (it.forte ? 0.55 : 0.35));
                    ctx.rotate(ang);
                    ctx.lineCap = 'round'; ctx.strokeStyle = '#f5f5f4'; ctx.lineWidth = 2.5;
                    ctx.beginPath(); ctx.moveTo(-R * 0.45, 0); ctx.lineTo(R * 0.18, 0); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(R * 0.32, 0); ctx.lineTo(R * 0.14, -R * 0.09); ctx.lineTo(R * 0.14, R * 0.09); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
                    ctx.strokeStyle = it.cor; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(-R * 0.45, 0); ctx.lineTo(-R * 0.55, -R * 0.08); ctx.moveTo(-R * 0.45, 0); ctx.lineTo(-R * 0.55, R * 0.08); ctx.stroke();
                    break;
                case 'adaga':
                    glow(R * 0.3);
                    ctx.rotate(ang + k * Math.PI * 5);
                    ctx.beginPath(); ctx.moveTo(R * 0.3, 0); ctx.lineTo(0, -R * 0.06); ctx.lineTo(-R * 0.04, 0); ctx.lineTo(0, R * 0.06); ctx.closePath();
                    ctx.fillStyle = '#e5e7eb'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#374151'; ctx.stroke();
                    ctx.fillStyle = it.cor; ctx.fillRect(-R * 0.16, -R * 0.035, R * 0.13, R * 0.07);
                    break;
                case 'cristal':
                    glow(R * 0.35);
                    ctx.rotate(ang);
                    ctx.beginPath(); ctx.moveTo(R * 0.26, 0); ctx.lineTo(0, -R * 0.09); ctx.lineTo(-R * 0.2, 0); ctx.lineTo(0, R * 0.09); ctx.closePath();
                    ctx.fillStyle = it.cor; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#ecfeff'; ctx.stroke();
                    break;
                case 'dinamite': {
                    ctx.rotate(t / 70);
                    ctx.fillStyle = '#dc2626'; ctx.fillRect(-R * 0.15, -R * 0.06, R * 0.3, R * 0.12);
                    ctx.lineWidth = 1; ctx.strokeStyle = '#7f1d1d'; ctx.strokeRect(-R * 0.15, -R * 0.06, R * 0.3, R * 0.12);
                    ctx.fillStyle = '#fde68a'; ctx.fillRect(-R * 0.05, -R * 0.06, R * 0.03, R * 0.12);
                    ctx.translate(R * 0.19, 0); glow(R * (0.13 + Math.random() * 0.08), '#fde047');
                    break;
                }
                case 'pena':
                    ctx.rotate(ang + Math.sin(t / 70) * 0.35);
                    glow(R * 0.28);
                    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.24, R * 0.075, 0, 0, 2 * Math.PI);
                    ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = it.cor; ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-R * 0.3, 0); ctx.lineTo(R * 0.22, 0); ctx.strokeStyle = '#94a3b8'; ctx.stroke();
                    break;
                case 'vento':
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.rotate(t / 60);
                    ctx.strokeStyle = it.cor; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
                    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, R * (0.12 + i * 0.07), i * 2.1, i * 2.1 + 2.2); ctx.stroke(); }
                    glow(R * 0.25);
                    if (Math.random() < 0.6) this.part({ t0: t, vida: 500, x: a.x, y: a.y, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, arr: 2, tam: 0.12, cor: '#ffffff', tipo: 'estrela' });
                    break;
                case 'bala': // traçante: risco claro atrás de uma cabeça brilhante
                    glow(R * (it.forte ? 0.3 : 0.22), '#fde68a');
                    ctx.rotate(ang);
                    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(253, 230, 138, 0.6)'; ctx.lineWidth = Math.max(1.5, R * 0.06);
                    ctx.beginPath(); ctx.moveTo(-R * 0.5, 0); ctx.lineTo(0, 0); ctx.stroke();
                    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.08, R * 0.035, 0, 0, 2 * Math.PI); ctx.fillStyle = '#fffbeb'; ctx.fill();
                    break;
                case 'bomba': // bomba de fumaça com pavio aceso
                    ctx.rotate(t / 120);
                    ctx.beginPath(); ctx.arc(0, 0, R * 0.13, 0, 2 * Math.PI); ctx.fillStyle = '#374151'; ctx.fill();
                    ctx.lineWidth = 1.2; ctx.strokeStyle = '#9ca3af'; ctx.stroke();
                    ctx.fillStyle = '#6b7280'; ctx.fillRect(-R * 0.03, -R * 0.2, R * 0.06, R * 0.08);
                    ctx.translate(0, -R * 0.23); glow(R * (0.1 + Math.random() * 0.06), '#fde047');
                    break;
                case 'renome':
                    glow(R * 0.3, '#facc15');
                    ctx.rotate(t / 200);
                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, rr = i % 2 ? R * 0.05 : R * 0.14; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
                    ctx.closePath(); ctx.fillStyle = '#fef9c3'; ctx.fill();
                    break;
                default: // orbe
                    glow(R * (it.forte ? 0.5 : 0.38));
                    ctx.beginPath(); ctx.arc(0, 0, R * 0.09, 0, 2 * Math.PI); ctx.fillStyle = '#ffffff'; ctx.fill();
            }
        },
        feixe(it, k, t, R) {
            const A = this.px(it.x, it.y), B = this.px(it.x2, it.y2);
            const cresce = this.sai(Math.min(1, k / 0.25)), fade = this.some(k, 0.55);
            const ex = A.x + (B.x - A.x) * cresce, ey = A.y + (B.y - A.y) * cresce;
            ctx.globalCompositeOperation = 'lighter';
            const larg = R * (it.larg || 0.24) * fade * (0.85 + 0.15 * Math.sin(t / 25));
            ctx.lineCap = 'round';
            if (it.corrente) {
                const d = this.dir(A, B), nx = -d.y, ny = d.x, n = 9;
                ctx.globalAlpha = fade;
                for (const [lw, cor] of [[Math.max(2, larg * 0.5), it.cor], [1.5, '#ffffff']]) {
                    ctx.beginPath(); ctx.moveTo(A.x, A.y);
                    for (let i = 1; i <= n; i++) {
                        const f = i / n * cresce, j = i < n ? (Math.random() - 0.5) * R * 0.22 : 0;
                        ctx.lineTo(A.x + (B.x - A.x) * f + nx * j, A.y + (B.y - A.y) * f + ny * j);
                    }
                    ctx.lineWidth = lw; ctx.strokeStyle = cor; ctx.stroke();
                }
            } else {
                ctx.globalAlpha = 0.55 * fade;
                ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(ex, ey);
                ctx.lineWidth = larg; ctx.strokeStyle = it.cor; ctx.stroke();
                ctx.globalAlpha = fade;
                ctx.lineWidth = Math.max(1.5, larg * 0.35); ctx.strokeStyle = '#ffffff'; ctx.stroke();
            }
            ctx.globalAlpha = fade;
            const s = R * 0.45;
            ctx.drawImage(this.sprite(it.cor), A.x - s, A.y - s, 2 * s, 2 * s);
            const s2 = R * 0.7 * cresce;
            ctx.drawImage(this.sprite(it.cor), ex - s2, ey - s2, 2 * s2, 2 * s2);
        },
        corte(it, k, t, R) {
            const P = this.px(it.x, it.y), rad = R * 0.75;
            const cx = P.x - Math.cos(it.ang) * R * 0.4, cy = P.y - Math.sin(it.ang) * R * 0.4;
            const ini = it.ang - 1.1, span = 2.2;
            const fim = ini + span * this.sai(Math.min(1, k / 0.45)), cauda = ini + span * this.sai(Math.max(0, (k - 0.2) / 0.8));
            if (fim <= cauda) return;
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = this.some(k, 0.6); ctx.lineCap = 'round';
            for (const [lw, cor] of [[R * 0.17, it.cor], [R * 0.06, '#ffffff']]) {
                ctx.beginPath(); ctx.arc(cx, cy, rad, cauda, fim); ctx.lineWidth = lw; ctx.strokeStyle = cor; ctx.stroke();
            }
        },
        golpe(it, k, t, R) {
            const P = this.px(it.x, it.y), s = R * (it.tam || 0.6), e = this.sai(k);
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
            const g = s * (1.2 - 0.6 * k);
            ctx.drawImage(this.sprite(it.cor), P.x - g, P.y - g, 2 * g, 2 * g);
            ctx.beginPath(); ctx.arc(P.x, P.y, s * (0.3 + 0.9 * e), 0, 2 * Math.PI);
            ctx.lineWidth = Math.max(1, R * 0.12 * (1 - k)); ctx.strokeStyle = it.cor; ctx.stroke();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, 2.5 * (1 - k)); ctx.lineCap = 'round';
            const rot = it.rot ?? (it.rot = Math.random());
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = rot + i * Math.PI / 4, r1 = s * (0.25 + 0.8 * e), r2 = s * (0.5 + 1.1 * e) * (i % 2 ? 0.75 : 1);
                ctx.moveTo(P.x + Math.cos(a) * r1, P.y + Math.sin(a) * r1); ctx.lineTo(P.x + Math.cos(a) * r2, P.y + Math.sin(a) * r2);
            }
            ctx.stroke();
        },
        anel(it, k, t, R) {
            const P = this.onde(it, t), e = this.sai(k), r = R * (it.r0 + (it.r1 - it.r0) * e);
            ctx.globalAlpha = 1 - k;
            ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, 2 * Math.PI);
            if (it.cheio) { ctx.fillStyle = this.rgba(it.cor, 0.16); ctx.fill(); }
            ctx.lineWidth = Math.max(1, R * it.larg * (1 - k)); ctx.strokeStyle = it.cor; ctx.stroke();
        },
        pilar(it, k, t, R) {
            const P = this.px(it.x, it.y + 0.3), sobe = this.estoura(Math.min(1, k / 0.22)), fade = this.some(k, 0.65);
            const h = R * 0.95 * sobe * (0.5 + 0.5 * fade), wd = R * 0.17;
            ctx.globalAlpha = 0.92 * fade;
            const espinho = (dx, hh, ww, inc) => {
                ctx.save(); ctx.translate(P.x + dx, P.y); ctx.rotate(inc);
                ctx.beginPath(); ctx.moveTo(-ww, 0); ctx.lineTo(0, -hh); ctx.lineTo(ww, 0); ctx.lineTo(0, ww * 0.5); ctx.closePath();
                const g = ctx.createLinearGradient(0, 0, 0, -hh);
                g.addColorStop(0, it.cor); g.addColorStop(1, '#ffffff');
                ctx.fillStyle = g; ctx.fill();
                ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(8, 47, 73, 0.6)'; ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -hh * 0.9); ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; ctx.lineWidth = 1; ctx.stroke();
                ctx.restore();
            };
            espinho(-wd * 1.2, h * 0.6, wd * 0.8, -0.35);
            espinho(wd * 1.2, h * 0.55, wd * 0.75, 0.4);
            espinho(0, h, wd, 0);
        },
        giro(it, k, t, R) {
            const P = this.onde(it, t), rad = R * 1.3, a = it.ang0 + this.vaiVem(k) * Math.PI * 2.2, fade = this.some(k, 0.75);
            ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
            for (let i = 0; i < 6; i++) {
                const aa = a - i * 0.2;
                ctx.globalAlpha = (1 - i / 6) * fade;
                ctx.beginPath(); ctx.arc(P.x, P.y, rad, aa - 0.22, aa);
                ctx.lineWidth = R * 0.17 * (1 - i / 7); ctx.strokeStyle = i === 0 ? '#ffffff' : it.cor; ctx.stroke();
            }
        },
        leque(it, k, t, R) {
            const P = this.px(it.x, it.y), rad = R * 2.3, a0 = it.ang - it.abre / 2, a = a0 + it.abre * this.sai(Math.min(1, k / 0.5)), fade = this.some(k, 0.5);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.3 * fade;
            ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.arc(P.x, P.y, rad, a0, a); ctx.closePath(); ctx.fillStyle = it.cor; ctx.fill();
            ctx.globalAlpha = fade; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(P.x, P.y, rad * 0.9, Math.max(a0, a - 0.6), a); ctx.lineWidth = R * 0.14; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        },
        martelo(it, k, t, R) {
            const P = this.onde(it, t), a = it.ang - 1.7 + 1.7 * this.vaiVem(Math.min(1, k / 0.7)), fade = this.some(k, 0.75);
            ctx.globalAlpha = fade;
            ctx.translate(P.x, P.y);
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 * fade;
            ctx.beginPath(); ctx.arc(0, 0, R * 0.95, a - 0.9, a); ctx.lineWidth = R * 0.25; ctx.strokeStyle = it.cor; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
            ctx.rotate(a);
            ctx.fillStyle = '#78350f'; ctx.fillRect(R * 0.2, -R * 0.04, R * 0.7, R * 0.08);
            ctx.fillStyle = '#9ca3af'; ctx.fillRect(R * 0.8, -R * 0.17, R * 0.24, R * 0.34);
            ctx.lineWidth = 1.2; ctx.strokeStyle = '#1f2937'; ctx.strokeRect(R * 0.8, -R * 0.17, R * 0.24, R * 0.34);
        },
        estocada(it, k, t, R) {
            const A = this.px(it.x, it.y), B = this.px(it.x2, it.y2), d = this.dir(A, B);
            const e = this.sai(Math.min(1, k / 0.4)), fade = this.some(k, 0.4);
            const sx = A.x + d.x * R * 0.3, sy = A.y + d.y * R * 0.3, ex = A.x + (B.x - A.x + d.x * R * 0.35) * e, ey = A.y + (B.y - A.y + d.y * R * 0.35) * e;
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade; ctx.lineCap = 'round';
            for (const [lw, cor] of [[R * 0.16, it.cor], [R * 0.05, '#ffffff']]) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineWidth = lw; ctx.strokeStyle = cor; ctx.stroke(); }
        },
        escudo(it, k, t, R) {
            const P = this.onde(it, t), ent = this.estoura(Math.min(1, k / 0.2)), fade = this.some(k, 0.6);
            const s = R * 0.86 * (0.7 + 0.3 * ent);
            ctx.globalAlpha = fade;
            drawHexagon(P.x, P.y, s, this.rgba(it.cor, 0.16), it.cor, 3);
            ctx.globalCompositeOperation = 'lighter';
            const a = k * Math.PI * 2.5, g = R * 0.3;
            ctx.drawImage(this.sprite(it.cor), P.x + Math.cos(a) * s - g, P.y + Math.sin(a) * s - g, 2 * g, 2 * g);
        },
        mira(it, k, t, R) {
            const P = this.onde(it, t), e = this.sai(Math.min(1, k / 0.4)), s = R * (1.15 - 0.4 * e), fade = this.some(k, 0.7);
            ctx.globalAlpha = fade; ctx.translate(P.x, P.y); ctx.rotate((1 - e) * Math.PI / 2);
            ctx.strokeStyle = it.cor; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, 2 * Math.PI); ctx.stroke();
            ctx.beginPath();
            for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.moveTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4); ctx.lineTo(Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85); }
            ctx.stroke();
        },
        selo(it, k, t, R) {
            const P = this.onde(it, t), s = R * 0.8 * this.estoura(Math.min(1, k / 0.25)), fade = this.some(k, 0.65);
            ctx.globalAlpha = fade; ctx.translate(P.x, P.y); ctx.rotate(t / 600);
            ctx.strokeStyle = it.cor; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, s, 0, 2 * Math.PI); ctx.stroke();
            ctx.lineWidth = 1.5;
            for (const r0 of [0, Math.PI / 4]) {
                ctx.beginPath();
                for (let i = 0; i < 4; i++) { const a = r0 + i * Math.PI / 2; ctx.lineTo(Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85); }
                ctx.closePath(); ctx.stroke();
            }
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * fade;
            ctx.drawImage(this.sprite(it.cor), -s, -s, 2 * s, 2 * s);
        },
        agua(it, k, t, R) {
            const P = this.onde(it, t), s = R * 0.8 * this.estoura(Math.min(1, k / 0.25)) * (1 + 0.04 * Math.sin(t / 90)), fade = this.some(k, 0.85);
            if (s <= 0) return;
            ctx.globalAlpha = fade;
            const g = ctx.createRadialGradient(P.x, P.y, s * 0.2, P.x, P.y, s);
            g.addColorStop(0, 'rgba(125, 211, 252, 0.05)'); g.addColorStop(1, 'rgba(125, 211, 252, 0.4)');
            ctx.beginPath(); ctx.arc(P.x, P.y, s, 0, 2 * Math.PI); ctx.fillStyle = g; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = '#bae6fd'; ctx.stroke();
            ctx.beginPath(); ctx.arc(P.x, P.y, s * 0.75, 3.6, 4.4); ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
        },
        aura(it, k, t, R) {
            const P = this.onde(it, t), s = R * 1.15;
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75 * Math.sin(Math.PI * k);
            ctx.drawImage(this.sprite(it.cor), P.x - s, P.y - s, 2 * s, 2 * s);
        },
        explosao(it, k, t, R) {
            const P = this.px(it.x, it.y), s = R * (it.tam || 1), e = this.sai(Math.min(1, k / 0.5)), rr = s * (0.3 + 0.8 * e);
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
            const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, rr);
            g.addColorStop(0, 'rgba(255, 255, 255, 1)'); g.addColorStop(0.3, 'rgba(253, 224, 71, 0.95)');
            g.addColorStop(0.65, 'rgba(249, 115, 22, 0.7)'); g.addColorStop(1, 'rgba(220, 38, 38, 0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P.x, P.y, rr, 0, 2 * Math.PI); ctx.fill();
            ctx.globalAlpha = 0.6 * (1 - k);
            ctx.beginPath(); ctx.arc(P.x, P.y, s * (0.5 + e), 0, 2 * Math.PI); ctx.lineWidth = Math.max(1, 3 * (1 - k)); ctx.strokeStyle = '#ffffff'; ctx.stroke();
        },
        faixa(it, k) {
            const W = view.width, H = view.height, y = H * 0.4, h = it.sub ? 64 : 54;
            let dx = 0;
            if (it.desliza) { if (k < 0.15) dx = -W * (1 - this.sai(k / 0.15)); else if (k > 0.85) dx = W * Math.pow((k - 0.85) / 0.15, 3); ctx.globalAlpha = 1; }
            else ctx.globalAlpha = k < 0.15 ? k / 0.15 : this.some(k, 0.85);
            ctx.translate(dx, 0);
            const g = ctx.createLinearGradient(0, 0, W, 0);
            g.addColorStop(0, this.rgba(it.cor, 0)); g.addColorStop(0.25, this.rgba(it.cor, 0.88)); g.addColorStop(0.75, this.rgba(it.cor, 0.88)); g.addColorStop(1, this.rgba(it.cor, 0));
            ctx.fillStyle = g; ctx.fillRect(0, y - h / 2, W, h);
            const b = ctx.createLinearGradient(0, 0, W, 0);
            b.addColorStop(0, this.rgba(it.borda, 0)); b.addColorStop(0.5, this.rgba(it.borda, 1)); b.addColorStop(1, this.rgba(it.borda, 0));
            ctx.fillStyle = b; ctx.fillRect(0, y - h / 2, W, 2); ctx.fillRect(0, y + h / 2 - 2, W, 2);
            drawTextoContorno(it.txt, W / 2, y - (it.sub ? 8 : 0), `bold ${W < 700 ? 20 : 26}px Inter`, it.texto, 'rgba(0, 0, 0, 0.6)', 4);
            if (it.sub) drawTextoContorno(it.sub, W / 2, y + 17, 'bold 12px Inter', '#e5e7eb', 'rgba(0, 0, 0, 0.6)', 3);
        },
        clarao(it, k) {
            ctx.globalAlpha = (it.a || 0.3) * (1 - k);
            ctx.fillStyle = it.cor; ctx.fillRect(0, 0, view.width, view.height);
        }
    }
};
VFX.iniciar();
