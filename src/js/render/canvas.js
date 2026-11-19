// ── Canvas do tabuleiro ──
// Elemento <canvas>, contexto 2D, view (tamanho, zoom e arrasto) e o cache do desenho do tabuleiro.
import { $ } from '../nucleo/dom.js';
import { CONFIG } from '../motor/config.js';

export const canvas = $('gameCanvas');
export const ctx = canvas.getContext('2d');
// panX/panY: deslocamento do mapa (arrastar) limitado a ±panMaxX/Y; baseX/baseY: origem com o mapa centralizado.
export const view = {
    width: 0,
    height: 0,
    originX: 0,
    originY: 0,
    baseX: 0,
    baseY: 0,
    panX: 0,
    panY: 0,
    panMaxX: 0,
    panMaxY: 0,
    dpr: 1,
    hexR: CONFIG.board.hexRadius,
};
export let boardLayer = null;
export function definirBoardLayer(valor) {
    boardLayer = valor;
    return valor;
} // para outros módulos trocarem "boardLayer"
export const renderCache = {
    targetHexes: [],
    rangeHexes: [],
    aliado: false,
    pendingIds: new Set(),
    blockIndexById: new Map(),
};
