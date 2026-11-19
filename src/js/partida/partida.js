// "Jogar de novo": local ou anfitrião recomeça; o convidado pede ao anfitrião.
// "Nova partida" (fim de jogo): mesma sala/modo, todos escolhem novas Estrelas.
const OPCOES_VOTO = { revanche: 'Revanche', nova: 'Nova partida' };

// Tela de fim de partida aberta: redesenha (votos mudaram).
function atualizarFimDePartida() { if (pausaAberta() && state && state.winner) abrirPausa(true); }

function novaPartida() {
    if (!state || !state.winner) return;
    if (Rede.ativo()) { Rede.votar('nova'); return; }
    const modo = state.modo || modoAtual();
    sairDaPartida(null);
    escolherModo(modo);
}

function jogarDeNovo() {
    if (Rede.ativo()) { Rede.votar('revanche'); return; }
    fecharPausa();
    beginMatch();
}

function modoAtual() { return Rede.ativo() ? (CONFIG.modos[Rede.modo] ? Rede.modo : CONFIG.modoPadrao) : (CONFIG.modos[modoEscolhido] ? modoEscolhido : CONFIG.modoLocalPadrao); }
function jogadoresDoModo() { return CONFIG.modos[modoAtual()].jogadores; }
// Jogadores controlados pelo computador no modo ([] = só pessoas).
function botsDoModo(modo) { const md = CONFIG.modos[modo]; return md && Array.isArray(md.bots) ? md.bots : []; }
// Modos do menu local (contra Bots); os outros são só online.
const modosLocais = () => Object.keys(CONFIG.modos).filter(id => !CONFIG.modos[id].soOnline);

function newState() {
    const modo = modoAtual(), def = CONFIG.modos[modo], bots = Rede.ativo() ? [] : botsDoModo(modo);
    aplicarMapa(def.mapa);
    Bot.rotulos(Rede.ativo() ? null : modo);
    const s = {
        modo, mapa: def.mapa, jogadores: [...def.jogadores],
        pieces: Rules.createPieces(Object.fromEntries(def.jogadores.map(j => [j, teams[j] || []]))),
        round: 1,
        blocks: [],
        blockIndex: 0,
        activeId: null,
        pending: null,
        triggers: [],
        efeitoPendente: null,
        fx: [], fxN: 0, // eventos para os efeitos visuais (ver Engine.fx)
        log: [def.jogadores.length > 2 || bots.length ? `Partida iniciada · ${def.nome} (${def.desc.toLowerCase()})${bots.length ? ` · nível ${Bot.niveis[Tutorial.partida ? 'normal' : botNivelEscolhido].nome}` : ''}` : 'Partida iniciada'],
        winner: null
    };
    if (bots.length) s.botNivel = Tutorial.partida ? 'normal' : botNivelEscolhido;
    // Ordem dos turnos sorteada antes da partida (vale a partida toda). A partida guiada começa sempre por você.
    s.ordem = Tutorial.partida ? [...def.jogadores] : Sorteio.sortear(def.jogadores);
    s.log.push(`Sorteio da ordem: ${s.ordem.map((j, i) => `${i + 1}º ${CONFIG.players[j].label}`).join(', ')}`);
    Rules.initMatch(s);
    return s;
}

function snapshot() { return JSON.stringify(state); }
