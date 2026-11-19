const canvas = $('gameCanvas');
const ctx = canvas.getContext('2d');
// panX/panY: deslocamento do mapa (arrastar) limitado a ±panMaxX/Y; baseX/baseY: origem com o mapa centralizado.
const view = { width: 0, height: 0, originX: 0, originY: 0, baseX: 0, baseY: 0, panX: 0, panY: 0, panMaxX: 0, panMaxY: 0, dpr: 1, hexR: CONFIG.board.hexRadius };
let boardLayer = null;
const renderCache = {
    targetHexes: [],
    rangeHexes: [],
    aliado: false,
    pendingIds: new Set(),
    blockIndexById: new Map()
};
