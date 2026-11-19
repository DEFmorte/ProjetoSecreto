// ── VFX: agendamento de partículas, tremores e textos ──
// Parte do VFX (efeitos visuais). Os métodos são juntados em vfx.js; use sempre VFX.nome(...).
import { Engine } from '../../motor/engine.js';
import { VFX_ESTILOS } from './estilos.js';

export default {
    // ── agendamento ──
    item(o) {
        this.itens.push(Object.assign({ camada: 'alto' }, o));
        return o;
    },
    part(o) {
        if (this.parts.length >= this.MAX_PARTS) return;
        this.parts.push(
            Object.assign({ vx: 0, vy: 0, g: 0, arr: 0, rot: 0, vr: 0, tipo: 'brilho', tam: 0.1, vida: 500 }, o),
        );
    },
    jorro(t0, x, y, n, cor, o = {}) {
        n = Math.max(1, Math.round(n * (this.completo() ? 1 : 0.4)));
        for (let i = 0; i < n; i++) {
            const a = o.ang != null ? o.ang + (Math.random() - 0.5) * (o.abre ?? 1) : Math.random() * 6.283;
            const v = (o.v ?? 2.5) * (0.4 + Math.random() * 0.8);
            this.part({
                t0: t0 + Math.random() * (o.espalha || 0),
                tela: o.tela,
                x: x + (Math.random() - 0.5) * (o.raio || 0),
                y: y + (Math.random() - 0.5) * (o.raio || 0),
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v + (o.sobe || 0),
                g: o.g ?? 0,
                arr: o.arr ?? 3,
                tam: (o.tam ?? 0.12) * (0.6 + Math.random() * 0.8),
                cor: Array.isArray(cor) ? cor[i % cor.length] : cor,
                tipo: o.tipo || 'faisca',
                vida: (o.vida ?? 500) * (0.7 + Math.random() * 0.6),
                rot: Math.random() * 6.283,
                vr: (Math.random() - 0.5) * (o.vr ?? 8),
            });
        }
    },
    tremer(t0, dur, forca) {
        if (this.completo()) this.tremores.push({ t0, dur, forca });
    },
    piscar(id, t0, cor = '#ffffff', dur = 170) {
        this.flashes[id] = { t0, dur, cor };
    },
    desviar(id, dx, dy, t0, dur, forma, treme = 0) {
        (this.desvios[id] = this.desvios[id] || []).push({ dx, dy, t0, dur, forma, treme });
    },
    texto(id, txt, cor, t0, pq, pos) {
        const pl = this.pilha[id];
        const n = pl && pl.ate > t0 ? pl.n + 1 : 0;
        const dur = pq ? 1000 : 1250;
        this.pilha[id] = { ate: t0 + 500, n };
        this.item({ tipo: 'texto', id, x: pos.x, y: pos.y, txt, cor, t0, dur, pq, dy: Math.min(n, 3) * 22 });
    },
    estilo(h, cor) {
        if (VFX_ESTILOS[h]) return VFX_ESTILOS[h];
        const a = Engine.def(h) || {},
            alvo = a.alvo || {},
            dano = Engine.causaDano(a);
        const e =
            alvo.tipo === 'avanco'
                ? 'investida'
                : alvo.tipo === 'ao-redor'
                  ? 'onda'
                  : alvo.tipo === 'arco'
                    ? 'leque'
                    : alvo.tipo === 'linha'
                      ? 'pilares'
                      : alvo.tipo === 'trajeto'
                        ? 'projetil'
                        : !alvo.tipo || alvo.tipo === 'proprio'
                          ? 'proprio'
                          : alvo.quem === 'aliados'
                            ? 'apoio'
                            : (alvo.alcance ?? 1) <= 1
                              ? 'corpo'
                              : a.magico
                                ? 'feixe'
                                : 'projetil';
        const cura = (a.efeitos || []).some((ef) => ef.tipo === 'alterarStatus' && ef.stat === 'vida');
        return {
            e,
            f: e === 'corpo' ? 'soco' : 'orbe',
            c: cor || '#e5e7eb',
            i: dano ? (a.magico ? 'energia' : 'corte') : 'brilho',
            x: cura ? 'cura' : 'aura',
        };
    },
};
