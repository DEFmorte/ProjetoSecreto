// ── VFX: formas de desenho por tipo de efeito (VFX.D) ──
// Parte do VFX (efeitos visuais). Os métodos são juntados em vfx.js; use sempre VFX.nome(...).
import { ctx, view } from '../canvas.js';
import { caminhoArredondado, drawHexagon, drawLabel, drawShuriken, drawTextoContorno } from '../desenho.js';

export default {
    D: {
        texto(it, k, t, R) {
            const p = this.onde(it, t),
                ent = Math.min(1, (k * it.dur) / 180);
            const esc = 0.6 + 0.4 * this.estoura(ent),
                fs = it.pq ? 10 : 13;
            ctx.globalAlpha = this.some(k, 0.75);
            ctx.translate(p.x, p.y - R * 1.12 - it.dy - (1 - ent) * 6 - k * 8);
            ctx.scale(esc, esc);
            const font = `bold ${fs}px Inter`;
            ctx.font = font;
            const w = ctx.measureText(it.txt).width + 14,
                h = fs + 9;
            caminhoArredondado(-w / 2, -h / 2, w, h, h / 2);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = it.cor;
            ctx.stroke();
            drawLabel(it.txt, 0, 0.5, font, it.pq ? it.cor : '#ffffff');
        },
        projetil(it, k, t, R) {
            const e = k,
                a = this.aoLongo(it.pts, e),
                b = this.aoLongo(it.pts, Math.max(0, e - 0.04));
            const alt = it.arco ? Math.sin(Math.PI * e) * it.arco : 0,
                altB = it.arco ? Math.sin(Math.PI * Math.max(0, e - 0.04)) * it.arco : 0;
            const P = this.px(a.x, a.y - alt),
                Q = this.px(b.x, b.y - altB);
            const ang =
                P.x === Q.x && P.y === Q.y
                    ? Math.atan2(it.pts[1].y - it.pts[0].y, it.pts[1].x - it.pts[0].x)
                    : Math.atan2(P.y - Q.y, P.x - Q.x);
            if (this.completo() || Math.random() < 0.5)
                this.part({
                    t0: t,
                    vida: it.forma === 'renome' ? 300 : 260,
                    x: a.x,
                    y: a.y - alt,
                    tam: it.forte ? 0.3 : 0.2,
                    cor: it.cor,
                    tipo: 'brilho',
                });
            if (it.arco) {
                const S = this.px(a.x, a.y);
                ctx.save();
                ctx.globalAlpha = 0.25;
                ctx.beginPath();
                ctx.ellipse(S.x, S.y + R * 0.2, R * 0.18, R * 0.07, 0, 0, 2 * Math.PI);
                ctx.fillStyle = '#000';
                ctx.fill();
                ctx.restore();
            }
            if (it.forma === 'shuriken') {
                drawShuriken(P.x, P.y, R * 0.32, t * 6, it.corDono || '#64748b');
                return;
            }
            ctx.translate(P.x, P.y);
            const glow = (s, cor = it.cor) => {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.drawImage(this.sprite(cor), -s, -s, 2 * s, 2 * s);
                ctx.restore();
            };
            switch (it.forma) {
                case 'flecha':
                    glow(R * (it.forte ? 0.55 : 0.35));
                    ctx.rotate(ang);
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = '#f5f5f4';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(-R * 0.45, 0);
                    ctx.lineTo(R * 0.18, 0);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(R * 0.32, 0);
                    ctx.lineTo(R * 0.14, -R * 0.09);
                    ctx.lineTo(R * 0.14, R * 0.09);
                    ctx.closePath();
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.strokeStyle = it.cor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-R * 0.45, 0);
                    ctx.lineTo(-R * 0.55, -R * 0.08);
                    ctx.moveTo(-R * 0.45, 0);
                    ctx.lineTo(-R * 0.55, R * 0.08);
                    ctx.stroke();
                    break;
                case 'adaga':
                    glow(R * 0.3);
                    ctx.rotate(ang + k * Math.PI * 5);
                    ctx.beginPath();
                    ctx.moveTo(R * 0.3, 0);
                    ctx.lineTo(0, -R * 0.06);
                    ctx.lineTo(-R * 0.04, 0);
                    ctx.lineTo(0, R * 0.06);
                    ctx.closePath();
                    ctx.fillStyle = '#e5e7eb';
                    ctx.fill();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#374151';
                    ctx.stroke();
                    ctx.fillStyle = it.cor;
                    ctx.fillRect(-R * 0.16, -R * 0.035, R * 0.13, R * 0.07);
                    break;
                case 'cristal':
                    glow(R * 0.35);
                    ctx.rotate(ang);
                    ctx.beginPath();
                    ctx.moveTo(R * 0.26, 0);
                    ctx.lineTo(0, -R * 0.09);
                    ctx.lineTo(-R * 0.2, 0);
                    ctx.lineTo(0, R * 0.09);
                    ctx.closePath();
                    ctx.fillStyle = it.cor;
                    ctx.fill();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#ecfeff';
                    ctx.stroke();
                    break;
                case 'dinamite': {
                    ctx.rotate(t / 70);
                    ctx.fillStyle = '#dc2626';
                    ctx.fillRect(-R * 0.15, -R * 0.06, R * 0.3, R * 0.12);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#7f1d1d';
                    ctx.strokeRect(-R * 0.15, -R * 0.06, R * 0.3, R * 0.12);
                    ctx.fillStyle = '#fde68a';
                    ctx.fillRect(-R * 0.05, -R * 0.06, R * 0.03, R * 0.12);
                    ctx.translate(R * 0.19, 0);
                    glow(R * (0.13 + Math.random() * 0.08), '#fde047');
                    break;
                }
                case 'pena':
                    ctx.rotate(ang + Math.sin(t / 70) * 0.35);
                    glow(R * 0.28);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, R * 0.24, R * 0.075, 0, 0, 2 * Math.PI);
                    ctx.fillStyle = '#f8fafc';
                    ctx.fill();
                    ctx.lineWidth = 1.2;
                    ctx.strokeStyle = it.cor;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(-R * 0.3, 0);
                    ctx.lineTo(R * 0.22, 0);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.stroke();
                    break;
                case 'vento':
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.rotate(t / 60);
                    ctx.strokeStyle = it.cor;
                    ctx.lineWidth = 2.2;
                    ctx.lineCap = 'round';
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.arc(0, 0, R * (0.12 + i * 0.07), i * 2.1, i * 2.1 + 2.2);
                        ctx.stroke();
                    }
                    glow(R * 0.25);
                    if (Math.random() < 0.6)
                        this.part({
                            t0: t,
                            vida: 500,
                            x: a.x,
                            y: a.y,
                            vx: (Math.random() - 0.5) * 1.5,
                            vy: (Math.random() - 0.5) * 1.5,
                            arr: 2,
                            tam: 0.12,
                            cor: '#ffffff',
                            tipo: 'estrela',
                        });
                    break;
                case 'bala': // traçante: risco claro atrás de uma cabeça brilhante
                    glow(R * (it.forte ? 0.3 : 0.22), '#fde68a');
                    ctx.rotate(ang);
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = 'rgba(253, 230, 138, 0.6)';
                    ctx.lineWidth = Math.max(1.5, R * 0.06);
                    ctx.beginPath();
                    ctx.moveTo(-R * 0.5, 0);
                    ctx.lineTo(0, 0);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.ellipse(0, 0, R * 0.08, R * 0.035, 0, 0, 2 * Math.PI);
                    ctx.fillStyle = '#fffbeb';
                    ctx.fill();
                    break;
                case 'bomba': // bomba de fumaça com pavio aceso
                    ctx.rotate(t / 120);
                    ctx.beginPath();
                    ctx.arc(0, 0, R * 0.13, 0, 2 * Math.PI);
                    ctx.fillStyle = '#374151';
                    ctx.fill();
                    ctx.lineWidth = 1.2;
                    ctx.strokeStyle = '#9ca3af';
                    ctx.stroke();
                    ctx.fillStyle = '#6b7280';
                    ctx.fillRect(-R * 0.03, -R * 0.2, R * 0.06, R * 0.08);
                    ctx.translate(0, -R * 0.23);
                    glow(R * (0.1 + Math.random() * 0.06), '#fde047');
                    break;
                case 'renome':
                    glow(R * 0.3, '#facc15');
                    ctx.rotate(t / 200);
                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        const an = (i * Math.PI) / 4,
                            rr = i % 2 ? R * 0.05 : R * 0.14;
                        ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
                    }
                    ctx.closePath();
                    ctx.fillStyle = '#fef9c3';
                    ctx.fill();
                    break;
                default: // orbe
                    glow(R * (it.forte ? 0.5 : 0.38));
                    ctx.beginPath();
                    ctx.arc(0, 0, R * 0.09, 0, 2 * Math.PI);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
            }
        },
        feixe(it, k, t, R) {
            const A = this.px(it.x, it.y),
                B = this.px(it.x2, it.y2);
            const cresce = this.sai(Math.min(1, k / 0.25)),
                fade = this.some(k, 0.55);
            const ex = A.x + (B.x - A.x) * cresce,
                ey = A.y + (B.y - A.y) * cresce;
            ctx.globalCompositeOperation = 'lighter';
            const larg = R * (it.larg || 0.24) * fade * (0.85 + 0.15 * Math.sin(t / 25));
            ctx.lineCap = 'round';
            if (it.corrente) {
                const d = this.dir(A, B),
                    nx = -d.y,
                    ny = d.x,
                    n = 9;
                ctx.globalAlpha = fade;
                for (const [lw, cor] of [
                    [Math.max(2, larg * 0.5), it.cor],
                    [1.5, '#ffffff'],
                ]) {
                    ctx.beginPath();
                    ctx.moveTo(A.x, A.y);
                    for (let i = 1; i <= n; i++) {
                        const f = (i / n) * cresce,
                            j = i < n ? (Math.random() - 0.5) * R * 0.22 : 0;
                        ctx.lineTo(A.x + (B.x - A.x) * f + nx * j, A.y + (B.y - A.y) * f + ny * j);
                    }
                    ctx.lineWidth = lw;
                    ctx.strokeStyle = cor;
                    ctx.stroke();
                }
            } else {
                ctx.globalAlpha = 0.55 * fade;
                ctx.beginPath();
                ctx.moveTo(A.x, A.y);
                ctx.lineTo(ex, ey);
                ctx.lineWidth = larg;
                ctx.strokeStyle = it.cor;
                ctx.stroke();
                ctx.globalAlpha = fade;
                ctx.lineWidth = Math.max(1.5, larg * 0.35);
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            }
            ctx.globalAlpha = fade;
            const s = R * 0.45;
            ctx.drawImage(this.sprite(it.cor), A.x - s, A.y - s, 2 * s, 2 * s);
            const s2 = R * 0.7 * cresce;
            ctx.drawImage(this.sprite(it.cor), ex - s2, ey - s2, 2 * s2, 2 * s2);
        },
        corte(it, k, t, R) {
            const P = this.px(it.x, it.y),
                rad = R * 0.75;
            const cx = P.x - Math.cos(it.ang) * R * 0.4,
                cy = P.y - Math.sin(it.ang) * R * 0.4;
            const ini = it.ang - 1.1,
                span = 2.2;
            const fim = ini + span * this.sai(Math.min(1, k / 0.45)),
                cauda = ini + span * this.sai(Math.max(0, (k - 0.2) / 0.8));
            if (fim <= cauda) return;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = this.some(k, 0.6);
            ctx.lineCap = 'round';
            for (const [lw, cor] of [
                [R * 0.17, it.cor],
                [R * 0.06, '#ffffff'],
            ]) {
                ctx.beginPath();
                ctx.arc(cx, cy, rad, cauda, fim);
                ctx.lineWidth = lw;
                ctx.strokeStyle = cor;
                ctx.stroke();
            }
        },
        golpe(it, k, t, R) {
            const P = this.px(it.x, it.y),
                s = R * (it.tam || 0.6),
                e = this.sai(k);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 1 - k;
            const g = s * (1.2 - 0.6 * k);
            ctx.drawImage(this.sprite(it.cor), P.x - g, P.y - g, 2 * g, 2 * g);
            ctx.beginPath();
            ctx.arc(P.x, P.y, s * (0.3 + 0.9 * e), 0, 2 * Math.PI);
            ctx.lineWidth = Math.max(1, R * 0.12 * (1 - k));
            ctx.strokeStyle = it.cor;
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, 2.5 * (1 - k));
            ctx.lineCap = 'round';
            const rot = it.rot ?? (it.rot = Math.random());
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = rot + (i * Math.PI) / 4,
                    r1 = s * (0.25 + 0.8 * e),
                    r2 = s * (0.5 + 1.1 * e) * (i % 2 ? 0.75 : 1);
                ctx.moveTo(P.x + Math.cos(a) * r1, P.y + Math.sin(a) * r1);
                ctx.lineTo(P.x + Math.cos(a) * r2, P.y + Math.sin(a) * r2);
            }
            ctx.stroke();
        },
        anel(it, k, t, R) {
            const P = this.onde(it, t),
                e = this.sai(k),
                r = R * (it.r0 + (it.r1 - it.r0) * e);
            ctx.globalAlpha = 1 - k;
            ctx.beginPath();
            ctx.arc(P.x, P.y, r, 0, 2 * Math.PI);
            if (it.cheio) {
                ctx.fillStyle = this.rgba(it.cor, 0.16);
                ctx.fill();
            }
            ctx.lineWidth = Math.max(1, R * it.larg * (1 - k));
            ctx.strokeStyle = it.cor;
            ctx.stroke();
        },
        pilar(it, k, t, R) {
            const P = this.px(it.x, it.y + 0.3),
                sobe = this.estoura(Math.min(1, k / 0.22)),
                fade = this.some(k, 0.65);
            const h = R * 0.95 * sobe * (0.5 + 0.5 * fade),
                wd = R * 0.17;
            ctx.globalAlpha = 0.92 * fade;
            const espinho = (dx, hh, ww, inc) => {
                ctx.save();
                ctx.translate(P.x + dx, P.y);
                ctx.rotate(inc);
                ctx.beginPath();
                ctx.moveTo(-ww, 0);
                ctx.lineTo(0, -hh);
                ctx.lineTo(ww, 0);
                ctx.lineTo(0, ww * 0.5);
                ctx.closePath();
                const g = ctx.createLinearGradient(0, 0, 0, -hh);
                g.addColorStop(0, it.cor);
                g.addColorStop(1, '#ffffff');
                ctx.fillStyle = g;
                ctx.fill();
                ctx.lineWidth = 1.2;
                ctx.strokeStyle = 'rgba(8, 47, 73, 0.6)';
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -hh * 0.9);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            };
            espinho(-wd * 1.2, h * 0.6, wd * 0.8, -0.35);
            espinho(wd * 1.2, h * 0.55, wd * 0.75, 0.4);
            espinho(0, h, wd, 0);
        },
        giro(it, k, t, R) {
            const P = this.onde(it, t),
                rad = R * 1.3,
                a = it.ang0 + this.vaiVem(k) * Math.PI * 2.2,
                fade = this.some(k, 0.75);
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineCap = 'round';
            for (let i = 0; i < 6; i++) {
                const aa = a - i * 0.2;
                ctx.globalAlpha = (1 - i / 6) * fade;
                ctx.beginPath();
                ctx.arc(P.x, P.y, rad, aa - 0.22, aa);
                ctx.lineWidth = R * 0.17 * (1 - i / 7);
                ctx.strokeStyle = i === 0 ? '#ffffff' : it.cor;
                ctx.stroke();
            }
        },
        leque(it, k, t, R) {
            const P = this.px(it.x, it.y),
                rad = R * 2.3,
                a0 = it.ang - it.abre / 2,
                a = a0 + it.abre * this.sai(Math.min(1, k / 0.5)),
                fade = this.some(k, 0.5);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.3 * fade;
            ctx.beginPath();
            ctx.moveTo(P.x, P.y);
            ctx.arc(P.x, P.y, rad, a0, a);
            ctx.closePath();
            ctx.fillStyle = it.cor;
            ctx.fill();
            ctx.globalAlpha = fade;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(P.x, P.y, rad * 0.9, Math.max(a0, a - 0.6), a);
            ctx.lineWidth = R * 0.14;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        },
        martelo(it, k, t, R) {
            const P = this.onde(it, t),
                a = it.ang - 1.7 + 1.7 * this.vaiVem(Math.min(1, k / 0.7)),
                fade = this.some(k, 0.75);
            ctx.globalAlpha = fade;
            ctx.translate(P.x, P.y);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.4 * fade;
            ctx.beginPath();
            ctx.arc(0, 0, R * 0.95, a - 0.9, a);
            ctx.lineWidth = R * 0.25;
            ctx.strokeStyle = it.cor;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
            ctx.rotate(a);
            ctx.fillStyle = '#78350f';
            ctx.fillRect(R * 0.2, -R * 0.04, R * 0.7, R * 0.08);
            ctx.fillStyle = '#9ca3af';
            ctx.fillRect(R * 0.8, -R * 0.17, R * 0.24, R * 0.34);
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = '#1f2937';
            ctx.strokeRect(R * 0.8, -R * 0.17, R * 0.24, R * 0.34);
        },
        estocada(it, k, t, R) {
            const A = this.px(it.x, it.y),
                B = this.px(it.x2, it.y2),
                d = this.dir(A, B);
            const e = this.sai(Math.min(1, k / 0.4)),
                fade = this.some(k, 0.4);
            const sx = A.x + d.x * R * 0.3,
                sy = A.y + d.y * R * 0.3,
                ex = A.x + (B.x - A.x + d.x * R * 0.35) * e,
                ey = A.y + (B.y - A.y + d.y * R * 0.35) * e;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = fade;
            ctx.lineCap = 'round';
            for (const [lw, cor] of [
                [R * 0.16, it.cor],
                [R * 0.05, '#ffffff'],
            ]) {
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.lineWidth = lw;
                ctx.strokeStyle = cor;
                ctx.stroke();
            }
        },
        escudo(it, k, t, R) {
            const P = this.onde(it, t),
                ent = this.estoura(Math.min(1, k / 0.2)),
                fade = this.some(k, 0.6);
            const s = R * 0.86 * (0.7 + 0.3 * ent);
            ctx.globalAlpha = fade;
            drawHexagon(P.x, P.y, s, this.rgba(it.cor, 0.16), it.cor, 3);
            ctx.globalCompositeOperation = 'lighter';
            const a = k * Math.PI * 2.5,
                g = R * 0.3;
            ctx.drawImage(this.sprite(it.cor), P.x + Math.cos(a) * s - g, P.y + Math.sin(a) * s - g, 2 * g, 2 * g);
        },
        mira(it, k, t, R) {
            const P = this.onde(it, t),
                e = this.sai(Math.min(1, k / 0.4)),
                s = R * (1.15 - 0.4 * e),
                fade = this.some(k, 0.7);
            ctx.globalAlpha = fade;
            ctx.translate(P.x, P.y);
            ctx.rotate(((1 - e) * Math.PI) / 2);
            ctx.strokeStyle = it.cor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.62, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const a = (i * Math.PI) / 2;
                ctx.moveTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4);
                ctx.lineTo(Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85);
            }
            ctx.stroke();
        },
        selo(it, k, t, R) {
            const P = this.onde(it, t),
                s = R * 0.8 * this.estoura(Math.min(1, k / 0.25)),
                fade = this.some(k, 0.65);
            ctx.globalAlpha = fade;
            ctx.translate(P.x, P.y);
            ctx.rotate(t / 600);
            ctx.strokeStyle = it.cor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, s, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.lineWidth = 1.5;
            for (const r0 of [0, Math.PI / 4]) {
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const a = r0 + (i * Math.PI) / 2;
                    ctx.lineTo(Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85);
                }
                ctx.closePath();
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5 * fade;
            ctx.drawImage(this.sprite(it.cor), -s, -s, 2 * s, 2 * s);
        },
        agua(it, k, t, R) {
            const P = this.onde(it, t),
                s = R * 0.8 * this.estoura(Math.min(1, k / 0.25)) * (1 + 0.04 * Math.sin(t / 90)),
                fade = this.some(k, 0.85);
            if (s <= 0) return;
            ctx.globalAlpha = fade;
            const g = ctx.createRadialGradient(P.x, P.y, s * 0.2, P.x, P.y, s);
            g.addColorStop(0, 'rgba(125, 211, 252, 0.05)');
            g.addColorStop(1, 'rgba(125, 211, 252, 0.4)');
            ctx.beginPath();
            ctx.arc(P.x, P.y, s, 0, 2 * Math.PI);
            ctx.fillStyle = g;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#bae6fd';
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(P.x, P.y, s * 0.75, 3.6, 4.4);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        },
        aura(it, k, t, R) {
            const P = this.onde(it, t),
                s = R * 1.15;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.75 * Math.sin(Math.PI * k);
            ctx.drawImage(this.sprite(it.cor), P.x - s, P.y - s, 2 * s, 2 * s);
        },
        explosao(it, k, t, R) {
            const P = this.px(it.x, it.y),
                s = R * (it.tam || 1),
                e = this.sai(Math.min(1, k / 0.5)),
                rr = s * (0.3 + 0.8 * e);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 1 - k;
            const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, rr);
            g.addColorStop(0, 'rgba(255, 255, 255, 1)');
            g.addColorStop(0.3, 'rgba(253, 224, 71, 0.95)');
            g.addColorStop(0.65, 'rgba(249, 115, 22, 0.7)');
            g.addColorStop(1, 'rgba(220, 38, 38, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(P.x, P.y, rr, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalAlpha = 0.6 * (1 - k);
            ctx.beginPath();
            ctx.arc(P.x, P.y, s * (0.5 + e), 0, 2 * Math.PI);
            ctx.lineWidth = Math.max(1, 3 * (1 - k));
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        },
        faixa(it, k) {
            const W = view.width,
                H = view.height,
                y = H * 0.4,
                h = it.sub ? 64 : 54;
            let dx = 0;
            if (it.desliza) {
                if (k < 0.15) dx = -W * (1 - this.sai(k / 0.15));
                else if (k > 0.85) dx = W * Math.pow((k - 0.85) / 0.15, 3);
                ctx.globalAlpha = 1;
            } else ctx.globalAlpha = k < 0.15 ? k / 0.15 : this.some(k, 0.85);
            ctx.translate(dx, 0);
            const g = ctx.createLinearGradient(0, 0, W, 0);
            g.addColorStop(0, this.rgba(it.cor, 0));
            g.addColorStop(0.25, this.rgba(it.cor, 0.88));
            g.addColorStop(0.75, this.rgba(it.cor, 0.88));
            g.addColorStop(1, this.rgba(it.cor, 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, y - h / 2, W, h);
            const b = ctx.createLinearGradient(0, 0, W, 0);
            b.addColorStop(0, this.rgba(it.borda, 0));
            b.addColorStop(0.5, this.rgba(it.borda, 1));
            b.addColorStop(1, this.rgba(it.borda, 0));
            ctx.fillStyle = b;
            ctx.fillRect(0, y - h / 2, W, 2);
            ctx.fillRect(0, y + h / 2 - 2, W, 2);
            drawTextoContorno(
                it.txt,
                W / 2,
                y - (it.sub ? 8 : 0),
                `bold ${W < 700 ? 20 : 26}px Inter`,
                it.texto,
                'rgba(0, 0, 0, 0.6)',
                4,
            );
            if (it.sub) drawTextoContorno(it.sub, W / 2, y + 17, 'bold 12px Inter', '#e5e7eb', 'rgba(0, 0, 0, 0.6)', 3);
        },
        clarao(it, k) {
            ctx.globalAlpha = (it.a || 0.3) * (1 - k);
            ctx.fillStyle = it.cor;
            ctx.fillRect(0, 0, view.width, view.height);
        },
    },
};
