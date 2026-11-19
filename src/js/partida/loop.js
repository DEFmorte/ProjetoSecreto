let gameRunning = false;
let loopHandle = null;

function stopLoop() {
    if (loopHandle) cancelAnimationFrame(loopHandle);
    loopHandle = null;
}

function startLoop() {
    stopLoop();
    loopHandle = requestAnimationFrame(gameLoop);
}

function startGame(estadoJson = null, desfazer = null) {
    const menu = $('menu-screen');
    menu.classList.add('hidden-menu');
    setTimeout(() => {
        menu.style.display = 'none';
        $('turn-banner').classList.remove('hidden');
        $('action-bar').classList.remove('hidden');
        $('initiative-bar').classList.remove('hidden');
        beginMatch(estadoJson, desfazer);
    }, 500);
}
