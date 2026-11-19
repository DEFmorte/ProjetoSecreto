// ── Rules: movimento (zonas alcançáveis, caminho) ──
// Parte do Rules (regras básicas). Os métodos são juntados em regras.js; use sempre Rules.nome(...).
import { CONFIG } from '../config.js';
import { Rules } from '../regras.js';

export default {
    reachableHexes(state, piece) {
        const maxDist = Rules.movementLeft(piece);
        const visited = new Set([`${piece.q},${piece.r}`]);
        const queue = [{ q: piece.q, r: piece.r, dist: 0 }];
        let head = 0;
        const reachable = [{ q: piece.q, r: piece.r }];

        while (head < queue.length) {
            const cur = queue[head++];
            if (cur.dist >= maxDist) continue;
            for (const n of Rules.neighbors(cur.q, cur.r)) {
                const key = `${n.q},${n.r}`;
                if (visited.has(key) || !Rules.isHexOnBoard(n.q, n.r)) continue;
                if (CONFIG.rules.piecesBlockMovement && Rules.pieceAt(state, n.q, n.r)) continue;
                visited.add(key);
                reachable.push({ q: n.q, r: n.r });
                queue.push({ q: n.q, r: n.r, dist: cur.dist + 1 });
            }
        }
        return reachable;
    },
    canExtendPath(state, piece, path, hex) {
        const last = path[path.length - 1];
        if (!last || Rules.hexDistance(last, hex) !== 1) return false;
        if (!Rules.isHexOnBoard(hex.q, hex.r)) return false;
        if (CONFIG.rules.piecesBlockMovement && Rules.pieceAt(state, hex.q, hex.r)) return false;
        return path.length - 1 < Rules.movementLeft(piece);
    },
    movementLeft(piece) {
        if (piece.turn && piece.turn.movimentoZerado) return 0; // ex.: Compelir
        const spent = piece.turn ? piece.turn.moveSpent : 0;
        return Math.max(0, CONFIG.rules.movementRange(piece) - spent);
    },
};
