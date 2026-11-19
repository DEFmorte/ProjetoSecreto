// ── Laço de desenho e início da partida ──
// gameRunning, startLoop/stopLoop (requestAnimationFrame) e startGame (fecha o menu e começa).
import { $ } from '../nucleo/dom.js';
import { beginMatch } from './sorteio.js';
import { gameLoop } from '../render/cena.js';

export let gameRunning = false;
export function definirGameRunning(valor) {
    gameRunning = valor;
    return valor;
} // para outros módulos trocarem "gameRunning"
export let loopHandle = null;
export function definirLoopHandle(valor) {
    loopHandle = valor;
    return valor;
} // para outros módulos trocarem "loopHandle"

export function stopLoop() {
    if (loopHandle) cancelAnimationFrame(loopHandle);
    loopHandle = null;
}

export function startLoop() {
    stopLoop();
    loopHandle = requestAnimationFrame(gameLoop);
}

export function startGame(estadoJson = null, desfazer = null) {
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
