import { CONFIG } from './config.js';
import { Engine } from './engine.js';

export const Rules = {
    DIRS: [{ q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }],

    // Mapa ativo (CONFIG.mapas). Trocar de mapa limpa os caches de zonas e distâncias.
    mapa: null,
    usarMapa(id) {
        const m = CONFIG.mapas[id] || CONFIG.mapas.classico;
        if (Rules.mapa === m) return;
        Rules.mapa = m;
        Rules._zonaSet = Rules._zonas = Rules._dist = null;
    },
    zonaSet() {
        if (!Rules._zonaSet) {
            const m = Rules.mapa || (Rules.usarMapa('classico'), Rules.mapa), set = new Set();
            if (m.zonas) m.zonas.forEach(z => set.add(`${z.q},${z.r}`));
            else {
                const R = m.raio, buracos = new Set((m.semZona || []).map(z => `${z.q},${z.r}`));
                for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++)
                    if (Math.abs(-q - r) <= R && !buracos.has(`${q},${r}`)) set.add(`${q},${r}`);
            }
            Rules._zonaSet = set;
        }
        return Rules._zonaSet;
    },
    spawn(player, i) { return ((Rules.mapa || CONFIG.mapas.classico).spawns[player] || [])[i] || { q: 0, r: 0 }; },

    isHexOnBoard(q, r) {
        return Rules.zonaSet().has(`${q},${r}`);
    },

    // Distância geométrica (vizinhança, linhas). Para alcance use Rules.distancia.
    hexDistance(a, b) {
        return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
    },

    // Todas as zonas existentes do tabuleiro (sem os buracos).
    zonas() {
        if (!Rules._zonas) Rules._zonas = [...Rules.zonaSet()].map(k => { const [q, r] = k.split(',').map(Number); return { q, r }; });
        return Rules._zonas;
    },

    // Distância de ALCANCE: menor número de passos andando só por zonas existentes
    // (dá a volta nos buracos, como o movimento). Estrelas não bloqueiam o alcance.
    distancia(a, b) {
        if (!Rules._dist) {
            Rules._dist = new Map();
            for (const z of Rules.zonas()) {
                const d = new Map([[`${z.q},${z.r}`, 0]]), fila = [z];
                for (let i = 0; i < fila.length; i++) {
                    const h = fila[i], k = d.get(`${h.q},${h.r}`) + 1;
                    for (const n of Rules.neighbors(h.q, h.r)) {
                        const key = `${n.q},${n.r}`;
                        if (!d.has(key) && Rules.isHexOnBoard(n.q, n.r)) { d.set(key, k); fila.push(n); }
                    }
                }
                Rules._dist.set(`${z.q},${z.r}`, d);
            }
        }
        const d = Rules._dist.get(`${a.q},${a.r}`);
        return (d && d.get(`${b.q},${b.r}`)) ?? Infinity;
    },

    neighbors(q, r) {
        return Rules.DIRS.map(d => ({ q: q + d.q, r: r + d.r }));
    },

    pieceAt(state, q, r) {
        return state.pieces.find(p => p.q === q && p.r === r);
    },

    pieceById(state, id) {
        return state.pieces.find(p => p.id === id) || null;
    },

    // 'primarios' | 'secundarios' | chave | lista → lista de chaves de status.
    expandStats(spec) {
        if (Array.isArray(spec)) return spec.flatMap(k => Rules.expandStats(k));
        return CONFIG.stats[spec] && spec !== 'internos' ? [...CONFIG.stats[spec]] : [spec];
    },
    categoriaStat(key) {
        return ['primarios', 'secundarios', 'internos'].find(c => CONFIG.stats[c].includes(key)) || null;
    },

    stat(piece, key) {
        let v = piece.stats[key] || 0;
        for (const e of piece.effects || []) if (e.stat === key) v += e.delta;
        return Math.max(0, v);
    },

    // Índice da direção em que b está, em linha reta, a partir de a (-1 se não estiver alinhado).
    directionTo(a, b) {
        const k = Rules.hexDistance(a, b);
        if (k === 0) return -1;
        return Rules.DIRS.findIndex(d => a.q + d.q * k === b.q && a.r + d.r * k === b.r);
    },

    // Quantos trechos em linha reta com pelo menos `min` zonas existem em um caminho (lista de zonas).
    straightRuns(path, min) {
        let runs = 0, len = 0, dir = -1;
        for (let i = 1; i < (path || []).length; i++) {
            const step = Rules.hexDistance(path[i - 1], path[i]) === 1 ? Rules.directionTo(path[i - 1], path[i]) : -1;
            if (step !== -1 && step === dir) len++;
            else { if (len >= min) runs++; len = step === -1 ? 0 : 1; }
            dir = step;
        }
        return runs + (len >= min ? 1 : 0);
    },

    // Contador de turnos de cada jogador (incrementa no início do turno dele).
    turnoAtual(state, player) {
        return (state.turnos && state.turnos[player]) || 0;
    },

    registrarDano(state, source, target) {
        const k = Rules.turnoAtual(state, source.player);
        const reg = source.registroDano = source.registroDano || {};
        Object.keys(reg).forEach(key => { if (+key < k - 1) delete reg[key]; });
        reg[k] = reg[k] || [];
        if (!reg[k].includes(target.id)) reg[k].push(target.id);
    },

    // source causou dano a target no turno (do jogador de source) atual + offset? (offset -1 = turno anterior)
    feriuNoTurno(state, source, target, offset = 0) {
        const reg = source.registroDano || {};
        return !!target && (reg[Rules.turnoAtual(state, source.player) + offset] || []).includes(target.id);
    },

    marks(piece, markId) {
        return (piece.effects || []).filter(e => e.tipo === 'marca' && (!markId || e.marca === markId)).length;
    },

    reachableHexes(state, piece) {
        const maxDist = Rules.movementLeft(piece);
        const visited = new Set([`${piece.q},${piece.r}`]);
        const queue = [{ q: piece.q, r: piece.r, dist: 0 }];
        let head = 0;
        const reachable = [{ q: piece.q, r: piece.r }];

        while (head < queue.length) {
            const cur = queue[head++];
            if (cur.dist >= maxDist) continue;
            for (const n of Rules.neighbors(cur.q, cur.r)) {
                const key = `${n.q},${n.r}`;
                if (visited.has(key) || !Rules.isHexOnBoard(n.q, n.r)) continue;
                if (CONFIG.rules.piecesBlockMovement && Rules.pieceAt(state, n.q, n.r)) continue;
                visited.add(key);
                reachable.push({ q: n.q, r: n.r });
                queue.push({ q: n.q, r: n.r, dist: cur.dist + 1 });
            }
        }
        return reachable;
    },

    canExtendPath(state, piece, path, hex) {
        const last = path[path.length - 1];
        if (!last || Rules.hexDistance(last, hex) !== 1) return false;
        if (!Rules.isHexOnBoard(hex.q, hex.r)) return false;
        if (CONFIG.rules.piecesBlockMovement && Rules.pieceAt(state, hex.q, hex.r)) return false;
        return path.length - 1 < Rules.movementLeft(piece);
    },

    movementLeft(piece) {
        if (piece.turn && piece.turn.movimentoZerado) return 0; // ex.: Compelir
        const spent = piece.turn ? piece.turn.moveSpent : 0;
        return Math.max(0, CONFIG.rules.movementRange(piece) - spent);
    },

    makeStats(color) {
        const { habilidades, ...base } = CONFIG.estrelas[color];
        return { ...base, vidaMax: base.vida, amagoMax: base.amago, armaduraMax: base.armadura };
    },

    // equipes: { jogador: [cores] } (ou duas listas: createPieces(j1, j2)). Posições iniciais vêm do mapa ativo.
    createPieces(equipes, p2Colors) {
        const pieces = [];
        let id = 1;
        const teams = Array.isArray(equipes) ? { 1: equipes, 2: p2Colors || [] } : equipes;
        for (const player of Object.keys(teams).map(Number).sort((a, b) => a - b)) {
            (teams[player] || []).forEach((color, i) => {
                const spawn = Rules.spawn(player, i);
                pieces.push({
                    id: id++, player, color,
                    q: spawn.q, r: spawn.r,
                    stats: Rules.makeStats(color),
                    habilidades: [...(CONFIG.estrelas[color].habilidades || [])],
                    ...(CONFIG.estrelas[color].recursos ? { recursos: { ...CONFIG.estrelas[color].recursos } } : {}),
                    ...(CONFIG.estrelas[color].objetos ? { objetos: Object.fromEntries(CONFIG.estrelas[color].objetos.map(o => [o, null])) } : {}),
                    effects: [],
                    renome: 0,
                    turn: null
                });
            });
        }
        return pieces;
    },

    buildInitiativeOrder(state) {
        const cfg = CONFIG.rules.initiative;
        const jog = state.jogadores || [1, 2];
        const firstPlayer = cfg.alternateOnTie ? jog[(state.round - 1) % jog.length] : jog[0];
        const sorteada = Array.isArray(state.ordem) && state.ordem.length ? state.ordem : null; // ordem sorteada no início
        const ordem = p => sorteada ? sorteada.indexOf(p) : (jog.indexOf(p) - jog.indexOf(firstPlayer) + jog.length) % jog.length; // empate: ordem sorteada (antigas: gira quem vem primeiro)
        return state.pieces
            .filter(p => CONFIG.rules.isAlive(p))
            .sort((a, b) => {
                for (const key of [cfg.stat, ...cfg.tieBreakStats]) {
                    const va = Rules.stat(a, key), vb = Rules.stat(b, key);
                    if (va !== vb) return vb - va;
                }
                if (a.player !== b.player) return ordem(a.player) - ordem(b.player);
                return a.id - b.id;
            })
            .map(p => p.id);
    },

    buildBlocks(state) {
        if (CONFIG.rules.turnMode !== 'initiative') {
            const jog = state.jogadores || [1, 2], k = Math.max(0, jog.indexOf(CONFIG.rules.startingPlayer));
            // Ordem sorteada no início (state.ordem); partidas antigas: ciclo fixo 1 → 2 (→ 3) a cada rodada.
            const order = Array.isArray(state.ordem) && state.ordem.length ? state.ordem.filter(pl => jog.includes(pl))
                : [...jog.slice(k), ...jog.slice(0, k)];
            return order
                .map(pl => ({ player: pl, ids: state.pieces.filter(p => p.player === pl && CONFIG.rules.isAlive(p)).map(p => p.id) }))
                .filter(b => b.ids.length > 0);
        }
        const blocks = [];
        for (const id of Rules.buildInitiativeOrder(state)) {
            const p = Rules.pieceById(state, id);
            const last = blocks[blocks.length - 1];
            if (last && last.player === p.player) last.ids.push(id);
            else blocks.push({ player: p.player, ids: [id] });
        }
        return blocks;
    },

    startRound(state) {
        state.pieces.forEach(p => {
            p.turn = { activated: false, done: false, moveSpent: 0, actionUsed: false, extra: null, usos: {} };
        });
        state.blocks = Rules.buildBlocks(state);
        state.blockIndex = 0;
        state.activeId = null;
    },

    initMatch(state) {
        if (!state.renome) state.renome = ((Rules.mapa || CONFIG.mapas.classico).renome || []).map(m => ({ q: m.q, r: m.r, valor: m.valor ?? 1 }));
        Rules.startRound(state);
        const first = state.blocks[0];
        if (first) Rules.iniciarTurno(state, first.player);
    },

    // Início do turno do jogador: expirações/recuperação e passivas 'inicioTurno'. true = espera uma escolha (state.pending).
    iniciarTurno(state, player) {
        Rules.fireTurnEvent(state, 'turnStart', player);
        Rules.contarRenomeExtra(state);
        if (Engine.gatilhosTurno(state, player, 'inicioTurno')) Engine.resolveQueue(state);
        return !!state.pending;
    },

    currentBlock(state) {
        return state.blocks[state.blockIndex] || null;
    },

    pendingIds(state) {
        const block = Rules.currentBlock(state);
        if (!block) return [];
        return block.ids.filter(id => {
            const p = Rules.pieceById(state, id);
            return p && !p.turn.done;
        });
    },

    activePiece(state) {
        return state.activeId != null ? Rules.pieceById(state, state.activeId) : null;
    },

    canSelect(state, piece) {
        if (state.winner || state.pending || !piece || !piece.turn || piece.turn.done) return false;
        const block = Rules.currentBlock(state);
        if (!block || !block.ids.includes(piece.id)) return false;
        return state.activeId == null || state.activeId === piece.id;
    },

    beginActivation(state, piece) {
        if (piece.turn.activated) return;
        piece.turn.activated = true;
        state.activeId = piece.id;
    },

    endActivation(state, piece) {
        if (piece.turn.done) return;
        Rules.beginActivation(state, piece);
        piece.turn.done = true;
        if (state.activeId === piece.id) state.activeId = null;
        for (const id of Object.keys(piece.objetos || {}))
            if ((CONFIG.objetos[id] || {}).recolheNoFim && Engine.objetoNaZonaDe(piece, id)) Engine.recolherObjeto(state, piece, id, 'fim da jogada');
        Engine.emit(state, 'fimAtivacao', { peca: piece });
        if (state.triggers && state.triggers.length) Engine.resolveQueue(state); // ex.: Chegada (escolha do aliado)
    },

    // Armadura temporária (escudos): camada consumida antes da armadura normal.
    armaduraExtra(piece) {
        return (piece.effects || []).filter(e => e.tipo === 'escudo').reduce((n, e) => n + e.restante, 0);
    },

    autoEndIfExhausted(state, piece) {
        const canAct = CONFIG.rules.hasUsableAction(state, piece);
        if (Rules.movementLeft(piece) <= 0 && !canAct) Rules.endActivation(state, piece);
    },

    turnBounds(state, player) {
        let first = -1, last = -1;
        state.blocks.forEach((b, i) => {
            if (b.player === player) { if (first < 0) first = i; last = i; }
        });
        return { first, last };
    },

    nextTurnRound(state, player) {
        const { first } = Rules.turnBounds(state, player);
        return (first >= 0 && state.blockIndex < first) ? state.round : state.round + 1;
    },

    fireTurnEvent(state, event, player) {
        state.pieces.forEach(p => {
            p.effects = (p.effects || []).filter(e => {
                if (!(e.expiraEvento === event && e.expiraJogador === player && state.round >= e.expiraRodada)) return true;
                if (e.travaArmadura) p.stats.armadura = Math.min(p.stats.armaduraMax, p.stats.armadura + (e.devolve || 0)); // conversão acabou: Armadura volta
                return false;
            });
        });
        if (event === 'turnStart') {
            if (state.log) {
                Engine.novoGrupoLog(state);
                Engine.log(state, `Rodada ${state.round} · Turno de ${CONFIG.players[player].label}`);
            }
            state.turnos = state.turnos || {};
            state.turnos[player] = (state.turnos[player] || 0) + 1;
            // Duração em turnos: reduzida no início do turno do jogador que aplicou o efeito.
            state.pieces.forEach(p => {
                p.effects = (p.effects || []).filter(e => {
                    if (e.turnosRestantes == null || e.contaJogador !== player) return true;
                    e.turnosRestantes--;
                    if (e.turnosRestantes > 0) return true;
                    if (state.log) Engine.log(state, `${Engine.label(p)}: ${e.origem} expirou`);
                    return false;
                });
            });
            const own = state.pieces.filter(p => p.player === player && CONFIG.rules.isAlive(p));
            own.forEach(p => CONFIG.rules.turnStart(p));
            if (own.length && state.log) {
                Engine.log(state, `${CONFIG.players[player].label}: Armadura restaurada e +${CONFIG.rules.amagoRegenPerTurn} Âmago`);
            }
        }
    },

    settle(state) {
        if (state.activeId != null && !Rules.pieceById(state, state.activeId)) state.activeId = null;
        let guard = 0;
        while (state.pieces.length && !state.pending && Rules.pendingIds(state).length === 0 && guard++ < 100) {
            const leaving = state.blocks[state.blockIndex];
            if (leaving && Rules.turnBounds(state, leaving.player).last === state.blockIndex) {
                // Passivas de fim de turno (ex.: Correção de Vitalidade): resolvidas uma vez; se pedirem escolha, a troca de turno espera.
                const chave = `${state.round}:${state.blockIndex}`;
                if (state.fimTurnoFeito !== chave) {
                    state.fimTurnoFeito = chave;
                    if (Engine.gatilhosTurno(state, leaving.player, 'fimTurno', `Fim do turno de ${CONFIG.players[leaving.player].label}`)) {
                        Engine.resolveQueue(state);
                        if (state.pending) return;
                    }
                }
                Rules.fireTurnEvent(state, 'turnEnd', leaving.player);
            }
            state.blockIndex++;
            if (state.blockIndex >= state.blocks.length) {
                state.round++;
                Rules.startRound(state);
            }
            const arriving = state.blocks[state.blockIndex];
            if (arriving && Rules.turnBounds(state, arriving.player).first === state.blockIndex) {
                if (Rules.iniciarTurno(state, arriving.player)) return;
            }
        }
    },

    // ignoraArmadura (Sentença): o dano vai direto para a Vida; a Armadura (e a extra) fica intacta.
    applyDamage(piece, amount, ignoraArmadura = false) {
        const s = piece.stats;
        let dmg = Math.max(0, amount), absorbed = 0;
        for (const e of ignoraArmadura ? [] : (piece.effects || []).filter(e => e.tipo === 'escudo')) {
            const a = Math.min(e.restante, dmg);
            e.restante -= a; dmg -= a; absorbed += a;
        }
        if (piece.effects) piece.effects = piece.effects.filter(e => e.tipo !== 'escudo' || e.restante > 0);
        const fromArmor = ignoraArmadura ? 0 : Math.min(s.armadura, dmg);
        s.armadura -= fromArmor;
        absorbed += fromArmor;
        dmg -= fromArmor;
        const lifeLost = Math.min(s.vida, dmg);
        s.vida -= lifeLost;
        return { absorbed, lifeLost };
    },

    heal(piece, amount) {
        piece.stats.vida = Math.min(piece.stats.vidaMax, piece.stats.vida + Math.max(0, amount));
    },

    restoreAmago(piece, amount) {
        piece.stats.amago = Math.min(piece.stats.amagoMax, piece.stats.amago + Math.max(0, amount));
    },

    spendAmago(piece, cost) {
        if (piece.stats.amago < cost) return false;
        piece.stats.amago -= cost;
        return true;
    },

    // ── Renome ──
    renomeEm(state, q, r) { return (state.renome || []).find(m => m.q === q && m.r === r) || null; },
    renomeTime(state, player) { return state.pieces.filter(p => p.player === player).reduce((n, p) => n + (p.renome || 0), 0); },
    // Coloca Renome no tabuleiro (soma com um marcador já existente na mesma zona).
    soltarRenome(state, q, r, valor) {
        if (valor <= 0) return;
        state.renome = state.renome || [];
        const m = Rules.renomeEm(state, q, r);
        if (m) m.valor += valor; else state.renome.push({ q, r, valor });
    },
    // Chamado sempre que alguém ganha Renome: registra o primeiro time a atingir a meta (vitória instantânea).
    // Renome para vencer na partida (depende do modo: CONFIG.modos[modo].metaRenome).
    metaRenome(state) {
        const md = state && CONFIG.modos[state.modo];
        return md && md.metaRenome !== undefined ? md.metaRenome : CONFIG.renome.metaVitoria;
    },
    // Texto das metas para a ajuda: "3" ou "3 (5 com 3 jogadores)".
    textoMetaRenome() {
        const por = {};
        for (const [id, md] of Object.entries(CONFIG.modos)) { const m = Rules.metaRenome({ modo: id }); if (m) (por[m] = por[m] || []).push(md.jogadores.length); }
        const metas = Object.keys(por).map(Number);
        if (metas.length <= 1) return metas.length ? `${metas[0]}` : '';
        const principal = Rules.metaRenome({ modo: CONFIG.modoPadrao });
        return `${principal} (${metas.filter(m => m !== principal).map(m => `${m} com ${[...new Set(por[m])].join('/')} jogadores`).join(', ')})`;
    },
    checarMetaRenome(state, player) {
        const meta = Rules.metaRenome(state);
        if (!meta || state.vencedorRenome || state.winner) return;
        if (Rules.renomeTime(state, player) >= meta) {
            state.vencedorRenome = player;
            Engine.log(state, `${CONFIG.players[player].label} alcança ${meta} de Renome!`);
        }
    },

    // ── Renome extra (desempate) ── state.renomeExtra = { faltam (rodadas), rodada (última contada) } enquanto a contagem está ativa (ver CONFIG.renome.extra).
    renomeExtraAtivo(state) {
        const cfg = CONFIG.renome.extra;
        return !!cfg && (state.jogadores || [1, 2]).some(pl => {
            const n = state.pieces.filter(p => p.player === pl && CONFIG.rules.isAlive(p)).length;
            return n > 0 && n <= cfg.quandoEquipeCom;
        });
    },
    // Chamado no início de cada turno: inicia, avança (uma vez por rodada, no 1º turno dela) ou encerra a contagem;
    // ao chegar a 0, sorteia o novo marcador.
    contarRenomeExtra(state) {
        const cfg = CONFIG.renome.extra;
        if (!cfg || state.winner || state.vencedorRenome || !Rules.renomeExtraAtivo(state)) { state.renomeExtra = null; return; }
        const n = Math.max(1, cfg.rodadas || 5), txt = k => `${k} ${k === 1 ? 'rodada' : 'rodadas'}`;
        if (!state.renomeExtra) {
            state.renomeExtra = { faltam: n, rodada: state.round };
            Engine.log(state, `Uma equipe ficou com só ${cfg.quandoEquipeCom === 1 ? '1 Estrela' : `${cfg.quandoEquipeCom} Estrelas`}: em ${txt(n)} surge um novo Renome`);
            return;
        }
        if (state.renomeExtra.rodada === state.round) return;
        state.renomeExtra.rodada = state.round;
        if (--state.renomeExtra.faltam > 0) return;
        state.renomeExtra.faltam = n;
        const z = Rules.sortearZonaRenome(state);
        if (!z) return;
        Rules.soltarRenome(state, z.q, z.r, cfg.valor);
        state.renomeExtra.ultimo = { q: z.q, r: z.r, rodada: state.round, bloco: state.blockIndex }; // destacado durante este turno
        Engine.log(state, `Novo Renome (${cfg.valor}) surge em (${z.q}, ${z.r}); o próximo em ${txt(n)}`);
    },
    sortearZonaRenome(state) {
        const vazias = Rules.zonas().filter(z => !Rules.pieceAt(state, z.q, z.r) && !Rules.renomeEm(state, z.q, z.r));
        const longe = vazias.filter(z => state.pieces.every(p => Rules.distancia(p, z) >= 2));
        const op = longe.length ? longe : vazias;
        return op.length ? op[Math.floor(Engine.rng() * op.length)] : null;
    },

    podeColetar(state, piece) {
        return !!(piece && piece.turn && !piece.turn.actionUsed && Rules.canSelect(state, piece) && Rules.renomeEm(state, piece.q, piece.r));
    },
    coletarRenome(state, piece) {
        if (!Rules.podeColetar(state, piece)) return false;
        const m = Rules.renomeEm(state, piece.q, piece.r);
        Rules.beginActivation(state, piece);
        Engine.novoGrupoLog(state);
        piece.turn.actionUsed = true;
        state.renome = state.renome.filter(x => x !== m);
        piece.renome = (piece.renome || 0) + m.valor;
        Engine.log(state, `${Engine.label(piece)} coleta ${m.valor} Renome (total ${piece.renome})`);
        Engine.fx(state, { k: 'renome', id: piece.id, v: m.valor });
        Rules.checarMetaRenome(state, piece.player);
        Engine.emit(state, 'coletouRenome', { peca: piece, valor: m.valor });
        return true;
    },

    removeDead(state) {
        const dead = state.pieces.filter(p => !CONFIG.rules.isAlive(p));
        // Renome que ninguém recebeu (derrota sem autor) cai no tabuleiro.
        for (const p of dead) if (p.renome > 0) {
            Rules.soltarRenome(state, p.q, p.r, p.renome);
            Engine.log(state, `${p.renome} Renome de ${Engine.label(p)} cai em (${p.q}, ${p.r})`);
            p.renome = 0;
        }
        state.pieces = state.pieces.filter(p => CONFIG.rules.isAlive(p));
        return dead;
    }
};
