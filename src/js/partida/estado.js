// ── Estado da partida ──
// Variáveis que vários módulos leem. Quem importa uma variável só pode lê-la (imports são só leitura); para trocar o
// valor, use a função definirX correspondente (ex.: definirState(novoEstado)).
import { CONFIG } from '../motor/config.js';

// Estado completo da partida em andamento (null fora de partida). Ver newState() em partida.js.
export let state = null;
export function definirState(valor) { state = valor; return valor; }

// Pilha de estados anteriores (JSON) para desfazer jogadas.
export let undoStack = [];
export function definirUndoStack(valor) { undoStack = valor; return valor; }

// Modo de jogo local escolhido no menu (CONFIG.modos, só os contra Bots). Online usa Rede.modo.
export let modoEscolhido = CONFIG.modoLocalPadrao;
export function definirModoEscolhido(valor) { modoEscolhido = valor; return valor; }

// Equipes escolhidas na seleção: { jogador: [cores das Estrelas] }.
export const equipesVazias = () => Object.fromEntries(Object.keys(CONFIG.players).map(j => [j, []]));
export let teams = equipesVazias();
export function definirTeams(valor) { teams = valor; return valor; }
