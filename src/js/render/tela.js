// ── Celular: tela cheia + trava na horizontal (Android/Chrome; o iPhone não permite e usa o aviso #girar-tela) ──
const TelaCheia = {
    disponivel() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); },
    ativa() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    async entrar() {
        const el = document.documentElement;
        try {
            if (!this.ativa()) await (el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen());
        } catch (e) { return; }
        try { await screen.orientation.lock('landscape'); } catch (e) { /* sem suporte: fica o aviso para girar */ }
    },
    sair() { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* ok */ } },
    alternar() { if (this.ativa()) this.sair(); else this.entrar(); },
    atualizarBotoes() {
        $('btn-tela-cheia').classList.toggle('hidden', !(ehToque() && this.disponivel()));
        $('btn-tela-cheia').innerText = this.ativa() ? 'Sair da tela cheia' : 'Tela cheia';
        $('btn-girar').classList.toggle('hidden', !(this.disponivel() && screen.orientation && screen.orientation.lock));
    }
};
function ehToque() { return matchMedia('(pointer: coarse)').matches; }
function ehCompacto() { return document.documentElement.classList.contains('compacto'); }
document.addEventListener('fullscreenchange', () => TelaCheia.atualizarBotoes());
document.addEventListener('webkitfullscreenchange', () => TelaCheia.atualizarBotoes());
$('btn-tela-cheia').addEventListener('click', () => TelaCheia.alternar());
$('btn-girar').addEventListener('click', () => TelaCheia.entrar());

// Celular deitado (pouca altura): liga o layout compacto e move banner/avisos/habilidades para as colunas laterais,
// deixando a altura toda para o tabuleiro. Devolve true se está compacto.
function aplicarCompacto() {
    const raiz = document.documentElement;
    const c = matchMedia('(max-height: 500px) and (orientation: landscape)').matches;
    raiz.classList.toggle('toque', ehToque());
    TelaCheia.atualizarBotoes();
    if (c === raiz.classList.contains('compacto')) return c;
    raiz.classList.toggle('compacto', c);
    const acoes = $('action-bar');
    if (c) {
        $('hud-esq').prepend($('turn-banner'));
        $('hud-dir').insertBefore($('prompt-bar'), acoes);
        $('hud-dir').insertBefore($('ability-bar'), acoes);
        ui.logAberto = false; // registro começa recolhido (pouco espaço)
    } else {
        $('ui-layer').prepend($('turn-banner'));
        $('hud-base').append($('prompt-bar'), $('ability-bar'));
    }
    view.layoutMudou = true;
    return c;
}

// Área livre para o tabuleiro: desconta o HUD (faixa superior = banner, inferior = habilidades/avisos,
// laterais = colunas de painéis em telas largas). Mantenha em sintonia com --hud-col/--hud-gap no CSS.
const HUD = { larga: 1000, topo: 84, base: 92, lateral: 15 * 16 + 2 * 16 };
function resizeCanvas() {
    view.dpr = window.devicePixelRatio || 1;
    view.width = window.innerWidth;
    view.height = window.innerHeight;
    canvas.width = Math.round(view.width * view.dpr);
    canvas.height = Math.round(view.height * view.dpr);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    boardLayer = null;
    // Hexágono máximo que cabe na área livre (limites do mapa em unidades de R). Abaixo de hexRadiusMin, o mapa
    // não encolhe mais: fica maior que a área livre e pode ser arrastado (view.panMaxX/Y > 0).
    const b = limitesMapa(), wU = b.maxX - b.minX, hU = b.maxY - b.minY;
    const cfg = CONFIG.board;
    let larguraLivre, alturaLivre, topo;
    if (aplicarCompacto()) {
        // Compacto: o mapa ocupa a altura toda; as colunas laterais dividem a largura que sobra (mín. 150px cada).
        const gap = 6;
        alturaLivre = view.height - 2 * gap; topo = gap;
        const r0 = Math.min(cfg.hexRadius, alturaLivre / hU);
        const col = Math.round(Math.max(150, Math.min(270, (view.width - wU * r0) / 2 - 2 * gap)));
        document.documentElement.style.setProperty('--hud-col', `${col}px`);
        larguraLivre = view.width - 2 * (col + 2 * gap);
        view.hexR = Math.max(14, Math.min(r0, larguraLivre / wU));
    } else {
        document.documentElement.style.removeProperty('--hud-col');
        larguraLivre = view.width >= HUD.larga ? view.width - 2 * HUD.lateral : view.width * 0.62;
        alturaLivre = view.height - HUD.topo - HUD.base; topo = HUD.topo;
        view.hexR = Math.max(cfg.hexRadiusMin, Math.min(cfg.hexRadius, larguraLivre / wU, alturaLivre / hU));
    }
    const R = view.hexR, folga = R * 0.5;
    view.panMaxX = wU * R > larguraLivre + 1 ? (wU * R - larguraLivre) / 2 + folga : 0;
    view.panMaxY = hU * R > alturaLivre + 1 ? (hU * R - alturaLivre) / 2 + folga : 0;
    view.baseX = view.width / 2 - (b.minX + b.maxX) / 2 * R;
    view.baseY = topo + alturaLivre / 2 - (b.minY + b.maxY) / 2 * R;
    moverMapa(0, 0);
    if (view.layoutMudou) { view.layoutMudou = false; if (state) refreshHUD(); }
}

// Limites do mapa ativo em unidades de R (centro do hexágono: x = 1,5q, y = √3·(q/2 + r); meia largura 1, meia altura √3/2).
function limitesMapa() {
    const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }, h = Math.sqrt(3) / 2;
    for (const z of Rules.zonas()) {
        const x = 1.5 * z.q, y = Math.sqrt(3) * (z.q / 2 + z.r);
        b.minX = Math.min(b.minX, x - 1); b.maxX = Math.max(b.maxX, x + 1);
        b.minY = Math.min(b.minY, y - h); b.maxY = Math.max(b.maxY, y + h);
    }
    return b;
}

// Desloca o mapa (px), dentro dos limites; (0, 0) só reaplica os limites.
function moverMapa(dx, dy) {
    const lim = (v, m) => Math.max(-m, Math.min(m, v));
    const x = lim(view.panX + dx, view.panMaxX), y = lim(view.panY + dy, view.panMaxY);
    const mudou = x !== view.panX || y !== view.panY;
    view.panX = x; view.panY = y;
    view.originX = view.baseX + x;
    view.originY = view.baseY + y;
    if (mudou) boardLayer = null;
    return mudou;
}
const mapaArrastavel = () => view.panMaxX > 0 || view.panMaxY > 0;

// Troca o mapa ativo (regras + tela). centralizar: volta o deslocamento ao centro.
function aplicarMapa(id, centralizar = false) {
    const antes = Rules.mapa;
    Rules.usarMapa(id);
    if (centralizar || antes !== Rules.mapa) { view.panX = view.panY = 0; resizeCanvas(); }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
