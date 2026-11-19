function selectedPiece() {
    return state && ui.selectedId != null ? state.pieces.find(p => p.id === ui.selectedId) : null;
}

function selectPiece(piece) {
    ui.selectedId = piece.id;
    ui.mode = null;
    ui.path = [{ q: piece.q, r: piece.r }];
    ui.reachable = Rules.reachableHexes(state, piece);
    updateStatsPanel(piece);
    updateActionBar();
}

function clearSelection(keepPanel = false) {
    ui.selectedId = null;
    ui.mode = null;
    ui.path = [];
    ui.reachable = [];
    ui.dragging = false;
    ui.justSelected = false;
    if (keepPanel) return; // quem chamou vai selecionar outra Estrela em seguida
    updateStatsPanel(null);
    updateActionBar();
}

function startAbilityMode(abilityId) {
    const piece = selectedPiece();
    const a = Engine.def(abilityId);
    if (!piece || !a || !Rules.canSelect(state, piece) || !Engine.canUse(state, piece, a)) return;
    ui.mode = { abilityId, etapa: null, pagamento: Engine.modosPagamento(piece, a)[0] };
    refreshHUD();
}

// Custo alternativo: alterna entre pagar com Âmago e com o recurso (quando os dois são possíveis).
function trocarPagamento(modo = null) {
    const piece = selectedPiece();
    const a = ui.mode && Engine.def(ui.mode.abilityId);
    if (!piece || !a) return;
    const modos = Engine.modosPagamento(piece, a);
    if (modos.length < 2) return;
    ui.mode.pagamento = modo || (ui.mode.pagamento === 'alternativo' ? 'amago' : 'alternativo');
    refreshHUD();
}

// Custo da habilidade em HTML: ◆Âmago, + recurso adicional ou "/ recurso" alternativo.
function custoHTML(piece, a, car = null) {
    const c = car || Engine.caracteristicas(piece, a);
    const rec = (x, sep) => { const r = CONFIG.recursos[x.recurso] || {}; return ` <span style="color:${r.cor}">${sep}${r.icone || ''}${x.valor}</span>`; };
    const repete = a.repeteCom && state && piece.turn && (piece.turn.usos[a.id] || 0) > 0 && Engine.slot(state, piece, a) === 'repeticao'; // Disparo Arcano repetido
    return `<span style="color:${COR.amago}">◆${c.custo}</span>${a.custoAdicional ? rec(a.custoAdicional, '+') : ''}${repete ? rec(a.repeteCom, '+') : ''}${a.custoAlternativo ? rec(a.custoAlternativo, '/ ') : ''}`;
}

function cancelAbilityMode() {
    if (ui.mode && ui.mode.etapa) ui.mode.etapa = null;
    else ui.mode = null;
    refreshHUD();
}

function handleTargetClick(hex) {
    if (!state || state.winner) return false;
    if (state.pending) {
        if (state.pending.tipo === 'escolha') {
            const t = Rules.pieceAt(state, hex.q, hex.r), k = `${hex.q},${hex.r}`;
            if (state.pending.opcoes.includes(k)) resolveChoice(k); // zona (ex.: Dar no Pé)
            else if (t && state.pending.opcoes.includes(t.id)) resolveChoice(t.id);
        }
        return true;
    }
    if (ui.mode) {
        const piece = selectedPiece();
        const a = Engine.def(ui.mode.abilityId);
        if (piece && a) {
            const res = Engine.choiceFromHex(state, piece, Engine.alvoDe(piece, a), hex, Engine.restrict(state, piece, a), ui.mode.etapa);
            if (res && res.etapa) { ui.mode.etapa = res.etapa; refreshHUD(); }
            else if (res) useAbility(a.id, res.choice);
        }
        return true;
    }
    return false;
}
