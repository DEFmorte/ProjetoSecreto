// ── Arrastar o mapa ──
// Botão do meio arrasta sempre; botão principal/toque arrasta quando começa fora de uma Estrela selecionável e fora do
// caminho (zonas verdes). Só vira arrasto depois de alguns px — antes disso é um clique normal.
import { CONFIG } from '../motor/config.js';
import { Rules } from '../motor/regras.js';
import { state } from '../partida/estado.js';
import { commitMove } from '../partida/acoes.js';
import { ui } from '../interface/ui.js';
import { clearSelection, handleTargetClick, selectedPiece, selectPiece } from '../interface/selecao.js';
import { canvas } from '../render/canvas.js';
import { mapaArrastavel, moverMapa } from '../render/tela.js';
import { setPreview } from '../hud/hud.js';
import { setHover, updateInspectPanel } from '../hud/cartoes.js';
import { gameRunning } from '../partida/loop.js';
import { eventHex } from '../partida/sorteio.js';

const arrasto = { id: null, x: 0, y: 0, ativo: false };
const fimArrasto = (e) => {
    if (arrasto.id !== e.pointerId) return;
    const estava = arrasto.ativo;
    arrasto.id = null; arrasto.ativo = false;
    if (estava) {
        canvas.style.cursor = mapaArrastavel() ? 'grab' : '';
        ui.lastClickHex = null;
        e.stopImmediatePropagation(); // não conta como clique
    }
};

// Caminho mais curto (zonas livres, dentro do movimento restante) da Estrela até a zona; null se não houver.
function caminhoAte(piece, alvo) {
    const max = Rules.movementLeft(piece), k = h => `${h.q},${h.r}`;
    const ant = new Map([[k(piece), null]]), fila = [{ q: piece.q, r: piece.r, d: 0 }];
    for (let i = 0; i < fila.length; i++) {
        const c = fila[i];
        if (c.q === alvo.q && c.r === alvo.r) {
            const cam = [];
            for (let h = c; h; h = ant.get(k(h))) cam.unshift({ q: h.q, r: h.r });
            return cam;
        }
        if (c.d >= max) continue;
        for (const n of Rules.neighbors(c.q, c.r)) {
            if (ant.has(k(n)) || !Rules.isHexOnBoard(n.q, n.r)) continue;
            if (CONFIG.rules.piecesBlockMovement && Rules.pieceAt(state, n.q, n.r)) continue;
            ant.set(k(n), c);
            fila.push({ q: n.q, r: n.r, d: c.d + 1 });
        }
    }
    return null;
}

