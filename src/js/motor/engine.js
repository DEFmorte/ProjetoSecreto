import { CONFIG } from './config.js';
import { Rules } from './regras.js';

export const Engine = {
    rng: Math.random,

    def(id) { return CONFIG.abilities[id] || null; },

    abilitiesOf(piece) {
        return (piece.habilidades || []).map(id => CONFIG.abilities[id]).filter(Boolean);
    },

    isAlive(p) { return CONFIG.rules.isAlive(p); },

    label(p) { return p ? `J${p.player} ${p.stats.nome}` : 'Efeito externo'; },

    // state.log: linhas (texto). Os acontecimentos (uma ação e tudo o que ela causou) começam nos índices absolutos de
    // state.logGrupos; state.logTotal conta as linhas já registradas (as mais antigas saem após CONFIG.logMax).
    log(state, text) {
        state.logTotal = (state.logTotal ?? state.log.length) + 1;
        state.log.push(text);
        if (state.log.length > CONFIG.logMax) state.log.splice(0, state.log.length - CONFIG.logMax);
    },

    // Abre um novo acontecimento no log: a próxima linha vira o título do grupo.
    novoGrupoLog(state) {
        const inicio = state.logTotal ?? state.log.length;
        const base = inicio - state.log.length;
        state.logGrupos = (state.logGrupos || []).filter(g => g >= base && g !== inicio);
        state.logGrupos.push(inicio);
    },

    // Grupos de linhas do log (mais antigo → mais recente).
    gruposLog(state) {
        const total = state.logTotal ?? state.log.length, base = total - state.log.length;
        const inicios = [0, ...(state.logGrupos || []).map(g => g - base).filter(i => i > 0 && i < state.log.length)];
        return inicios.map((ini, k) => state.log.slice(ini, inicios[k + 1] ?? state.log.length)).filter(g => g.length);
    },

    // ── Características secundárias ──
    alcanceBase(alvo) {
        if (!alvo || !alvo.tipo || alvo.tipo === 'proprio' || alvo.semAlcance) return 0;
        return alvo.alcance ?? alvo.raio ?? alvo.comprimento ?? 1;
    },
    // Área: extensão afetada. Só aparece em habilidades que atingem mais de uma zona.
    areaBase(alvo) {
        if (!alvo) return null;
        const zonas = n => `${n} ${n === 1 ? 'zona' : 'zonas'}`;
        switch (alvo.tipo) {
            case 'ao-redor': return (alvo.raio ?? 1) === 1 ? 'arredores' : `raio de ${zonas(alvo.raio)}`;
            case 'linha': return `linha de ${zonas(alvo.comprimento)}`;
            case 'avanco': return 'percurso em linha reta';
            case 'trajeto': return alvo.destino ? (alvo.incluiDestino ? 'caminho até o objeto, com a zona dele' : 'caminho até o objeto') : 'caminho em linha reta';
            case 'zona': return alvo.raioArea ? 'zona escolhida e arredores' : null;
            case 'varios': return `${alvo.quantidade ?? 2} alvos diferentes`;
            case 'arco': return `${zonas(alvo.zonas ?? 2)} adjacentes`;
            default: return null;
        }
    },
    duracaoBase(a) {
        if (a.alvo && a.alvo.modos) return null; // cada opção tem a própria duração (ver descrição)
        const ef = (a.efeitos || []).find(e => e.duracao) || null;
        if (ef) return ef.duracao.ate === 'permanente' ? null : ef.duracao;
        const m = (a.efeitos || []).find(e => e.tipo === 'marca' && CONFIG.marks[e.marca]);
        return m ? CONFIG.marks[m.marca].duracao || null : null;
    },
    // Filtro de efeitos que alteram habilidades: { habilidade: id | [ids], tipo: tipo primário | [tipos] }.
    filtroHabilidade(f, a) {
        if (!f) return true;
        const has = (v, x) => Array.isArray(v) ? v.includes(x) : v === x;
        return (f.habilidade === undefined || has(f.habilidade, a.id)) && (f.tipo === undefined || has(f.tipo, a.tipo));
    },
    // Características da habilidade para a Estrela (base + efeitos 'modificarHabilidade' ativos na Estrela).
    caracteristicas(piece, a) {
        const c = {
            tipo: a.tipo,
            alcance: Engine.alcanceBase(a.alvo),
            custo: a.custo || 0,
            duracao: Engine.duracaoBase(a),
            repetivel: !!a.repetivel,
            ultraRapida: !!a.ultraRapida,
            area: Engine.areaBase(a.alvo)
        };
        const maximos = {}; // efeitos com `maximo` (ex.: Fumacê: alcance no máximo 1), aplicados depois dos bônus
        for (const e of (piece && piece.effects) || []) {
            if (!e.caracteristica || !Engine.filtroHabilidade(e.filtro, a)) continue;
            const def = CONFIG.habilidades.secundarias[e.caracteristica];
            if (!def) continue;
            if (e.maximo != null && def.tipo === 'numero') maximos[e.caracteristica] = Math.min(maximos[e.caracteristica] ?? Infinity, e.maximo);
            else if (def.tipo === 'booleano') c[e.caracteristica] = !!e.delta;
            else if (def.tipo === 'numero') c[e.caracteristica] += e.delta;
            else if (def.tipo === 'duracao' && c.duracao && c.duracao.turnos) c.duracao = { ...c.duracao, turnos: c.duracao.turnos + e.delta };
        }
        for (const [k, m] of Object.entries(maximos)) c[k] = Math.min(c[k], m);
        c.custo = Math.max(0, c.custo);
        if (Engine.alcanceBase(a.alvo) > 0) c.alcance = Math.max(1, c.alcance);
        return c;
    },
    custo(piece, a) { return Engine.caracteristicas(piece, a).custo; },
    // Alvo com o alcance efetivo aplicado (mesmo objeto quando não há alteração).
    alvoDe(piece, a, car = null) {
        const alvo = a.alvo || {};
        const base = Engine.alcanceBase(alvo);
        if (!base || !(piece && piece.effects || []).some(e => e.caracteristica === 'alcance')) return alvo;
        const ef = (car || Engine.caracteristicas(piece, a)).alcance;
        if (!base || ef === base) return alvo;
        const campo = alvo.alcance !== undefined ? 'alcance' : alvo.raio !== undefined ? 'raio' : alvo.comprimento !== undefined ? 'comprimento' : 'alcance';
        return { ...alvo, [campo]: ef };
    },
    descreverDuracao(d) {
        if (!d) return '';
        if (d.turnos) return `${d.turnos} turno(s)`;
        return { 'fim-turno': 'até o final do turno', 'fim-proximo-turno': 'até o final do próximo turno', 'inicio-proximo-turno': 'até o início do próximo turno', 'ser-gasto': 'até ser gasto' }[d.ate] || '';
    },
    // Texto curto: "Jogada de Ataque · Custo 2 · Alcance 3 · Repetível".
    descreverCaracteristicas(piece, a) {
        const c = Engine.caracteristicas(piece, a), L = CONFIG.habilidades;
        const parts = [(L.primarias[c.tipo] || {}).label || c.tipo];
        if (c.tipo !== 'passiva') parts.push(`${L.secundarias.custo.label} ${c.custo}`
            + (a.custoAdicional ? ` + ${Engine.textoRecurso(a.custoAdicional.recurso, a.custoAdicional.valor)}` : '')
            + (a.custoAlternativo ? ` ou ${Engine.textoRecurso(a.custoAlternativo.recurso, a.custoAlternativo.valor)}` : ''));
        if (c.alcance) parts.push(`${L.secundarias.alcance.label} ${c.alcance}`);
        if (c.area) parts.push(`${L.secundarias.area.label}: ${c.area}`);
        if (c.duracao) parts.push(`${L.secundarias.duracao.label}: ${Engine.descreverDuracao(c.duracao)}`);
        if (c.repetivel) parts.push(L.secundarias.repetivel.label);
        if (c.ultraRapida) parts.push(L.secundarias.ultraRapida.label);
        return parts.join(' · ');
    },

    // Avisos no console para erros de configuração (tipos, stats e características desconhecidos).
    validarConfig() {
        const avisos = [];
        const statOk = k => !!Rules.categoriaStat(k) || !!CONFIG.stats[k];
        const chaves = new Set(['id', 'nome', 'tipo', 'descricao', 'alvo', 'efeitos', 'gatilho', 'naoAcumula', 'concede', 'efeitoReacao', 'bonus', 'reducao', 'imutavel', 'oculta', 'reduzDano', 'ultraContraMarca', 'custoAlternativo', 'custoAdicional', 'imune', 'jogadaDeAtaque', 'repeteCom', 'consomeRecurso',
            ...Object.keys(CONFIG.habilidades.secundarias).filter(k => k !== 'alcance' && k !== 'duracao')]);
        for (const [id, a] of Object.entries(CONFIG.abilities)) {
            if (!CONFIG.habilidades.primarias[a.tipo] && !(a.tipo === 'efeito' && a.oculta)) avisos.push(`${id}: tipo desconhecido '${a.tipo}'`);
            for (const k of Object.keys(a)) if (!chaves.has(k)) avisos.push(`${id}: característica desconhecida '${k}'`);
            for (const ef of a.efeitos || []) {
                if (!Engine.EFFECTS[ef.tipo]) avisos.push(`${id}: efeito desconhecido '${ef.tipo}'`);
                const stats = [ef.stat, ef.valor && ef.valor.stat].filter(Boolean);
                for (const k of stats.flatMap(x => Rules.expandStats(x))) if (!statOk(k)) avisos.push(`${id}: status desconhecido '${k}'`);
                if (ef.tipo === 'modificador' && Rules.expandStats(ef.stat).some(k => Rules.categoriaStat(k) === 'primarios'))
                    avisos.push(`${id}: 'modificador' é para status secundários; use 'alterarStatus' para primários`);
                if (ef.tipo === 'modificarHabilidade' && !CONFIG.habilidades.secundarias[ef.caracteristica]) avisos.push(`${id}: característica '${ef.caracteristica}' não existe`);
            }
        }
        for (const [cor, h] of Object.entries(CONFIG.estrelas)) {
            for (const k of [...CONFIG.stats.primarios, ...CONFIG.stats.secundarios]) if (typeof h[k] !== 'number') avisos.push(`Estrela ${h.nome || cor}: status '${k}' ausente`);
            for (const id of h.habilidades || []) if (!CONFIG.abilities[id]) avisos.push(`Estrela ${h.nome || cor}: habilidade '${id}' não existe`);
            for (const r of Object.keys(h.recursos || {})) if (!CONFIG.recursos[r]) avisos.push(`Estrela ${h.nome || cor}: recurso '${r}' não existe`);
            for (const o of h.objetos || []) if (!CONFIG.objetos[o]) avisos.push(`Estrela ${h.nome || cor}: objeto '${o}' não existe`);
        }
        const mapaAtivo = Rules.mapa;
        for (const [id, m] of Object.entries(CONFIG.mapas)) {
            Rules.usarMapa(id);
            const ocupado = new Set();
            for (const [j, lista] of Object.entries(m.spawns || {})) {
                if (lista.length < CONFIG.teamSize) avisos.push(`Mapa ${id}: jogador ${j} tem só ${lista.length} posições iniciais`);
                for (const z of lista) {
                    if (!Rules.isHexOnBoard(z.q, z.r)) avisos.push(`Mapa ${id}: posição inicial (${z.q}, ${z.r}) fora do tabuleiro`);
                    if (ocupado.has(`${z.q},${z.r}`)) avisos.push(`Mapa ${id}: posição inicial (${z.q}, ${z.r}) repetida`);
                    ocupado.add(`${z.q},${z.r}`);
                }
            }
            for (const z of m.renome || []) if (!Rules.isHexOnBoard(z.q, z.r)) avisos.push(`Mapa ${id}: Renome (${z.q}, ${z.r}) fora do tabuleiro`);
        }
        for (const [id, md] of Object.entries(CONFIG.modos)) {
            if (!CONFIG.mapas[md.mapa]) avisos.push(`Modo ${id}: mapa '${md.mapa}' não existe`);
            else for (const j of md.jogadores) {
                if (!CONFIG.players[j]) avisos.push(`Modo ${id}: jogador ${j} sem tema em CONFIG.players`);
                if (!(CONFIG.mapas[md.mapa].spawns || {})[j]) avisos.push(`Modo ${id}: mapa sem posições do jogador ${j}`);
            }
        }
        Rules.mapa = null; Rules.usarMapa(mapaAtivo ? Object.keys(CONFIG.mapas).find(k => CONFIG.mapas[k] === mapaAtivo) : 'classico');
        avisos.forEach(m => console.warn('[CONFIG]', m));
        return avisos;
    },

    // ── Custos especiais ──
    // 'amago': custo normal (+ custoAdicional, se houver); 'alternativo': só o custoAlternativo, sem Âmago.
    recurso(piece, r) { return (piece.recursos && piece.recursos[r]) || 0; },
    podePagar(piece, a, modo, car = null) {
        if (modo === 'alternativo') { const alt = a.custoAlternativo; return !!alt && Engine.recurso(piece, alt.recurso) >= alt.valor; }
        const ad = a.custoAdicional;
        return piece.stats.amago >= (car || Engine.caracteristicas(piece, a)).custo && (!ad || Engine.recurso(piece, ad.recurso) >= ad.valor);
    },
    modosPagamento(piece, a, car = null) { return ['amago', 'alternativo'].filter(m => Engine.podePagar(piece, a, m, car)); },
    pagouAlternativo(piece, abilityId) {
        const id = typeof abilityId === 'string' ? abilityId : abilityId && abilityId.id;
        return !!(piece && piece.turn && piece.turn.pagamento && piece.turn.pagamento[id] === 'alternativo');
    },
    textoRecurso(r, n) { const c = CONFIG.recursos[r] || { icone: '', nome: r, singular: r }; return `${n} ${c.icone} ${n === 1 ? c.singular : c.nome}`; },

    modosDe(piece, alvo, state = null) {
        const m = alvo && alvo.modos;
        return typeof m === 'function' ? m(piece, state) : (m || null);
    },
    // Bônus nas rolagens de ataque: o da próxima rolagem (gasto) + o que dura (ex.: Consagração).
    bonusAtaque(piece) { return piece ? Rules.stat(piece, 'bonus_ataque') + Rules.stat(piece, 'bonus_rolagem') : 0; },
    // Descontos que saem na primeira habilidade ativada (gastaAoUsar, ex.: Folga).
    gastarDescontos(state, piece, a) {
        const gastos = ((piece && piece.effects) || []).filter(e => e.gastaAoUsar && e.caracteristica && Engine.filtroHabilidade(e.filtro, a));
        if (!gastos.length) return;
        piece.effects = piece.effects.filter(e => !gastos.includes(e));
        Engine.log(state, `${Engine.label(piece)}: ${gastos.map(e => e.origem).join(', ')} gasta em ${a.nome}`);
    },
    // A habilidade em uso passa a contar como Ultra Rápida (ex.: Descarga): devolve a ação se foi a primeira do turno.
    tornarUltra(state, f, hab, motivo) {
        const t = f && f.turn, u = t && t.ultimoUso;
        if (!u || !hab || u.abilityId !== hab.id || (t.ultraUsos && t.ultraUsos[hab.id])) return false;
        t.ultraUsos = { ...(t.ultraUsos || {}), [hab.id]: true };
        if (u.livreSeUltra && t.actionUsed) {
            t.actionUsed = false;
            Engine.log(state, `${motivo}: ${hab.nome} conta como Ultra Rápida (ação não consumida)`);
        } else Engine.log(state, `${motivo}: ${hab.nome} conta como Ultra Rápida`);
        return true;
    },

    // Ultra Rápida: não gasta a ação, mas só antes de qualquer outra habilidade no turno.
    isFree(piece, a, car = null) { return !!((car || Engine.caracteristicas(piece, a)).ultraRapida && !Engine.usouOutraHabilidade(piece)); },

    usouOutraHabilidade(piece) {
        const t = piece.turn;
        if (!t) return true;
        if (t.actionUsed) return true;
        return Object.entries(t.usos || {}).some(([id, n]) => {
            const h = Engine.def(id);
            return n > 0 && h && !Engine.caracteristicas(piece, h).ultraRapida && !(t.ultraUsos && t.ultraUsos[id]) && h.tipo !== 'passiva' && h.tipo !== 'reacao';
        });
    },

    // A Estrela ainda tem algum efeito criado por esta habilidade?
    efeitoAtivo(piece, abilityId) {
        return (piece.effects || []).some(e => e.habilidade === abilityId);
    },

    isDebuff(e) { return e.debuff ?? (e.delta < 0); },

    matchesWho(piece, t, who) {
        if (who === 'inimigos') return t.player !== piece.player;
        if (who === 'aliados') return t.player === piece.player;
        return true;
    },

    inRange(state, piece, range, who) {
        return state.pieces.filter(p => p.id !== piece.id && Engine.isAlive(p)
            && Rules.distancia(piece, p) <= range
            && Engine.matchesWho(piece, p, who));
    },

    // Avanço em linha reta: escolha = "direção:passos:q,r" (q,r = zona onde a Estrela termina).
    parseAvanco(choice) {
        const m = /^(\d+):(\d+):(-?\d+),(-?\d+)$/.exec(String(choice));
        return m ? { dir: +m[1], passos: +m[2], q: +m[3], r: +m[4] } : null;
    },

    // Zonas em linha reta a partir da Estrela. ateBorda: para na primeira posição fora do tabuleiro (borda ou buraco).
    linha(piece, dir, passos, ateBorda = false) {
        const d = Rules.DIRS[dir];
        const hexes = [];
        for (let s = 1; d && s <= passos; s++) {
            const h = { q: piece.q + d.q * s, r: piece.r + d.r * s };
            if (ateBorda && !Rules.isHexOnBoard(h.q, h.r)) break;
            hexes.push(h);
        }
        return hexes;
    },

    // ── Objetos no tabuleiro (CONFIG.objetos) ── piece.objetos[id]: null = com a Estrela; { q, r } = na zona onde caiu.
    objetoComDono(piece, id) { return !!(piece && piece.objetos && id in piece.objetos && !piece.objetos[id]); },
    objetoNoTabuleiro(piece, id) { return (piece && piece.objetos && piece.objetos[id]) || null; },
    objetoNaZonaDe(piece, id) { const o = Engine.objetoNoTabuleiro(piece, id); return !!o && o.q === piece.q && o.r === piece.r; },
    recolherObjeto(state, piece, id, motivo = null) {
        if (!Engine.objetoNoTabuleiro(piece, id)) return false;
        piece.objetos[id] = null;
        Engine.log(state, `${Engine.label(piece)} recupera a ${(CONFIG.objetos[id] || {}).nome || id}${motivo ? ` (${motivo})` : ''}`);
        return true;
    },
    // Zona do outro lado do alvo adjacente, em linha reta a partir da Estrela (salto por cima).
    zonaAtras(piece, alvo) {
        const di = Rules.hexDistance(piece, alvo) === 1 ? Rules.directionTo(piece, alvo) : -1;
        if (di < 0) return null;
        const d = Rules.DIRS[di];
        return { q: alvo.q + d.q, r: alvo.r + d.r };
    },
    zonaLivre(state, h) { return !!h && !Engine.bloqueio(state, h); },

    // Alvo 'trajeto': escolha "dir:passos" = zona em linha reta a até `alcance` zonas (para em buracos e na borda).
    // requer(dono, state): condição para usar; destino(dono, state): única zona aceita (ex.: a da shuriken), null = nenhuma.
    parseTrajeto(choice) {
        const m = /^(\d+):(\d+)$/.exec(String(choice));
        return m ? { dir: +m[1], passos: +m[2] } : null;
    },
    trajetoOpcoes(state, piece, alvo) {
        if (alvo.requer && !alvo.requer(piece, state)) return [];
        const fixo = alvo.destino ? alvo.destino(piece, state) : null;
        if (alvo.destino && !fixo) return [];
        const out = [];
        Rules.DIRS.forEach((d, i) => Engine.linha(piece, i, alvo.alcance ?? 1, true).forEach((h, k) => {
            if (!fixo || (h.q === fixo.q && h.r === fixo.r)) out.push(`${i}:${k + 1}`);
        }));
        return out;
    },

    // Alvo 'salto': escolha "id:q,r" = Estrela no alcance + zona ao lado dela onde a Estrela aterrissa (livre, a até
    // `alcance` zonas da Estrela; a própria zona vale se ela já estiver ao lado do alvo).
    parseSalto(choice) {
        const m = /^(\d+):(-?\d+),(-?\d+)$/.exec(String(choice));
        return m ? { id: +m[1], q: +m[2], r: +m[3] } : null;
    },
    saltoOpcoes(state, piece, alvo) {
        const R = alvo.alcance ?? 1, out = [];
        for (const t of Engine.inRange(state, piece, R, alvo.quem || 'inimigos')) {
            if (alvo.filtro && !alvo.filtro(piece, t, state)) continue;
            for (const n of Rules.neighbors(t.q, t.r)) {
                if (!Rules.isHexOnBoard(n.q, n.r)) continue;
                const proprio = n.q === piece.q && n.r === piece.r;
                if ((proprio || Engine.zonaLivre(state, n)) && Rules.distancia(piece, n) <= R) out.push(`${t.id}:${n.q},${n.r}`);
            }
        }
        return out;
    },

    // Alvo 'zona': escolha "q,r". areaZona: a zona e as que estão a até raioArea dela (só zonas do tabuleiro).
    parseZona(choice) {
        const m = /^(-?\d+),(-?\d+)$/.exec(String(choice));
        return m ? { q: +m[1], r: +m[2] } : null;
    },
    areaZona(h, alvo) {
        const R = alvo.raioArea || 0;
        return [{ q: h.q, r: h.r }, ...Rules.zonas().filter(z => { const d = Rules.hexDistance(z, h); return d >= 1 && d <= R; })];
    },
    // Alvo 'varios': escolha "id1,id2" (ids em ordem crescente) ou "id" quando só há uma Estrela no alcance.
    parseVarios(choice) {
        return [...new Set(String(choice ?? '').split(',').filter(x => /^\d+$/.test(x)).map(Number))];
    },

    avancoOpcoes(state, piece, alvo) {
        const out = [];
        const livre = (h) => Rules.isHexOnBoard(h.q, h.r) && !Rules.pieceAt(state, h.q, h.r);
        Rules.DIRS.forEach((d, i) => {
            for (let s = 1; s <= (alvo.alcance ?? 1); s++) {
                const q = piece.q + d.q * s, r = piece.r + d.r * s;
                if (!Rules.isHexOnBoard(q, r)) break;
                if (livre({ q, r })) out.push(`${i}:${s}:${q},${r}`);
                else if (alvo.pousoAdjacente) Rules.neighbors(q, r).filter(livre).forEach(n => out.push(`${i}:${s}:${n.q},${n.r}`));
            }
        });
        return out;
    },

    affected(state, piece, alvo, choice) {
        switch (alvo.tipo) {
            case 'inimigo':
            case 'escolha': {
                const t = Rules.pieceById(state, choice);
                return t && Engine.isAlive(t) ? [t.id] : [];
            }
            case 'ao-redor':
                return Engine.inRange(state, piece, alvo.raio ?? 1, alvo.quem || 'todos').map(p => p.id);
            case 'arco':
                return Engine.arcoZonas(piece, choice, alvo)
                    .map(h => Rules.pieceAt(state, h.q, h.r))
                    .filter(t => t && Engine.isAlive(t) && Engine.matchesWho(piece, t, alvo.quem || 'todos'))
                    .map(t => t.id);
            case 'linha':
            case 'avanco': {
                const c = alvo.tipo === 'linha' ? { dir: choice, passos: alvo.comprimento } : Engine.parseAvanco(choice);
                if (!c) return [];
                return Engine.linha(piece, c.dir, c.passos, true)
                    .map(h => Rules.pieceAt(state, h.q, h.r))
                    .filter(t => t && t.id !== piece.id && Engine.isAlive(t) && Engine.matchesWho(piece, t, alvo.quem || 'todos'))
                    .map(t => t.id);
            }
            case 'trajeto': {
                const c = Engine.parseTrajeto(choice);
                if (!c) return [];
                return Engine.linha(piece, c.dir, alvo.incluiDestino ? c.passos : c.passos - 1, true)
                    .map(h => Rules.pieceAt(state, h.q, h.r))
                    .filter(t => t && t.id !== piece.id && Engine.isAlive(t) && Engine.matchesWho(piece, t, alvo.quem || 'todos'))
                    .map(t => t.id);
            }
            case 'varios':
                return Engine.parseVarios(choice).map(id => Rules.pieceById(state, id))
                    .filter(t => t && t.id !== piece.id && Engine.isAlive(t) && Engine.matchesWho(piece, t, alvo.quem || 'inimigos'))
                    .map(t => t.id);
            case 'zona': {
                const h = Engine.parseZona(choice);
                if (!h || alvo.livre) return [];
                return Engine.areaZona(h, alvo).map(z => Rules.pieceAt(state, z.q, z.r))
                    .filter(t => t && Engine.isAlive(t) && Engine.matchesWho(piece, t, alvo.quem || 'todos'))
                    .map(t => t.id);
            }
            case 'salto': {
                const c = Engine.parseSalto(choice), t = c && Rules.pieceById(state, c.id);
                return t && t.id !== piece.id && Engine.isAlive(t) && Engine.matchesWho(piece, t, alvo.quem || 'inimigos') ? [t.id] : [];
            }
            case 'proprio':
                return [piece.id];
        }
        return [];
    },

    choices(state, piece, alvo, only) {
        let all;
        switch (alvo.tipo) {
            case 'inimigo':
                all = Engine.inRange(state, piece, alvo.alcance ?? 1, 'inimigos').map(p => p.id);
                if (alvo.filtro) all = all.filter(id => alvo.filtro(piece, Rules.pieceById(state, id), state));
                break;
            case 'escolha':
                all = Engine.inRange(state, piece, alvo.alcance ?? 1, alvo.quem || 'todos').map(p => p.id);
                // proprioSe(piece, state): sem outro alvo válido, o usuário pode escolher a si mesmo (ex.: Presente da Lua).
                if (!all.length && alvo.proprioSe && alvo.proprioSe(piece, state)) all = [piece.id];
                // filtro(dono, alvo, state): restringe quem pode ser escolhido (ex.: só aliados feridos).
                if (alvo.filtro) all = all.filter(id => alvo.filtro(piece, Rules.pieceById(state, id), state));
                break;
            case 'ao-redor': all = [null]; break;
            case 'linha':
            case 'arco': all = Rules.DIRS.map((d, i) => i); break;
            case 'avanco': all = Engine.avancoOpcoes(state, piece, alvo); break;
            case 'trajeto': all = Engine.trajetoOpcoes(state, piece, alvo); break;
            case 'varios': {
                let ids = Engine.inRange(state, piece, alvo.alcance ?? 1, alvo.quem || 'inimigos').map(p => p.id);
                if (alvo.filtro) ids = ids.filter(id => alvo.filtro(piece, Rules.pieceById(state, id), state));
                ids.sort((a, b) => a - b);
                all = ids.length < 2 ? ids.map(String) : ids.flatMap((a, i) => ids.slice(i + 1).map(b => `${a},${b}`));
                break;
            }
            case 'zona': {
                const R = alvo.alcance ?? 1;
                all = Rules.zonas().filter(z => { const d = Rules.distancia(piece, z); return d >= 1 && d <= R && (!alvo.livre || !Engine.bloqueio(state, z)); })
                    .map(z => `${z.q},${z.r}`);
                break;
            }
            case 'salto': all = Engine.saltoOpcoes(state, piece, alvo); break;
            case 'proprio': {
                const modos = Engine.modosDe(piece, alvo, state);
                all = modos ? modos.map((m, i) => i) : [null];
                if (alvo.requer && !alvo.requer(piece, state)) all = [];
                break;
            }
            default: all = [];
        }
        const semAlvoOk = alvo.tipo === 'avanco' || alvo.tipo === 'trajeto' || (alvo.tipo === 'zona' && alvo.livre); // movimento/arremesso é válido mesmo sem atingir ninguém
        return all.filter(ch => (!only || only.includes(ch)) && (semAlvoOk || Engine.affected(state, piece, alvo, ch).length > 0));
    },

    // etapa (avanço): null = escolher o destino; "dir:passos" = escolher onde pousar ao lado da zona ocupada.
    previewHexes(state, piece, alvo, only, etapa = null) {
        const hexes = [];
        const choices = Engine.choices(state, piece, alvo, only);
        if (alvo.tipo === 'avanco') {
            const seen = new Set();
            choices.forEach(ch => {
                const c = Engine.parseAvanco(ch);
                const h = etapa ? (ch.startsWith(etapa + ':') ? c : null) : Engine.linha(piece, c.dir, c.passos).pop();
                if (h && !seen.has(`${h.q},${h.r}`)) { seen.add(`${h.q},${h.r}`); hexes.push({ q: h.q, r: h.r }); }
            });
            return hexes;
        }
        if (alvo.tipo === 'inimigo' || alvo.tipo === 'escolha') {
            choices.forEach(id => { const t = Rules.pieceById(state, id); hexes.push({ q: t.q, r: t.r }); });
        } else if (alvo.tipo === 'ao-redor') {
            const R = alvo.raio ?? 1;
            for (const z of Rules.zonas()) {
                const d = Rules.distancia(piece, z);
                if (d >= 1 && d <= R) hexes.push(z);
            }
        } else if (alvo.tipo === 'linha') {
            choices.forEach(i => hexes.push(...Engine.linha(piece, i, alvo.comprimento, true)));
        } else if (alvo.tipo === 'trajeto') { // destinos e caminhos (com destino fixo, o caminho até ele)
            const seen = new Set();
            choices.forEach(ch => { const c = Engine.parseTrajeto(ch); Engine.linha(piece, c.dir, c.passos, true).forEach(h => {
                if (!seen.has(`${h.q},${h.r}`)) { seen.add(`${h.q},${h.r}`); hexes.push(h); }
            }); });
        } else if (alvo.tipo === 'arco') {
            // etapa "k": a 1ª zona (vizinha k) já foi escolhida; destaca as zonas que completam uma área válida.
            const seen = new Set();
            const add = h => { const k = `${h.q},${h.r}`; if (!seen.has(k) && Rules.isHexOnBoard(h.q, h.r)) { seen.add(k); hexes.push(h); } };
            if (etapa != null) {
                const k = +etapa;
                choices.forEach(i => { if (i === k) add(Engine.arcoZonas(piece, i, alvo)[1]); else if ((i + 1) % 6 === k) add(Engine.arcoZonas(piece, i, alvo)[0]); });
            } else choices.forEach(i => Engine.arcoZonas(piece, i, alvo).forEach(add));
        } else if (alvo.tipo === 'varios') {
            // etapa "id": a 1ª Estrela já foi escolhida; destaca ela e as que podem formar o par.
            const ids = new Set();
            choices.forEach(ch => { const l = Engine.parseVarios(ch); if (etapa == null || l.includes(+etapa)) l.forEach(i => ids.add(i)); });
            ids.forEach(id => { const t = Rules.pieceById(state, id); if (t) hexes.push({ q: t.q, r: t.r }); });
        } else if (alvo.tipo === 'zona') {
            // etapa "q,r": zona escolhida; destaca a área atingida (clicar nela confirma).
            if (etapa != null && choices.includes(etapa)) hexes.push(...Engine.areaZona(Engine.parseZona(etapa), alvo));
            else choices.forEach(ch => hexes.push(Engine.parseZona(ch)));
        } else if (alvo.tipo === 'salto') {
            // etapa "id": o alvo já foi escolhido; destaca as zonas de pouso ao lado dele.
            const seen = new Set();
            choices.forEach(ch => {
                const c = Engine.parseSalto(ch), t = Rules.pieceById(state, c.id);
                const h = etapa != null ? (c.id === +etapa ? { q: c.q, r: c.r } : null) : t && { q: t.q, r: t.r };
                if (h && !seen.has(`${h.q},${h.r}`)) { seen.add(`${h.q},${h.r}`); hexes.push(h); }
            });
        } else if (alvo.tipo === 'proprio') {
            hexes.push({ q: piece.q, r: piece.r });
        }
        return hexes;
    },

    choiceFromHex(state, piece, alvo, hex, only, etapa = null) {
        const choices = Engine.choices(state, piece, alvo, only);
        if (alvo.tipo === 'avanco') {
            if (etapa) {
                const ch = choices.find(c => c === `${etapa}:${hex.q},${hex.r}`);
                return ch ? { choice: ch } : undefined;
            }
            for (let i = 0; i < Rules.DIRS.length; i++) {
                for (let s = 1; s <= (alvo.alcance ?? 1); s++) {
                    const fim = Engine.linha(piece, i, s).pop();
                    if (fim.q !== hex.q || fim.r !== hex.r) continue;
                    const prefix = `${i}:${s}`;
                    const direto = choices.find(c => c === `${prefix}:${hex.q},${hex.r}`);
                    if (direto) return { choice: direto };
                    const opcoes = choices.filter(c => c.startsWith(prefix + ':'));
                    if (opcoes.length === 1) return { choice: opcoes[0] };
                    return opcoes.length ? { etapa: prefix } : undefined;
                }
            }
            return undefined;
        }
        if (alvo.tipo === 'inimigo' || alvo.tipo === 'escolha') {
            const t = Rules.pieceAt(state, hex.q, hex.r);
            return t && choices.includes(t.id) ? { choice: t.id } : undefined;
        }
        if (alvo.tipo === 'ao-redor') {
            const inside = Rules.distancia(piece, hex) <= (alvo.raio ?? 1);
            return inside && choices.length ? { choice: null } : undefined;
        }
        if (alvo.tipo === 'linha') {
            const i = choices.find(i => Engine.linha(piece, i, alvo.comprimento, true).some(h => h.q === hex.q && h.r === hex.r));
            if (i !== undefined) return { choice: i };
        }
        if (alvo.tipo === 'trajeto') {
            const fim = ch => { const c = Engine.parseTrajeto(ch); return Engine.linha(piece, c.dir, c.passos).pop(); };
            const direto = choices.find(ch => { const h = fim(ch); return h.q === hex.q && h.r === hex.r; });
            if (direto) return { choice: direto };
            // Destino único (ex.: puxar a shuriken): clicar no caminho também serve.
            if (choices.length === 1) {
                const c = Engine.parseTrajeto(choices[0]);
                if (Engine.linha(piece, c.dir, c.passos).some(h => h.q === hex.q && h.r === hex.r)) return { choice: choices[0] };
            }
            return undefined;
        }
        if (alvo.tipo === 'arco') {
            const k = Rules.DIRS.findIndex(d => piece.q + d.q === hex.q && piece.r + d.r === hex.r);
            if (k < 0) return undefined;
            if (etapa != null) { // 2ª zona: vizinha de k
                const e = +etapa;
                if (k === (e + 1) % 6 && choices.includes(e)) return { choice: e };
                if (k === (e + 5) % 6 && choices.includes(k)) return { choice: k };
                return undefined;
            }
            // Áreas que contêm a zona clicada; se todas atingem as mesmas Estrelas, não precisa da 2ª zona.
            const cand = choices.filter(i => i === k || (i + 1) % 6 === k);
            const grupos = new Set(cand.map(i => Engine.affected(state, piece, alvo, i).sort().join(',')));
            if (!cand.length) return undefined;
            return grupos.size === 1 ? { choice: cand[0] } : { etapa: String(k) };
        }
        if (alvo.tipo === 'varios') {
            const t = Rules.pieceAt(state, hex.q, hex.r);
            if (!t) return undefined;
            if (etapa != null) { // 2ª Estrela
                const par = [+etapa, t.id].sort((a, b) => a - b).join(',');
                return t.id !== +etapa && choices.includes(par) ? { choice: par } : undefined;
            }
            if (choices.includes(String(t.id))) return { choice: String(t.id) };
            return choices.some(ch => Engine.parseVarios(ch).includes(t.id)) ? { etapa: String(t.id) } : undefined;
        }
        if (alvo.tipo === 'zona') {
            const k = `${hex.q},${hex.r}`;
            if (!alvo.raioArea) return choices.includes(k) ? { choice: k } : undefined;
            // 1º clique escolhe a zona e mostra a área; clicar na área confirma (outra zona válida fora dela troca a escolha).
            if (etapa != null && choices.includes(etapa) && Engine.areaZona(Engine.parseZona(etapa), alvo).some(h => h.q === hex.q && h.r === hex.r)) return { choice: etapa };
            return choices.includes(k) ? { etapa: k } : undefined;
        }
        if (alvo.tipo === 'salto') {
            if (etapa != null) { // zona de pouso (ou outro alvo, para trocar)
                const ch = choices.find(c => c === `${etapa}:${hex.q},${hex.r}`);
                if (ch) return { choice: ch };
            }
            const t = Rules.pieceAt(state, hex.q, hex.r);
            const opcoes = t ? choices.filter(c => Engine.parseSalto(c).id === t.id) : [];
            if (opcoes.length === 1) return { choice: opcoes[0] };
            return opcoes.length ? { etapa: String(t.id) } : undefined;
        }
        if (alvo.tipo === 'proprio') {
            if (alvo.modos) return undefined; // a opção é escolhida nos botões da barra de ação
            return (hex.q === piece.q && hex.r === piece.r) ? { choice: null } : undefined;
        }
        return undefined;
    },

    slot(state, piece, a) {
        const t = piece.turn;
        if (!t || a.oculta) return null;
        const car = Engine.caracteristicas(piece, a); // calculadas uma vez por consulta
        if (!Engine.modosPagamento(piece, a, car).length || !Engine.podeUsarNaRodada(piece, a, car)) return null;
        if (a.naoAcumula && Engine.efeitoAtivo(piece, a.id)) return null; // não acumula: espera o efeito anterior ser gasto/expirar
        const alvo = Engine.alvoDe(piece, a, car);
        const ex = t.extra;
        // extra: { tipo, alvoId } (Manter Pressão: mais um ataque contra o mesmo alvo) | { habilidade } (concederUso: mais um uso dela).
        if (ex && (ex.habilidade ? ex.habilidade === a.id && Engine.choices(state, piece, alvo).length
            : ex.tipo === a.tipo && Engine.choices(state, piece, alvo, [ex.alvoId]).length)) return 'extra';
        const free = Engine.isFree(piece, a, car);
        if (car.ultraRapida && !free) return null;
        // Usar outra habilidade (mesmo um uso extra, ex.: Pegar e Jogar → Shuriken) gasta a ação da jogada.
        let kind = free ? 'livre' : (!Engine.usouOutraHabilidade(piece) ? 'acao' : null);
        // repeteCom (Disparo Arcano): já usada na rodada → pode repetir pagando o recurso, sem gastar a ação.
        if (!kind && a.repeteCom && (t.usos[a.id] || 0) > 0 && Engine.recurso(piece, a.repeteCom.recurso) >= a.repeteCom.valor) kind = 'repeticao';
        return kind && Engine.choices(state, piece, alvo).length ? kind : null;
    },

    podeUsarNaRodada(piece, a, car = null) {
        const usos = (piece.turn && piece.turn.usos) || {};
        return (usos[a.id] || 0) === 0 || (car || Engine.caracteristicas(piece, a)).repetivel;
    },

    restrict(state, piece, a) {
        return Engine.slot(state, piece, a) === 'extra' && !piece.turn.extra.habilidade ? [piece.turn.extra.alvoId] : undefined;
    },

    canUse(state, piece, a) {
        if (!a || a.tipo === 'passiva' || a.tipo === 'reacao') return false;
        return !!Engine.slot(state, piece, a);
    },

    hasUsableAction(state, piece) {
        return Rules.podeColetar(state, piece) || Engine.abilitiesOf(piece).some(a => Engine.canUse(state, piece, a));
    },

    // Registro para os efeitos visuais (state.fx). Só a partida em jogo tem a lista; as simulações dos Bots não registram.
    // Eventos: hab (uso: de, h, q/r do usuário, al = [id, q, r] dos alvos, z = zonas da área, p = passiva/efeito),
    // rol (de, para, ok), dano (de, para, v, abs, vida, h), mov (id, cam, f = forçado), renome (id, v).
    fx(state, ev) {
        if (!state || !Array.isArray(state.fx)) return;
        ev.n = state.fxN = (state.fxN || 0) + 1;
        state.fx.push(ev);
        if (state.fx.length > 60) state.fx.splice(0, state.fx.length - 60);
    },
    fxHab(state, piece, a, choice, ids = null, passiva = false) {
        if (!state || !Array.isArray(state.fx) || !piece || !a) return;
        const alvo = Engine.alvoDe(piece, a) || {};
        const al = (ids || Engine.affected(state, piece, alvo, choice)).map(id => Rules.pieceById(state, id)).filter(Boolean).map(p => [p.id, p.q, p.r]);
        let z = [];
        if (alvo.tipo === 'linha') z = Engine.linha(piece, choice, alvo.comprimento, true);
        else if (alvo.tipo === 'avanco') { const c = Engine.parseAvanco(choice); if (c) z = Engine.linha(piece, c.dir, c.passos, true); }
        else if (alvo.tipo === 'trajeto') { const c = Engine.parseTrajeto(choice); if (c) z = Engine.linha(piece, c.dir, c.passos, true); }
        else if (alvo.tipo === 'arco') z = Engine.arcoZonas(piece, choice, alvo);
        else if (alvo.tipo === 'ao-redor') z = Rules.neighbors(piece.q, piece.r).filter(h => Rules.isHexOnBoard(h.q, h.r));
        else if (alvo.tipo === 'zona') { const h = Engine.parseZona(choice); if (h) z = Engine.areaZona(h, alvo); } // zona escolhida primeiro
        else if (alvo.tipo === 'salto') { const c = Engine.parseSalto(choice); if (c) z = [{ q: c.q, r: c.r }]; }
        const ev = { k: 'hab', de: piece.id, h: a.id, q: piece.q, r: piece.r, al, z: z.map(h => [h.q, h.r]) };
        if (passiva) ev.p = 1;
        Engine.fx(state, ev);
    },

    // pagamento: 'amago' | 'alternativo' (padrão: Âmago se der, senão o custo alternativo).
    use(state, piece, abilityId, choice = null, pagamento = null) {
        const a = Engine.def(abilityId);
        if (!a || !(piece.habilidades || []).includes(abilityId)) return false;
        if (!Rules.canSelect(state, piece) || !Engine.canUse(state, piece, a)) return false;
        const restrict = Engine.restrict(state, piece, a);
        if (!Engine.choices(state, piece, Engine.alvoDe(piece, a), restrict).includes(choice)) return false;
        const slot = Engine.slot(state, piece, a);
        const modos = Engine.modosPagamento(piece, a);
        const modo = pagamento ? (modos.includes(pagamento) ? pagamento : null) : modos[0];
        if (!modo) return false;
        const custo = modo === 'alternativo' ? 0 : Engine.custo(piece, a);
        const recursoPago = modo === 'alternativo' ? a.custoAlternativo : (a.custoAdicional || null);
        const repete = slot === 'repeticao' ? a.repeteCom : null;

        Rules.beginActivation(state, piece);
        Engine.novoGrupoLog(state);
        Rules.spendAmago(piece, custo);
        if (recursoPago) piece.recursos[recursoPago.recurso] -= recursoPago.valor;
        if (repete) piece.recursos[repete.recurso] -= repete.valor;
        piece.turn.custoPago = { ...(piece.turn.custoPago || {}), [abilityId]: custo };
        piece.turn.pagamento = { ...(piece.turn.pagamento || {}), [abilityId]: modo };
        
        // livreSeUltra: se esta habilidade passar a contar como Ultra Rápida (Graciosa), a ação é devolvida.
        piece.turn.ultimoUso = { abilityId, livreSeUltra: slot === 'acao' && !Engine.usouOutraHabilidade(piece) };
        piece.turn.usos[abilityId] = (piece.turn.usos[abilityId] || 0) + 1;
        if (slot === 'extra') piece.turn.extra = null; 
        else if (slot !== 'livre' && slot !== 'repeticao') piece.turn.actionUsed = true;
        
        const gastos = [custo ? `-${custo} Âmago` : '', recursoPago ? `-${Engine.textoRecurso(recursoPago.recurso, recursoPago.valor)}` : '',
            repete ? `-${Engine.textoRecurso(repete.recurso, repete.valor)}` : ''].filter(Boolean).join(', ');
        Engine.log(state, `${Engine.label(piece)} usa ${a.nome}${slot === 'extra' ? ' [uso extra]' : slot === 'repeticao' ? ' [repetição]' : ''}${gastos ? ` (${gastos})` : ''}`);
        Engine.gastarDescontos(state, piece, a);
        Engine.fxHab(state, piece, a, choice);
        Engine.emit(state, 'ativouHabilidade', { peca: piece, habilidade: a, custo }); // antes dos efeitos (ex.: Aura Revitalizante)

        if (a.tipo === 'ataque' || a.jogadaDeAtaque) Engine.realizarAtaque(state, piece, a, choice, Engine.affected(state, piece, Engine.alvoDe(piece, a), choice));
        else Engine.aplicarComReacoes(state, piece, a, choice);
        Engine.resolveQueue(state);
        return true;
    },

    // Jogada de Ataque (habilidade 'ataque' ou reação que ataca): eventos/modificadores do uso e rolagem contra cada alvo.
    // Manual: abre state.pending 'rolagem' (ver resolveRoll). Automático: o atacante rola uma vez para todos os alvos.
    // O andamento fica em state.ataque (um alvo por vez): depois de cada rolagem, aliados podem pedir uma rerolagem
    // (ex.: Desse Daí!) antes do resultado valer. Bônus de ataque e Esquiva Ignorada são lidos e gastos no início.
    realizarAtaque(state, piece, a, choice, alvos) {
        const ignora = Rules.stat(piece, 'ignora_esquiva') > 0;
        Engine.emit(state, 'usouAtaque', { peca: piece, habilidade: a });
        const modDano = Engine.consumirModDanoAtaque(state, piece);
        const bonusAtk = Engine.bonusAtaque(piece);
        if (ignora) Engine.consumeIgnoraEsquiva(piece);
        Engine.consumeBonusAtaque(piece);
        state.ataque = { pieceId: piece.id, abilityId: a.id, choice, alvos: [...alvos], i: 0, acertos: [], ignora, modDano, bonusAtk, atkDice: null, r: null, fixo: null, recusou: [] };
        Engine.continuarAtaque(state);
    },

    // Rola (automático) ou pede a rolagem (manual) do alvo atual, oferece rerolagens e fecha o resultado; no fim aplica.
    continuarAtaque(state) {
        const at = state.ataque;
        if (!at) return;
        const piece = Rules.pieceById(state, at.pieceId), a = Engine.def(at.abilityId);
        const manual = CONFIG.rules.attackRoll.mode === 'manual';
        while (piece && at.i < at.alvos.length) {
            const id = at.alvos[at.i], t = Rules.pieceById(state, id);
            if (!t) { at.i++; at.r = null; at.fixo = null; at.recusou = []; continue; }
            if (!at.r) {
                if (manual) {
                    state.pending = { tipo: 'rolagem', pieceId: at.pieceId, abilityId: at.abilityId, choice: at.choice, alvos: at.alvos, i: at.i, acertos: at.acertos,
                        ignora: at.ignora, modDano: at.modDano, bonusAtk: at.bonusAtk, ...(at.fixo ? { fixo: at.fixo } : {}) };
                    return;
                }
                at.r = Engine.rollAttack(piece, t, at.atkDice, null, at);
                if (!at.atkDice) at.atkDice = at.r.atkDice; // o atacante rola uma vez para todos os alvos
                Engine.log(state, `Ataque em ${Engine.label(t)}: ${Engine.describeRoll(at.r)} → ${at.r.hit ? 'ACERTO' : 'ESQUIVA'}`);
            }
            const rr = Engine.rerolagemDisponivel(state, at, piece, t);
            if (rr) { state.pending = rr; return; }
            Engine.fx(state, { k: 'rol', de: piece.id, para: id, ok: at.r.hit ? 1 : 0 });
            if (at.r.hit) { at.acertos.push(id); Engine.queueHitTriggers(state, piece, id); }
            else Engine.queueMissTriggers(state, piece, id);
            at.i++; at.r = null; at.fixo = null; at.recusou = [];
        }
        state.ataque = null;
        if (piece) Engine.aplicarComReacoes(state, piece, a, at.choice, at.acertos, at.modDano || 0);
    },

    // Reação de rerolagem de um aliado de quem ficou com o resultado ruim (errou o ataque ou foi atingido).
    rerolagemDisponivel(state, at, atacante, defensor) {
        const r = at.r;
        if (!r || !atacante || !defensor || atacante.player === defensor.player) return null;
        const quem = r.hit ? defensor : atacante, lado = r.hit ? 'defesa' : 'ataque';
        for (const o of state.pieces) {
            if (o.player !== quem.player || o.id === quem.id || !Engine.isAlive(o)) continue;
            for (const h of Engine.gatilhos(o, 'rolagemAliado', 'reacao')) {
                if (at.recusou.includes(`${o.id}:${h.id}`) || !Engine.reacaoDisponivel(o, h)) continue;
                if (Rules.distancia(o, quem) > Engine.caracteristicas(o, h).alcance) continue;
                const res = r.atk != null ? ` (${r.atk} contra ${r.def})` : '';
                const pergunta = lado === 'ataque'
                    ? `${h.nome}: ${o.stats.nome} pode fazer ${quem.stats.nome} rolar o ataque de novo — errou ${defensor.stats.nome}${res}. Custo: ${Engine.custo(o, h)} Âmago`
                    : `${h.nome}: ${o.stats.nome} pode fazer ${quem.stats.nome} rolar a esquiva de novo — foi atingida por ${atacante.stats.nome}${res}. Custo: ${Engine.custo(o, h)} Âmago`;
                return { tipo: 'reacao', donoId: o.id, abilityId: h.id, alvoId: quem.id, rerolagem: lado, pergunta };
            }
        }
        return null;
    },

    // Rerolagem de um lado da rolagem atual (o outro lado mantém os dados). Manual: a rolagem é pedida de novo.
    rerolar(state, lado) {
        const at = state.ataque;
        if (!at) return;
        const piece = Rules.pieceById(state, at.pieceId), t = Rules.pieceById(state, at.alvos[at.i]);
        if (CONFIG.rules.attackRoll.mode === 'manual' || !at.r || !at.r.atkDice || !piece || !t) {
            at.fixo = at.r && at.r.atkDice ? (lado === 'ataque' ? { def: at.r.def } : { atk: at.r.atk }) : null;
            at.r = null;
            return;
        }
        at.r = Engine.rollAttack(piece, t, lado === 'ataque' ? null : at.r.atkDice, lado === 'defesa' ? null : at.r.defDice, at);
        Engine.log(state, `Nova rolagem ${lado === 'ataque' ? 'de ataque' : 'de esquiva'} em ${Engine.label(t)}: ${Engine.describeRoll(at.r)} → ${at.r.hit ? 'ACERTO' : 'ESQUIVA'}`);
    },

    // Reações de quem foi alvo de uma Jogada de Ataque que errou (ex.: Retribuição): inimigo adjacente.
    queueMissTriggers(state, piece, targetId) {
        const alvo = Rules.pieceById(state, targetId);
        if (!alvo || !piece || alvo.player === piece.player || !Engine.isAlive(alvo)) return;
        for (const h of Engine.gatilhos(alvo, 'errouAtaqueContra', 'reacao'))
            if (Rules.hexDistance(alvo, piece) <= Engine.caracteristicas(alvo, h).alcance && Engine.reacaoDisponivel(alvo, h))
                state.triggers.push({ donoId: alvo.id, abilityId: h.id, origemId: piece.id });
    },

    queueHitTriggers(state, piece, targetId) {
        const alvo = Rules.pieceById(state, targetId);
        if (!alvo) return;
        for (const h of Engine.gatilhos(piece, 'acertouAtaque')) {
            if (Engine.matchesWho(piece, alvo, h.gatilho.quem || 'todos')) state.triggers.push({ donoId: piece.id, abilityId: h.id, origemId: targetId });
        }
    },

    consumeBonusAtaque(piece) {
        if (piece.effects.some(e => e.stat === 'bonus_ataque')) piece.effects = piece.effects.filter(e => e.stat !== 'bonus_ataque');
    },

    consumeIgnoraEsquiva(piece) {
        piece.effects = piece.effects.filter(e => e.stat !== 'ignora_esquiva');
    },

    rollDice({ count, sides }) {
        return Array.from({ length: count }, () => 1 + Math.floor(Engine.rng() * sides));
    },

    // atkDice opcional: reutiliza a rolagem do atacante (ataques com vários alvos); cada defensor rola a própria esquiva.
    // Bônus do defensor na rolagem (Esquiva), a menos que o atacante a ignore.
    bonusDefesa(attacker, defender, ignora = null) {
        const stat = CONFIG.rules.attackRoll.defenderAddsStat;
        const ignoraEsquiva = ignora ?? (!!attacker && Rules.stat(attacker, 'ignora_esquiva') > 0);
        return { ignoraEsquiva, bonus: (stat && !ignoraEsquiva) ? Rules.stat(defender, stat) : 0 };
    },

    // defDice opcional: reutiliza a esquiva já rolada (rerolagem só do ataque). opts { ignora, bonusAtk }: valores lidos
    // no início do ataque (state.ataque); sem opts, lidos da Estrela agora.
    rollAttack(attacker, defender, atkDice = null, defDice = null, opts = null) {
        const cfg = CONFIG.rules.attackRoll;
        const sum = (arr) => arr.reduce((a, b) => a + b, 0);
        atkDice = atkDice || Engine.rollDice(cfg.attackerDice);
        defDice = defDice || Engine.rollDice(cfg.defenderDice);
        const { ignoraEsquiva, bonus } = Engine.bonusDefesa(attacker, defender, opts ? opts.ignora : null);
        const bonusAtk = opts && opts.bonusAtk != null ? opts.bonusAtk : Engine.bonusAtaque(attacker); // ex.: Revigorar pago com Penas, Consagração
        const atk = sum(atkDice) + bonusAtk, def = sum(defDice) + bonus;
        return { atkDice, defDice, bonus, bonusAtk, atk, def, hit: cfg.hit(atk, def), ignoraEsquiva };
    },

    describeRoll(r) {
        const cfg = CONFIG.rules.attackRoll;
        const ignoraText = r.ignoraEsquiva ? ' (Esquiva Ignorada)' : '';
        const stat = (cfg.defenderAddsStat && r.bonus > 0) ? ` + ${cfg.defenderAddsStat.slice(0, 3).toUpperCase()} ${r.bonus}` : ignoraText;
        return `${cfg.attackerDice.count}D${cfg.attackerDice.sides} [${r.atkDice.join('+')}]${r.bonusAtk ? ` + ${r.bonusAtk}` : ''} = ${r.atk} contra ` +
            `${cfg.defenderDice.count}D${cfg.defenderDice.sides} [${r.defDice.join('+')}]${stat} = ${r.def}`;
    },

    resolveRoll(state, hit) {
        const pd = state.pending;
        if (!pd || pd.tipo !== 'rolagem') return false;
        state.pending = null;
        const at = state.ataque || (state.ataque = { pieceId: pd.pieceId, abilityId: pd.abilityId, choice: pd.choice, alvos: pd.alvos, i: pd.i, acertos: pd.acertos || [],
            ignora: pd.ignora, modDano: pd.modDano || 0, bonusAtk: pd.bonusAtk || 0, atkDice: null, r: null, fixo: null, recusou: [] }); // partida salva antes das rerolagens
        const t = Rules.pieceById(state, at.alvos[at.i]);
        Engine.log(state, `Ataque em ${Engine.label(t)} (rolagem manual): ${hit ? 'ACERTO' : 'ESQUIVA'}`);
        at.r = { hit: !!hit, manual: true };
        at.fixo = null;
        Engine.continuarAtaque(state);
        Engine.resolveQueue(state);
        return true;
    },

    // Jogadas de Ataque (habilidades 'ataque' e reações que atacam).
    ehAtaque(a) { return !!a && (a.tipo === 'ataque' || a.efeitoReacao === 'ataque' || !!a.jogadaDeAtaque); },

    // Passivas com imutavel: status (chave | categoria | lista) que não podem ser alterados (ex.: Véu do Luar).
    imutavel(piece, k) {
        return Engine.abilitiesOf(piece).find(a => a.tipo === 'passiva' && a.imutavel && Rules.expandStats(a.imutavel).includes(k)) || null;
    },

    causaDano(a) {
        return (a.efeitos || []).some(ef => ef.tipo === 'dano' || (ef.aoColidir || []).some(x => x.tipo === 'dano'));
    },

    // Modificadores de dano da próxima Jogada de Ataque (ex.: Recompensa da Lua): somados e gastos ao usar o ataque.
    consumirModDanoAtaque(state, piece) {
        const mods = piece.effects.filter(e => e.tipo === 'estado' && e.danoAtaque);
        if (!mods.length) return 0;
        piece.effects = piece.effects.filter(e => !mods.includes(e));
        const total = mods.reduce((t, e) => t + e.danoAtaque, 0);
        Engine.log(state, `${mods.map(e => e.origem).join(', ')}: dano deste ataque de ${Engine.label(piece)} ${total > 0 ? '+' : ''}${total}`);
        return total;
    },

    // Habilidades da Estrela com gatilho no evento (tipo opcional: 'passiva' | 'reacao').
    gatilhos(piece, evento, tipo = null) {
        return Engine.abilitiesOf(piece).filter(h => h.gatilho && h.gatilho.evento === evento && (!tipo || h.tipo === tipo));
    },

    // A Estrela ignora efeitos desse tipo? (característica 'imune' de uma habilidade dela, ex.: Égide da Coroa)
    imune(piece, tipo) {
        return !!piece && Engine.abilitiesOf(piece).some(h => (h.imune || []).includes(tipo));
    },

    // A reação pode ser oferecida agora? (Estrela viva, sem uso na rodada e com Âmago para o custo)
    reacaoDisponivel(piece, a) {
        return !!piece && !!a && Engine.isAlive(piece) && Engine.podeUsarNaRodada(piece, a) && piece.stats.amago >= Engine.custo(piece, a);
    },

    // Gasta um acionamento de um estado (usos null = ilimitado).
    gastarEstado(state, dono, e) {
        if (e.usos != null && --e.usos <= 0) dono.effects = dono.effects.filter(x => x !== e);
        Engine.log(state, `${e.origem} de ${Engine.label(dono)} é acionado`);
    },

    // Estrelas atingidas por um uso (only: restringe aos ids listados, ex.: alvos acertados no ataque).
    alvosDoUso(state, source, a, choice, only = null) {
        return Engine.affected(state, source, Engine.alvoDe(source, a), choice)
            .filter(id => !only || only.includes(id))
            .map(id => Rules.pieceById(state, id)).filter(Boolean);
    },

    // Antes de aplicar uma habilidade que causa dano, abre a janela de reações que alteram esse dano:
    //  - 'aliadoCausaDanoComAtaque' (ex.: Selo do Império): aliados do atacante, se o ataque acertou alguém;
    //  - 'aliadoRecebeDano' (ex.: Cortina D'Água): aliados de cada alvo inimigo da fonte.
    // As reações são perguntadas uma a uma (state.efeitoPendente) e só depois os efeitos são aplicados.
    aplicarComReacoes(state, source, a, choice, only = null, bonusDano = 0) {
        const fila = [];
        // Aliados de `alvo` (vivos, no alcance da reação) com reação ao evento.
        const apoios = (alvo, evento) => {
            for (const o of state.pieces) if (o.player === alvo.player && o.id !== alvo.id && Engine.isAlive(o))
                for (const h of Engine.gatilhos(o, evento, 'reacao'))
                    if (Rules.distancia(o, alvo) <= Engine.caracteristicas(o, h).alcance) fila.push({ donoId: o.id, abilityId: h.id, alvoId: alvo.id });
        };
        if (source && Engine.causaDano(a)) {
            const alvos = Engine.alvosDoUso(state, source, a, choice, only).filter(t => Engine.isAlive(t));
            if (Engine.ehAtaque(a) && alvos.length) apoios(source, 'aliadoCausaDanoComAtaque');
            for (const t of alvos) if (t.player !== source.player) apoios(t, 'aliadoRecebeDano');
            // Passiva consomeRecurso (Penitente): acertou a Jogada de Ataque → pergunta antes dos apoios, um marcador por vez.
            if (Engine.ehAtaque(a) && alvos.length) for (const h of Engine.abilitiesOf(source))
                if (h.tipo === 'passiva' && h.consomeRecurso && Engine.recurso(source, h.consomeRecurso) > 0) fila.unshift({ donoId: source.id, abilityId: h.id, alvoId: source.id });
        }
        if (!fila.length) {
            Engine.applyEffects(state, source, a, choice, only, bonusDano ? { bonusDano } : null);
            return;
        }
        state.efeitoPendente = { pieceId: source.id, abilityId: a.id, choice, only, bonusDano, reducaoDano: {}, fila };
        Engine.proximoApoio(state);
    },

    proximoApoio(state) {
        const ap = state.efeitoPendente;
        if (!ap) return;
        while (ap.fila.length) {
            const { donoId, abilityId, alvoId } = ap.fila.shift();
            const dono = Rules.pieceById(state, donoId);
            const h = Engine.def(abilityId);
            const alvo = Rules.pieceById(state, alvoId);
            if (h && h.consomeRecurso) {
                const n = dono && Engine.isAlive(dono) ? Engine.recurso(dono, h.consomeRecurso) : 0, cfg = CONFIG.recursos[h.consomeRecurso] || {};
                if (n > 0) {
                    state.pending = { tipo: 'reacao', donoId, abilityId, alvoId, apoio: true, fonteId: ap.pieceId, consumo: true, rotulos: ['Consumir', 'Parar'],
                        pergunta: `${h.nome}: consumir 1 ${cfg.icone || ''} ${cfg.singular || h.consomeRecurso} para +1 de dano neste ataque? (tem ${n}${ap.bonusDano ? `; bônus atual +${ap.bonusDano}` : ''})` };
                    return;
                }
                continue;
            }
            if (Engine.reacaoDisponivel(dono, h) && alvo && Engine.isAlive(alvo)) {
                state.pending = { tipo: 'reacao', donoId, abilityId, alvoId, apoio: true, fonteId: ap.pieceId };
                return;
            }
        }
        state.efeitoPendente = null;
        const piece = Rules.pieceById(state, ap.pieceId);
        const a = Engine.def(ap.abilityId);
        if (piece) Engine.applyEffects(state, piece, a, ap.choice, ap.only, { bonusDano: ap.bonusDano, reducaoDano: ap.reducaoDano });
    },

    // Resposta a state.pending 'reacao' (use = true: paga o custo e aplica). Reações de apoio (Selo, Cortina) só
    // ajustam o efeito pendente; ao fim, segue para o próximo apoio da fila.
    resolveReaction(state, use) {
        const pd = state.pending;
        if (!pd || pd.tipo !== 'reacao') return false;
        const owner = Rules.pieceById(state, pd.donoId);
        const a = Engine.def(pd.abilityId);
        const alvo = Rules.pieceById(state, pd.alvoId);
        const ap = state.efeitoPendente;
        state.pending = null;

        // Consumo de recurso de uma passiva (Penitente): +1 de dano por marcador, perguntando de novo enquanto houver.
        if (pd.consumo) {
            const r = a && a.consomeRecurso, cfg = CONFIG.recursos[r] || {};
            if (use && owner && ap && Engine.recurso(owner, r) > 0) {
                owner.recursos[r]--;
                ap.bonusDano += 1;
                Engine.log(state, `${Engine.label(owner)} consome 1 ${cfg.singular || r} (${a.nome}): +1 de dano (${owner.recursos[r]}/${cfg.max})`);
                if (owner.recursos[r] > 0) ap.fila.unshift({ donoId: owner.id, abilityId: a.id, alvoId: pd.alvoId });
            }
            if (state.efeitoPendente && !state.pending) Engine.proximoApoio(state);
            Engine.resolveQueue(state);
            return true;
        }

        const custo = owner ? Engine.custo(owner, a) : 0;
        // Rerolagem (Desse Daí!): no meio da Jogada de Ataque (state.ataque); depois, o ataque continua.
        if (pd.rerolagem) {
            const at = state.ataque;
            if (at) at.recusou.push(`${pd.donoId}:${pd.abilityId}`);
            if (use && owner && at && Rules.spendAmago(owner, custo)) {
                owner.turn.usos[a.id] = (owner.turn.usos[a.id] || 0) + 1;
                Engine.log(state, `${Engine.label(owner)} usa a reação ${a.nome}: ${Engine.label(alvo)} rola ${pd.rerolagem === 'ataque' ? 'o ataque' : 'a esquiva'} de novo!`);
                Engine.fxHab(state, owner, a, pd.alvoId, alvo ? [alvo.id] : []);
                Engine.emit(state, 'ativouHabilidade', { peca: owner, habilidade: a, custo });
                Engine.gastarDescontos(state, owner, a);
                Engine.rerolar(state, pd.rerolagem);
            }
            Engine.continuarAtaque(state);
            Engine.resolveQueue(state);
            return true;
        }
        if (use && owner && Rules.spendAmago(owner, custo)) {
            owner.turn.usos[a.id] = (owner.turn.usos[a.id] || 0) + 1;
            Engine.log(state, `${Engine.label(owner)} usa a reação ${a.nome}!`);
            Engine.fxHab(state, owner, a, pd.alvoId, alvo ? [alvo.id] : []);
            Engine.emit(state, 'ativouHabilidade', { peca: owner, habilidade: a, custo });
            Engine.gastarDescontos(state, owner, a);
            if (a.concede) {
                owner.turn.extra = { tipo: a.concede.tipo, alvoId: pd.alvoId };
                Engine.log(state, `${Engine.label(owner)} ganha um uso extra de ${a.concede.tipo} contra ${Engine.label(alvo)}`);
            } else if (a.efeitoReacao === 'reducaoDano') {
                if (ap) {
                    const r = ap.reducaoDano[pd.alvoId] || (ap.reducaoDano[pd.alvoId] = { valor: 0, nome: a.nome });
                    r.valor += a.reducao || 1;
                    Engine.log(state, `${a.nome}: ${Engine.label(alvo)} sofrerá -${a.reducao || 1} de dano`);
                }
            } else if (a.efeitoReacao === 'bonusDano') {
                if (ap) {
                    ap.bonusDano += a.bonus || 1;
                    Engine.log(state, `${a.nome}: ataque de ${Engine.label(alvo)} recebe +${a.bonus || 1} de dano`);
                }
            } else if (a.efeitoReacao === 'ataque') {
                Engine.realizarAtaque(state, owner, a, pd.alvoId, [pd.alvoId]);
            } else {
                Engine.aplicarComReacoes(state, owner, a, pd.alvoId);
            }
        }
        if (pd.apoio && state.efeitoPendente && !state.pending) Engine.proximoApoio(state);
        Engine.resolveQueue(state);
        return true;
    },

    chooseTarget(state, targetId) {
        const pd = state.pending;
        if (!pd || pd.tipo !== 'escolha' || !pd.opcoes.includes(targetId)) return false;
        const owner = Rules.pieceById(state, pd.donoId);
        const a = Engine.def(pd.abilityId);
        state.pending = null;
        if (owner && targetId === null && pd.opcional) Engine.log(state, `${Engine.label(owner)} não usa ${a.nome}`);
        else if (owner) Engine.aplicarComReacoes(state, owner, a, targetId);
        Engine.resolveQueue(state);
        return true;
    },

    // valor: número | função(source, target) | { stat, mult, fixo } | 'estado' (valor do estado que acionou o efeito:
    // recalculado a partir de quem aplicou o estado, ou o valor guardado se essa Estrela não estiver mais em jogo).
    valorDe(source, valor, target, ctx = {}) {
        const piso = v => Math.max(0, Math.floor(v || 0));
        if (valor === 'estado') {
            const e = ctx.estado || {};
            return ctx.fonteEstado && e.valorBase ? Engine.valorDe(ctx.fonteEstado, e.valorBase, target) : piso(e.valor);
        }
        if (typeof valor === 'number') return piso(valor);
        if (typeof valor === 'function') return piso(valor(source, target, ctx.state));
        const base = valor.stat && source ? Rules.stat(source, valor.stat) * (valor.mult ?? 1) : 0;
        return piso(base + (valor.fixo || 0));
    },

    applyEffects(state, source, ability, choice, only, extra = null) {
        Engine.runEffects(state, source, ability, Engine.alvosDoUso(state, source, ability, choice, only), choice, extra);
    },

    // Alvos são calculados antes de qualquer efeito (ex.: o caminho do avanço é medido a partir da posição original).
    // extra: contexto adicional repassado aos efeitos (bonusDano, estado).
    runEffects(state, source, ability, targets, choice, extra = null) {
        if (source && ability && (ability.tipo === 'passiva' || ability.tipo === 'efeito')) Engine.fxHab(state, source, ability, choice, targets.map(t => t.id), true);
        const origens = new Map(targets.map(t => [t.id, { q: t.q, r: t.r }]));
        for (const ef of ability.efeitos || []) {
            const h = Engine.EFFECTS[ef.tipo];
            if (!h || (ef.se && !ef.se(source, targets, state))) continue; // se(source, alvos, state): condição do efeito
            if (ef.modo !== undefined && ef.modo !== choice) continue;     // modo: só roda na opção escolhida (alvo.modos)
            if (h.global) h.run(state, source, ability, ef, { ...extra, targets, choice, origens });
            else if (ef.naFonte) { if (source && Engine.isAlive(source)) h.run(state, source, ability, ef, { ...extra, target: source, targets, choice, origens }); }
            else for (const t of targets) if (Engine.isAlive(t) && !(ef.excetoFonte && t === source)) h.run(state, source, ability, ef, { ...extra, target: t, targets, choice, origens });
        }
    },

    // Efeitos genéricos. global: roda uma vez por uso; caso contrário, roda para cada alvo.
    EFFECTS: {
        dano: {
            // ctx.bonusDano: soma ao dano (Selo do Império, Recompensa da Lua); ctx.reducaoDano[id]: redução gasta
            // no primeiro dano desta habilidade naquele alvo (Cortina D'Água).
            run(state, source, ability, ef, ctx) {
                const t = ctx.target;
                const bonus = ctx.bonusDano || 0;
                const red = ctx.reducaoDano && ctx.reducaoDano[t.id];
                if (red) delete ctx.reducaoDano[t.id];
                const v = Engine.valorDe(source, ef.valor, t, ctx) + bonus - (red ? red.valor : 0);
                // ignoraArmaduraSeMenor (Sentença): Armadura atual do alvo (com a extra) menor que o dano → ignora a Armadura.
                const arm = t.stats.armadura + Rules.armaduraExtra(t);
                const ignoraArmadura = !!ef.ignoraArmaduraSeMenor && arm > 0 && arm < v;
                const zerou = () => ef.ultraSeZerarArmadura && arm > 0 && t.stats.armadura + Rules.armaduraExtra(t) === 0;
                const causa = ability.nome + (bonus ? ` ${bonus > 0 ? '+' : ''}${bonus}` : '') + (red ? `, -${red.valor} ${red.nome}` : '') + (ignoraArmadura ? ', ignora a armadura' : '');
                if (v <= 0 && red) Engine.log(state, `${Engine.label(t)} não sofre dano (${causa})`);
                const base = ef.valor && ef.valor.stat ? Rules.expandStats(ef.valor.stat) : []; // status em que o dano se baseia
                Engine.dealDamage(state, source, t, v, causa, ability, { base, ignoraArmadura });
                if (zerou()) Engine.tornarUltra(state, source, ability, `Armadura de ${Engine.label(t)} zerada`); // Descarga
            }
        },
        // Status secundários (ou marcadores internos). stat: chave | 'secundarios' | lista.
        modificador: {
            run(state, source, ability, ef, { target }) {
                for (const k of Rules.expandStats(ef.stat).filter(k => Rules.categoriaStat(k) !== 'primarios')) {
                    const imune = Engine.imutavel(target, k);
                    if (imune) { Engine.log(state, `${Engine.label(target)}: ${k} não pode ser alterado (${imune.nome})`); continue; }
                    // valor: número (pode ser negativo) | { stat, fixo } | função — calculado no momento da aplicação
                    const delta = typeof ef.valor === 'number' ? ef.valor : typeof ef.valor === 'function' ? ef.valor(source, target) : Engine.valorDe(source, ef.valor, target); // pode ser negativo
                    if (!delta) continue;
                    target.effects.push({ origem: ability.nome, habilidade: ability.id, stat: k, delta, ...Engine.expiry(state, source, ef.duracao) });
                    Engine.log(state, `${Engine.label(target)}: ${(CONFIG.stats.rotulosInternos || {})[k] || k} ${delta > 0 ? '+' : ''}${delta} (${ability.nome})`);
                }
            }
        },
        marca: {
            // unica: a Estrela só mantém uma marca deste tipo em jogo (a anterior sai de quem a tinha).
            run(state, source, ability, ef, { target }) {
                if (ef.unica && source) state.pieces.forEach(p => {
                    if (!Engine.temMarcaDe(p, ef.marca, source)) return;
                    p.effects = p.effects.filter(e => !(e.tipo === 'marca' && e.marca === ef.marca && e.fonteId === source.id));
                    if (p !== target) Engine.log(state, `${Engine.label(p)} perde ${CONFIG.marks[ef.marca].nome}`);
                });
                Engine.applyMark(state, source, target, ef.marca);
            }
        },
        // Estado com gatilho próprio: gatilho 'sofreuDano' enfileira `aciona` (ex.: Cinturão de Dinamites);
        // aoEvento: roda `aciona` imediatamente quando o evento ocorre (ver Engine.emit).
        // usos: número de acionamentos (padrão 1; null = ilimitado). valor: lido com valor 'estado' — recalculado a partir de quem
        // aplicou o estado no momento em que ele aciona (se essa Estrela não estiver mais em jogo, usa o valor do momento da aplicação).
        estado: {
            run(state, source, ability, ef, { target }) {
                // acumula: soma o modificador de dano (danoAtaque) ao estado ainda não gasto, em vez de substituí-lo.
                const atual = ef.acumula && target.effects.find(e => e.tipo === 'estado' && e.estado === ef.estado);
                if (atual) {
                    atual.danoAtaque = (atual.danoAtaque || 0) + (ef.danoAtaque || 0);
                    Engine.log(state, `${Engine.label(target)}: ${ef.nome || ability.nome} acumula (próximo ataque ${atual.danoAtaque > 0 ? '+' : ''}${atual.danoAtaque} de dano)`);
                    return;
                }
                target.effects = target.effects.filter(e => !(e.tipo === 'estado' && e.estado === ef.estado));
                // unicoDaFonte (Chegada): só uma Estrela por vez com o estado desta fonte.
                if (ef.unicoDaFonte && source) for (const p of state.pieces)
                    if (p !== target) p.effects = (p.effects || []).filter(e => !(e.tipo === 'estado' && e.estado === ef.estado && e.fonteId === source.id));
                target.effects.push({
                    tipo: 'estado', estado: ef.estado, origem: ef.nome || ability.nome, habilidade: ability.id,
                    gatilho: ef.gatilho, aoEvento: ef.aoEvento, aciona: ef.aciona, danoAtaque: ef.danoAtaque, compartilhaDano: ef.compartilhaDano, usos: ef.usos === null ? null : (ef.usos ?? 1),
                    ...(ef.limiteDano != null ? { limiteDano: ef.limiteDano } : {}),
                    valor: ef.valor ? Engine.valorDe(source, ef.valor, target) : undefined,
                    valorBase: ef.valor && typeof ef.valor === 'object' ? ef.valor : undefined, fonteId: source ? source.id : null,
                    debuff: !!ef.debuff, buff: !ef.debuff, ...Engine.expiry(state, source, ef.duracao)
                });
                Engine.log(state, `${Engine.label(target)} recebe ${ef.nome || ability.nome}${ef.duracao && ef.duracao.turnos ? ` (${ef.duracao.turnos} turnos)` : ''}`);
            }
        },
        // Status primários: altera o valor atual (valor > 0 recupera, < 0 reduz), limitado a [0, máximo]. Não é dano.
        // stat: 'vida' | 'amago' | 'primarios' | lista.
        alterarStatus: {
            run(state, source, ability, ef, ctx) {
                const target = ctx.target;
                const sinal = ef.reduzir ? -1 : 1;
                const v = sinal * Engine.valorDe(source, ef.valor, target, ctx);
                if (!v) return;
                for (const k of Rules.expandStats(ef.stat).filter(k => Rules.categoriaStat(k) === 'primarios')) {
                    const max = target.stats[k + 'Max'] ?? Infinity;
                    const antes = target.stats[k];
                    target.stats[k] = Math.max(0, Math.min(max, antes + v));
                    const d = target.stats[k] - antes;
                    if (d) Engine.log(state, `${Engine.label(target)}: ${k} ${d > 0 ? '+' : ''}${d} (${ability.nome})`);
                    if (k === 'vida' && d > 0) Engine.emit(state, 'curou', { fonte: source, alvo: target, habilidade: ability, valor: d });
                    if (k === 'vida' && antes > 0 && !Engine.isAlive(target)) {
                        Engine.log(state, `${Engine.label(target)} foi derrotado`);
                        Engine.registrarAbate(state, source, target, ability);
                    }
                }
            }
        },
        // Altera características secundárias das habilidades do alvo (ex.: custo -1, alcance +1, tornar repetível).
        // { caracteristica, valor (número; booleano para repetivel/ultraRapida), filtro: { habilidade, tipo }, duracao }
        // maximo: em vez de somar, limita o valor (ex.: Fumacê: alcance no máximo 1).
        modificarHabilidade: {
            run(state, source, ability, ef, { target }) {
                const delta = ef.maximo != null ? 0 : ef.valor;
                const debuff = ef.debuff ?? (ef.caracteristica === 'custo' ? delta > 0 : (typeof delta === 'number' ? delta < 0 : !delta));
                target.effects.push({
                    caracteristica: ef.caracteristica, delta, ...(ef.maximo != null ? { maximo: ef.maximo } : {}), ...(ef.gastaAoUsar ? { gastaAoUsar: true } : {}), filtro: ef.filtro || null, origem: ability.nome, habilidade: ability.id,
                    debuff, buff: !debuff, ...Engine.expiry(state, source, ef.duracao)
                });
                Engine.log(state, `${Engine.label(target)}: ${CONFIG.habilidades.secundarias[ef.caracteristica]?.label || ef.caracteristica} ${ef.maximo != null ? `no máximo ${ef.maximo}` : typeof delta === 'number' ? (delta > 0 ? '+' : '') + delta : (delta ? 'ativado' : 'removido')} (${ability.nome})`);
            }
        },
        // Transfere Renome entre a fonte e o alvo. direcao: 'roubar' (alvo → fonte) | 'doar' (fonte → alvo).
        // valor: { fixo: N } | 'todos'. Limitado ao que quem entrega possui.
        transferirRenome: {
            run(state, source, ability, ef, { target }) {
                if (!source) return;
                const [de, para] = ef.direcao === 'doar' ? [source, target] : [target, source];
                if (de === para) return;
                const disp = de.renome || 0;
                const n = Math.min(disp, ef.valor === 'todos' ? disp : Engine.valorDe(source, ef.valor, target));
                if (n <= 0) return;
                de.renome = disp - n;
                para.renome = (para.renome || 0) + n;
                Engine.log(state, `${Engine.label(para)} recebe ${n} Renome de ${Engine.label(de)} (${ability.nome})`);
                Rules.checarMetaRenome(state, para.player);
                Engine.emit(state, 'transferiuRenome', { de, para, valor: n, habilidade: ability });
            }
        },
        // Armadura temporária: substitui o escudo anterior da mesma habilidade.
        escudo: {
            run(state, source, ability, ef, { target }) {
                const v = Engine.valorDe(source, ef.valor, target, { state });
                if (v <= 0) return;
                target.effects = target.effects.filter(e => !(e.tipo === 'escudo' && e.habilidade === ability.id));
                target.effects.push({ tipo: 'escudo', origem: ability.nome, habilidade: ability.id, restante: v, buff: true, ...Engine.expiry(state, source, ef.duracao) });
                Engine.log(state, `${Engine.label(target)}: armadura +${v} (${ability.nome})`);
            }
        },
        // Transfere TODO o valor atual de um atributo para outro pela duração (ex.: Sobrecarregar Reator); a origem fica em 0.
        // de 'magico' → 'armadura': Poder Mágico −N e Armadura temporária +N (consumida pelo dano, como um escudo).
        // de 'armadura' → 'magico': a Armadura (incluindo a temporária) vai a 0 e não é restaurada no início do turno
        // enquanto durar (travaArmadura); Poder Mágico +N. Ao expirar, a Armadura convertida volta (até o máximo).
        converter: {
            run(state, source, ability, ef, { target }) {
                const base = { origem: ability.nome, habilidade: ability.id, conversao: true, debuff: false, ...Engine.expiry(state, source, ef.duracao) };
                const imune = Engine.imutavel(target, 'magico');
                if (imune) { Engine.log(state, `${Engine.label(target)}: magico não pode ser alterado (${imune.nome})`); return; }
                target.effects = target.effects.filter(e => e.habilidade !== ability.id); // reaplicar substitui a conversão anterior
                if (ef.de === 'magico') {
                    const v = Rules.stat(target, 'magico');
                    if (v <= 0) { Engine.log(state, `${Engine.label(target)}: sem Poder Mágico para converter (${ability.nome})`); return; }
                    target.effects.push({ ...base, stat: 'magico', delta: -v });
                    target.effects.push({ ...base, tipo: 'escudo', restante: v, buff: true });
                    Engine.log(state, `${Engine.label(target)}: Poder Mágico ${v} → armadura +${v} (${ability.nome})`);
                } else {
                    const v = target.stats.armadura + Rules.armaduraExtra(target);
                    if (v <= 0) { Engine.log(state, `${Engine.label(target)}: sem Armadura para converter (${ability.nome})`); return; }
                    target.effects = target.effects.filter(e => e.tipo !== 'escudo');
                    target.stats.armadura = 0;
                    target.effects.push({ ...base, travaArmadura: true, devolve: Math.min(v, target.stats.armaduraMax) });
                    target.effects.push({ ...base, stat: 'magico', delta: v });
                    Engine.log(state, `${Engine.label(target)}: Armadura ${v} → Poder Mágico +${v} (${ability.nome})`);
                }
            }
        },
        // Ativa os efeitos de outra habilidade da fonte (ex.: Investida → Defesa Erguida), se a condição for atendida.
        ativarHabilidade: {
            global: true,
            run(state, source, ability, ef) {
                const h = Engine.def(ef.habilidade);
                if (!source || !h || !Engine.isAlive(source)) return;
                Engine.log(state, `${ability.nome} ativa ${h.nome}`);
                Engine.runEffects(state, source, h, [source], null);
            }
        },
        limparDebuffs: {
            run(state, source, ability, ef, { target }) { Engine.removeDebuffs(state, target, ability.nome); }
        },
        avancar: {
            global: true,
            run(state, source, ability, ef, { choice }) {
                const dest = Engine.parseAvanco(choice);
                if (!source || !dest || !Rules.isHexOnBoard(dest.q, dest.r) || Rules.pieceAt(state, dest.q, dest.r)) return;
                const caminho = [{ q: source.q, r: source.r }, ...Engine.linha(source, dest.dir, dest.passos)];
                const fim = caminho[caminho.length - 1];
                if (fim.q !== dest.q || fim.r !== dest.r) caminho.push({ q: dest.q, r: dest.r });
                Engine.moveTo(state, source, dest, { caminho });
                Engine.log(state, `${Engine.label(source)} avança ${dest.passos} zona(s) e para em (${dest.q}, ${dest.r})`);
            }
        },
        // Objetos (CONFIG.objetos). lancarObjeto: deixa o objeto da fonte na zona escolhida (alvo 'trajeto').
        lancarObjeto: {
            global: true,
            run(state, source, ability, ef, { choice }) {
                const c = Engine.parseTrajeto(choice);
                if (!source || !c || !Engine.objetoComDono(source, ef.objeto)) return;
                const h = Engine.linha(source, c.dir, c.passos).pop();
                source.objetos[ef.objeto] = { q: h.q, r: h.r };
                Engine.log(state, `A ${(CONFIG.objetos[ef.objeto] || {}).nome || ef.objeto} de ${Engine.label(source)} fica em (${h.q}, ${h.r})`);
            }
        },
        // A fonte vai para a zona escolhida (alvo 'zona' livre, adjacente), sem gastar movimento e sem acionar
        // reações de movimento (Machadada, Compelir). Escolha null = fica onde está.
        moverPara: {
            global: true,
            run(state, source, ability, ef, { choice }) {
                const h = Engine.parseZona(choice);
                if (!source || !h || !Engine.isAlive(source) || Rules.hexDistance(source, h) !== 1 || !Engine.zonaLivre(state, h)) return;
                Engine.moveTo(state, source, h, { caminho: [{ q: source.q, r: source.r }, h], semGatilhos: true });
                Engine.log(state, `${Engine.label(source)} se move para (${h.q}, ${h.r}) (${ability.nome})`);
            }
        },
        // Devolve o objeto à fonte, de onde estiver (puxar: só muda o texto do registro).
        recolherObjeto: {
            global: true,
            run(state, source, ability, ef) { if (source) Engine.recolherObjeto(state, source, ef.objeto, ef.puxar ? 'puxada' : null); }
        },
        // Mais um uso da habilidade nesta jogada, sem gastar a ação (o custo dela é pago normalmente).
        concederUso: {
            global: true,
            run(state, source, ability, ef) {
                if (!source || !source.turn || !Engine.def(ef.habilidade)) return;
                source.turn.extra = { habilidade: ef.habilidade };
                Engine.log(state, `${Engine.label(source)} ganha um uso extra de ${Engine.def(ef.habilidade).nome}`);
            }
        },
        // A fonte salta sobre o alvo escolhido e para na zona atrás dele (acontece mesmo se a Jogada de Ataque errar).
        saltarSobre: {
            global: true,
            run(state, source, ability, ef, { choice }) {
                const alvo = Rules.pieceById(state, choice);
                const dest = source && alvo && Engine.zonaAtras(source, alvo);
                if (!dest || !Engine.zonaLivre(state, dest)) { if (source) Engine.log(state, `${Engine.label(source)} não tem onde aterrissar (${ability.nome})`); return; }
                Engine.moveTo(state, source, dest, { caminho: [{ q: source.q, r: source.r }, { q: alvo.q, r: alvo.r }, dest] });
                Engine.log(state, `${Engine.label(source)} salta sobre ${Engine.label(alvo)} e aterrissa em (${dest.q}, ${dest.r})`);
            }
        },
        // Salto até a zona escolhida ao lado do alvo (alvo 'salto'); acontece mesmo se a Jogada de Ataque errar.
        saltarPara: {
            global: true,
            run(state, source, ability, ef, { choice }) {
                const c = Engine.parseSalto(choice), alvo = c && Rules.pieceById(state, c.id);
                if (!source || !c || !Engine.isAlive(source)) return;
                if (c.q === source.q && c.r === source.r) return; // já estava ao lado do alvo
                if (!Engine.zonaLivre(state, c)) { Engine.log(state, `${Engine.label(source)} não tem onde aterrissar (${ability.nome})`); return; }
                Engine.moveTo(state, source, { q: c.q, r: c.r }, { caminho: [{ q: source.q, r: source.r }, { q: c.q, r: c.r }] });
                Engine.log(state, `${Engine.label(source)} pula${alvo ? ` até ${Engine.label(alvo)}` : ''} e aterrissa em (${c.q}, ${c.r})`);
            }
        },
        // Troca marcadores de recurso por Âmago (Absorver Carga): escolha 0 = 1 marcador, 1 = 2...
        trocarRecurso: {
            global: true,
            run(state, source, ability, ef, { choice }) {
                const cfg = CONFIG.recursos[ef.recurso];
                const n = source && cfg ? Math.min(Engine.recurso(source, ef.recurso), (Number(choice) || 0) + 1) : 0;
                if (n <= 0) return;
                source.recursos[ef.recurso] -= n;
                const antes = source.stats.amago;
                Rules.restoreAmago(source, n);
                Engine.log(state, `${Engine.label(source)} consome ${Engine.textoRecurso(ef.recurso, n)} e recupera ${source.stats.amago - antes} Âmago (${ability.nome})`);
            }
        },
        // Zera o movimento restante do alvo neste turno (não altera a Agilidade).
        zerarMovimento: {
            run(state, source, ability, ef, { target }) {
                if (!target.turn) return;
                target.turn.movimentoZerado = true;
                Engine.log(state, `${Engine.label(target)} não pode mais se mover neste turno (${ability.nome})`);
            }
        },
        // Movimento forçado. direcao: 'afastar' (empurra para longe da fonte), 'aproximar', 'atravessar' (por cima da fonte, para a zona oposta).
        deslocar: {
            run(state, source, ability, ef, ctx) { if (source) Engine.forcedMove(state, source, ctx.target, ef, ability, ctx); }
        },
        // A fonte se move para a zona que o alvo ocupava antes da habilidade (se estiver livre).
        ocuparOrigemDoAlvo: {
            run(state, source, ability, ef, { target, origens }) {
                const o = origens.get(target.id);
                if (!source || !o || !Rules.isHexOnBoard(o.q, o.r) || Rules.pieceAt(state, o.q, o.r)) return;
                Engine.moveTo(state, source, o, {});
                Engine.log(state, `${Engine.label(source)} avança para (${o.q}, ${o.r})`);
            }
        },
        // Enfileira uma habilidade interna com escolha de alvo própria (excluindo os alvos deste uso).
        acionarHabilidade: {
            global: true,
            run(state, source, ability, ef, { targets }) {
                if (!source) return;
                state.triggers.push({ donoId: source.id, abilityId: ef.habilidade, origemId: source.id, excluir: targets.map(t => t.id) });
            }
        },
        // Ganha (ou perde, valor < 0) um recurso especial, até o máximo. umaVezPorTurno: só um ganho por turno da Estrela.
        recurso: {
            run(state, source, ability, ef, { target }) {
                const cfg = CONFIG.recursos[ef.recurso];
                if (!cfg || !target.recursos) return;
                const t = target.turn;
                if (ef.umaVezPorTurno && t && t.recursoGanho && t.recursoGanho[ef.recurso]) return;
                const antes = target.recursos[ef.recurso] || 0;
                const valor = typeof ef.valor === 'number' ? ef.valor : Engine.valorDe(target, ef.valor, target); // ex.: { stat: 'magico' }
                target.recursos[ef.recurso] = Math.max(0, Math.min(cfg.max ?? Infinity, antes + valor));
                const d = target.recursos[ef.recurso] - antes;
                if (!d) return;
                if (ef.umaVezPorTurno && t) t.recursoGanho = { ...(t.recursoGanho || {}), [ef.recurso]: true };
                Engine.log(state, `${Engine.label(target)}: ${d > 0 ? '+' : ''}${d} ${Math.abs(d) === 1 ? cfg.singular : cfg.nome} (${target.recursos[ef.recurso]}/${cfg.max})`);
            }
        },
        recuperarAmago: {
            global: true,
            run(state, source, ability, ef) {
                if (!source) return;
                const pago = source.turn && source.turn.custoPago && source.turn.custoPago[ability.id];
                const v = ef.valor === 'custo' ? (pago ?? Engine.custo(source, ability)) : Engine.valorDe(source, ef.valor);
                if (v <= 0) return;
                Rules.restoreAmago(source, v);
                Engine.log(state, `${Engine.label(source)} recupera ${v} Âmago (${ability.nome})`);
            }
        }
    },

    expiry(state, source, duracao) {
        if (!source || (duracao && (duracao.ate === 'ser-gasto' || duracao.ate === 'permanente'))) return {}; // 'ser-gasto': sem expiração, só sai quando consumido
        if (duracao && duracao.turnos) return { turnosRestantes: duracao.turnos, contaJogador: source.player };
        const ate = (duracao && duracao.ate) || 'fim-proximo-turno';
        if (ate === 'fim-turno') { // fim do turno em andamento (de quem estiver jogando)
            const b = state.blocks && state.blocks[state.blockIndex];
            return { expiraEvento: 'turnEnd', expiraJogador: b ? b.player : source.player, expiraRodada: state.round };
        }
        return {
            expiraEvento: ate === 'fim-proximo-turno' ? 'turnEnd' : 'turnStart',
            expiraJogador: source.player,
            expiraRodada: Rules.nextTurnRound(state, source.player)
        };
    },

    applyMark(state, source, target, markId) {
        const m = CONFIG.marks[markId];
        if (!m || !target || !Engine.isAlive(target)) return;
        target.effects.push({ tipo: 'marca', marca: markId, origem: m.nome, debuff: m.debuff !== false, fonteId: source ? source.id : null, ...Engine.expiry(state, source, m.duracao) });
        Engine.log(state, `${Engine.label(target)} recebe ${m.nome} (×${Rules.marks(target, markId)})`);
    },

    removeDebuffs(state, piece, causa) {
        const before = piece.effects.length;
        piece.effects = piece.effects.filter(e => !Engine.isDebuff(e));
        const n = before - piece.effects.length;
        if (n) Engine.log(state, `${Engine.label(piece)}: ${n} debuff(s) removido(s)${causa ? ` (${causa})` : ''}`);
        return n;
    },

    // info.base: status em que o dano se baseia (ex.: ['magico']); info.compartilhado: parte transferida (não volta a ser dividida).
    dealDamage(state, source, target, amount, causa, ability = null, info = {}) {
        if (amount <= 0 || !Engine.isAlive(target)) return;
        // Divisão de dano (ex.: Projeção AA): um aliado adjacente com o estado assume parte do dano.
        const prot = !info.compartilhado && Engine.protetorDe(state, target);
        if (prot) {
            const parte = Math.floor(amount * prot.estado.compartilhaDano);
            if (parte > 0) {
                Engine.log(state, `${prot.estado.origem}: ${Engine.label(prot.peca)} assume ${parte} de ${amount} do dano em ${Engine.label(target)}`);
                Engine.receberDano(state, source, target, amount - parte, causa, ability, info);
                Engine.receberDano(state, source, prot.peca, parte, `${causa} → ${prot.estado.origem}`, ability, { ...info, compartilhado: true });
                return;
            }
        }
        Engine.receberDano(state, source, target, amount, causa, ability, info);
    },

    // Aliado vivo, adjacente ao alvo, com estado que divide o dano (compartilhaDano = fração assumida).
    protetorDe(state, target) {
        for (const p of state.pieces) {
            if (p === target || p.player !== target.player || !Engine.isAlive(p) || Rules.hexDistance(p, target) !== 1) continue;
            const estado = (p.effects || []).find(e => e.tipo === 'estado' && e.compartilhaDano);
            if (estado) return { peca: p, estado };
        }
        return null;
    },

    receberDano(state, source, target, amount, causa, ability = null, info = {}) {
        if (amount <= 0 || !Engine.isAlive(target)) return;
        // Passivas que reduzem o dano recebido (reduzDano: { valor, minimo, base }); seus efeitos rodam na própria Estrela.
        const reatores = [];
        for (const a of Engine.abilitiesOf(target)) {
            const rd = a.tipo === 'passiva' && a.reduzDano;
            if (!rd || (rd.base && !(info.base || []).includes(rd.base))) continue;
            const novo = Math.max(Math.min(amount, rd.minimo ?? 0), amount - rd.valor);
            if (novo < amount) causa += `, -${amount - novo} ${a.nome}`;
            amount = novo;
            reatores.push(a);
        }
        // Estado limiteDano (Chegada): com a fonte viva e adjacente, no máximo N de dano por instância.
        const lim = (target.effects || []).find(e => e.tipo === 'estado' && e.limiteDano != null && amount > e.limiteDano
            && (f => f && Engine.isAlive(f) && Rules.hexDistance(f, target) === 1)(Rules.pieceById(state, e.fonteId)));
        if (lim) { causa += `, máx. ${lim.limiteDano} ${lim.origem}`; amount = lim.limiteDano; }
        const r = Rules.applyDamage(target, amount, !!info.ignoraArmadura);
        Engine.fx(state, { k: 'dano', de: source ? source.id : null, para: target.id, v: amount, abs: r.absorbed, vida: r.lifeLost, h: (ability && ability.id) || null });
        const partes = [r.absorbed ? `armadura -${r.absorbed}` : '', r.lifeLost ? `vida -${r.lifeLost}` : ''].filter(Boolean).join(', ');
        Engine.log(state, `${Engine.label(target)} sofre ${amount} de dano (${causa})${partes ? ': ' + partes : ''}`);
        if (Engine.isAlive(target)) for (const a of reatores) Engine.runEffects(state, target, a, [target], null);
        if (source) {
            Engine.emit(state, 'causouDano', { fonte: source, alvo: target, habilidade: ability, valor: amount, absorvido: r.absorbed });
            Rules.registrarDano(state, source, target);
        }
        if (!Engine.isAlive(target)) {
            Engine.log(state, `${Engine.label(target)} foi derrotado`);
            Engine.registrarAbate(state, source, target, ability);
            return;
        }
        if (r.lifeLost === 0 && !CONFIG.rules.passivesTriggerOnAbsorbedDamage) return;
        for (const e of [...target.effects]) {
            if (e.tipo !== 'estado' || e.gatilho !== 'sofreuDano') continue;
            state.triggers.push({ donoId: target.id, abilityId: e.aciona, origemId: source ? source.id : null, valor: amount });
            Engine.gastarEstado(state, target, e);
        }
        for (const a of Engine.gatilhos(target, 'sofreuDano', 'passiva')) {
            // condicao(ctx, dono, state), ctx = { fonte, alvo, habilidade, valor } (ex.: Dar no Pé: só dano de Jogada de Ataque)
            if (a.gatilho.condicao && !a.gatilho.condicao({ fonte: source, alvo: target, habilidade: ability, valor: amount }, target, state)) continue;
            state.triggers.push({ donoId: target.id, abilityId: a.id, origemId: source ? source.id : null, valor: amount });
        }
    },

    // Quem derrota uma inimiga recebe Renome pelo abate + o Renome do derrotado. Evento 'derrotou' { fonte, alvo, habilidade, renome }.
    registrarAbate(state, source, target, ability = null) {
        // Sem autor ou abate de aliada: ninguém ganha Renome (removeDead solta o Renome do derrotado no tabuleiro).
        if (!source || source === target || source.player === target.player) return;
        const ganho = (CONFIG.renome.porAbate || 0) + (target.renome || 0);
        target.renome = 0;
        source.renome = (source.renome || 0) + ganho;
        if (ganho) Engine.log(state, `${Engine.label(source)} recebe ${ganho} Renome pelo abate (total ${source.renome})`);
        Rules.checarMetaRenome(state, source.player);
        Engine.emit(state, 'derrotou', { fonte: source, alvo: target, habilidade: ability, renome: ganho });
    },

    // Passivas imediatas: gatilho { evento, condicao(ctx, dono, state), alvo: 'dono' (padrão) | 'alvo' }.
    // Eventos: 'causouDano' { fonte, alvo, habilidade, valor }, 'moveu' { peca, caminho, trilha, trilhaAntes, forcado },
    //          'colisao' { peca, fonte, habilidade, com: { tipo: 'terreno' | 'estrela', peca } }.
    emit(state, evento, ctx) {
        if (evento === 'causouDano') Engine.ultraContraMarca(state, ctx);
        for (const dono of [...state.pieces]) {
            if (!Engine.isAlive(dono)) continue;
            const alvosDe = g => g.alvo === 'alvo' ? [ctx.alvo || ctx.peca].filter(Boolean) : [dono];
            for (const p of Engine.gatilhos(dono, evento, 'passiva')) {
                const g = p.gatilho;
                if (g.condicao && !g.condicao(ctx, dono, state)) continue;
                // Passiva com alvo a escolher (ex.: Chegada): entra na fila e é resolvida como as de turno.
                if (p.alvo && p.alvo.tipo && p.alvo.tipo !== 'proprio') { state.triggers = state.triggers || []; state.triggers.push({ donoId: dono.id, abilityId: p.id, origemId: dono.id }); continue; }
                Engine.runEffects(state, dono, p, alvosDe(g), null);
            }
            // Reações do próprio dono a eventos emitidos aqui: entram na fila (perguntadas em resolveQueue).
            // As reações a ataques/arredores/apoio usam eventos próprios, enfileirados em outros pontos.
            for (const r of Engine.gatilhos(dono, evento, 'reacao')) {
                const g = r.gatilho;
                if (g.condicao && !g.condicao(ctx, dono, state)) continue;
                state.triggers = state.triggers || [];
                if (!Engine.reacaoDisponivel(dono, r) || state.triggers.some(t => t.donoId === dono.id && t.abilityId === r.id)) continue;
                state.triggers.push({ donoId: dono.id, abilityId: r.id, origemId: dono.id });
            }
            // Estados com aoEvento (ex.: Pulso Restaurador, Luz de Benevolência): o dono do estado aciona `aciona`.
            for (const e of [...dono.effects]) {
                if (e.tipo !== 'estado' || e.aoEvento !== evento || !dono.effects.includes(e)) continue;
                const h = Engine.def(e.aciona);
                const g = (h && h.gatilho) || {};
                if (!h || (g.condicao && !g.condicao(ctx, dono, state, e))) continue;
                const alvos = alvosDe(g);
                Engine.gastarEstado(state, dono, e);
                const fonte = e.fonteId != null ? Rules.pieceById(state, e.fonteId) : null;
                Engine.runEffects(state, dono, h, alvos, null, { estado: e, fonteEstado: fonte && Engine.isAlive(fonte) ? fonte : null });
            }
        }
    },

    // O que impede uma Estrela de entrar na zona (null = livre).
    bloqueio(state, hex) {
        if (!Rules.isHexOnBoard(hex.q, hex.r)) return { tipo: 'terreno' };
        const p = Rules.pieceAt(state, hex.q, hex.r);
        return p ? { tipo: 'estrela', peca: p } : null;
    },

    // Move uma Estrela e registra a trilha do turno (usada por gatilhos de movimento, ex.: Impulso Bestial).
    // semGatilhos (Dar no Pé): anda normalmente na tela, mas não conta como movimento voluntário (nem para a trilha).
    moveTo(state, piece, hex, { caminho, forcado = false, semGatilhos = false } = {}) {
        const path = caminho || [{ q: piece.q, r: piece.r }, { q: hex.q, r: hex.r }];
        piece.q = hex.q;
        piece.r = hex.r;
        Engine.fx(state, { k: 'mov', id: piece.id, cam: path.map(h => [h.q, h.r]), f: forcado ? 1 : 0 });
        const t = piece.turn;
        let trilha = [], trilhaAntes = [];
        if (t && !forcado && !semGatilhos) {
            t.moveuVoluntario = true;
            Engine.checkLeaveTriggers(state, piece, path);
            Engine.checkEnterTriggers(state, piece, path);
            const last = t.trilha && t.trilha[t.trilha.length - 1];
            trilhaAntes = last && last.q === path[0].q && last.r === path[0].r ? t.trilha : [path[0]];
            trilha = [...trilhaAntes, ...path.slice(1)];
            t.trilha = trilha;
        } else if (t) {
            t.trilha = null;
        }
        Engine.emit(state, 'moveu', { peca: piece, caminho: path, trilha, trilhaAntes, forcado: forcado || semGatilhos });
    },

    // Movimento voluntário pelo caminho (zonas adjacentes, livres, dentro do movimento restante).
    mover(state, piece, path) {
        if (!piece || !Rules.canSelect(state, piece) || !path || path.length < 2) return false;
        if (path[0].q !== piece.q || path[0].r !== piece.r) return false;
        if (path.length - 1 > Rules.movementLeft(piece)) return false;
        for (let i = 1; i < path.length; i++) {
            if (Rules.hexDistance(path[i - 1], path[i]) !== 1 || Engine.bloqueio(state, path[i])) return false;
        }
        // Reação 'inimigoEntrouNosArredores' disponível (ex.: Compelir): o movimento para na zona em que entrou nos arredores.
        const corte = Engine.paradaPorReacao(state, piece, path);
        if (corte < path.length - 1) path = path.slice(0, corte + 1);
        const cost = path.length - 1;
        Rules.beginActivation(state, piece);
        Engine.novoGrupoLog(state);
        piece.turn.moveSpent += cost;
        const fim = path[path.length - 1];
        Engine.log(state, `${Engine.label(piece)} se move ${cost} zona(s) até (${fim.q}, ${fim.r})`);
        Engine.moveTo(state, piece, fim, { caminho: path.map(h => ({ q: h.q, r: h.r })) });
        Engine.resolveQueue(state);
        return true;
    },

    // Estrelas inimigas de `piece` ainda em jogo.
    inimigosVivos(state, piece) {
        return state.pieces.filter(o => o.player !== piece.player && Engine.isAlive(o));
    },

    // Reações do tipo 'inimigoSaiuDosArredores' (ex.: Machadada): o movimento voluntário sai da adjacência do dono.
    checkLeaveTriggers(state, piece, path) {
        for (const dono of Engine.inimigosVivos(state, piece)) {
            const saiu = path.some((h, i) => i > 0 && Rules.hexDistance(path[i - 1], dono) === 1 && Rules.hexDistance(h, dono) > 1);
            if (!saiu) continue;
            for (const a of Engine.gatilhos(dono, 'inimigoSaiuDosArredores')) state.triggers.push({ donoId: dono.id, abilityId: a.id, origemId: piece.id });
        }
    },

    // Inimigos que `piece` passa a ter adjacentes ao percorrer o caminho (entrou nos arredores deles).
    entrouNosArredores(path, dono, ate = path.length - 1) {
        for (let i = 1; i <= ate; i++) if (Rules.hexDistance(path[i - 1], dono) > 1 && Rules.hexDistance(path[i], dono) === 1) return i;
        return -1;
    },

    // Índice da 1ª zona do caminho em que o movimento é interrompido por uma reação disponível de entrada nos arredores.
    paradaPorReacao(state, piece, path) {
        let corte = path.length - 1;
        for (const dono of Engine.inimigosVivos(state, piece)) {
            if (!Engine.gatilhos(dono, 'inimigoEntrouNosArredores', 'reacao').some(a => Engine.reacaoDisponivel(dono, a))) continue;
            const i = Engine.entrouNosArredores(path, dono, corte);
            if (i > 0) corte = i;
        }
        return corte;
    },

    // Reações do tipo 'inimigoEntrouNosArredores' (ex.: Compelir): o movimento voluntário entra na adjacência do dono.
    checkEnterTriggers(state, piece, path) {
        for (const dono of Engine.inimigosVivos(state, piece)) {
            if (Engine.entrouNosArredores(path, dono) < 0) continue;
            for (const a of Engine.gatilhos(dono, 'inimigoEntrouNosArredores')) state.triggers.push({ donoId: dono.id, abilityId: a.id, origemId: piece.id });
        }
    },

    forcedMove(state, source, target, ef, ability, ctx = {}) {
        if (Engine.imune(target, 'movimentoInvoluntario')) {
            const h = Engine.abilitiesOf(target).find(x => (x.imune || []).includes('movimentoInvoluntario'));
            Engine.log(state, `${Engine.label(target)} é imune a movimentação involuntária (${h.nome})`);
            return;
        }
        const di = Rules.directionTo(source, target);
        if (di < 0) return;
        const d = Rules.DIRS[di];
        const n = ef.distancia ?? 1;
        const inicio = { q: target.q, r: target.r };
        let colisao = null;
        if (ef.direcao === 'atravessar') {
            const dest = { q: source.q - d.q * n, r: source.r - d.r * n };
            colisao = Engine.bloqueio(state, dest);
            if (!colisao) Engine.moveTo(state, target, dest, { forcado: true });
        } else {
            const sinal = ef.direcao === 'aproximar' ? -1 : 1;
            const caminho = [inicio];
            for (let i = 0; i < n; i++) {
                const next = { q: target.q + d.q * sinal, r: target.r + d.r * sinal };
                colisao = Engine.bloqueio(state, next);
                if (colisao) break;
                target.q = next.q; target.r = next.r;
                caminho.push(next);
            }
            if (caminho.length > 1) {
                target.q = inicio.q; target.r = inicio.r;
                Engine.moveTo(state, target, caminho[caminho.length - 1], { caminho, forcado: true });
            }
        }
        if (target.q !== inicio.q || target.r !== inicio.r) {
            Engine.log(state, `${Engine.label(target)} é deslocado para (${target.q}, ${target.r}) (${ability.nome})`);
        }
        if (colisao) {
            Engine.log(state, `${Engine.label(target)} colide com ${colisao.tipo === 'terreno' ? 'o terreno' : Engine.label(colisao.peca)}`);
            if (ef.aoColidir) Engine.runEffects(state, source, { ...ability, efeitos: ef.aoColidir }, [target], null, { bonusDano: ctx.bonusDano, reducaoDano: ctx.reducaoDano });
            Engine.emit(state, 'colisao', { peca: target, fonte: source, habilidade: ability, com: colisao });
        }
    },

    // Área 'arco': escolha i = zonas vizinhas nas direções i e i+1 (Rules.DIRS está em ordem circular, então são adjacentes entre si).
    arcoZonas(piece, i, alvo = {}) {
        const n = alvo.zonas ?? 2, out = [];
        for (let k = 0; k < n; k++) { const d = Rules.DIRS[((+i) + k) % 6]; if (d) out.push({ q: piece.q + d.q, r: piece.r + d.r }); }
        return out;
    },

    menorDistancia(state, piece, who) {
        let min = Infinity;
        for (const p of state.pieces) if (p.id !== piece.id && Engine.isAlive(p) && Engine.matchesWho(piece, p, who)) min = Math.min(min, Rules.distancia(piece, p));
        return min;
    },

    temMarcaDe(target, markId, source) {
        return (target.effects || []).some(e => e.tipo === 'marca' && e.marca === markId && e.fonteId === source.id);
    },

    // Passiva com ultraContraMarca (Graciosa): a primeira habilidade da Estrela que causar dano a uma Estrela com a marca dela
    // conta como Ultra Rápida — se foi usada com a ação e antes de qualquer outra habilidade do turno, a ação é devolvida.
    ultraContraMarca(state, ctx) {
        const f = ctx.fonte, t = f && f.turn, u = t && t.ultimoUso;
        if (!u || !ctx.habilidade || u.abilityId !== ctx.habilidade.id || t.graciosaUsada || !ctx.alvo) return;
        const h = Engine.abilitiesOf(f).find(a => a.ultraContraMarca && Engine.temMarcaDe(ctx.alvo, a.ultraContraMarca, f));
        if (!h) return;
        t.graciosaUsada = true;
        t.ultraUsos = { ...(t.ultraUsos || {}), [u.abilityId]: true };
        if (u.livreSeUltra && t.actionUsed) {
            t.actionUsed = false;
            Engine.log(state, `${h.nome}: ${ctx.habilidade.nome} conta como Ultra Rápida (ação não consumida)`);
        } else {
            Engine.log(state, `${h.nome}: ${ctx.habilidade.nome} conta como Ultra Rápida`);
        }
    },

    // Enfileira as passivas do evento ('inicioTurno', ex.: Graciosa; 'fimTurno', ex.: Correção) das Estrelas do jogador
    // com alvo válido. titulo: abre um acontecimento no log antes da 1ª. Retorna quantas foram enfileiradas.
    gatilhosTurno(state, player, evento, titulo = null) {
        let n = 0;
        state.triggers = state.triggers || [];
        for (const p of state.pieces) {
            if (p.player !== player || !Engine.isAlive(p)) continue;
            for (const a of Engine.gatilhos(p, evento, 'passiva')) {
                if (a.gatilho.condicao && !a.gatilho.condicao({ player }, p, state)) continue;
                if (!Engine.choices(state, p, Engine.alvoDe(p, a)).length) continue;
                if (!n && titulo && state.log) { Engine.novoGrupoLog(state); Engine.log(state, titulo); }
                state.triggers.push({ donoId: p.id, abilityId: a.id, origemId: p.id });
                n++;
            }
        }
        return n;
    },

    resolveQueue(state) {
        let guard = 0;
        while (!state.pending && state.triggers.length && guard++ < 50) {
            const t = state.triggers.shift();
            const owner = Rules.pieceById(state, t.donoId);
            const a = Engine.def(t.abilityId);
            if (!owner || !Engine.isAlive(owner)) continue;
            
            if (a.tipo === 'reacao') {
                if (a.gatilho && a.gatilho.ainda && !a.gatilho.ainda(owner, state, t)) continue; // a situação mudou antes da pergunta
                const alvoVivo = Rules.pieceById(state, t.origemId);
                if (alvoVivo && Engine.isAlive(alvoVivo) && Engine.reacaoDisponivel(owner, a)) {
                    state.pending = { tipo: 'reacao', donoId: owner.id, abilityId: a.id, alvoId: t.origemId };
                    return; 
                }
                continue; 
            }

            const alvoA = Engine.alvoDe(owner, a);
            const opcoes = Engine.choices(state, owner, alvoA).filter(id => !(t.excluir || []).includes(id));
            if (opcoes.length === 0) {
                Engine.log(state, `${a.nome}: nenhum alvo disponível`);
            } else if (alvoA.opcional) { // o dono decide (null = não usar), mesmo com uma opção só
                Engine.log(state, `${a.nome} de ${Engine.label(owner)}: ${alvoA.livre ? 'pode se mover' : 'pode ser usada'}`);
                state.pending = { tipo: 'escolha', donoId: owner.id, abilityId: a.id, opcoes: [null, ...opcoes], opcional: true };
            } else if (opcoes.length === 1) {
                Engine.log(state, `${a.nome} de ${Engine.label(owner)} ativa`);
                Engine.aplicarComReacoes(state, owner, a, opcoes[0]);
            } else {
                Engine.log(state, `${a.nome} de ${Engine.label(owner)} ativa: escolha o alvo`);
                state.pending = { tipo: 'escolha', donoId: owner.id, abilityId: a.id, opcoes };
            }
        }
        if (guard >= 50) {
            state.triggers = [];
            Engine.log(state, 'Limite de gatilhos encadeados atingido');
        }
    }
};
