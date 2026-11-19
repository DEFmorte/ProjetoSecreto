// ── VFX: utilidades (cores, curvas, posições) ──
// Parte do VFX (efeitos visuais). Os métodos são juntados em vfx.js; use sempre VFX.nome(...).
import { state } from '../../partida/estado.js';
import { view } from '../canvas.js';
import { posPeca } from '../desenho.js';

export default {
    // ── utilidades ──
    w(q, r) {
        return { x: 1.5 * q, y: Math.sqrt(3) * (q / 2 + r) };
    },
    px(x, y) {
        return { x: view.originX + x * view.hexR, y: view.originY + y * view.hexR };
    },
    rgba(hex, a) {
        if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
        const n = parseInt(hex.slice(1), 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    },
    sai: (k) => 1 - Math.pow(1 - k, 3),
    vaiVem: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    estoura: (k) => {
        const c = 1.70158;
        return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
    },
    some: (k, de = 0.7) => (k > de ? (1 - k) / (1 - de) : 1),
    sprite(cor) {
        let c = this.sprites[cor];
        if (c) return c;
        c = this.sprites[cor] = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d'),
            gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gr.addColorStop(0.22, this.rgba(cor, 0.9));
        gr.addColorStop(0.55, this.rgba(cor, 0.3));
        gr.addColorStop(1, this.rgba(cor, 0));
        g.fillStyle = gr;
        g.fillRect(0, 0, 64, 64);
        return c;
    },
    aoLongo(pts, e) {
        if (pts.length < 2) return pts[0];
        const seg = [];
        let tot = 0;
        for (let i = 1; i < pts.length; i++) {
            const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
            seg.push(d);
            tot += d;
        }
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
    dir(A, B) {
        const dx = B.x - A.x,
            dy = B.y - A.y,
            d = Math.hypot(dx, dy) || 1;
        return { x: dx / d, y: dy / d, d };
    },
    // Posição desenhada: segue a Estrela (com animação e desvios) ou um ponto fixo.
    onde(it, t) {
        const p = it.id != null && state ? state.pieces.find((x) => x.id === it.id) : null;
        return p ? posPeca(p, t) : this.px(it.x, it.y);
    },
};
