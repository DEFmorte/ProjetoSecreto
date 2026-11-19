// ── VFX: desenho dos efeitos na tela ──
// Parte do VFX (efeitos visuais). Os métodos são juntados em vfx.js; use sempre VFX.nome(...).
import { CONFIG } from '../../motor/config.js';
import { ui } from '../../interface/ui.js';
import { retrato } from '../../menus/escolha-equipe.js';
import { ctx, view } from '../canvas.js';
import { drawContadores, posPeca } from '../desenho.js';

export default {
    // ── desenho ──
    tremor(t) {
        if (!this.tremores.length) return null;
        let f = 0;
        this.tremores = this.tremores.filter((s) => t < s.t0 + s.dur);
        for (const s of this.tremores) {
            const k = (t - s.t0) / s.dur;
            if (k >= 0) f = Math.max(f, s.forca * (1 - k) * (1 - k));
        }
        return f > 0.3 ? { x: (Math.random() * 2 - 1) * f, y: (Math.random() * 2 - 1) * f } : null;
    },
    desvio(id, t) {
        const l = this.desvios[id];
        if (!l) return null;
        let x = 0,
            y = 0,
            vivo = false;
        for (const d of l) {
            const k = (t - d.t0) / d.dur;
            if (k >= 1) continue;
            vivo = true;
            if (k < 0) continue;
            const env =
                d.forma === 'bote'
                    ? k < 0.35
                        ? this.sai(k / 0.35)
                        : 1 - this.vaiVem((k - 0.35) / 0.65)
                    : d.forma === 'recuo'
                      ? k < 0.15
                          ? k / 0.15
                          : Math.pow(1 - (k - 0.15) / 0.85, 2)
                      : Math.sin(Math.PI * k);
            x += d.dx * env + (d.treme ? Math.sin(k * 70) * d.treme * (1 - k) : 0);
            y += d.dy * env;
        }
        if (!vivo) {
            delete this.desvios[id];
            return null;
        }
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
        if (t >= s.ate) {
            delete this.segura[p.id];
            return null;
        }
        return s;
    },
    barraFantasma(id, t) {
        const b = this.barras[id];
        if (!b) return null;
        const k = (t - b.t0) / 650;
        if (k >= 1) {
            delete this.barras[id];
            return null;
        }
        if (k < 0) return null;
        return b.para + (b.de - b.para) * (k < 0.3 ? 1 : 1 - this.vaiVem((k - 0.3) / 0.7));
    },
    // Antes de desenhar a Estrela: sombra no salto e rastro na investida.
    antesDaPeca(p, pos, t) {
        const R = view.hexR,
            an = ui.anims[p.id];
        if (pos.chao != null) {
            ctx.save();
            ctx.globalAlpha = 0.35 * (1 - Math.min(0.6, pos.alt / (R * 1.6)));
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.chao + R * 0.35, R * 0.5, R * 0.18, 0, 0, 2 * Math.PI);
            ctx.fillStyle = '#000000';
            ctx.fill();
            ctx.restore();
        }
        if (an && an.cam && (an.tipo === 'investida' || an.tipo === 'empurrao')) {
            const k = (t - an.t0) / an.dur;
            if (k <= 0 || k >= 1) return;
            ctx.save();
            for (let i = 3; i >= 1; i--) {
                const q = this.posAnim(an, Math.max(0, k - i * 0.07));
                ctx.globalAlpha = 0.28 / i;
                ctx.beginPath();
                ctx.arc(q.x, q.y, R * 0.58, 0, 2 * Math.PI);
                ctx.fillStyle = p.color;
                ctx.fill();
            }
            ctx.restore();
        }
    },
    // Brilho branco sobre o retrato no instante do golpe.
    brilhoPeca(p, x, y, R, t) {
        const f = this.flashes[p.id];
        if (!f) return;
        const k = (t - f.t0) / f.dur;
        if (k >= 1) {
            delete this.flashes[p.id];
            return;
        }
        if (k < 0) return;
        ctx.save();
        ctx.globalAlpha = 0.8 * (1 - k);
        ctx.beginPath();
        ctx.arc(x, y, R * 0.6, 0, 2 * Math.PI);
        ctx.fillStyle = f.cor;
        ctx.fill();
        ctx.restore();
    },
    desenharFantasmas(t, R) {
        if (!this.fantasmas.length) return;
        this.fantasmas = this.fantasmas.filter((g) => t < g.ate && g.p && g.p.stats);
        for (const g of this.fantasmas) {
            const { x, y } = posPeca(g.pos, t);
            const img = retrato(g.p.stats.nome),
                th = CONFIG.players[g.p.player] || {};
            ctx.beginPath();
            ctx.arc(x, y, R * 0.6, 0, 2 * Math.PI);
            ctx.fillStyle = g.p.color;
            ctx.fill();
            if (img) {
                ctx.save();
                ctx.clip();
                ctx.drawImage(img, x - R * 0.6, y - R * 0.6, R * 1.2, R * 1.2);
                ctx.restore();
            }
            ctx.lineWidth = 3;
            ctx.strokeStyle = th.bannerBorder || '#ffffff';
            ctx.stroke();
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
            try {
                f.call(this, it, k, t, R);
            } finally {
                ctx.restore();
            }
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
            const s = (t - p.t0) / 1000,
                f = p.arr ? (1 - Math.exp(-p.arr * s)) / p.arr : s;
            const wx = p.x + p.vx * f,
                wy = p.y + p.vy * f + 0.5 * p.g * s * s;
            const { x, y } = tela ? { x: wx, y: wy } : this.px(wx, wy);
            const tam = (tela ? 1 : R) * p.tam;
            ctx.save();
            switch (p.tipo) {
                case 'brilho': {
                    const r = tam * (1 - k * 0.5);
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 1 - k;
                    ctx.drawImage(this.sprite(p.cor), x - r * 2, y - r * 2, r * 4, r * 4);
                    break;
                }
                case 'faisca': {
                    const amort = p.arr ? Math.exp(-p.arr * s) : 1,
                        vx = p.vx * amort,
                        vy = p.vy * amort + p.g * s;
                    const v = Math.hypot(vx, vy) || 1,
                        l = tam * 2.5 * (1 - k) + tam;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 1 - k;
                    ctx.strokeStyle = p.cor;
                    ctx.lineWidth = Math.max(1, tam * 0.5);
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - (vx / v) * l, y - (vy / v) * l);
                    ctx.stroke();
                    break;
                }
                case 'caco': {
                    ctx.globalAlpha = 1 - k * k;
                    ctx.translate(x, y);
                    ctx.rotate(p.rot + p.vr * s);
                    ctx.beginPath();
                    ctx.moveTo(0, -tam);
                    ctx.lineTo(tam * 0.6, 0);
                    ctx.lineTo(0, tam * 0.8);
                    ctx.lineTo(-tam * 0.5, 0);
                    ctx.closePath();
                    ctx.fillStyle = p.cor;
                    ctx.fill();
                    ctx.lineWidth = 0.8;
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
                    ctx.stroke();
                    break;
                }
                case 'fumaca':
                    ctx.globalAlpha = 0.38 * (1 - k);
                    ctx.beginPath();
                    ctx.arc(x, y, tam * (0.6 + k * 1.3), 0, 2 * Math.PI);
                    ctx.fillStyle = p.cor;
                    ctx.fill();
                    break;
                case 'mais':
                    ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
                    ctx.strokeStyle = p.cor;
                    ctx.lineWidth = Math.max(2, tam * 0.38);
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(x - tam * 0.5, y);
                    ctx.lineTo(x + tam * 0.5, y);
                    ctx.moveTo(x, y - tam * 0.5);
                    ctx.lineTo(x, y + tam * 0.5);
                    ctx.stroke();
                    break;
                case 'seta':
                case 'setaBaixo': {
                    const sg = p.tipo === 'seta' ? -1 : 1;
                    ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
                    ctx.strokeStyle = p.cor;
                    ctx.lineWidth = Math.max(2, tam * 0.3);
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(x - tam * 0.5, y - sg * tam * 0.25);
                    ctx.lineTo(x, y + sg * tam * 0.25);
                    ctx.lineTo(x + tam * 0.5, y - sg * tam * 0.25);
                    ctx.stroke();
                    break;
                }
                case 'estrela': {
                    const r = tam * Math.sin(Math.PI * Math.min(1, k * 1.2));
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 1 - k * 0.5;
                    ctx.translate(x, y);
                    ctx.rotate(p.rot + p.vr * s * 0.3);
                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        const a = (i * Math.PI) / 4,
                            rr = i % 2 ? r * 0.28 : r;
                        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
                    }
                    ctx.closePath();
                    ctx.fillStyle = p.cor;
                    ctx.fill();
                    break;
                }
                case 'confete':
                    ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
                    ctx.translate(x, y);
                    ctx.rotate(p.rot + p.vr * s);
                    ctx.scale(1, Math.abs(Math.cos(p.rot + s * 9)));
                    ctx.fillStyle = p.cor;
                    ctx.fillRect(-tam / 2, -tam / 4, tam, tam / 2);
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
};