// Executado uma vez na inicialização do jogo (main.js), na ordem certa em relação aos outros módulos.
export function iniciarPonteiro() {
canvas.addEventListener('pointerdown', (e) => {
    arrasto.id = null; arrasto.ativo = false;
    if (!gameRunning || !state || !mapaArrastavel()) return;
    if (e.button === 1) e.preventDefault();
    else {
        if (e.button !== 0) return;
        const hex = eventHex(e), mesma = z => z.q === hex.q && z.r === hex.r;
        const p = Rules.pieceAt(state, hex.q, hex.r);
        if (!state.winner && !state.pending && !ui.mode && p && Rules.canSelect(state, p)) return;
        if (!state.pending && !ui.mode && (ui.reachable.some(mesma) || ui.path.some(mesma))) return;
    }
    arrasto.id = e.pointerId; arrasto.x = e.clientX; arrasto.y = e.clientY;
});
canvas.addEventListener('pointermove', (e) => {
    if (arrasto.id !== e.pointerId) {
        if (gameRunning && e.pointerType === 'mouse' && e.buttons === 0) canvas.style.cursor = mapaArrastavel() && !ui.mode ? 'grab' : '';
        return;
    }
    const dx = e.clientX - arrasto.x, dy = e.clientY - arrasto.y;
    if (!arrasto.ativo) {
        if (Math.hypot(dx, dy) < 6) return;
        arrasto.ativo = true;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
        canvas.style.cursor = 'grabbing';
        setHover(null);
    }
    arrasto.x = e.clientX; arrasto.y = e.clientY;
    moverMapa(dx, dy);
    e.stopImmediatePropagation();
});
canvas.addEventListener('pointerup', fimArrasto);
canvas.addEventListener('pointercancel', fimArrasto);
canvas.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
// Roda do mouse / touchpad: desliza o mapa (Shift = horizontal).
canvas.addEventListener('wheel', (e) => {
    if (!gameRunning || !mapaArrastavel()) return;
    e.preventDefault();
    const k = e.deltaMode === 1 ? 16 : 1;
    if (e.shiftKey) moverMapa(-e.deltaY * k, 0);
    else moverMapa(-e.deltaX * k, -e.deltaY * k);
}, { passive: false });
canvas.addEventListener('pointerdown', (e) => {
    if (gameRunning && e.pointerType !== 'mouse' && ui.previewId) setPreview(null);
    if (!gameRunning || state.winner || state.pending || ui.mode) return;
    const hex = eventHex(e);
    const piece = Rules.pieceAt(state, hex.q, hex.r);
    if (piece && Rules.canSelect(state, piece) && ui.selectedId !== piece.id) {
        selectPiece(piece);
        ui.justSelected = true;
    }
});
canvas.addEventListener('pointermove', (e) => {
    if (gameRunning && state && e.pointerType === 'mouse') {
        const h = eventHex(e), sob = Rules.pieceAt(state, h.q, h.r);
        setHover(sob ? sob.id : null);
    }
    const piece = selectedPiece();
    if (!gameRunning || !piece || state.pending || ui.mode) return;
    if (!(e.buttons > 0 || e.pressure > 0)) return;

    const hex = eventHex(e);
    if (!ui.reachable.some(h => h.q === hex.q && h.r === hex.r)) return;

    const idx = ui.path.findIndex(h => h.q === hex.q && h.r === hex.r);
    if (idx !== -1) {
        ui.path = ui.path.slice(0, idx + 1);
        ui.dragging = true;
    } else if (Rules.canExtendPath(state, piece, ui.path, hex)) {
        ui.path.push(hex);
        ui.dragging = true;
    }
});
canvas.addEventListener('pointerleave', () => setHover(null));
canvas.addEventListener('pointerup', (e) => {
    if (!gameRunning) return;
    const hex = eventHex(e);
    if (handleTargetClick(hex)) return;

    // Clique numa Estrela que não pode ser selecionada (oponente, aliado que já agiu): fixa/solta a inspeção.
    const clicada = Rules.pieceAt(state, hex.q, hex.r);
    if (clicada && !ui.dragging && !Rules.canSelect(state, clicada)) {
        ui.pinId = ui.pinId === clicada.id ? null : clicada.id;
        updateInspectPanel();
        return;
    }
    if (!clicada && !ui.dragging && ui.pinId != null) { ui.pinId = null; updateInspectPanel(); }

    // Toque: tocar numa zona verde traça o caminho mais curto; tocar de novo no destino confirma o movimento.
    if (e.pointerType !== 'mouse' && !clicada && !ui.dragging && !ui.justSelected && !state.winner && !state.pending && !ui.mode) {
        const piece = selectedPiece(), fim = ui.path[ui.path.length - 1];
        if (piece && Rules.canSelect(state, piece)) {
            if (ui.path.length > 1 && fim.q === hex.q && fim.r === hex.r) {
                ui.lastClickHex = null; ui.lastClickTime = 0;
                commitMove(piece.id, ui.path);
                return;
            }
            const cam = ui.reachable.some(h => h.q === hex.q && h.r === hex.r) && caminhoAte(piece, hex);
            if (cam && cam.length > 1) { ui.path = cam; ui.lastClickHex = null; ui.lastClickTime = 0; return; }
        }
    }

    const now = Date.now();
    const isDouble = ui.lastClickHex && ui.lastClickHex.q === hex.q && ui.lastClickHex.r === hex.r
        && (now - ui.lastClickTime) < CONFIG.input.doubleClickMs;

    if (isDouble) {
        const piece = selectedPiece();
        if (piece && ui.path.length > 1) {
            const finalHex = ui.path[ui.path.length - 1];
            if (hex.q === finalHex.q && hex.r === finalHex.r) {
                commitMove(piece.id, ui.path);
            }
        }
        ui.lastClickTime = 0;
        ui.lastClickHex = null;
        ui.dragging = false;
        return;
    }

    ui.lastClickTime = now;
    ui.lastClickHex = hex;

    if (ui.justSelected) {
        ui.justSelected = false;
    } else if (!ui.dragging) {
        const finalHex = ui.path[ui.path.length - 1];
        const onFinal = finalHex && hex.q === finalHex.q && hex.r === finalHex.r;
        if (!(onFinal && ui.path.length > 1)) clearSelection();
    }
    ui.dragging = false;
});
}
