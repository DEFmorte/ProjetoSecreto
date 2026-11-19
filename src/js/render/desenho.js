// ── Primitivas de desenho ──
// Hexágonos, estrelas, rótulos, barras, contadores e marcadores usados pela cena.
import { CONFIG } from '../motor/config.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';
import { state } from '../partida/estado.js';
import { ui } from '../interface/ui.js';
import { COR, iconePronto, IMG_ICONES } from '../interface/icones.js';
import { selectedPiece } from '../interface/selecao.js';
import { boardLayer, canvas, ctx, definirBoardLayer, renderCache, view } from './canvas.js';
import { hexToPixel } from './hex.js';
import { corVida } from '../hud/cartoes.js';
import { VFX } from './vfx.js';
import { alcanceHexes } from '../hud/habilidades.js';

function drawStar(x, y, rOut, rIn, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5,
            rad = i % 2 ? rIn : rOut;
        ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = stroke;
    ctx.stroke();
}

// Shuriken no tabuleiro: 4 pontas girando devagar, centro na cor da Estrela dona.
export function drawShuriken(x, y, r, timestamp, corDono) {
    const ang = timestamp / 900;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
            rad = i % 2 ? r * 0.34 : r;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = CONFIG.objetos.shuriken.cor;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#111827';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, 2 * Math.PI);
    ctx.fillStyle = corDono;
    ctx.fill();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

// Marcador de Renome no tabuleiro (fica por baixo das Estrelas; visível quando a zona está livre).
export function drawRenomeMarker(m, R, timestamp) {
    const { x, y } = hexToPixel(m.q, m.r);
    const glow = 0.5 + 0.5 * Math.sin(timestamp / 400);
    ctx.save();
    ctx.shadowColor = CONFIG.renome.cor;
    ctx.shadowBlur = 8 + glow * 8;
    if (iconePronto(CONFIG.renome.icone)) {
        const t = R * 0.86;
        ctx.drawImage(IMG_ICONES[CONFIG.renome.icone], x - t / 2, y - t / 2, t, t);
        ctx.restore();
        drawContagem(x + t * 0.36, y + t * 0.36, m.valor, 8);
        return;
    }
    drawStar(x, y, R * 0.42, R * 0.18, CONFIG.renome.cor, '#713f12');
    ctx.restore();
    drawLabel(String(m.valor), x, y + 1, 'bold 10px Inter', '#422006');
}

// Ícone redondo com contorno escuro (selos nas Estrelas).
export function drawIcone(id, x, y, raio, contorno = '#111827') {
    ctx.drawImage(IMG_ICONES[id], x - raio, y - raio, raio * 2, raio * 2);
    drawCircle(x, y, raio, null, contorno, 1.5);
}

// Bolinha com número (quantidade/valor por cima de um ícone).
export function drawContagem(x, y, n, raio = 6.5) {
    drawCircle(x, y, raio, '#111827', CONFIG.renome.cor, 1.25);
    drawLabel(String(n), x, y + 0.5, `bold ${raio > 7 ? 10 : 9}px Inter`, '#ffffff');
}

// Selo de Renome (carregado pela Estrela, ou marcador sob uma Estrela).
export function drawRenomeBadge(x, y, n, rOut = 12, rIn = 5.5, stroke = '#713f12') {
    if (iconePronto(CONFIG.renome.icone)) {
        drawIcone(CONFIG.renome.icone, x, y, rOut - 1, stroke === '#ffffff' ? '#ffffff' : '#111827');
        drawContagem(x + rOut * 0.75, y + rOut * 0.75, n, 6);
        return;
    }
    drawStar(x, y, rOut, rIn, CONFIG.renome.cor, stroke);
    drawLabel(String(n), x, y + 1, 'bold 9px Inter', '#422006');
}

// Texto centralizado.
// Contador de recurso especial (ex.: Penas Energizadas) à esquerda da Estrela.
export function drawRecursoBadge(x, y, n, cfg = {}) {
    ctx.beginPath();
    ctx.ellipse(x, y, 6.5, 9, -0.5, 0, Math.PI * 2); // pena estilizada
    ctx.fillStyle = n > 0 ? cfg.cor || '#fcd34d' : '#1f2937';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#78350f';
    ctx.stroke();
    drawLabel(String(n), x, y + 0.5, 'bold 10px Inter', n > 0 ? '#422006' : '#9ca3af');
}

export function drawLabel(txt, x, y, font, color) {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
}

export function drawCircle(x, y, rad, fill, stroke, lineWidth) {
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, 2 * Math.PI);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}

