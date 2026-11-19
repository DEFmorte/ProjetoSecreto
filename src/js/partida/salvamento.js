// ── Salvamento automático (só partidas locais) ──
// A cada mudança, guarda a partida (com as últimas jogadas para desfazer) no navegador. Ao abrir o jogo de novo,
// o menu oferece "Continuar partida". A partida terminada (ou online) não fica salva.
import { $ } from '../nucleo/dom.js';
import { CONFIG } from '../motor/config.js';
import { Rules } from '../motor/regras.js';
import { definirModoEscolhido, definirTeams, equipesVazias, state, teams, undoStack } from './estado.js';
import { Tutorial } from '../menus/tutorial.js';
import { Bot } from '../bot/bot.js';
import { Rede } from '../online/rede.js';
import { botsDoModo, modosLocais, snapshot } from './partida.js';
import { gameRunning, startGame } from './loop.js';

const SALVAR = { chave: 'testez_partida', versao: 1, desfazer: 10, espera: 300 };
let salvarTimer = null;
export function agendarSalvamento() {
    clearTimeout(salvarTimer);
    salvarTimer = setTimeout(salvarPartida, SALVAR.espera);
}
export function salvarPartida() {
    clearTimeout(salvarTimer); salvarTimer = null;
    if (!gameRunning || !state || Rede.ativo() || Tutorial.partida) return; // a partida guiada não é salva
    try {
        if (state.winner) { localStorage.removeItem(SALVAR.chave); return; }
        localStorage.setItem(SALVAR.chave, JSON.stringify({
            v: SALVAR.versao, salvoEm: Date.now(), equipes: teams,
            estado: snapshot(), desfazer: undoStack.slice(-SALVAR.desfazer)
        }));
    } catch (e) { /* armazenamento cheio ou bloqueado: segue sem salvar */ }
}
function apagarPartidaSalva() { try { localStorage.removeItem(SALVAR.chave); } catch (e) { /* ignora */ } }
// Lê e confere a partida salva; se estiver corrompida ou for de uma versão com outras Estrelas/habilidades, descarta.
function lerPartidaSalva() {
    let raw = null;
    try { raw = localStorage.getItem(SALVAR.chave); } catch (e) { return null; }
    if (!raw) return null;
    try {
        const d = JSON.parse(raw), s = JSON.parse(d.estado);
        if (s.mapa && !CONFIG.mapas[s.mapa]) throw new Error('mapa inexistente');
        const equipesOk = (s.jogadores || [1, 2]).every(j => Array.isArray(d.equipes && d.equipes[j]) && d.equipes[j].every(c => CONFIG.estrelas[c]));
        const pecasOk = Array.isArray(s.pieces) && s.pieces.every(p => CONFIG.estrelas[p.color] && CONFIG.players[p.player]
            && (p.habilidades || []).every(id => CONFIG.abilities[id]) && Array.isArray(p.effects));
        if (d.v !== SALVAR.versao || s.winner || !modosLocais().includes(s.modo) || !Array.isArray(s.blocks) || !equipesOk || !pecasOk) throw new Error('save inválido');
        Rules.activePiece(s); Rules.pendingIds(s); // estado utilizável?
        return { salvoEm: d.salvoEm, equipes: d.equipes, estado: d.estado, rodada: s.round, modo: s.modo, botNivel: s.botNivel, desfazer: Array.isArray(d.desfazer) ? d.desfazer : [] };
    } catch (e) {
        apagarPartidaSalva();
        return null;
    }
}
function tempoDesde(ms) {
    const min = Math.round((Date.now() - ms) / 60000);
    if (min < 1) return 'agora mesmo';
    if (min < 60) return `há ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.round(h / 24);
    return `há ${d} dia${d > 1 ? 's' : ''}`;
}
export function atualizarBotaoContinuar() {
    const save = lerPartidaSalva();
    $('btn-continuar').classList.toggle('hidden', !save);
    if (save) $('continuar-info').textContent = `${botsDoModo(save.modo).length ? `${CONFIG.modos[save.modo].nome} (${Bot.nivel({ botNivel: save.botNivel }).nome}) · ` : ''}Rodada ${save.rodada} · salva ${tempoDesde(save.salvoEm)}`;
}
export function continuarPartida() {
    const save = lerPartidaSalva();
    if (!save) { atualizarBotaoContinuar(); return; }
    definirTeams(equipesVazias());
    for (const [j, cores] of Object.entries(save.equipes)) if (Array.isArray(cores)) teams[j] = [...cores];
    const s = JSON.parse(save.estado);
    definirModoEscolhido(CONFIG.modos[s.modo] ? s.modo : CONFIG.modoLocalPadrao);
    startGame(save.estado, save.desfazer);
}

// Executado uma vez na inicialização do jogo (main.js), na ordem certa em relação aos outros módulos.
export function iniciarSalvamento() {
window.addEventListener('pagehide', salvarPartida);
}
