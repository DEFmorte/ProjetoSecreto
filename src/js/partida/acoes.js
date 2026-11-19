function pushUndo() {
    if (Rede.ativo()) return; // online não há desfazer
    undoStack.push(snapshot());
    if (undoStack.length > CONFIG.maxUndo) undoStack.shift();
}

function finishChange() {
    Rules.removeDead(state);
    state.winner = CONFIG.rules.checkVictory(state);
    if (state.winner) {
        state.pending = null;
        state.triggers = [];
    } else if (!state.pending) {
        const act = Rules.activePiece(state);
        if (act) Rules.autoEndIfExhausted(state, act);
        Rules.settle(state);
    }
    if (!Rede.aplicando && !Bot.aplicando) afterStateChange(); // online/Bot: quem aplicou redesenha depois de liberar Rules.canSelect
    return true;
}

// Ações da partida: a interface monta uma ação e chama executar(). No modo local ela é aplicada direto;
// online, o convidado envia a ação ao anfitrião, que confere de quem é a vez, aplica e devolve o estado.
function executar(acao, jogador = Rede.eu) {
    if (!Rede.ativo() && Bot.ativo()) {
        // Contra o Bot: você só age com as suas Estrelas e decide as suas reações/escolhas.
        const voce = state.jogadores.find(j => !Bot.ehBot(j));
        if (!gameRunning || !Rede.podeAgir(acao, voce)) return false;
        let ok = false;
        Bot.aplicando = true; // o motor confere Rules.canSelect também para as Estrelas do Bot (ex.: fim automático da jogada)
        try { ok = aplicarAcao(acao); } finally { Bot.aplicando = false; }
        afterStateChange();
        return ok;
    }
    if (!Rede.ativo()) return aplicarAcao(acao);
    if (!state || !gameRunning || !Rede.podeAgir(acao, jogador)) return false;
    if (Rede.papel === 'convidado') { Rede.enviar({ t: 'acao', acao }); return true; }
    let ok = false;
    Rede.aplicando = true; // o motor confere Rules.canSelect também para as Estrelas do convidado
    try { ok = aplicarAcao(acao); } finally { Rede.aplicando = false; }
    afterStateChange();
    Rede.enviarEstado();
    return ok;
}

function aplicarAcao(a) {
    switch (a && a.tipo) {
        case 'mover': return aplicarMover(a.pieceId, a.path);
        case 'habilidade': return aplicarHabilidade(a.pieceId, a.abilityId, a.choice, a.pagamento);
        case 'escolha': return !!Engine.chooseTarget(state, a.targetId) && finishChange();
        case 'rolagem': return !!Engine.resolveRoll(state, a.hit) && finishChange();
        case 'reacao': return !!(state && !state.winner && Engine.resolveReaction(state, a.usar)) && finishChange();
        case 'coletar': return aplicarColeta(a.pieceId);
        case 'encerrar': return aplicarEncerrar(a.pieceId);
    }
    return false;
}

function aplicarMover(pieceId, path) {
    pushUndo();
    if (!Engine.mover(state, Rules.pieceById(state, pieceId), path)) { undoStack.pop(); return false; }
    return finishChange();
}

function aplicarHabilidade(pieceId, abilityId, choice, pagamento) {
    const piece = Rules.pieceById(state, pieceId);
    if (!piece) return false;
    pushUndo();
    if (!Engine.use(state, piece, abilityId, choice, pagamento)) {
        undoStack.pop();
        updateActionBar();
        return false;
    }
    return finishChange();
}

function aplicarColeta(pieceId) {
    const piece = Rules.pieceById(state, pieceId);
    if (!Rules.podeColetar(state, piece)) return false;
    pushUndo();
    Rules.coletarRenome(state, piece);
    Engine.resolveQueue(state);
    return finishChange();
}

function aplicarEncerrar(pieceId) {
    const piece = Rules.pieceById(state, pieceId);
    if (!piece || !Rules.canSelect(state, piece)) return false;
    pushUndo();
    Rules.endActivation(state, piece);
    return finishChange();
}

function commitMove(pieceId, path) { return executar({ tipo: 'mover', pieceId, path }); }

function useAbility(abilityId, choice, pagamento = (ui.mode && ui.mode.abilityId === abilityId ? ui.mode.pagamento : null)) {
    const piece = selectedPiece();
    if (!piece) return false;
    return executar({ tipo: 'habilidade', pieceId: piece.id, abilityId, choice: choice === undefined ? null : choice, pagamento });
}

