// ── Engine: alvos, áreas e escolhas ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { CONFIG } from '../config.js';
import { Rules } from '../regras.js';
import { Engine } from '../engine.js';

export default {
    matchesWho(piece, t, who) {
        if (who === 'inimigos') return t.player !== piece.player;
        if (who === 'aliados') return t.player === piece.player;
        return true;
    },
    inRange(state, piece, range, who) {
        return state.pieces.filter(
            (p) =>
                p.id !== piece.id &&
                Engine.isAlive(p) &&
                Rules.distancia(piece, p) <= range &&
                Engine.matchesWho(piece, p, who),
        );
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
    // ── Objetos no tabuleiro (CONFIG.objetos) ── piece.objetos[id]: null = com a Estrela; { q, r } = na zona onde
    // caiu.
    objetoComDono(piece, id) {
        return !!(piece && piece.objetos && id in piece.objetos && !piece.objetos[id]);
    },
    objetoNoTabuleiro(piece, id) {
        return (piece && piece.objetos && piece.objetos[id]) || null;
    },
    objetoNaZonaDe(piece, id) {
        const o = Engine.objetoNoTabuleiro(piece, id);
        return !!o && o.q === piece.q && o.r === piece.r;
    },
    recolherObjeto(state, piece, id, motivo = null) {
        if (!Engine.objetoNoTabuleiro(piece, id)) return false;
        piece.objetos[id] = null;
        Engine.log(
            state,
            `${Engine.label(piece)} recupera a ${(CONFIG.objetos[id] || {}).nome || id}${motivo ? ` (${motivo})` : ''}`,
        );
        return true;
    },
    // Zona do outro lado do alvo adjacente, em linha reta a partir da Estrela (salto por cima).
    zonaAtras(piece, alvo) {
        const di = Rules.hexDistance(piece, alvo) === 1 ? Rules.directionTo(piece, alvo) : -1;
        if (di < 0) return null;
        const d = Rules.DIRS[di];
        return { q: alvo.q + d.q, r: alvo.r + d.r };
    },
    zonaLivre(state, h) {
        return !!h && !Engine.bloqueio(state, h);
    },
    // Alvo 'trajeto': escolha "dir:passos" = zona em linha reta a até `alcance` zonas (para em buracos e na borda).
    // requer(dono, state): condição para usar; destino(dono, state): única zona aceita (ex.: a da shuriken), null =
    // nenhuma.
    parseTrajeto(choice) {
        const m = /^(\d+):(\d+)$/.exec(String(choice));
        return m ? { dir: +m[1], passos: +m[2] } : null;
    },
    trajetoOpcoes(state, piece, alvo) {
        if (alvo.requer && !alvo.requer(piece, state)) return [];
        const fixo = alvo.destino ? alvo.destino(piece, state) : null;
        if (alvo.destino && !fixo) return [];
        const out = [];
        Rules.DIRS.forEach((d, i) =>
            Engine.linha(piece, i, alvo.alcance ?? 1, true).forEach((h, k) => {
                if (!fixo || (h.q === fixo.q && h.r === fixo.r)) out.push(`${i}:${k + 1}`);
            }),
        );
        return out;
    },
    // Alvo 'salto': escolha "id:q,r" = Estrela no alcance + zona ao lado dela onde a Estrela aterrissa (livre, a até
    // `alcance` zonas da Estrela; a própria zona vale se ela já estiver ao lado do alvo).
    parseSalto(choice) {
        const m = /^(\d+):(-?\d+),(-?\d+)$/.exec(String(choice));
        return m ? { id: +m[1], q: +m[2], r: +m[3] } : null;
    },
    saltoOpcoes(state, piece, alvo) {
        const R = alvo.alcance ?? 1,
            out = [];
        for (const t of Engine.inRange(state, piece, R, alvo.quem || 'inimigos')) {
            if (alvo.filtro && !alvo.filtro(piece, t, state)) continue;
            for (const n of Rules.neighbors(t.q, t.r)) {
                if (!Rules.isHexOnBoard(n.q, n.r)) continue;
                const proprio = n.q === piece.q && n.r === piece.r;
                if ((proprio || Engine.zonaLivre(state, n)) && Rules.distancia(piece, n) <= R)
                    out.push(`${t.id}:${n.q},${n.r}`);
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
        return [
            { q: h.q, r: h.r },
            ...Rules.zonas().filter((z) => {
                const d = Rules.hexDistance(z, h);
                return d >= 1 && d <= R;
            }),
        ];
    },
    // Alvo 'varios': escolha "id1,id2" (ids em ordem crescente) ou "id" quando só há uma Estrela no alcance.
    parseVarios(choice) {
        return [
            ...new Set(
                String(choice ?? '')
                    .split(',')
                    .filter((x) => /^\d+$/.test(x))
                    .map(Number),
            ),
        ];
    },
    avancoOpcoes(state, piece, alvo) {
        const out = [];
        const livre = (h) => Rules.isHexOnBoard(h.q, h.r) && !Rules.pieceAt(state, h.q, h.r);
        Rules.DIRS.forEach((d, i) => {
            for (let s = 1; s <= (alvo.alcance ?? 1); s++) {
                const q = piece.q + d.q * s,
                    r = piece.r + d.r * s;
                if (!Rules.isHexOnBoard(q, r)) break;
                if (livre({ q, r })) out.push(`${i}:${s}:${q},${r}`);
                else if (alvo.pousoAdjacente)
                    Rules.neighbors(q, r)
                        .filter(livre)
                        .forEach((n) => out.push(`${i}:${s}:${n.q},${n.r}`));
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
                return Engine.inRange(state, piece, alvo.raio ?? 1, alvo.quem || 'todos').map((p) => p.id);
            case 'arco':
                return Engine.arcoZonas(piece, choice, alvo)
                    .map((h) => Rules.pieceAt(state, h.q, h.r))
                    .filter((t) => t && Engine.isAlive(t) && Engine.matchesWho(piece, t, alvo.quem || 'todos'))
                    .map((t) => t.id);
            case 'linha':
            case 'avanco': {
                const c =
                    alvo.tipo === 'linha' ? { dir: choice, passos: alvo.comprimento } : Engine.parseAvanco(choice);
                if (!c) return [];
                return Engine.linha(piece, c.dir, c.passos, true)
                    .map((h) => Rules.pieceAt(state, h.q, h.r))
                    .filter(
                        (t) =>
                            t &&
                            t.id !== piece.id &&
                            Engine.isAlive(t) &&
                            Engine.matchesWho(piece, t, alvo.quem || 'todos'),
                    )
                    .map((t) => t.id);
            }
            case 'trajeto': {
                const c = Engine.parseTrajeto(choice);
                if (!c) return [];
                return Engine.linha(piece, c.dir, alvo.incluiDestino ? c.passos : c.passos - 1, true)
                    .map((h) => Rules.pieceAt(state, h.q, h.r))
                    .filter(
                        (t) =>
                            t &&
                            t.id !== piece.id &&
                            Engine.isAlive(t) &&
                            Engine.matchesWho(piece, t, alvo.quem || 'todos'),
                    )
                    .map((t) => t.id);
            }
            case 'varios':
                return Engine.parseVarios(choice)
                    .map((id) => Rules.pieceById(state, id))
                    .filter(
                        (t) =>
                            t &&
                            t.id !== piece.id &&
                            Engine.isAlive(t) &&
                            Engine.matchesWho(piece, t, alvo.quem || 'inimigos'),
                    )
                    .map((t) => t.id);
            case 'zona': {
                const h = Engine.parseZona(choice);
                if (!h || alvo.livre) return [];
                return Engine.areaZona(h, alvo)
                    .map((z) => Rules.pieceAt(state, z.q, z.r))
                    .filter((t) => t && Engine.isAlive(t) && Engine.matchesWho(piece, t, alvo.quem || 'todos'))
                    .map((t) => t.id);
            }
            case 'salto': {
                const c = Engine.parseSalto(choice),
                    t = c && Rules.pieceById(state, c.id);
                return t &&
                    t.id !== piece.id &&
                    Engine.isAlive(t) &&
                    Engine.matchesWho(piece, t, alvo.quem || 'inimigos')
                    ? [t.id]
                    : [];
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
                all = Engine.inRange(state, piece, alvo.alcance ?? 1, 'inimigos').map((p) => p.id);
                if (alvo.filtro) all = all.filter((id) => alvo.filtro(piece, Rules.pieceById(state, id), state));
                break;
            case 'escolha':
                all = Engine.inRange(state, piece, alvo.alcance ?? 1, alvo.quem || 'todos').map((p) => p.id);
                // proprioSe(piece, state): sem outro alvo válido, o usuário pode escolher a si mesmo (ex.: Presente da
                // Lua).
                if (!all.length && alvo.proprioSe && alvo.proprioSe(piece, state)) all = [piece.id];
                // filtro(dono, alvo, state): restringe quem pode ser escolhido (ex.: só aliados feridos).
                if (alvo.filtro) all = all.filter((id) => alvo.filtro(piece, Rules.pieceById(state, id), state));
                break;
            case 'ao-redor':
                all = [null];
                break;
            case 'linha':
            case 'arco':
                all = Rules.DIRS.map((d, i) => i);
                break;
            case 'avanco':
                all = Engine.avancoOpcoes(state, piece, alvo);
                break;
            case 'trajeto':
                all = Engine.trajetoOpcoes(state, piece, alvo);
                break;
            case 'varios': {
                let ids = Engine.inRange(state, piece, alvo.alcance ?? 1, alvo.quem || 'inimigos').map((p) => p.id);
                if (alvo.filtro) ids = ids.filter((id) => alvo.filtro(piece, Rules.pieceById(state, id), state));
                ids.sort((a, b) => a - b);
                all =
                    ids.length < 2 ? ids.map(String) : ids.flatMap((a, i) => ids.slice(i + 1).map((b) => `${a},${b}`));
                break;
            }
            case 'zona': {
                const R = alvo.alcance ?? 1;
                all = Rules.zonas()
                    .filter((z) => {
                        const d = Rules.distancia(piece, z);
                        return d >= 1 && d <= R && (!alvo.livre || !Engine.bloqueio(state, z));
                    })
                    .map((z) => `${z.q},${z.r}`);
                break;
            }
            case 'salto':
                all = Engine.saltoOpcoes(state, piece, alvo);
                break;
            case 'proprio': {
                const modos = Engine.modosDe(piece, alvo, state);
                all = modos ? modos.map((m, i) => i) : [null];
                if (alvo.requer && !alvo.requer(piece, state)) all = [];
                break;
            }
            default:
                all = [];
        }
        // movimento/arremesso é válido mesmo sem atingir ninguém
        const semAlvoOk = alvo.tipo === 'avanco' || alvo.tipo === 'trajeto' || (alvo.tipo === 'zona' && alvo.livre);
        return all.filter(
            (ch) => (!only || only.includes(ch)) && (semAlvoOk || Engine.affected(state, piece, alvo, ch).length > 0),
        );
    },
    // etapa (avanço): null = escolher o destino; "dir:passos" = escolher onde pousar ao lado da zona ocupada.
    previewHexes(state, piece, alvo, only, etapa = null) {
        const hexes = [];
        const choices = Engine.choices(state, piece, alvo, only);
        if (alvo.tipo === 'avanco') {
            const seen = new Set();
            choices.forEach((ch) => {
                const c = Engine.parseAvanco(ch);
                const h = etapa ? (ch.startsWith(etapa + ':') ? c : null) : Engine.linha(piece, c.dir, c.passos).pop();
                if (h && !seen.has(`${h.q},${h.r}`)) {
                    seen.add(`${h.q},${h.r}`);
                    hexes.push({ q: h.q, r: h.r });
                }
            });
            return hexes;
        }
        if (alvo.tipo === 'inimigo' || alvo.tipo === 'escolha') {
            choices.forEach((id) => {
                const t = Rules.pieceById(state, id);
                hexes.push({ q: t.q, r: t.r });
            });
        } else if (alvo.tipo === 'ao-redor') {
            const R = alvo.raio ?? 1;
            for (const z of Rules.zonas()) {
                const d = Rules.distancia(piece, z);
                if (d >= 1 && d <= R) hexes.push(z);
            }
        } else if (alvo.tipo === 'linha') {
            choices.forEach((i) => hexes.push(...Engine.linha(piece, i, alvo.comprimento, true)));
        } else if (alvo.tipo === 'trajeto') {
            // destinos e caminhos (com destino fixo, o caminho até ele)
            const seen = new Set();
            choices.forEach((ch) => {
                const c = Engine.parseTrajeto(ch);
                Engine.linha(piece, c.dir, c.passos, true).forEach((h) => {
                    if (!seen.has(`${h.q},${h.r}`)) {
                        seen.add(`${h.q},${h.r}`);
                        hexes.push(h);
                    }
                });
            });
        } else if (alvo.tipo === 'arco') {
            // etapa "k": a 1ª zona (vizinha k) já foi escolhida; destaca as zonas que completam uma área válida.
            const seen = new Set();
            const add = (h) => {
                const k = `${h.q},${h.r}`;
                if (!seen.has(k) && Rules.isHexOnBoard(h.q, h.r)) {
                    seen.add(k);
                    hexes.push(h);
                }
            };
            if (etapa != null) {
                const k = +etapa;
                choices.forEach((i) => {
                    if (i === k) add(Engine.arcoZonas(piece, i, alvo)[1]);
                    else if ((i + 1) % 6 === k) add(Engine.arcoZonas(piece, i, alvo)[0]);
                });
            } else choices.forEach((i) => Engine.arcoZonas(piece, i, alvo).forEach(add));
        } else if (alvo.tipo === 'varios') {
            // etapa "id": a 1ª Estrela já foi escolhida; destaca ela e as que podem formar o par.
            const ids = new Set();
            choices.forEach((ch) => {
                const l = Engine.parseVarios(ch);
                if (etapa == null || l.includes(+etapa)) l.forEach((i) => ids.add(i));
            });
            ids.forEach((id) => {
                const t = Rules.pieceById(state, id);
                if (t) hexes.push({ q: t.q, r: t.r });
            });
        } else if (alvo.tipo === 'zona') {
            // etapa "q,r": zona escolhida; destaca a área atingida (clicar nela confirma).
            if (etapa != null && choices.includes(etapa)) hexes.push(...Engine.areaZona(Engine.parseZona(etapa), alvo));
            else choices.forEach((ch) => hexes.push(Engine.parseZona(ch)));
        } else if (alvo.tipo === 'salto') {
            // etapa "id": o alvo já foi escolhido; destaca as zonas de pouso ao lado dele.
            const seen = new Set();
            choices.forEach((ch) => {
                const c = Engine.parseSalto(ch),
                    t = Rules.pieceById(state, c.id);
                const h = etapa != null ? (c.id === +etapa ? { q: c.q, r: c.r } : null) : t && { q: t.q, r: t.r };
                if (h && !seen.has(`${h.q},${h.r}`)) {
                    seen.add(`${h.q},${h.r}`);
                    hexes.push(h);
                }
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
                const ch = choices.find((c) => c === `${etapa}:${hex.q},${hex.r}`);
                return ch ? { choice: ch } : undefined;
            }
            for (let i = 0; i < Rules.DIRS.length; i++) {
                for (let s = 1; s <= (alvo.alcance ?? 1); s++) {
                    const fim = Engine.linha(piece, i, s).pop();
                    if (fim.q !== hex.q || fim.r !== hex.r) continue;
                    const prefix = `${i}:${s}`;
                    const direto = choices.find((c) => c === `${prefix}:${hex.q},${hex.r}`);
                    if (direto) return { choice: direto };
                    const opcoes = choices.filter((c) => c.startsWith(prefix + ':'));
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
            const i = choices.find((i) =>
                Engine.linha(piece, i, alvo.comprimento, true).some((h) => h.q === hex.q && h.r === hex.r),
            );
            if (i !== undefined) return { choice: i };
        }
        if (alvo.tipo === 'trajeto') {
            const fim = (ch) => {
                const c = Engine.parseTrajeto(ch);
                return Engine.linha(piece, c.dir, c.passos).pop();
            };
            const direto = choices.find((ch) => {
                const h = fim(ch);
                return h.q === hex.q && h.r === hex.r;
            });
            if (direto) return { choice: direto };
            // Destino único (ex.: puxar a shuriken): clicar no caminho também serve.
            if (choices.length === 1) {
                const c = Engine.parseTrajeto(choices[0]);
                if (Engine.linha(piece, c.dir, c.passos).some((h) => h.q === hex.q && h.r === hex.r))
                    return { choice: choices[0] };
            }
            return undefined;
        }
        if (alvo.tipo === 'arco') {
            const k = Rules.DIRS.findIndex((d) => piece.q + d.q === hex.q && piece.r + d.r === hex.r);
            if (k < 0) return undefined;
            if (etapa != null) {
                // 2ª zona: vizinha de k
                const e = +etapa;
                if (k === (e + 1) % 6 && choices.includes(e)) return { choice: e };
                if (k === (e + 5) % 6 && choices.includes(k)) return { choice: k };
                return undefined;
            }
            // Áreas que contêm a zona clicada; se todas atingem as mesmas Estrelas, não precisa da 2ª zona.
            const cand = choices.filter((i) => i === k || (i + 1) % 6 === k);
            const grupos = new Set(cand.map((i) => Engine.affected(state, piece, alvo, i).sort().join(',')));
            if (!cand.length) return undefined;
            return grupos.size === 1 ? { choice: cand[0] } : { etapa: String(k) };
        }
        if (alvo.tipo === 'varios') {
            const t = Rules.pieceAt(state, hex.q, hex.r);
            if (!t) return undefined;
            if (etapa != null) {
                // 2ª Estrela
                const par = [+etapa, t.id].sort((a, b) => a - b).join(',');
                return t.id !== +etapa && choices.includes(par) ? { choice: par } : undefined;
            }
            if (choices.includes(String(t.id))) return { choice: String(t.id) };
            return choices.some((ch) => Engine.parseVarios(ch).includes(t.id)) ? { etapa: String(t.id) } : undefined;
        }
        if (alvo.tipo === 'zona') {
            const k = `${hex.q},${hex.r}`;
            if (!alvo.raioArea) return choices.includes(k) ? { choice: k } : undefined;
            // 1º clique escolhe a zona e mostra a área; clicar na área confirma (outra zona válida fora dela troca a
            // escolha).
            if (
                etapa != null &&
                choices.includes(etapa) &&
                Engine.areaZona(Engine.parseZona(etapa), alvo).some((h) => h.q === hex.q && h.r === hex.r)
            )
                return { choice: etapa };
            return choices.includes(k) ? { etapa: k } : undefined;
        }
        if (alvo.tipo === 'salto') {
            if (etapa != null) {
                // zona de pouso (ou outro alvo, para trocar)
                const ch = choices.find((c) => c === `${etapa}:${hex.q},${hex.r}`);
                if (ch) return { choice: ch };
            }
            const t = Rules.pieceAt(state, hex.q, hex.r);
            const opcoes = t ? choices.filter((c) => Engine.parseSalto(c).id === t.id) : [];
            if (opcoes.length === 1) return { choice: opcoes[0] };
            return opcoes.length ? { etapa: String(t.id) } : undefined;
        }
        if (alvo.tipo === 'proprio') {
            if (alvo.modos) return undefined; // a opção é escolhida nos botões da barra de ação
            return hex.q === piece.q && hex.r === piece.r ? { choice: null } : undefined;
        }
        return undefined;
    },
    // Área 'arco': escolha i = zonas vizinhas nas direções i e i+1 (Rules.DIRS está em ordem circular, então são
    // adjacentes entre si).
    arcoZonas(piece, i, alvo = {}) {
        const n = alvo.zonas ?? 2,
            out = [];
        for (let k = 0; k < n; k++) {
            const d = Rules.DIRS[(+i + k) % 6];
            if (d) out.push({ q: piece.q + d.q, r: piece.r + d.r });
        }
        return out;
    },
    menorDistancia(state, piece, who) {
        let min = Infinity;
        for (const p of state.pieces)
            if (p.id !== piece.id && Engine.isAlive(p) && Engine.matchesWho(piece, p, who))
                min = Math.min(min, Rules.distancia(piece, p));
        return min;
    },
};