export function drawHexagon(x, y, radius, fill, stroke, lineWidth = 1, c = ctx) {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const px = x + radius * Math.cos(a);
        const py = y + radius * Math.sin(a);
        if (i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
    }
    c.closePath();
    if (fill) {
        c.fillStyle = fill;
        c.fill();
    }
    if (stroke) {
        c.lineWidth = lineWidth;
        c.strokeStyle = stroke;
        c.stroke();
    }
}

export function getBoardLayer() {
    if (boardLayer) return boardLayer;
    const R = view.hexR,
        vis = CONFIG.board.visual;
    definirBoardLayer(document.createElement('canvas'));
    boardLayer.width = canvas.width;
    boardLayer.height = canvas.height;
    const c = boardLayer.getContext('2d');
    c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    // Zonas opacas (buracos ficam vazios, mostrando o fundo).
    for (const z of Rules.zonas()) {
        const { x, y } = hexToPixel(z.q, z.r);
        drawHexagon(x, y, R - 1, vis.zona, vis.contorno, vis.contornoLargura, c);
    }
    return boardLayer;
}

// Habilidade em foco: em uso (ui.mode) ou sob o mouse (ui.previewId), para a Estrela selecionada.
function habilidadeEmFoco() {
    const piece = selectedPiece();
    const id = ui.mode ? ui.mode.abilityId : ui.previewId;
    const a = id && Engine.def(id);
    return piece && a ? { piece, a } : null;
}

export function refreshRenderCache() {
    renderCache.pendingIds = new Set(state && !state.winner ? Rules.pendingIds(state) : []);
    renderCache.blockIndexById.clear();
    if (state && CONFIG.rules.turnMode === 'initiative') {
        state.blocks.forEach((block, index) => {
            block.ids.forEach((id) => renderCache.blockIndexById.set(id, index));
        });
    }
    renderCache.targetHexes = [];
    renderCache.rangeHexes = [];
    renderCache.aliado = false;
    if (!state || state.winner) return;
    const pend = state.pending;
    if (pend) {
        if (pend.tipo === 'escolha') {
            const a = Engine.def(pend.abilityId);
            renderCache.aliado = !!(a && a.alvo && (a.alvo.quem === 'aliados' || a.alvo.livre));
            renderCache.targetHexes = pend.opcoes
                .map((o) =>
                    typeof o === 'string' ? Engine.parseZona(o) : o === null ? null : Rules.pieceById(state, o),
                )
                .filter(Boolean)
                .map((p) => ({ q: p.q, r: p.r }));
        }
        return;
    }
    const foco = habilidadeEmFoco();
    if (!foco) return;
    const { piece, a } = foco,
        alvo = Engine.alvoDe(piece, a);
    renderCache.aliado = alvo.quem === 'aliados';
    renderCache.rangeHexes = alcanceHexes(piece, a);
    if (ui.mode || (Rules.canSelect(state, piece) && Engine.canUse(state, piece, a)))
        renderCache.targetHexes = Engine.previewHexes(
            state,
            piece,
            alvo,
            Engine.restrict(state, piece, a),
            ui.mode ? ui.mode.etapa : null,
        );
}

// Posição desenhada da Estrela (desliza da zona anterior até a atual depois de um movimento).
// Com efeitos visuais: anda pelo caminho (andar, investida, salto, empurrão) e soma os desvios (bote, recuo, esquiva).
export function posPeca(p, t) {
    const pos = posCaminho(p, t),
        d = VFX.desvio(p.id, t);
    if (d) {
        pos.x += d.x;
        pos.y += d.y;
    }
    return pos;
}
function posCaminho(p, t) {
    const fim = hexToPixel(p.q, p.r);
    const an = ui.anims[p.id];
    if (!an) return fim;
    const k = (t - an.t0) / an.dur;
    if (!(an.dur > 0) || k >= 1) {
        delete ui.anims[p.id];
        return fim;
    }
    if (an.cam) return VFX.posAnim(an, Math.max(0, k));
    const ini = hexToPixel(an.q, an.r),
        e = 1 - Math.pow(1 - Math.max(0, k), 3);
    return { x: ini.x + (fim.x - ini.x) * e, y: ini.y + (fim.y - ini.y) * e };
}

export function caminhoArredondado(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
}

