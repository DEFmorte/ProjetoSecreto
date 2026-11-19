import { Falha } from '../nucleo/falha.js';
import { CONFIG } from '../motor/config.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';
import { state } from '../partida/estado.js';
import { ui } from '../interface/ui.js';
import { iconePronto } from '../interface/icones.js';
import { retrato } from '../menus/escolha-equipe.js';
import { ctx, renderCache, view } from './canvas.js';
import { hexToPixel } from './hex.js';
import { definirLoopHandle, gameRunning } from '../partida/loop.js';
import { drawCircle, drawContadores, drawContagem, drawHexagon, drawIcone, drawLabel, drawRecursoBadge, drawRenomeBadge, drawRenomeMarker, drawShuriken, drawTextoContorno, getBoardLayer, posPeca } from './desenho.js';
import { VFX } from './vfx.js';

// Números flutuantes (dano, cura, Âmago, Armadura, esquiva): sobem e somem (os grandes surgem com um "pulo").
const FLOAT_MS = 1400;
function drawFloats(t) {
    ui.floats = ui.floats.filter(f => t - f.t0 < FLOAT_MS);
    for (const f of ui.floats) {
        const k = (t - f.t0) / FLOAT_MS;
        if (k < 0) continue;
        const { x, y } = hexToPixel(f.q, f.r);
        ctx.save();
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        const pulo = f.grande && VFX.ligado() ? 1 + 0.55 * Math.max(0, 1 - k * FLOAT_MS / 170) : 1;
        drawTextoContorno(f.txt, x, y - view.hexR * 0.6 - (f.dy ?? 0) - 26 * (1 - Math.pow(1 - k, 2)), f.grande ? `bold ${Math.round(17 * pulo)}px Inter` : 'bold 12px Inter', f.cor, 'rgba(0, 0, 0, 0.9)', 4);
        ctx.restore();
    }
}

// Um erro ao desenhar um quadro não para o jogo: avisa uma vez e segue desenhando os próximos.
export function gameLoop(timestamp) {
    if (!gameRunning || !state) return;
    try { desenharQuadro(timestamp); }
    catch (err) { Falha.mostrar(err, 'desenho'); }
    if (gameRunning) definirLoopHandle(requestAnimationFrame(gameLoop));
}

// Tremor da tela (efeitos visuais) desloca a cena; faixa de turno e confete ficam por cima, sem tremer.
function desenharQuadro(timestamp) {
    const tr = VFX.tremor(timestamp);
    ctx.save();
    try {
        if (tr) { ctx.clearRect(0, 0, view.width, view.height); ctx.translate(tr.x, tr.y); }
        desenharCena(timestamp);
    } finally { ctx.restore(); }
    VFX.desenharTela(timestamp);
}

