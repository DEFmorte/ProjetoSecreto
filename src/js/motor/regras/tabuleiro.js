// ── Rules: tabuleiro, mapas, zonas e distâncias ──
// Parte do Rules (regras básicas). Os métodos são juntados em regras.js; use sempre Rules.nome(...).
import { CONFIG } from '../config.js';
import { Rules } from '../regras.js';

export default {
    DIRS: [
        { q: 1, r: 0 },
        { q: 1, r: -1 },
        { q: 0, r: -1 },
        { q: -1, r: 0 },
        { q: -1, r: 1 },
        { q: 0, r: 1 },
    ],
    // Mapa ativo (CONFIG.mapas). Trocar de mapa limpa os caches de zonas e distâncias.
    mapa: null,
    usarMapa(id) {
        const m = CONFIG.mapas[id] || CONFIG.mapas.classico;
        if (Rules.mapa === m) return;
        Rules.mapa = m;
        Rules._zonaSet = Rules._zonas = Rules._dist = null;
    },
    zonaSet() {
        if (!Rules._zonaSet) {
            const m = Rules.mapa || (Rules.usarMapa('classico'), Rules.mapa),
                set = new Set();
            if (m.zonas) m.zonas.forEach((z) => set.add(`${z.q},${z.r}`));
            else {
                const R = m.raio,
                    buracos = new Set((m.semZona || []).map((z) => `${z.q},${z.r}`));
                for (let q = -R; q <= R; q++)
                    for (let r = -R; r <= R; r++)
                        if (Math.abs(-q - r) <= R && !buracos.has(`${q},${r}`)) set.add(`${q},${r}`);
            }
            Rules._zonaSet = set;
        }
        return Rules._zonaSet;
    },
    spawn(player, i) {
        return ((Rules.mapa || CONFIG.mapas.classico).spawns[player] || [])[i] || { q: 0, r: 0 };
    },
    isHexOnBoard(q, r) {
        return Rules.zonaSet().has(`${q},${r}`);
    },
    // Distância geométrica (vizinhança, linhas). Para alcance use Rules.distancia.
    hexDistance(a, b) {
        return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
    },
    // Todas as zonas existentes do tabuleiro (sem os buracos).
    zonas() {
        if (!Rules._zonas)
            Rules._zonas = [...Rules.zonaSet()].map((k) => {
                const [q, r] = k.split(',').map(Number);
                return { q, r };
            });
        return Rules._zonas;
    },
    // Distância de ALCANCE: menor número de passos andando só por zonas existentes
    // (dá a volta nos buracos, como o movimento). Estrelas não bloqueiam o alcance.
    distancia(a, b) {
        if (!Rules._dist) {
            Rules._dist = new Map();
            for (const z of Rules.zonas()) {
                const d = new Map([[`${z.q},${z.r}`, 0]]),
                    fila = [z];
                for (let i = 0; i < fila.length; i++) {
                    const h = fila[i],
                        k = d.get(`${h.q},${h.r}`) + 1;
                    for (const n of Rules.neighbors(h.q, h.r)) {
                        const key = `${n.q},${n.r}`;
                        if (!d.has(key) && Rules.isHexOnBoard(n.q, n.r)) {
                            d.set(key, k);
                            fila.push(n);
                        }
                    }
                }
                Rules._dist.set(`${z.q},${z.r}`, d);
            }
        }
        const d = Rules._dist.get(`${a.q},${a.r}`);
        return (d && d.get(`${b.q},${b.r}`)) ?? Infinity;
    },
    neighbors(q, r) {
        return Rules.DIRS.map((d) => ({ q: q + d.q, r: r + d.r }));
    },
    pieceAt(state, q, r) {
        return state.pieces.find((p) => p.q === q && p.r === r);
    },
    pieceById(state, id) {
        return state.pieces.find((p) => p.id === id) || null;
    },
    // Índice da direção em que b está, em linha reta, a partir de a (-1 se não estiver alinhado).
    directionTo(a, b) {
        const k = Rules.hexDistance(a, b);
        if (k === 0) return -1;
        return Rules.DIRS.findIndex((d) => a.q + d.q * k === b.q && a.r + d.r * k === b.r);
    },
    // Quantos trechos em linha reta com pelo menos `min` zonas existem em um caminho (lista de zonas).
    straightRuns(path, min) {
        let runs = 0,
            len = 0,
            dir = -1;
        for (let i = 1; i < (path || []).length; i++) {
            const step = Rules.hexDistance(path[i - 1], path[i]) === 1 ? Rules.directionTo(path[i - 1], path[i]) : -1;
            if (step !== -1 && step === dir) len++;
            else {
                if (len >= min) runs++;
                len = step === -1 ? 0 : 1;
            }
            dir = step;
        }
        return runs + (len >= min ? 1 : 0);
    },
};