function drawBarra(x, y, w, h, frac, cor) {
    caminhoArredondado(x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(17, 24, 39, 0.92)';
    ctx.fill();
    if (frac > 0) {
        caminhoArredondado(x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
        ctx.fillStyle = cor;
        ctx.fill();
    }
    caminhoArredondado(x, y, w, h, h / 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.stroke();
}

// Texto com contorno escuro (legível sobre qualquer fundo).
export function drawTextoContorno(txt, x, y, font, cor, contorno = 'rgba(0, 0, 0, 0.9)', largura = 3) {
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = largura;
    ctx.strokeStyle = contorno;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = cor;
    ctx.fillText(txt, x, y);
}

function drawEscudo(x, y, s, n, extra) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.85, y - s * 0.6);
    ctx.lineTo(x + s * 0.75, y + s * 0.35);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.75, y + s * 0.35);
    ctx.lineTo(x - s * 0.85, y - s * 0.6);
    ctx.closePath();
    ctx.fillStyle = n > 0 ? '#475569' : '#1f2937';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = extra ? '#7dd3fc' : COR.armadura;
    ctx.stroke();
    drawLabel(
        String(n),
        x,
        y + 0.5,
        `bold ${Math.round(s * (n >= 10 ? 0.95 : 1.1))}px Inter`,
        n > 0 ? '#ffffff' : '#6b7280',
    );
}

function drawLosango(x, y, s, n) {
    const lx = s * (n >= 10 ? 1.25 : 1); // mais largo para 2 dígitos
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + lx, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - lx, y);
    ctx.closePath();
    ctx.fillStyle = n > 0 ? COR.amago : '#1f2937';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0c4a6e';
    ctx.stroke();
    drawLabel(
        String(n),
        x,
        y + 0.5,
        `bold ${Math.round(s * (n >= 10 ? 0.95 : 1.1))}px Inter`,
        n > 0 ? '#082f49' : '#6b7280',
    );
}

// Contadores sob o retrato: barra de Vida (com número), barra de Âmago, escudo de Armadura à esquerda,
// losango de Âmago à direita e ▲/▼ (efeitos) em cima.
function drawPilula(x, y, txt, fundo, h) {
    const font = `bold ${Math.round(h * 0.8)}px Inter`;
    ctx.font = font;
    const w = ctx.measureText(txt).width + h * 0.7;
    caminhoArredondado(x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fillStyle = fundo;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0b1220';
    ctx.stroke();
    drawLabel(txt, x, y + 0.5, font, '#0b1220');
}
// t: com efeitos visuais, mostra os valores de antes até o golpe chegar e a "barra fantasma" do dano.
export function drawContadores(p, x, y, R, efeitos, t = 0) {
    const s = p.stats,
        w = R * 1.0,
        x0 = x - w / 2;
    const hv = Math.max(10, Math.round(R * 0.23)),
        ha = Math.max(3, Math.round(R * 0.09));
    const y0 = y + R * 0.5;
    const seg = VFX.segurado(p, t),
        vida = seg ? seg.vida : s.vida,
        amago = seg ? seg.amago : s.amago;
    const fv = vida / (s.vidaMax || 1);
    drawBarra(x0, y0, w, hv, fv, corVida(fv));
    const fb = seg ? null : VFX.barraFantasma(p.id, t);
    if (fb != null && fb > fv) {
        caminhoArredondado(x0 + w * Math.max(0, fv), y0 + 1, w * Math.min(1, fb - Math.max(0, fv)), hv - 2, 2);
        ctx.fillStyle = 'rgba(254, 243, 199, 0.9)';
        ctx.fill();
    }
    drawBarra(x0, y0 + hv + 1.5, w, ha, amago / (s.amagoMax || 1), COR.amago);
    drawTextoContorno(String(vida), x, y0 + hv / 2 + 0.5, `bold ${hv + 1}px Inter`, '#ffffff');
    const tam = Math.max(9, R * 0.22),
        meio = y0 + (hv + ha) / 2;
    const extra = Rules.armaduraExtra(p),
        arm = seg ? seg.arm : s.armadura + extra;
    if (s.armaduraMax > 0 || arm > 0) drawEscudo(x0 - tam * 0.4, meio, tam, arm, extra > 0);
    drawLosango(x0 + w + tam * 0.5, meio, tam, amago);
    // Efeitos ativos: pílula verde (▲ bons) e vermelha (▼ ruins) com a quantidade, em cima do retrato.
    const hp = Math.max(11, Math.round(R * 0.25)),
        dois = efeitos.bons && efeitos.ruins,
        yp = y - R * 0.72;
    if (efeitos.bons) drawPilula(x - (dois ? hp * 0.95 : 0), yp, `▲${efeitos.bons}`, '#4ade80', hp);
    if (efeitos.ruins) drawPilula(x + (dois ? hp * 0.95 : 0), yp, `▼${efeitos.ruins}`, '#f87171', hp);
}
