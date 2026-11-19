// ── Motor do jogo (regras + Estrelas), sem nada de tela ──
// Ponto de entrada para quem precisa do jogo "puro": o Worker do Bot, os testes e o simulador.
// Importar este arquivo garante que as Estrelas já estão registradas no CONFIG.
export { CONFIG } from './config.js';
import '../estrelas/index.js';
export { Rules } from './regras.js';
export { Engine } from './engine.js';
export { Partida } from './partida.js';
