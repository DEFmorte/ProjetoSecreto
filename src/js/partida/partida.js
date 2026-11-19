// ── Criação e fim de partida ──
// Estado inicial (newState), modo atual, "Jogar de novo" e "Nova partida".
import { CONFIG } from '../motor/config.js';
import { modoEscolhido, state, teams } from './estado.js';
import { Tutorial } from '../menus/tutorial.js';
import { Bot } from '../bot/bot.js';
import { Rede } from '../online/rede.js';
import { botNivelEscolhido, escolherModo, sairDaPartida } from '../menus/menu-principal.js';
import { aplicarMapa } from '../render/tela.js';
import { beginMatch } from './sorteio.js';
import { abrirPausa, fecharPausa, pausaAberta } from '../menus/pausa.js';
import { Partida } from '../motor/partida.js';

// "Jogar de novo": local ou anfitrião recomeça; o convidado pede ao anfitrião.
// "Nova partida" (fim de jogo): mesma sala/modo, todos escolhem novas Estrelas.
export const OPCOES_VOTO = { revanche: 'Revanche', nova: 'Nova partida' };

// Tela de fim de partida aberta: redesenha (votos mudaram).
export function atualizarFimDePartida() {
    if (pausaAberta() && state && state.winner) abrirPausa(true);
}

export function novaPartida() {
    if (!state || !state.winner) return;
    if (Rede.ativo()) {
        Rede.votar('nova');
        return;
    }
    const modo = state.modo || modoAtual();
    sairDaPartida(null);
    escolherModo(modo);
}

export function jogarDeNovo() {
    if (Rede.ativo()) {
        Rede.votar('revanche');
        return;
    }
    fecharPausa();
    beginMatch();
}

export function modoAtual() {
    return Rede.ativo()
        ? CONFIG.modos[Rede.modo]
            ? Rede.modo
            : CONFIG.modoPadrao
        : CONFIG.modos[modoEscolhido]
          ? modoEscolhido
          : CONFIG.modoLocalPadrao;
}
export function jogadoresDoModo() {
    return CONFIG.modos[modoAtual()].jogadores;
}
// Jogadores controlados pelo computador no modo ([] = só pessoas).
export function botsDoModo(modo) {
    const md = CONFIG.modos[modo];
    return md && Array.isArray(md.bots) ? md.bots : [];
}
// Modos do menu local (contra Bots); os outros são só online.
export const modosLocais = () => Object.keys(CONFIG.modos).filter((id) => !CONFIG.modos[id].soOnline);

export function newState() {
    const modo = modoAtual(),
        def = CONFIG.modos[modo],
        bots = Rede.ativo() ? [] : botsDoModo(modo);
    aplicarMapa(def.mapa);
    Bot.rotulos(Rede.ativo() ? null : modo);
    const botNivel = bots.length ? (Tutorial.partida ? 'normal' : botNivelEscolhido) : null;
    return Partida.criar({
        modo,
        equipes: Object.fromEntries(def.jogadores.map((j) => [j, teams[j] || []])),
        // A partida guiada começa sempre por você.
        ordem: Tutorial.partida ? [...def.jogadores] : null,
        botNivel,
        mensagem:
            def.jogadores.length > 2 || bots.length
                ? `Partida iniciada · ${def.nome} (${def.desc.toLowerCase()})${bots.length ? ` · nível ${Bot.niveis[botNivel].nome}` : ''}`
                : 'Partida iniciada',
    });
}

export function snapshot() {
    return JSON.stringify(state);
}
