// Esc no jogo: cancela a habilidade → apaga o caminho traçado → solta a ficha fixada → abre o menu de pausa.
function voltarNoJogo() {
    if (ui.mode) { cancelAbilityMode(); return; }
    if (ui.path.length > 1) { ui.path = [ui.path[0]]; ui.dragging = false; refreshHUD(); return; }
    if (ui.pinId != null) { ui.pinId = null; updateInspectPanel(); return; }
    abrirPausa();
}

$('btn-play').addEventListener('click', abrirMenuModo);
$('btn-modo-voltar').addEventListener('click', () => mostrarPainelMenu('main-menu'));
$('btn-continuar').addEventListener('click', continuarPartida);
$('btn-online').addEventListener('click', abrirMenuOnline);
montarBotoesCriarSala();
$('btn-entrar-sala').addEventListener('click', () => Rede.entrarSala($('input-codigo').value));
$('input-codigo').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
$('btn-copiar-link').addEventListener('click', copiarLinkSala);
$('btn-online-back').addEventListener('click', sairMenuOnline);
$('btn-help').addEventListener('click', () => mostrarAjuda(undefined, null));
$('btn-sel-back').addEventListener('click', voltarSelecao);
$('btn-confirm-team').addEventListener('click', confirmTeam);
$('btn-sel-sortear').addEventListener('click', sortearEquipe);
$('btn-help-back').addEventListener('click', () => fecharAjuda());
$('btn-undo').addEventListener('click', undo);
$('btn-skip').addEventListener('click', endActivation);
$('btn-menu').addEventListener('click', () => abrirPausa());

// Atalhos de teclado (menus, pausa, ajuda e partida).
document.addEventListener('keydown', (e) => {
    if (e.repeat || e.altKey) return;
    if (Falha.aberto()) return; // aviso de erro aberto: só os botões dele (Enter/Tab nativos)
    const k = e.key, tecla = k.length === 1 ? k.toLowerCase() : k;
    if (Sorteio.aberto()) { // sorteio da ordem na tela: Enter/Espaço/Esc pulam a animação e depois começam
        if (k === 'Enter' || k === ' ' || k === 'Escape') { e.preventDefault(); Sorteio.avancar(); }
        return;
    }
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { // digitando (código da sala)
        if (k === 'Enter' && e.target.id === 'input-codigo') { e.preventDefault(); Rede.entrarSala(e.target.value); }
        else if (k === 'Escape') e.target.blur();
        return;
    }
    const ctrl = e.ctrlKey || e.metaKey;
    if (ajudaAberta()) {
        if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); fecharAjuda(); }
        else if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); trocarAbaAjuda(k === 'ArrowLeft' ? -1 : 1); }
        return;
    }
    if (pausaAberta()) {
        if (k === 'Escape') { e.preventDefault(); fecharPausa(); }
        else if (tecla === 'h' && !ctrl && !(state && state.winner)) mostrarAjuda(undefined, 'pausa');
        else if (k === 'Enter' && state && state.winner) { e.preventDefault(); jogarDeNovo(); }
        else if (tecla === 'n' && !ctrl && state && state.winner) { e.preventDefault(); novaPartida(); }
        else if (ctrl && tecla === 'z' && state && state.winner && undoStack.length) { e.preventDefault(); fecharPausa(); undo(); }
        return;
    }
    if (!gameRunning) {
        const menu = $('menu-screen');
        if (menu.style.display === 'none' || menu.classList.contains('hidden-menu')) return;
        const sel = !$('selection-menu').classList.contains('hidden');
        if (sel) {
            if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); voltarSelecao(); }
            else if (k === 'Enter') { e.preventDefault(); confirmTeam(); }
            else if (tecla === 's' && !ctrl) { e.preventDefault(); sortearEquipe(); }
        } else if (!$('online-menu').classList.contains('hidden')) {
            if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); sairMenuOnline(); }
        } else if (!$('modo-menu').classList.contains('hidden')) {
            const porNumero = modosLocais().find(id => String(CONFIG.modos[id].tecla || CONFIG.modos[id].jogadores.length).toLowerCase() === k.toLowerCase());
            if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); mostrarPainelMenu('main-menu'); }
            else if (k === 'Enter') { e.preventDefault(); escolherModo(modoEscolhido); }
            else if (porNumero) { e.preventDefault(); escolherModo(porNumero); }
            else if (tecla === 'd' && !ctrl) { e.preventDefault(); const ks = Object.keys(Bot.niveis); escolherNivelBot(ks[(ks.indexOf(botNivelEscolhido) + 1) % ks.length]); }
        } else if (k === 'Enter') { e.preventDefault(); abrirMenuModo(); }
        else if (tecla === 'o' && !ctrl) { e.preventDefault(); abrirMenuOnline(); }
        else if (tecla === 'c' && !ctrl && !$('btn-continuar').classList.contains('hidden')) { e.preventDefault(); continuarPartida(); }
        else if (tecla === 'h' && !ctrl) mostrarAjuda(undefined, null);
        return;
    }
    if (ctrl) {
        if (tecla === 'z') { e.preventDefault(); undo(); }
        return;
    }
    if (k === 'Escape') { e.preventDefault(); voltarNoJogo(); }
    else if (tecla === 'h') mostrarAjuda(undefined, 'jogo');
    else if (k.startsWith('Arrow') && mapaArrastavel()) {
        e.preventDefault();
        const p = view.hexR * 1.5;
        moverMapa(k === 'ArrowLeft' ? p : k === 'ArrowRight' ? -p : 0, k === 'ArrowUp' ? p : k === 'ArrowDown' ? -p : 0);
    }
    else if (state && state.winner) return;
    else if (tecla === 'e') { if (!$('btn-skip').disabled) endActivation(); }
    else if (tecla === 'c') collectRenome();
    else if (tecla === 'p' && ui.mode) trocarPagamento();
    else if (/^[1-9]$/.test(k) && ui.atalhos[Number(k) - 1]) startAbilityMode(ui.atalhos[Number(k) - 1]);
});

buildColorButtons();
Engine.validarConfig();
atualizarBotaoContinuar();

// Link de convite (?sala=CÓDIGO): abre o menu online e entra na sala.
{
    const sala = new URLSearchParams(location.search).get('sala');
    if (sala) { abrirMenuOnline(); $('input-codigo').value = sala.toUpperCase().slice(0, SALA_TAMANHO); Rede.entrarSala(sala); }
}

window.Game = {
    CONFIG, Rules, Engine,
    get state() { return state; },
    export() { return snapshot(); },
    import(json) {
        state = JSON.parse(json);
        aplicarMapa(state.mapa || 'classico');
        ui.vis = null;
        afterStateChange();
    },
    undo, endActivation, restart: beginMatch, Rede,
    damage: dealDamage, heal: healPiece, cleanse: cleansePiece, move: commitMove, collect: collectRenome
};
