// ── VFX: movimento, mudanças, derrota e festa ──
// Parte do VFX (efeitos visuais). Os métodos são juntados em vfx.js; use sempre VFX.nome(...).
import { CONFIG } from '../../motor/config.js';
import { Rules } from '../../motor/regras.js';
import { Engine } from '../../motor/engine.js';
import { state } from '../../partida/estado.js';
import { ui } from '../../interface/ui.js';
import { COR } from '../../interface/icones.js';
import { view } from '../canvas.js';

export default {
    // Animação do movimento pelo caminho: andar (passinhos com poeira), investida (rastro), salto/arremesso (arco),
    // empurrão.
    animarMov(e, t0, tipo, per) {
        const cam = (e.cam || []).filter(Array.isArray);
        if (cam.length < 2) return t0;
        const pts = cam.map(([q, r]) => this.w(q, r)),
            n = cam.length - 1;
        const dur =
            tipo === 'salto'
                ? 480
                : tipo === 'arremesso'
                  ? 520
                  : (per || (tipo === 'andar' ? 150 : tipo === 'investida' ? 70 : 110)) * n + 40;
        ui.anims[e.id] = { q: cam[0][0], r: cam[0][1], t0, dur, cam: pts, tipo, n };
        const fimP = pts[n];
        if (tipo === 'andar')
            for (let i = 1; i <= n; i++)
                this.jorro(t0 + (i * (dur - 40)) / n - 30, pts[i].x, pts[i].y + 0.42, 2, '#9ca3af', {
                    tipo: 'fumaca',
                    v: 0.5,
                    vida: 450,
                    tam: 0.13,
                });
        else if (tipo === 'investida') {
            this.jorro(t0, pts[0].x, pts[0].y + 0.4, 5, '#a8a29e', { tipo: 'fumaca', v: 0.9, vida: 500, tam: 0.18 });
        } else if (tipo === 'salto' || tipo === 'arremesso') {
            this.jorro(t0 + dur - 20, fimP.x, fimP.y + 0.4, 7, '#a8a29e', {
                tipo: 'fumaca',
                v: 1.2,
                vida: 550,
                tam: 0.2,
            });
            this.item({
                tipo: 'anel',
                x: fimP.x,
                y: fimP.y + 0.15,
                cor: '#d6d3d1',
                t0: t0 + dur,
                dur: 350,
                r0: 0.3,
                r1: 0.9,
                larg: 0.07,
                camada: 'chao',
            });
            if (tipo === 'arremesso') this.tremer(t0 + dur, 260, 5);
        } else
            this.jorro(t0, pts[0].x, pts[0].y + 0.4, 4, '#a8a29e', {
                tipo: 'fumaca',
                v: 0.7,
                vida: 450,
                tam: 0.16,
                espalha: dur,
            });
        return t0 + dur;
    },
    // Posição numa animação de caminho (ver posPeca).
    posAnim(an, k) {
        const R = view.hexR;
        let e;
        switch (an.tipo) {
            case 'andar':
                e = 0.5 * k + 0.5 * (k * k * (3 - 2 * k));
                break;
            case 'investida':
                e = k * k * (2.2 - 1.2 * k);
                break;
            case 'empurrao':
                e = this.sai(k);
                break;
            default:
                e = k;
        }
        const pt = this.aoLongo(an.cam, e),
            s = this.px(pt.x, pt.y);
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
            this.jorro(tq, W.x, W.y + 0.2, 9, ['#4ade80', '#bbf7d0'], {
                tipo: 'mais',
                v: 0.3,
                sobe: -1.3,
                arr: 1,
                vida: 950,
                tam: 0.17,
                raio: 0.9,
                espalha: 250,
            });
        }
        if (b.amago > a.amago)
            this.jorro(tq, W.x, W.y, 7, ['#38bdf8', '#e0f2fe'], {
                tipo: 'brilho',
                v: 0.6,
                sobe: -1,
                arr: 1,
                vida: 700,
                tam: 0.12,
                raio: 0.7,
            });
        if (b.arm > a.arm)
            this.item({ tipo: 'escudo', id, x: W.x, y: W.y, cor: COR.armadura || '#94a3b8', t0: tq, dur: 800 });
        if (b.bons > a.bons)
            this.jorro(tq, W.x, W.y + 0.2, 4, '#4ade80', {
                tipo: 'seta',
                v: 0.15,
                sobe: -1.1,
                arr: 1,
                vida: 900,
                tam: 0.2,
                raio: 0.8,
                espalha: 200,
                vr: 0,
            });
        if (b.ruins > a.ruins) {
            this.jorro(tq, W.x, W.y - 0.3, 4, '#f87171', {
                tipo: 'setaBaixo',
                v: 0.15,
                sobe: 0.9,
                arr: 1,
                vida: 900,
                tam: 0.2,
                raio: 0.8,
                espalha: 200,
                vr: 0,
            });
            this.jorro(tq, W.x, W.y, 5, ['#7e22ce', '#3b0764'], {
                tipo: 'fumaca',
                v: 0.5,
                sobe: -0.3,
                vida: 800,
                tam: 0.25,
            });
        }
        for (const [m, n] of Object.entries(b.mk || {}))
            if (n > ((a.mk || {})[m] || 0) && CONFIG.marks[m])
                this.item({
                    tipo: 'selo',
                    id,
                    x: W.x,
                    y: W.y,
                    cor: CONFIG.marks[m].cor || '#ffffff',
                    t0: tq,
                    dur: 800,
                });
    },
    contagens(p) {
        let bons = 0,
            ruins = 0;
        for (const e of p.effects || []) {
            if (e.tipo === 'marca') continue;
            if (Engine.isDebuff(e)) ruins++;
            else if (e.buff || e.delta > 0 || e.tipo === 'escudo') bons++;
        }
        const mk = {};
        for (const id of Object.keys(CONFIG.marks)) {
            const n = Rules.marks(p, id);
            if (n) mk[id] = n;
        }
        return { bons, ruins, mk };
    },
    // Derrota: a Estrela continua desenhada até o golpe e se estilhaça; o Renome voa para quem derrotou.
    derrota(id, a, pos, ate, quem) {
        const W = this.w(pos.q, pos.r),
            cor = (a.ref && a.ref.color) || '#ffffff';
        this.fantasmas.push({ p: a.ref, pos: { id, q: pos.q, r: pos.r }, ate });
        this.piscar(id, ate - 140, '#ffffff', 160);
        this.jorro(ate, W.x, W.y, 18, [cor, '#ffffff', '#1f2937'], {
            tipo: 'caco',
            v: 3.6,
            sobe: -1,
            g: 7,
            arr: 0.6,
            vida: 800,
            tam: 0.14,
        });
        this.jorro(ate, W.x, W.y, 10, [cor, '#ffffff'], { tipo: 'faisca', v: 4, vida: 450, tam: 0.12 });
        this.jorro(ate + 40, W.x, W.y, 6, '#6b7280', { tipo: 'fumaca', v: 0.8, sobe: -0.5, vida: 900, tam: 0.3 });
        this.item({ tipo: 'anel', x: W.x, y: W.y, cor: '#ffffff', t0: ate, dur: 500, r0: 0.4, r1: 1.6, larg: 0.12 });
        this.tremer(ate, 380, 8);
        if (quem == null) return ate;
        const k = state.pieces.find((p) => p.id === quem);
        if (!k) return ate;
        const K = this.w(k.q, k.r);
        let chega = ate;
        for (let i = 0; i < 5; i++) {
            const t0 = ate + 150 + i * 60,
                du = 520 + Math.random() * 120;
            this.item({
                tipo: 'projetil',
                pts: [W, K],
                forma: 'renome',
                cor: '#facc15',
                t0,
                dur: du,
                arco: 0.6 + Math.random() * 0.8,
            });
            chega = Math.max(chega, t0 + du);
        }
        this.jorro(chega, K.x, K.y, 12, ['#facc15', '#fde68a', '#ffffff'], {
            tipo: 'estrela',
            v: 1.6,
            vida: 700,
            tam: 0.17,
        });
        this.item({
            tipo: 'anel',
            id: quem,
            x: K.x,
            y: K.y,
            cor: '#facc15',
            t0: chega,
            dur: 500,
            r0: 0.3,
            r1: 1.1,
            larg: 0.1,
        });
        return chega;
    },
    faixa(t0, round, player, novaRodada) {
        const th = CONFIG.players[player];
        if (!th) return;
        this.item({
            tipo: 'faixa',
            camada: 'tela',
            t0,
            dur: this.completo() ? 1300 : 1000,
            txt: `VEZ DO ${th.label}`,
            sub: novaRodada ? `RODADA ${round}` : '',
            cor: th.bannerBg,
            borda: th.bannerBorder,
            texto: th.bannerText,
            desliza: this.completo(),
        });
        // Bots esperam a faixa passar antes de agir (fica melhor em vídeo).
        this.ocupado = Math.max(this.ocupado, t0 + (this.completo() ? 800 : 500));
    },
    festa(t0) {
        const W = view.width,
            H = view.height,
            cores = ['#facc15', '#f472b6', '#60a5fa', '#4ade80', '#f97316', '#c084fc', '#ffffff'];
        for (const lado of [-1, 1])
            this.jorro(t0, lado < 0 ? 0 : W, H, 70, cores, {
                tela: true,
                tipo: 'confete',
                ang: lado < 0 ? -1.1 : -2.04,
                abre: 0.7,
                v: Math.max(700, H * 1.5),
                g: 900,
                arr: 1.2,
                tam: 9,
                vida: 2800,
                espalha: 350,
                vr: 12,
            });
        this.item({ tipo: 'clarao', camada: 'tela', t0, dur: 450, cor: '#ffffff', a: 0.3 });
    },
};
