let state = null;
let undoStack = [];
// Modo de jogo local escolhido no menu (CONFIG.modos, só os contra Bots). Online usa Rede.modo.
let modoEscolhido = CONFIG.modoLocalPadrao;
const equipesVazias = () => Object.fromEntries(Object.keys(CONFIG.players).map(j => [j, []]));
let teams = equipesVazias();