const resolveChoice = targetId => executar({ tipo: 'escolha', targetId });
const resolveRoll = hit => executar({ tipo: 'rolagem', hit: !!hit });
const resolveReaction = use => executar({ tipo: 'reacao', usar: !!use });

// Estrela que coleta/encerra: a ativa, senão a selecionada.
function pecaDaVez() {
    if (!gameRunning || !state || state.winner || state.pending) return null;
    return Rules.activePiece(state) || selectedPiece();
}

function collectRenome() {
    const piece = pecaDaVez();
    return piece ? executar({ tipo: 'coletar', pieceId: piece.id }) : false;
}

function endActivation() {
    const piece = pecaDaVez();
    return piece ? executar({ tipo: 'encerrar', pieceId: piece.id }) : false;
}

// Ações de teste (console: Game.damage/heal/cleanse): aplicam a mudança numa Estrela com desfazer.
function acaoTeste(pieceId, fn) {
    const piece = state && Rules.pieceById(state, pieceId);
    if (!piece) return;
    pushUndo();
    fn(piece);
    finishChange();
}
const dealDamage = (pieceId, amount) => acaoTeste(pieceId, p => { Engine.dealDamage(state, null, p, amount, 'teste'); Engine.resolveQueue(state); });
const cleansePiece = pieceId => acaoTeste(pieceId, p => Engine.removeDebuffs(state, p, 'teste'));
const healPiece = (pieceId, amount) => acaoTeste(pieceId, p => Rules.heal(p, amount));

function undo() {
    if (undoStack.length === 0 || !gameRunning || Rede.ativo()) return;
    const antes = { state, pilha: [...undoStack] };
    state = JSON.parse(undoStack.pop());
    // Contra Bots: volta até a sua última decisão (desfaz também o que os Bots fizeram depois dela).
    while (Bot.ativo() && undoStack.length && (Bot.vez() || state.winner)) state = JSON.parse(undoStack.pop());
    // Nenhuma decisão sua para voltar (ex.: um Bot começou a partida): não desfaz nada.
    if (Bot.ativo() && (Bot.vez() || state.winner)) { state = antes.state; undoStack = antes.pilha; return; }
    Bot.parar();
    aplicarMapa(state.mapa || 'classico');
    ui.vis = null; // desfazer não mostra números flutuantes
    afterStateChange();
}

function afterStateChange() {
    let target = null;
    if (state && !state.winner) {
        const active = Rules.activePiece(state);
        const pending = Rules.pendingIds(state);
        target = active || (pending.length === 1 ? Rules.pieceById(state, pending[0]) : null);
        if (target && Rede.ativo() && target.player !== Rede.eu) target = null; // online: só seleciona as suas
        if (target && Bot.ehBot(target.player)) target = null; // contra Bots: as deles ficam com eles
    }
    // Reseleciona direto (sem esconder o painel antes), para não reiniciar a animação a cada ação.
    if (target) { clearSelection(true); selectPiece(target); }
    else clearSelection();
    efeitosVisuais();
    refreshHUD();
    agendarSalvamento();
    if (!state || !state.winner) ui.vitoriaVista = null;
    else if (ui.vitoriaVista !== state.winner) {
        ui.vitoriaVista = state.winner;
        const espera = VFX.esperaVitoria(), s0 = state, w = state.winner;
        if (espera > 0) setTimeout(() => { if (state === s0 && state.winner === w && gameRunning && !pausaAberta()) abrirPausa(true); }, espera);
        else abrirPausa(true);
    }
    Bot.agendar();
}