function desenharCena(timestamp) {
    const R = view.hexR;
    ctx.clearRect(0, 0, view.width, view.height);
    const targeting = !!(ui.mode || state.pending || renderCache.rangeHexes.length);

    ctx.drawImage(getBoardLayer(), 0, 0, view.width, view.height);

    if (!targeting) {
        ui.reachable.forEach(h => {
            const { x, y } = hexToPixel(h.q, h.r);
            drawHexagon(x, y, R - 1, 'rgba(34, 197, 94, 0.25)', 'rgba(34, 197, 94, 0.6)', 2);
        });
    } else {
        // Alcance (claro) e alvos válidos (pulsando): laranja = inimigos, verde = aliados.
        const c = renderCache.aliado ? '34, 197, 94' : '249, 115, 22';
        renderCache.rangeHexes.forEach(h => {
            const { x, y } = hexToPixel(h.q, h.r);
            drawHexagon(x, y, R - 1, `rgba(${c}, 0.10)`, `rgba(${c}, 0.35)`, 1.5);
        });
        const pulse = (Math.sin(timestamp / 180) + 1) / 2;
        renderCache.targetHexes.forEach(h => {
            const { x, y } = hexToPixel(h.q, h.r);
            drawHexagon(x, y, R - 1, `rgba(${c}, ${0.2 + pulse * 0.2})`, `rgba(${c}, 0.9)`, 2);
        });
    }

    if (!targeting && ui.path.length > 0) {
        ctx.beginPath();
        const start = hexToPixel(ui.path[0].q, ui.path[0].r);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < ui.path.length; i++) {
            const p = hexToPixel(ui.path[i].q, ui.path[i].r);
            ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        if (ui.path.length > 1) {
            const fin = ui.path[ui.path.length - 1];
            const pos = hexToPixel(fin.q, fin.r);
            const pulse = (Math.sin(timestamp / 150) + 1) / 2;
            drawHexagon(pos.x, pos.y, R - 2, `rgba(234, 179, 8, ${0.3 + pulse * 0.4})`, '#eab308', 3);
            drawLabel(document.documentElement.classList.contains('toque') ? 'TOQUE' : '2x CLIQUE', pos.x, pos.y, 'bold 11px Inter', '#ffffff');
        }
    }

    const ocupados = [];
    for (const m of state.renome || []) {
        if (Rules.pieceAt(state, m.q, m.r)) ocupados.push(m); else drawRenomeMarker(m, R, timestamp);
    }
    // Renome extra recém-surgido: contorno pulsante durante o turno em que apareceu.
    const novo = state.renomeExtra && state.renomeExtra.ultimo;
    if (novo && novo.rodada === state.round && novo.bloco === state.blockIndex && Rules.renomeEm(state, novo.q, novo.r)) {
        const pos = hexToPixel(novo.q, novo.r), pulse = (Math.sin(timestamp / 220) + 1) / 2;
        drawHexagon(pos.x, pos.y, R - 3, `rgba(250, 204, 21, ${0.08 + pulse * 0.17})`, `rgba(250, 204, 21, ${0.55 + pulse * 0.45})`, 3);
    }

    // Objetos no tabuleiro (shuriken): na zona livre, no centro; embaixo de uma Estrela, pequeno na borda de baixo da zona.
    const objetosSob = [];
    for (const dono of state.pieces) for (const [o, pos] of Object.entries(dono.objetos || {})) {
        if (!pos || VFX.oculto(dono.id, o, timestamp)) continue; // shuriken ainda no ar
        if (Rules.pieceAt(state, pos.q, pos.r)) { objetosSob.push({ dono, o, pos }); continue; }
        const c = hexToPixel(pos.q, pos.r);
        drawShuriken(c.x, c.y, R * 0.36, timestamp, dono.color);
    }

    VFX.desenhar(timestamp, 'chao');
    VFX.desenharFantasmas(timestamp, R);
    const pendingNow = renderCache.pendingIds;
    const activeId = state.winner ? null : state.activeId;
    state.pieces.forEach(p => {
        const pos = posPeca(p, timestamp), { x, y } = pos;
        const theme = CONFIG.players[p.player];
        VFX.antesDaPeca(p, pos, timestamp);

        // Estrela: retrato recortado em círculo com anel na cor do time; sem retrato, círculo na cor da Estrela com "J1/J2".
        const img = retrato(p.stats.nome);
        ctx.beginPath();
        ctx.arc(x, y, R * 0.6, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.fill();
        if (img) {
            ctx.save(); ctx.clip();
            ctx.drawImage(img, x - R * 0.6, y - R * 0.6, R * 1.2, R * 1.2);
            ctx.restore();
        }
        ctx.lineWidth = 3;
        ctx.strokeStyle = img ? theme.bannerBorder : theme.pieceBorder;
        ctx.stroke();

        // Pode agir neste turno: anel fino e fixo na cor do time (mais forte na Estrela ativa). A selecionada usa o tracejado.
        if (pendingNow.has(p.id) && ui.selectedId !== p.id) {
            ctx.globalAlpha = activeId === p.id ? 0.9 : 0.4;
            drawCircle(x, y, R * 0.68, null, theme.bannerBorder, activeId === p.id ? 2 : 1.5);
            ctx.globalAlpha = 1;
        }

        if (!img) drawLabel(`J${p.player}`, x, y, 'bold 13px Inter', theme.pieceText);
        VFX.brilhoPeca(p, x, y, R, timestamp);

        const efeitos = { bons: 0, ruins: 0 };
        for (const e of p.effects || []) { if (e.tipo === 'marca') continue; if (Engine.isDebuff(e)) efeitos.ruins++; else if (e.buff || e.delta > 0 || e.tipo === 'escudo') efeitos.bons++; }
        drawContadores(p, x, y, R, efeitos, timestamp);

        let markSlot = 0;
        for (const [id, m] of Object.entries(CONFIG.marks)) {
            const n = Rules.marks(p, id);
            if (!n) continue;
            const mx = x - R * 0.55, my = y - R * 0.5 + markSlot++ * 19;
            if (iconePronto(m.icone)) {
                drawIcone(m.icone, mx, my, 9, m.cor);
                if (n > 1) drawContagem(mx + 7, my + 7, n, 5.5);
                continue;
            }
            ctx.beginPath();
            ctx.moveTo(mx, my - 8); ctx.lineTo(mx + 8, my); ctx.lineTo(mx, my + 8); ctx.lineTo(mx - 8, my);
            ctx.closePath();
            ctx.fillStyle = m.cor;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#111827';
            ctx.stroke();
            drawLabel(n > 1 ? String(n) : m.sigla, mx, my + 0.5, 'bold 9px Inter', '#111827');
        }

        if (p.renome > 0) drawRenomeBadge(x + R * 0.62, y + R * 0.05, p.renome);
        Object.entries(p.recursos || {}).forEach(([r, n], i) => drawRecursoBadge(x - R * 0.62, y + R * 0.05 + i * 16, n, CONFIG.recursos[r]));

        const orderPos = renderCache.blockIndexById.get(p.id) ?? -1;
        if (CONFIG.rules.turnMode === 'initiative' && orderPos !== -1) {
            const done = p.turn.done || orderPos < state.blockIndex;
            drawCircle(x + R * 0.5, y - R * 0.5, 9, done ? '#374151' : '#111827', theme.bannerBorder, 2);
            drawLabel(String(orderPos + 1), x + R * 0.5, y - R * 0.5, 'bold 10px Inter', '#ffffff');
        }

        if (ui.selectedId === p.id) {
            ctx.setLineDash([4, 4]);
            drawCircle(x, y, R * 0.68, null, 'rgba(255, 255, 255, 0.85)', 1.5);
            ctx.setLineDash([]);
        }
    });

    for (const { dono, pos } of objetosSob) {
        const c = hexToPixel(pos.q, pos.r);
        drawShuriken(c.x, c.y + R * 0.66, R * 0.2, timestamp, dono.color);
    }

    // Marcadores sob uma Estrela: selo ★ pequeno no canto esquerdo da zona (o jogador vê que pode coletar).
    for (const m of ocupados) {
        const { x, y } = hexToPixel(m.q, m.r);
        drawRenomeBadge(x - R * 0.62, y + R * 0.05, m.valor, 11, 5, '#ffffff');
    }

    VFX.desenhar(timestamp, 'alto');
    drawFloats(timestamp);
}
