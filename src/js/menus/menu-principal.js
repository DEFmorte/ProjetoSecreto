// Contra Bots (menu local): escolha do modo. Teclas 1/2 escolhem, D troca o nível; Enter repete o último modo.
function abrirMenuModo() {
    const box = $('modo-opcoes');
    box.innerHTML = '';
    if (!modosLocais().includes(modoEscolhido)) modoEscolhido = CONFIG.modoLocalPadrao;
    for (const id of modosLocais()) {
        const md = CONFIG.modos[id];
        const mapa = CONFIG.mapas[md.mapa];
        const b = document.createElement('button');
        b.dataset.modo = id;
        b.className = `pointer-events-auto menu-btn ${id === modoEscolhido ? 'primario' : ''}`;
        b.innerHTML = `<span class="text-left" style="min-width:0"><span class="block">${md.nome}</span><span style="white-space:normal" class="block text-[10px] font-semibold normal-case tracking-normal ${id === modoEscolhido ? 'text-blue-100' : 'text-gray-400'}">${md.desc} · mapa ${mapa.nome}</span></span><span class="kbd">${md.tecla || md.jogadores.length}${id === modoEscolhido ? ' · Enter' : ''}</span>`;
        b.addEventListener('click', () => escolherModo(id));
        box.appendChild(b);
    }
    { // nível dos Bots (vale para os dois modos), logo abaixo
        const n = document.createElement('div');
        n.className = 'bot-nivel'; n.id = 'bot-nivel';
        n.innerHTML = `<span>Nível dos Bots</span><span class="seg" role="group" aria-label="Nível dos Bots">${Object.entries(Bot.niveis).map(([k, nv]) =>
            `<button type="button" data-nivel="${k}" class="pointer-events-auto ${k}" title="${k === 'dificil' ? 'Pensa mais: testa as melhores jogadas prevendo a resposta do adversário' : 'Joga bem, mas às vezes escolhe uma jogada pior'}">${nv.nome}</button>`).join('')}</span><span class="kbd">D</span>`;
        n.querySelectorAll('button').forEach(x => x.addEventListener('click', () => escolherNivelBot(x.dataset.nivel)));
        box.appendChild(n);
    }
    escolherNivelBot(botNivelEscolhido);
    mostrarPainelMenu('modo-menu');
}
// Nível do Bot para as próximas partidas (lembrado no navegador); a partida guarda o seu em state.botNivel.
let botNivelEscolhido = (() => { try { const n = localStorage.getItem('testez_bot_nivel'); return Bot.niveis[n] ? n : Bot.nivelPadrao; } catch (e) { return Bot.nivelPadrao; } })();
function escolherNivelBot(n) {
    if (!Bot.niveis[n]) return;
    botNivelEscolhido = n;
    try { localStorage.setItem('testez_bot_nivel', n); } catch (e) { /* ignora */ }
    document.querySelectorAll('#bot-nivel button').forEach(x => x.classList.toggle('on', x.dataset.nivel === n));
}

function escolherModo(id) {
    if (!CONFIG.modos[id] || (!Rede.ativo() && !modosLocais().includes(id))) return;
    modoEscolhido = id;
    teams = equipesVazias();
    selectedColorsForMenu = [];
    currentSelectingPlayer = CONFIG.modos[id].jogadores[0];
    goToSelection();
}

function goToSelection() {
    mostrarPainelMenu('selection-menu');
    renderSelectionTitle();
    updateSelectionUI();
}

// Voltar na seleção: jogador N → jogador anterior (com a equipe escolhida), Jogador 1 → escolha de jogadores.
function voltarSelecao() {
    if (Rede.ativo()) { showMenu(); return; } // online: sair da sala
    const jog = jogadoresDoModo(), anterior = jog[jog.indexOf(currentSelectingPlayer) - 1];
    if (anterior) {
        currentSelectingPlayer = anterior;
        selectedColorsForMenu = [...teams[anterior]];
        teams[anterior] = [];
        renderSelectionTitle();
        updateSelectionUI();
        return;
    }
    selectedColorsForMenu = [];
    abrirMenuModo();
}

function confirmTeam() {
    if (selectedColorsForMenu.length !== CONFIG.teamSize) return;
    if (Rede.ativo()) {
        if (teams[Rede.eu].length) return;
        teams[Rede.eu] = [...selectedColorsForMenu];
        updateSelectionUI();
        $('selection-hint').innerText = dicaEquipeConfirmada();
        if (Rede.papel === 'convidado') { Rede.enviar({ t: 'equipe', cores: teams[Rede.eu] }); Rede.atualizarStatus(); }
        else { Rede.atualizarSala(); Rede.tentarIniciar(); }
        return;
    }
    const jog = jogadoresDoModo(), proximo = jog[jog.indexOf(currentSelectingPlayer) + 1];
    teams[currentSelectingPlayer] = [...selectedColorsForMenu];
    if (proximo) {
        selectedColorsForMenu = [];
        currentSelectingPlayer = proximo;
        renderSelectionTitle();
        updateSelectionUI();
    } else startGame();
}

function showMenu() {
    salvarPartida(); // não perde a última jogada (o salvamento é adiado alguns ms)
    if (Rede.ativo()) Rede.encerrar();
    sairDaPartida('main-menu');
    atualizarBotaoContinuar();
}

// Fecha a partida e volta à tela de menus (sem desconectar). painel null: quem chamou escolhe o painel.
function sairDaPartida(painel = 'main-menu') {
    stopLoop();
    gameRunning = false;
    state = null;
    undoStack = [];
    teams = equipesVazias();
    selectedColorsForMenu = [];
    currentSelectingPlayer = 1;
    clearSelection();
    ui.vis = null; ui.floats = []; ui.anims = {}; ui.previewId = null; ui.vitoriaVista = null;
    Tutorial.parar();
    Bot.encerrarPartida();
    Sorteio.fechar(false);
    fecharPausa();
    fecharAjuda(false);

    ['turn-banner', 'action-bar', 'initiative-bar', 'log-panel', 'prompt-bar', 'ability-bar', 'ability-tip']
        .forEach(id => $(id).classList.add('hidden'));
    if (painel) mostrarPainelMenu(painel);

    const menu = $('menu-screen');
    menu.style.display = 'flex';
    void menu.offsetWidth;
    menu.classList.remove('hidden-menu');
    ctx.clearRect(0, 0, view.width, view.height);
}
