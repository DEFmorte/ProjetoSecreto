// ── VFX: disparos, apoios e impactos ──
// Parte do VFX (efeitos visuais). Os métodos são juntados em vfx.js; use sempre VFX.nome(...).
import { COR } from '../../interface/icones.js';

export default {
    // Clarão do cano (Billy): faíscas e fumacinha na direção do tiro, com tranco; chumbo = espingarda (mais forte).
    disparo(id, C, al, t0, chumbo) {
        const d = this.dir(C, al),
            x = C.x + d.x * 0.38,
            y = C.y + d.y * 0.38,
            ang = Math.atan2(d.y, d.x);
        this.item({ tipo: 'golpe', x, y, cor: '#fde047', t0, dur: 140, tam: chumbo ? 0.5 : 0.35 });
        this.jorro(t0, x, y, chumbo ? 12 : 7, ['#fde047', '#fb923c', '#ffffff'], {
            tipo: 'faisca',
            v: 3.4,
            ang,
            abre: chumbo ? 1.1 : 0.7,
            vida: 200,
            tam: 0.09,
        });
        this.jorro(t0 + 40, x, y, chumbo ? 4 : 2, '#9ca3af', {
            tipo: 'fumaca',
            v: 0.5,
            sobe: -0.4,
            vida: 600,
            tam: 0.2,
        });
        this.desviar(id, -d.x * (chumbo ? 0.2 : 0.1), -d.y * (chumbo ? 0.2 : 0.1), t0, 220, 'recuo');
        if (chumbo) this.tremer(t0, 160, 2);
    },
    // Efeito de apoio/próprio no alvo: escudo, mira, selo, água, cúpula, cura…
    extra(x, id, W, cor, t0) {
        switch (x) {
            case 'escudo':
                this.item({ tipo: 'escudo', id, x: W.x, y: W.y, cor, t0, dur: 900 });
                break;
            case 'mira':
                this.item({ tipo: 'mira', id, x: W.x, y: W.y, cor, t0, dur: 900 });
                break;
            case 'selo':
                this.item({ tipo: 'selo', id, x: W.x, y: W.y, cor, t0, dur: 1000 });
                break;
            case 'agua':
                this.item({ tipo: 'agua', id, x: W.x, y: W.y, cor, t0, dur: 1000 });
                this.jorro(t0 + 950, W.x, W.y, 12, ['#7dd3fc', '#e0f2fe'], {
                    tipo: 'brilho',
                    v: 2,
                    g: 4,
                    vida: 450,
                    tam: 0.1,
                });
                break;
            case 'cupula':
                this.item({
                    tipo: 'anel',
                    id,
                    x: W.x,
                    y: W.y,
                    cor,
                    t0,
                    dur: 900,
                    r0: 0.5,
                    r1: 1.9,
                    larg: 0.1,
                    cheio: 1,
                    camada: 'chao',
                });
                this.item({
                    tipo: 'anel',
                    id,
                    x: W.x,
                    y: W.y,
                    cor: '#ffffff',
                    t0: t0 + 150,
                    dur: 700,
                    r0: 0.4,
                    r1: 1.7,
                    larg: 0.05,
                    camada: 'chao',
                });
                break;
            case 'anel':
                this.item({
                    tipo: 'anel',
                    id,
                    x: W.x,
                    y: W.y,
                    cor,
                    t0,
                    dur: 600,
                    r0: 0.3,
                    r1: 1.4,
                    larg: 0.12,
                    camada: 'chao',
                });
                this.item({
                    tipo: 'anel',
                    id,
                    x: W.x,
                    y: W.y,
                    cor,
                    t0: t0 + 180,
                    dur: 600,
                    r0: 0.3,
                    r1: 1.4,
                    larg: 0.08,
                    camada: 'chao',
                });
                break;
            case 'cinto':
                this.item({ tipo: 'aura', id, x: W.x, y: W.y, cor, t0, dur: 800, camada: 'chao' });
                this.jorro(t0, W.x, W.y, 14, ['#fde047', '#f97316', '#ef4444'], {
                    tipo: 'faisca',
                    v: 1.8,
                    vida: 500,
                    tam: 0.1,
                    espalha: 400,
                });
                break;
            case 'cura':
                this.item({ tipo: 'aura', id, x: W.x, y: W.y, cor: '#4ade80', t0, dur: 700, camada: 'chao' });
                this.jorro(t0, W.x, W.y, 10, [cor, '#ffffff'], { tipo: 'brilho', v: 1.2, vida: 500, tam: 0.12 });
                break;
            default: // aura / buff
                this.item({ tipo: 'aura', id, x: W.x, y: W.y, cor, t0, dur: 700, camada: 'chao' });
                this.jorro(t0, W.x, W.y + 0.3, 10, [cor, '#ffffff'], {
                    tipo: 'estrela',
                    v: 0.5,
                    sobe: -1.4,
                    arr: 1,
                    vida: 800,
                    tam: 0.15,
                    raio: 0.9,
                });
        }
    },
    // Impacto de dano: forma conforme a habilidade, brilho na Estrela, empurrãozinho e tremor da tela.
    impacto(e, tq, alvo, fonte, P) {
        if (!alvo) return;
        const W = this.w(alvo.q, alvo.r),
            F = fonte ? this.w(fonte.q, fonte.r) : null;
        const st = e.h ? this.estilo(e.h) : { i: 'golpe', c: '#f87171' };
        const d = F && (F.x !== W.x || F.y !== W.y) ? this.dir(F, W) : { x: 0, y: -1 };
        const forca = Math.min(3, 1 + (e.vida || 0) * 0.35);
        if (!P.explodiu[e.para]) this.impactoVisual(st.i, W, tq, st.c, forca, d);
        else delete P.explodiu[e.para];
        if (e.abs && !e.vida)
            this.jorro(tq, W.x, W.y, 8, [COR.armadura || '#94a3b8', '#e2e8f0'], {
                tipo: 'faisca',
                v: 2.6,
                vida: 300,
                tam: 0.09,
            });
        this.piscar(e.para, tq);
        this.desviar(e.para, d.x * 0.18 * forca, d.y * 0.18 * forca, tq, 300, 'recuo', 0.05);
        const pesado = st.i === 'pesado' || st.i === 'explosao';
        if (e.vida)
            this.tremer(tq, pesado ? 320 : 220, Math.min(10, (pesado ? 3 : 1.5) + e.vida * (pesado ? 1.3 : 0.8)));
    },
    impactoVisual(tipo, W, tq, cor, forca, d) {
        const ang = d ? Math.atan2(d.y, d.x) : -Math.PI / 2;
        switch (tipo) {
            case 'corte':
                this.item({
                    tipo: 'corte',
                    x: W.x,
                    y: W.y,
                    ang: ang + (Math.random() < 0.5 ? 0.5 : -0.5),
                    cor,
                    t0: tq - 30,
                    dur: 300,
                });
                this.jorro(tq, W.x, W.y, 9 * forca, ['#ffffff', cor], {
                    tipo: 'faisca',
                    v: 3.2,
                    ang,
                    abre: 2.2,
                    vida: 320,
                    tam: 0.1,
                });
                break;
            case 'pesado':
                this.item({ tipo: 'golpe', x: W.x, y: W.y, cor, t0: tq, dur: 380, tam: 0.75 + 0.1 * forca });
                this.jorro(tq, W.x, W.y + 0.2, 8 * forca, ['#a8a29e', '#78716c', cor], {
                    tipo: 'caco',
                    v: 3,
                    sobe: -1.5,
                    g: 8,
                    arr: 0.6,
                    vida: 650,
                    tam: 0.09,
                });
                this.jorro(tq, W.x, W.y + 0.35, 5, '#a8a29e', { tipo: 'fumaca', v: 0.9, vida: 650, tam: 0.25 });
                break;
            case 'cristal':
                this.item({ tipo: 'golpe', x: W.x, y: W.y, cor, t0: tq, dur: 340, tam: 0.65 });
                this.jorro(tq, W.x, W.y, 10 * forca, [cor, '#ffffff', '#a5f3fc'], {
                    tipo: 'caco',
                    v: 3.4,
                    sobe: -1,
                    g: 6,
                    arr: 0.8,
                    vida: 600,
                    tam: 0.11,
                });
                break;
            case 'energia':
                this.item({ tipo: 'anel', x: W.x, y: W.y, cor, t0: tq, dur: 420, r0: 0.2, r1: 1.0, larg: 0.14 });
                this.item({ tipo: 'golpe', x: W.x, y: W.y, cor, t0: tq, dur: 300, tam: 0.55 });
                this.jorro(tq, W.x, W.y, 12 * forca, [cor, '#ffffff'], { tipo: 'faisca', v: 3, vida: 380, tam: 0.1 });
                break;
            case 'explosao':
                this.item({ tipo: 'explosao', x: W.x, y: W.y, t0: tq, dur: 520, tam: 0.85 + 0.12 * forca });
                this.jorro(tq, W.x, W.y, 14 * forca, ['#fde047', '#f97316', '#ffffff'], {
                    tipo: 'faisca',
                    v: 4,
                    vida: 420,
                    tam: 0.11,
                });
                this.jorro(tq + 60, W.x, W.y, 6, ['#57534e', '#78716c'], {
                    tipo: 'fumaca',
                    v: 0.8,
                    sobe: -0.6,
                    vida: 900,
                    tam: 0.32,
                });
                this.jorro(tq, W.x, W.y, 6, ['#44403c', '#facc15'], {
                    tipo: 'caco',
                    v: 3.2,
                    sobe: -1.5,
                    g: 8,
                    arr: 0.6,
                    vida: 600,
                    tam: 0.08,
                });
                this.tremer(tq, 300, 4);
                break;
            case 'brilho':
                this.item({ tipo: 'anel', x: W.x, y: W.y, cor, t0: tq, dur: 400, r0: 0.2, r1: 0.9, larg: 0.08 });
                this.jorro(tq, W.x, W.y, 10 * forca, [cor, '#ffffff'], {
                    tipo: 'estrela',
                    v: 1.8,
                    vida: 550,
                    tam: 0.15,
                });
                break;
            default:
                this.item({ tipo: 'golpe', x: W.x, y: W.y, cor: cor || '#f87171', t0: tq, dur: 300, tam: 0.55 });
                this.jorro(tq, W.x, W.y, 8, ['#ffffff', '#fca5a5'], { tipo: 'faisca', v: 2.8, vida: 320, tam: 0.1 });
        }
    },
};
