// ── VFX: eventos da partida viram sequências de efeitos ──
// Parte do VFX (efeitos visuais). Os métodos são juntados em vfx.js; use sempre VFX.nome(...).
import { Rules } from '../../motor/regras.js';
import { Engine } from '../../motor/engine.js';
import { state } from '../../partida/estado.js';

export default {
    // ── lote: transforma os eventos novos em uma sequência ──
    planejar(antes, agora, t) {
        const evs = (state.fx || []).filter((e) => e && e.n > this.visto);
        // Uso esperando rolagem manual ou reações de apoio: fica para quando resolver (aí aparece completo).
        const pd = state.pending,
            ap = state.efeitoPendente;
        const espera =
            pd && pd.tipo === 'rolagem'
                ? pd.pieceId
                : pd && state.ataque
                  ? state.ataque.pieceId
                  : ap
                    ? ap.pieceId
                    : null;
        let lote = evs;
        if (espera != null) {
            for (let j = evs.length - 1; j >= 0; j--)
                if (evs[j].k === 'hab' && evs[j].de === espera && !evs[j].p) {
                    lote = evs.slice(0, j);
                    break;
                }
        }
        this.visto = lote === evs ? state.fxN || 0 : lote.length ? lote[lote.length - 1].n : this.visto;
        const base = Math.max(t, Math.min(this.ocupado, t + 1200));
        const P = {
            base,
            quando: {},
            imp: {},
            lanc: {},
            moveu: new Set(),
            esquivas: [],
            abates: {},
            posEm: {},
            teveHab: false,
            explodiu: {},
        };
        this.ultimoHab = false;
        if (!lote.length) return P;
        const posDe = (id) => {
            if (P.posEm[id]) return P.posEm[id];
            const v = antes.get(id) || agora.get(id);
            return v ? { q: v.q, r: v.r } : null;
        };
        let c = base,
            fim = base,
            atual = null;
        const usados = new Set();
        for (let i = 0; i < lote.length; i++) {
            const e = lote[i];
            if (e.k === 'hab') {
                if (!e.p) P.teveHab = true;
                const ini = Math.max(c, P.quando[e.de] ?? 0);
                let mi = -1;
                for (let j = i + 1; j < lote.length && lote[j].k !== 'hab'; j++)
                    if (lote[j].k === 'mov' && lote[j].id === e.de && !lote[j].f) {
                        mi = j;
                        break;
                    }
                if (P.lanc[e.de] == null) P.lanc[e.de] = ini + 150;
                atual = e;
                const r = this.uso(e, ini, mi >= 0 ? lote[mi] : null, P, posDe);
                if (mi >= 0 && r.moveu) {
                    usados.add(mi);
                    P.moveu.add(e.de);
                    const cam = lote[mi].cam;
                    if (cam && cam.length) P.posEm[e.de] = { q: cam[cam.length - 1][0], r: cam[cam.length - 1][1] };
                }
                c = ini + (e.p ? 80 : 180);
                fim = Math.max(fim, r.fim);
            } else if (e.k === 'rol') {
                if (!e.ok) {
                    const tq = P.imp[e.para] ?? c;
                    P.esquivas.push({ id: e.para, t: tq });
                    const A = posDe(e.de),
                        B = posDe(e.para);
                    if (A && B) {
                        const d = this.dir(this.w(A.q, A.r), this.w(B.q, B.r));
                        this.desviar(e.para, -d.y * 0.38, d.x * 0.38, tq - 90, 340, 'esquiva');
                    }
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
                let tipo = 'andar',
                    t0 = c;
                if (e.f) {
                    t0 = P.imp[e.id] ?? c;
                    tipo = 'empurrao';
                    const fonte = atual && posDe(atual.de);
                    if (
                        fonte &&
                        cam.length === 2 &&
                        Rules.hexDistance({ q: cam[0][0], r: cam[0][1] }, { q: cam[1][0], r: cam[1][1] }) === 2 &&
                        Rules.hexDistance(fonte, { q: cam[0][0], r: cam[0][1] }) === 1 &&
                        Rules.hexDistance(fonte, { q: cam[1][0], r: cam[1][1] }) === 1
                    )
                        tipo = 'arremesso';
                } else if (atual && atual.de === e.id && c - (P.lanc[e.id] ?? -1e9) < 400) tipo = 'investida';
                const d = this.animarMov(e, t0, tipo);
                P.moveu.add(e.id);
                if (e.f)
                    P.imp[e.id] = d; // dano de colisão/arremesso aparece no fim do empurrão
                else c = d;
                fim = Math.max(fim, d);
            } else if (e.k === 'renome') {
                const p = posDe(e.id);
                if (p) {
                    const W = this.w(p.q, p.r);
                    this.item({
                        tipo: 'anel',
                        x: W.x,
                        y: W.y,
                        cor: '#facc15',
                        t0: c,
                        dur: 600,
                        r0: 0.3,
                        r1: 1.2,
                        larg: 0.12,
                    });
                    this.jorro(c, W.x, W.y, 14, ['#facc15', '#fde68a', '#ffffff'], {
                        tipo: 'estrela',
                        v: 1.6,
                        sobe: -1.2,
                        arr: 2,
                        vida: 900,
                        tam: 0.18,
                    });
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
        const dono = state.pieces.find((p) => p.id === e.de);
        if (!a || typeof e.q !== 'number') return { fim: ini };
        const st = this.estilo(e.h, dono && dono.color);
        if (st.e === 'nada') return { fim: ini };
        const passiva = !!e.p,
            cor = st.c,
            C = this.w(e.q, e.r),
            imp = P.imp;
        const alvos = (e.al || []).map(([id, q, r]) => ({ id, q, r, ...this.w(q, r) }));
        const z = (e.z || []).map(([q, r]) => ({ q, r, ...this.w(q, r) }));
        const voo = (A, B) =>
            Math.max(220, Math.min(650, 140 + 55 * Math.hypot(B.x - A.x, B.y - A.y))) + (st.arco ? 120 : 0);
        let fim = ini + 400,
            moveu = false;
        this.texto(e.de, a.nome, cor, ini, passiva, C);
        if (!passiva) {
            this.item({ tipo: 'aura', id: e.de, x: C.x, y: C.y, cor, t0: ini, dur: 520, camada: 'chao' });
            this.jorro(ini, C.x, C.y + 0.3, 6, cor, {
                tipo: 'brilho',
                v: 0.4,
                sobe: -1.3,
                arr: 1,
                vida: 650,
                tam: 0.13,
                raio: 0.8,
            });
        }
        const L = ini + (passiva ? 70 : 170);
        switch (st.e) {
            case 'projetil': {
                const primeiro = alvos[0] || z[z.length - 1];
                if (primeiro) {
                    const d = this.dir(C, primeiro);
                    this.desviar(e.de, d.x * 0.16, d.y * 0.16, L - 70, 240, 'bote');
                }
                if (st.multi && z.length) {
                    z.forEach((h, i) => {
                        const t0 = L + i * 120,
                            du = voo(C, h),
                            tq = t0 + du;
                        this.item({
                            tipo: 'projetil',
                            pts: [C, h],
                            forma: st.f,
                            cor,
                            t0,
                            dur: du,
                            arco: 0.9 + i * 0.15,
                        });
                        this.impactoVisual(st.i, h, tq, cor, 1, null);
                        for (const al of alvos)
                            if (al.q === h.q && al.r === h.r) {
                                imp[al.id] = tq;
                                P.explodiu[al.id] = 1;
                            }
                        fim = Math.max(fim, tq + 300);
                    });
                } else if (z.length) {
                    const o = st.objeto && dono && dono.objetos && dono.objetos[st.objeto];
                    const E = o ? this.w(o.q, o.r) : z[z.length - 1],
                        du = voo(C, E) + 80,
                        dist = Math.hypot(E.x - C.x, E.y - C.y) || 1;
                    this.item({
                        tipo: 'projetil',
                        pts: [C, E],
                        forma: st.f,
                        cor,
                        t0: L,
                        dur: du,
                        corDono: dono && dono.color,
                    });
                    for (const al of alvos)
                        imp[al.id] = L + du * Math.min(1, Math.hypot(al.x - C.x, al.y - C.y) / dist);
                    if (st.objeto) this.ocultos[`${e.de}:${st.objeto}`] = L + du;
                    this.jorro(L + du, E.x, E.y, 8, ['#e5e7eb', cor], { tipo: 'faisca', v: 2.2, vida: 350, tam: 0.1 });
                    this.item({
                        tipo: 'anel',
                        x: E.x,
                        y: E.y,
                        cor: '#e5e7eb',
                        t0: L + du,
                        dur: 350,
                        r0: 0.15,
                        r1: 0.6,
                        larg: 0.08,
                        camada: 'chao',
                    });
                    fim = Math.max(fim, L + du + 250);
                } else
                    alvos.forEach((al, i) => {
                        const t0 = L + i * (st.disparo ? 170 : 70),
                            du = st.disparo ? Math.max(130, voo(C, al) * 0.45) : voo(C, al);
                        if (st.disparo) this.disparo(e.de, C, al, t0, !!st.chumbo);
                        const d = this.dir(C, al);
                        for (const o of st.chumbo ? [-0.2, 0, 0.2] : [0])
                            this.item({
                                tipo: 'projetil',
                                pts: [C, o ? { x: al.x - d.y * o, y: al.y + d.x * o } : al],
                                forma: st.f,
                                cor,
                                t0,
                                dur: du,
                                arco: st.arco ? 0.9 : 0,
                                forte: st.forte,
                            });
                        imp[al.id] = t0 + du;
                        fim = Math.max(fim, t0 + du + 250);
                    });
                break;
            }
            case 'volta': {
                const S = z[z.length - 1];
                if (!S) break;
                const du = voo(S, C) + 80,
                    dist = Math.hypot(S.x - C.x, S.y - C.y) || 1;
                this.item({
                    tipo: 'projetil',
                    pts: [S, C],
                    forma: st.f,
                    cor,
                    t0: L,
                    dur: du,
                    corDono: dono && dono.color,
                });
                for (const al of alvos) imp[al.id] = L + du * Math.min(1, Math.hypot(al.x - S.x, al.y - S.y) / dist);
                const d = this.dir(S, C);
                this.desviar(e.de, d.x * 0.15, d.y * 0.15, L + du - 40, 260, 'recuo');
                this.jorro(L + du, C.x, C.y, 8, ['#ffffff', cor], { tipo: 'estrela', v: 1.4, vida: 500, tam: 0.14 });
                fim = Math.max(fim, L + du + 250);
                break;
            }
            case 'nuvem': {
                // bomba de fumaça (Fumacê): voa em arco até a zona escolhida e espalha fumaça pela área
                const Z = z[0] || alvos[0];
                if (!Z) break;
                const d0 = this.dir(C, Z);
                this.desviar(e.de, d0.x * 0.16, d0.y * 0.16, L - 70, 240, 'bote');
                const du = voo(C, Z) + 140,
                    tq = L + du;
                this.item({ tipo: 'projetil', pts: [C, Z], forma: st.f || 'bomba', cor, t0: L, dur: du, arco: 1.1 });
                this.item({
                    tipo: 'anel',
                    x: Z.x,
                    y: Z.y,
                    cor: '#e5e7eb',
                    t0: tq,
                    dur: 560,
                    r0: 0.2,
                    r1: 2.0,
                    larg: 0.16,
                    camada: 'chao',
                });
                this.jorro(tq, Z.x, Z.y, 8, ['#fde047', '#ffffff'], { tipo: 'faisca', v: 2.2, vida: 260, tam: 0.08 });
                (z.length ? z : [Z]).forEach((h) => {
                    const t0 = tq + Rules.hexDistance(Z, h) * 110;
                    this.jorro(t0, h.x, h.y, 8, ['#9ca3af', '#d1d5db', '#6b7280', '#e5e7eb'], {
                        tipo: 'fumaca',
                        v: 0.55,
                        sobe: -0.2,
                        vida: 1800,
                        tam: 0.45,
                        raio: 0.8,
                        espalha: 350,
                    });
                    for (const al of alvos) if (al.q === h.q && al.r === h.r) imp[al.id] = t0 + 150;
                });
                fim = Math.max(fim, tq + 1000);
                break;
            }
            case 'feixe':
                alvos.forEach((al, i) => {
                    const t0 = L + i * 90;
                    this.item({
                        tipo: 'feixe',
                        x: C.x,
                        y: C.y,
                        x2: al.x,
                        y2: al.y,
                        cor,
                        t0,
                        dur: 560,
                        corrente: st.corrente,
                    });
                    imp[al.id] = t0 + 150;
                    fim = Math.max(fim, t0 + 560);
                });
                break;
            case 'corpo':
            case 'investida':
            case 'salto': {
                let feito = false;
                if (st.e === 'investida' && mov && (mov.cam || []).length > 1) {
                    const cam = mov.cam,
                        n = cam.length - 1,
                        S = ini + 130,
                        per = 70;
                    const end = this.animarMov(mov, S, 'investida', per);
                    moveu = true;
                    feito = true;
                    for (const al of alvos) {
                        let j = cam.findIndex((h) => h[0] === al.q && h[1] === al.r);
                        if (j < 0) j = cam.findIndex((h) => Rules.hexDistance({ q: h[0], r: h[1] }, al) === 1);
                        imp[al.id] = S + per * (j < 1 ? n : j);
                    }
                    fim = Math.max(fim, end + 250);
                } else if (st.e === 'salto' && mov && (mov.cam || []).length > 1) {
                    const S = ini + 110,
                        end = this.animarMov(mov, S, 'salto');
                    moveu = true;
                    feito = true;
                    for (const al of alvos) imp[al.id] = S + 240;
                    fim = Math.max(fim, end + 250);
                }
                if (feito) break;
                alvos.forEach((al, i) => {
                    const d = this.dir(C, al),
                        t0 = ini + 100 + i * 140,
                        tq = t0 + 110;
                    this.desviar(e.de, d.x * 0.42, d.y * 0.42, t0, 320, 'bote');
                    if (st.f === 'martelo')
                        this.item({
                            tipo: 'martelo',
                            id: e.de,
                            x: C.x,
                            y: C.y,
                            ang: Math.atan2(d.y, d.x),
                            cor,
                            t0: tq - 190,
                            dur: 280,
                        });
                    if (st.f === 'estocada')
                        this.item({ tipo: 'estocada', x: C.x, y: C.y, x2: al.x, y2: al.y, cor, t0: tq - 60, dur: 260 });
                    imp[al.id] = tq;
                    fim = Math.max(fim, tq + 260);
                });
                if (mov && (mov.cam || []).length > 1) {
                    // Trinvestida: depois do empurrão, ocupa a zona do alvo
                    const t0 = Math.max(ini + 220, ...alvos.map((al) => imp[al.id] || 0)) + 120;
                    fim = Math.max(fim, this.animarMov(mov, t0, 'investida') + 200);
                    moveu = true;
                }
                break;
            }
            case 'giro': {
                const ang0 = Math.random() * 6.283,
                    t0 = ini + 130,
                    dur = 440;
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
                this.item({
                    tipo: 'anel',
                    x: C.x,
                    y: C.y,
                    cor,
                    t0: ini + 120,
                    dur: 480,
                    r0: 0.4,
                    r1: 2.3,
                    larg: 0.2,
                    camada: 'chao',
                });
                for (const al of alvos) imp[al.id] = ini + 260;
                fim = Math.max(fim, ini + 600);
                break;
            case 'pilares': {
                const zonas = z.length ? z : alvos;
                if (st.onda) {
                    this.item({
                        tipo: 'anel',
                        x: C.x,
                        y: C.y,
                        cor,
                        t0: ini + 120,
                        dur: 460,
                        r0: 0.3,
                        r1: 2.0,
                        larg: 0.18,
                        camada: 'chao',
                    });
                    this.desviar(e.de, 0, 0.12, ini + 60, 220, 'bote');
                }
                zonas.forEach((h) => {
                    const dd = Math.max(1, Rules.hexDistance({ q: e.q, r: e.r }, h));
                    const t0 = ini + 150 + (dd - 1) * 110 + (st.onda ? Math.random() * 60 : 0);
                    this.item({ tipo: 'pilar', x: h.x, y: h.y, cor, t0, dur: 700 });
                    this.jorro(t0, h.x, h.y + 0.25, 6, [cor, '#ffffff'], {
                        tipo: 'caco',
                        v: 2.4,
                        sobe: -1.5,
                        g: 7,
                        arr: 0.8,
                        vida: 600,
                        tam: 0.1,
                    });
                    this.jorro(t0, h.x, h.y + 0.4, 3, '#94a3b8', { tipo: 'fumaca', v: 0.6, vida: 500, tam: 0.22 });
                    for (const al of alvos) if (al.q === h.q && al.r === h.r) imp[al.id] = t0 + 70;
                    fim = Math.max(fim, t0 + 500);
                });
                this.tremer(ini + 150, 280, 3);
                break;
            }
            case 'leque': {
                const ref = z.length ? z : alvos;
                let sx = 0,
                    sy = 0;
                for (const h of ref) {
                    sx += h.x - C.x;
                    sy += h.y - C.y;
                }
                const ang = Math.atan2(sy, sx),
                    t0 = ini + 130;
                this.desviar(e.de, Math.cos(ang) * 0.25, Math.sin(ang) * 0.25, ini + 80, 300, 'bote');
                this.item({ tipo: 'leque', x: C.x, y: C.y, ang, abre: 2.1, cor, t0, dur: 400 });
                alvos.forEach((al, i) => {
                    imp[al.id] = t0 + 150 + i * 50;
                });
                fim = Math.max(fim, t0 + 450);
                break;
            }
            case 'apoio':
                alvos.forEach((al, i) => {
                    const t0 = L + i * 90;
                    let tq;
                    if (al.id === e.de) tq = ini + 220;
                    else if (st.f === 'feixe') {
                        this.item({ tipo: 'feixe', x: C.x, y: C.y, x2: al.x, y2: al.y, cor, t0, dur: 480, larg: 0.12 });
                        tq = t0 + 150;
                    } else {
                        const du = voo(C, al);
                        this.item({
                            tipo: 'projetil',
                            pts: [C, al],
                            forma: st.f || 'orbe',
                            cor,
                            t0,
                            dur: du,
                            arco: 0.5,
                        });
                        tq = t0 + du;
                    }
                    imp[al.id] = tq;
                    this.extra(st.x, al.id, al, cor, tq);
                    fim = Math.max(fim, tq + 400);
                });
                break;
            case 'direto':
                this.jorro(ini + 40, C.x, C.y, 8, ['#fde047', '#f97316'], {
                    tipo: 'faisca',
                    v: 2.5,
                    vida: 350,
                    tam: 0.1,
                });
                for (const al of alvos) {
                    imp[al.id] = ini + 100;
                }
                fim = Math.max(fim, ini + 500);
                break;
            default: // 'proprio'
                imp[e.de] = imp[e.de] ?? ini + 160;
                this.extra(st.x, e.de, C, cor, ini + 120);
                fim = Math.max(fim, ini + 600);
        }
        // Alvos inimigos de habilidades sem dano (Marcas, Compelir): brilho no momento em que são atingidos.
        if (!Engine.causaDano(a) && st.e !== 'apoio' && st.e !== 'proprio' && st.e !== 'nuvem')
            for (const al of alvos)
                if (imp[al.id] != null && al.id !== e.de) this.impactoVisual('brilho', al, imp[al.id], cor, 0.8, null);
        return { fim, moveu };
    },
};