// Compara com a foto anterior: números flutuantes (dano, cura, Âmago, Armadura, esquiva, derrota) e animação de movimento.
// Com os efeitos visuais ligados, os eventos do motor (state.fx) dão o tempo de cada impacto (ver VFX.planejar).
function efeitosVisuais() {
    const antes = ui.vis, agora = new Map(), t = performance.now();
    if (state) for (const p of state.pieces)
        agora.set(p.id, { q: p.q, r: p.r, vida: p.stats.vida, amago: p.stats.amago, arm: p.stats.armadura + Rules.armaduraExtra(p), renome: p.renome || 0, ref: p, ...VFX.contagens(p) });
    ui.vis = agora;
    const total = state ? (state.logTotal ?? state.log.length) : 0;
    const novas = total - ui.logVisto;
    ui.logVisto = total;
    if (!antes) { ui.floats = []; ui.anims = {}; VFX.reiniciar(); return; }
    let plano = null;
    if (VFX.ligado() && state) plano = VFX.planejar(antes, agora, t);
    else { VFX.visto = (state && state.fxN) || 0; VFX.ultimoHab = false; }
    const quando = id => plano ? (plano.quando[id] ?? plano.imp[id] ?? plano.lanc[id] ?? plano.base) : t;
    const fila = {}; // atraso e degrau por Estrela, para os números não se sobreporem
    const add = (h, id, txt, cor, grande = false, t0 = quando(id)) => {
        const n = fila[id] = (fila[id] ?? -1) + 1;
        ui.floats.push({ q: h.q, r: h.r, txt, cor, grande, t0: t0 + n * 260, dy: Math.min(n, 4) * 15 });
    };
    const chegada = {}; // Renome do abate: chega com as estrelinhas
    for (const [id, a] of antes) {
        const b = agora.get(id);
        if (!b) {
            const pos = (plano && plano.posEm[id]) || a, ate = quando(id) + 120;
            if (plano) {
                const quem = plano.abates[id];
                const c = VFX.derrota(id, a, pos, ate, quem != null && agora.has(quem) && agora.get(quem).renome > antes.get(quem)?.renome ? quem : null);
                if (quem != null) chegada[quem] = c;
                VFX.segura[id] = { ate, vida: a.vida, amago: a.amago, arm: a.arm };
            }
            add(pos, id, 'DERROTADO', '#f87171', true, plano ? ate : t);
            continue;
        }
        if ((b.q !== a.q || b.r !== a.r) && !(plano && plano.moveu.has(id))) ui.anims[id] = { q: a.q, r: a.r, t0: t, dur: Math.min(450, 110 * Rules.hexDistance(a, b)) };
        const dv = b.vida - a.vida, da = b.arm - a.arm, dm = b.amago - a.amago;
        if (plano && (dv || da || dm)) {
            const tq = quando(id);
            if (tq > t + 16) VFX.segura[id] = { ate: tq, vida: a.vida, amago: a.amago, arm: a.arm };
            if (dv < 0) VFX.barras[id] = { t0: tq, de: a.vida / (a.ref.stats.vidaMax || 1), para: b.vida / (a.ref.stats.vidaMax || 1) };
        }
        if (dv) add(b, id, `${dv > 0 ? '+' : ''}${dv}`, dv < 0 ? '#f87171' : COR.vida, true);
        if (da) add(b, id, `${da > 0 ? '+' : ''}${da} ARM`, COR.armadura);
        if (dm) add(b, id, `${dm > 0 ? '+' : ''}${dm} ◆`, COR.amago);
        if (plano) {
            VFX.mudancas(id, a, b, quando(id));
            const dr = b.renome - a.renome;
            if (dr > 0) add(b, id, `+${dr} ★`, '#facc15', true, chegada[id] ?? quando(id));
        }
    }
    if (plano) for (const e of plano.esquivas) {
        const p = agora.get(e.id) || antes.get(e.id);
        if (p) add(p, e.id, 'ESQUIVOU', '#e5e7eb', true, e.t);
    } else for (const l of novas > 0 ? state.log.slice(-Math.min(novas, state.log.length)) : []) {
        const m = /^Ataque em J(\d) (.+?)(?: \(rolagem manual\))?: .*ESQUIVA$/.exec(l);
        const p = m && state.pieces.find(x => x.player === Number(m[1]) && x.stats.nome === m[2]);
        if (p) add(p, p.id, 'ESQUIVOU', '#e5e7eb', true);
    }
    // Troca de turno: faixa "VEZ DO JOGADOR N" (e a rodada nova). Vitória: confete.
    const vez = VFX.chaveVez();
    if (plano && vez && VFX.vez && vez !== VFX.vez) {
        const [rd, pl] = vez.split(':').map(Number);
        VFX.faixa(Math.max(plano.base, VFX.ocupado - 150), rd, pl, rd !== Number(VFX.vez.split(':')[0]));
    }
    VFX.vez = vez;
    if (state && state.winner && VFX.vencedor !== state.winner) {
        VFX.vencedor = state.winner;
        if (plano) VFX.festa(Math.max(t, VFX.ocupado - 100));
    }
}
