// ── Engine: efeitos das habilidades (EFFECTS) ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { CONFIG } from '../config.js';
import { Rules } from '../regras.js';
import { Engine } from '../engine.js';

export default {
    // valor: número | função(source, target) | { stat, mult, fixo } | 'estado' (valor do estado que acionou o efeito:
    // recalculado a partir de quem aplicou o estado, ou o valor guardado se essa Estrela não estiver mais em jogo).
    valorDe(source, valor, target, ctx = {}) {
        const piso = (v) => Math.max(0, Math.floor(v || 0));
        if (valor === 'estado') {
            const e = ctx.estado || {};
            return ctx.fonteEstado && e.valorBase
                ? Engine.valorDe(ctx.fonteEstado, e.valorBase, target)
                : piso(e.valor);
        }
        if (typeof valor === 'number') return piso(valor);
        if (typeof valor === 'function') return piso(valor(source, target, ctx.state));
        const base = valor.stat && source ? Rules.stat(source, valor.stat) * (valor.mult ?? 1) : 0;
        return piso(base + (valor.fixo || 0));
    },
    applyEffects(state, source, ability, choice, only, extra = null) {
        Engine.runEffects(
            state,
            source,
            ability,
            Engine.alvosDoUso(state, source, ability, choice, only),
            choice,
            extra,
        );
    },
    // Alvos são calculados antes de qualquer efeito (ex.: o caminho do avanço é medido a partir da posição original).
    // extra: contexto adicional repassado aos efeitos (bonusDano, estado).
    runEffects(state, source, ability, targets, choice, extra = null) {
        if (source && ability && (ability.tipo === 'passiva' || ability.tipo === 'efeito'))
            Engine.fxHab(
                state,
                source,
                ability,
                choice,
                targets.map((t) => t.id),
                true,
            );
        const origens = new Map(targets.map((t) => [t.id, { q: t.q, r: t.r }]));
        for (const ef of ability.efeitos || []) {
            const h = Engine.EFFECTS[ef.tipo];
            // se(source, alvos, state): condição do efeito
            if (!h || (ef.se && !ef.se(source, targets, state))) continue;
            if (ef.modo !== undefined && ef.modo !== choice) continue; // modo: só roda na opção escolhida (alvo.modos)
            if (h.global) h.run(state, source, ability, ef, { ...extra, targets, choice, origens });
            else if (ef.naFonte) {
                if (source && Engine.isAlive(source))
                    h.run(state, source, ability, ef, { ...extra, target: source, targets, choice, origens });
            } else
                for (const t of targets)
                    if (Engine.isAlive(t) && !(ef.excetoFonte && t === source))
                        h.run(state, source, ability, ef, { ...extra, target: t, targets, choice, origens });
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
                // ignoraArmaduraSeMenor (Sentença): Armadura atual do alvo (com a extra) menor que o dano → ignora a
                // Armadura.
                const arm = t.stats.armadura + Rules.armaduraExtra(t);
                const ignoraArmadura = !!ef.ignoraArmaduraSeMenor && arm > 0 && arm < v;
                const zerou = () =>
                    ef.ultraSeZerarArmadura && arm > 0 && t.stats.armadura + Rules.armaduraExtra(t) === 0;
                const causa =
                    ability.nome +
                    (bonus ? ` ${bonus > 0 ? '+' : ''}${bonus}` : '') +
                    (red ? `, -${red.valor} ${red.nome}` : '') +
                    (ignoraArmadura ? ', ignora a armadura' : '');
                if (v <= 0 && red) Engine.log(state, `${Engine.label(t)} não sofre dano (${causa})`);
                // status em que o dano se baseia
                const base = ef.valor && ef.valor.stat ? Rules.expandStats(ef.valor.stat) : [];
                Engine.dealDamage(state, source, t, v, causa, ability, { base, ignoraArmadura });
                // Descarga
                if (zerou()) Engine.tornarUltra(state, source, ability, `Armadura de ${Engine.label(t)} zerada`);
            },
        },
        // Status secundários (ou marcadores internos). stat: chave | 'secundarios' | lista.
        modificador: {
            run(state, source, ability, ef, { target }) {
                for (const k of Rules.expandStats(ef.stat).filter((k) => Rules.categoriaStat(k) !== 'primarios')) {
                    const imune = Engine.imutavel(target, k);
                    if (imune) {
                        Engine.log(state, `${Engine.label(target)}: ${k} não pode ser alterado (${imune.nome})`);
                        continue;
                    }
                    // valor: número (pode ser negativo) | { stat, fixo } | função — calculado no momento da aplicação
                    const delta =
                        typeof ef.valor === 'number'
                            ? ef.valor
                            : typeof ef.valor === 'function'
                              ? ef.valor(source, target)
                              : Engine.valorDe(source, ef.valor, target); // pode ser negativo
                    if (!delta) continue;
                    target.effects.push({
                        origem: ability.nome,
                        habilidade: ability.id,
                        stat: k,
                        delta,
                        ...Engine.expiry(state, source, ef.duracao),
                    });
                    Engine.log(
                        state,
                        `${Engine.label(target)}: ${(CONFIG.stats.rotulosInternos || {})[k] || k} ${delta > 0 ? '+' : ''}${delta} (${ability.nome})`,
                    );
                }
            },
        },
        marca: {
            // unica: a Estrela só mantém uma marca deste tipo em jogo (a anterior sai de quem a tinha).
            run(state, source, ability, ef, { target }) {
                if (ef.unica && source)
                    state.pieces.forEach((p) => {
                        if (!Engine.temMarcaDe(p, ef.marca, source)) return;
                        p.effects = p.effects.filter(
                            (e) => !(e.tipo === 'marca' && e.marca === ef.marca && e.fonteId === source.id),
                        );
                        if (p !== target) Engine.log(state, `${Engine.label(p)} perde ${CONFIG.marks[ef.marca].nome}`);
                    });
                Engine.applyMark(state, source, target, ef.marca);
            },
        },
        // Estado com gatilho próprio: gatilho 'sofreuDano' enfileira `aciona` (ex.: Cinturão de Dinamites);
        // aoEvento: roda `aciona` imediatamente quando o evento ocorre (ver Engine.emit).
        // usos: número de acionamentos (padrão 1; null = ilimitado). valor: lido com valor 'estado' — recalculado a
        // partir de quem aplicou o estado no momento em que ele aciona (se essa Estrela não estiver mais em jogo, usa o
        // valor do momento da aplicação).
        estado: {
            run(state, source, ability, ef, { target }) {
                // acumula: soma o modificador de dano (danoAtaque) ao estado ainda não gasto, em vez de substituí-lo.
                const atual = ef.acumula && target.effects.find((e) => e.tipo === 'estado' && e.estado === ef.estado);
                if (atual) {
                    atual.danoAtaque = (atual.danoAtaque || 0) + (ef.danoAtaque || 0);
                    Engine.log(
                        state,
                        `${Engine.label(target)}: ${ef.nome || ability.nome} acumula (próximo ataque ${atual.danoAtaque > 0 ? '+' : ''}${atual.danoAtaque} de dano)`,
                    );
                    return;
                }
                target.effects = target.effects.filter((e) => !(e.tipo === 'estado' && e.estado === ef.estado));
                // unicoDaFonte (Chegada): só uma Estrela por vez com o estado desta fonte.
                if (ef.unicoDaFonte && source)
                    for (const p of state.pieces)
                        if (p !== target)
                            p.effects = (p.effects || []).filter(
                                (e) => !(e.tipo === 'estado' && e.estado === ef.estado && e.fonteId === source.id),
                            );
                target.effects.push({
                    tipo: 'estado',
                    estado: ef.estado,
                    origem: ef.nome || ability.nome,
                    habilidade: ability.id,
                    gatilho: ef.gatilho,
                    aoEvento: ef.aoEvento,
                    aciona: ef.aciona,
                    danoAtaque: ef.danoAtaque,
                    compartilhaDano: ef.compartilhaDano,
                    usos: ef.usos === null ? null : (ef.usos ?? 1),
                    ...(ef.limiteDano != null ? { limiteDano: ef.limiteDano } : {}),
                    valor: ef.valor ? Engine.valorDe(source, ef.valor, target) : undefined,
                    valorBase: ef.valor && typeof ef.valor === 'object' ? ef.valor : undefined,
                    fonteId: source ? source.id : null,
                    debuff: !!ef.debuff,
                    buff: !ef.debuff,
                    ...Engine.expiry(state, source, ef.duracao),
                });
                Engine.log(
                    state,
                    `${Engine.label(target)} recebe ${ef.nome || ability.nome}${ef.duracao && ef.duracao.turnos ? ` (${ef.duracao.turnos} turnos)` : ''}`,
                );
            },
        },
        // Status primários: altera o valor atual (valor > 0 recupera, < 0 reduz), limitado a [0, máximo]. Não é dano.
        // stat: 'vida' | 'amago' | 'primarios' | lista.
        alterarStatus: {
            run(state, source, ability, ef, ctx) {
                const target = ctx.target;
                const sinal = ef.reduzir ? -1 : 1;
                const v = sinal * Engine.valorDe(source, ef.valor, target, ctx);
                if (!v) return;
                for (const k of Rules.expandStats(ef.stat).filter((k) => Rules.categoriaStat(k) === 'primarios')) {
                    const max = target.stats[k + 'Max'] ?? Infinity;
                    const antes = target.stats[k];
                    target.stats[k] = Math.max(0, Math.min(max, antes + v));
                    const d = target.stats[k] - antes;
                    if (d) Engine.log(state, `${Engine.label(target)}: ${k} ${d > 0 ? '+' : ''}${d} (${ability.nome})`);
                    if (k === 'vida' && d > 0)
                        Engine.emit(state, 'curou', { fonte: source, alvo: target, habilidade: ability, valor: d });
                    if (k === 'vida' && antes > 0 && !Engine.isAlive(target)) {
                        Engine.log(state, `${Engine.label(target)} foi derrotado`);
                        Engine.registrarAbate(state, source, target, ability);
                    }
                }
            },
        },
        // Altera características secundárias das habilidades do alvo (ex.: custo -1, alcance +1, tornar repetível).
        // { caracteristica, valor (número; booleano para repetivel/ultraRapida), filtro: { habilidade, tipo }, duracao
        // } maximo: em vez de somar, limita o valor (ex.: Fumacê: alcance no máximo 1).
        modificarHabilidade: {
            run(state, source, ability, ef, { target }) {
                const delta = ef.maximo != null ? 0 : ef.valor;
                const debuff =
                    ef.debuff ??
                    (ef.caracteristica === 'custo' ? delta > 0 : typeof delta === 'number' ? delta < 0 : !delta);
                target.effects.push({
                    caracteristica: ef.caracteristica,
                    delta,
                    ...(ef.maximo != null ? { maximo: ef.maximo } : {}),
                    ...(ef.gastaAoUsar ? { gastaAoUsar: true } : {}),
                    filtro: ef.filtro || null,
                    origem: ability.nome,
                    habilidade: ability.id,
                    debuff,
                    buff: !debuff,
                    ...Engine.expiry(state, source, ef.duracao),
                });
                Engine.log(
                    state,
                    `${Engine.label(target)}: ${CONFIG.habilidades.secundarias[ef.caracteristica]?.label || ef.caracteristica} ${ef.maximo != null ? `no máximo ${ef.maximo}` : typeof delta === 'number' ? (delta > 0 ? '+' : '') + delta : delta ? 'ativado' : 'removido'} (${ability.nome})`,
                );
            },
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
            },
        },
        // Armadura temporária: substitui o escudo anterior da mesma habilidade.
        escudo: {
            run(state, source, ability, ef, { target }) {
                const v = Engine.valorDe(source, ef.valor, target, { state });
                if (v <= 0) return;
                target.effects = target.effects.filter((e) => !(e.tipo === 'escudo' && e.habilidade === ability.id));
                target.effects.push({
                    tipo: 'escudo',
                    origem: ability.nome,
                    habilidade: ability.id,
                    restante: v,
                    buff: true,
                    ...Engine.expiry(state, source, ef.duracao),
                });
                Engine.log(state, `${Engine.label(target)}: armadura +${v} (${ability.nome})`);
            },
        },
        // Transfere TODO o valor atual de um atributo para outro pela duração (ex.: Sobrecarregar Reator); a origem
        // fica em 0. de 'magico' → 'armadura': Poder Mágico −N e Armadura temporária +N (consumida pelo dano, como um
        // escudo). de 'armadura' → 'magico': a Armadura (incluindo a temporária) vai a 0 e não é restaurada no início
        // do turno enquanto durar (travaArmadura); Poder Mágico +N. Ao expirar, a Armadura convertida volta (até o
        // máximo).
        converter: {
            run(state, source, ability, ef, { target }) {
                const base = {
                    origem: ability.nome,
                    habilidade: ability.id,
                    conversao: true,
                    debuff: false,
                    ...Engine.expiry(state, source, ef.duracao),
                };
                const imune = Engine.imutavel(target, 'magico');
                if (imune) {
                    Engine.log(state, `${Engine.label(target)}: magico não pode ser alterado (${imune.nome})`);
                    return;
                }
                // reaplicar substitui a conversão anterior
                target.effects = target.effects.filter((e) => e.habilidade !== ability.id);
                if (ef.de === 'magico') {
                    const v = Rules.stat(target, 'magico');
                    if (v <= 0) {
                        Engine.log(state, `${Engine.label(target)}: sem Poder Mágico para converter (${ability.nome})`);
                        return;
                    }
                    target.effects.push({ ...base, stat: 'magico', delta: -v });
                    target.effects.push({ ...base, tipo: 'escudo', restante: v, buff: true });
                    Engine.log(state, `${Engine.label(target)}: Poder Mágico ${v} → armadura +${v} (${ability.nome})`);
                } else {
                    const v = target.stats.armadura + Rules.armaduraExtra(target);
                    if (v <= 0) {
                        Engine.log(state, `${Engine.label(target)}: sem Armadura para converter (${ability.nome})`);
                        return;
                    }
                    target.effects = target.effects.filter((e) => e.tipo !== 'escudo');
                    target.stats.armadura = 0;
                    target.effects.push({
                        ...base,
                        travaArmadura: true,
                        devolve: Math.min(v, target.stats.armaduraMax),
                    });
                    target.effects.push({ ...base, stat: 'magico', delta: v });
                    Engine.log(state, `${Engine.label(target)}: Armadura ${v} → Poder Mágico +${v} (${ability.nome})`);
                }
            },
        },
        // Ativa os efeitos de outra habilidade da fonte (ex.: Investida → Defesa Erguida), se a condição for atendida.
        ativarHabilidade: {
            global: true,
            run(state, source, ability, ef) {
                const h = Engine.def(ef.habilidade);
                if (!source || !h || !Engine.isAlive(source)) return;
                Engine.log(state, `${ability.nome} ativa ${h.nome}`);
                Engine.runEffects(state, source, h, [source], null);
            },
        },
        limparDebuffs: {
            run(state, source, ability, ef, { target }) {
                Engine.removeDebuffs(state, target, ability.nome);
            },
        },
        avancar: {
            global: true,
            run(state, source, ability, ef, { choice }) {
                const dest = Engine.parseAvanco(choice);
                if (!source || !dest || !Rules.isHexOnBoard(dest.q, dest.r) || Rules.pieceAt(state, dest.q, dest.r))
                    return;
                const caminho = [{ q: source.q, r: source.r }, ...Engine.linha(source, dest.dir, dest.passos)];
                const fim = caminho[caminho.length - 1];
                if (fim.q !== dest.q || fim.r !== dest.r) caminho.push({ q: dest.q, r: dest.r });
                Engine.moveTo(state, source, dest, { caminho });
                Engine.log(
                    state,
                    `${Engine.label(source)} avança ${dest.passos} zona(s) e para em (${dest.q}, ${dest.r})`,
                );
            },
        },
        // Objetos (CONFIG.objetos). lancarObjeto: deixa o objeto da fonte na zona escolhida (alvo 'trajeto').
        lancarObjeto: {
            global: true,
            run(state, source, ability, ef, { choice }) {
                const c = Engine.parseTrajeto(choice);
                if (!source || !c || !Engine.objetoComDono(source, ef.objeto)) return;
                const h = Engine.linha(source, c.dir, c.passos).pop();
                source.objetos[ef.objeto] = { q: h.q, r: h.r };
                Engine.log(
                    state,
                    `A ${(CONFIG.objetos[ef.objeto] || {}).nome || ef.objeto} de ${Engine.label(source)} fica em (${h.q}, ${h.r})`,
                );
            },
        },
        // A fonte vai para a zona escolhida (alvo 'zona' livre, adjacente), sem gastar movimento e sem acionar
        // reações de movimento (Machadada, Compelir). Escolha null = fica onde está.
        moverPara: {
            global: true,
            run(state, source, ability, ef, { choice }) {
                const h = Engine.parseZona(choice);
                if (
                    !source ||
                    !h ||
                    !Engine.isAlive(source) ||
                    Rules.hexDistance(source, h) !== 1 ||
                    !Engine.zonaLivre(state, h)
                )
                    return;
                Engine.moveTo(state, source, h, { caminho: [{ q: source.q, r: source.r }, h], semGatilhos: true });
                Engine.log(state, `${Engine.label(source)} se move para (${h.q}, ${h.r}) (${ability.nome})`);
            },
        },
        // Devolve o objeto à fonte, de onde estiver (puxar: só muda o texto do registro).
        recolherObjeto: {
            global: true,
            run(state, source, ability, ef) {
                if (source) Engine.recolherObjeto(state, source, ef.objeto, ef.puxar ? 'puxada' : null);
            },
        },
        // Mais um uso da habilidade nesta jogada, sem gastar a ação (o custo dela é pago normalmente).
        concederUso: {
            global: true,
            run(state, source, ability, ef) {
                if (!source || !source.turn || !Engine.def(ef.habilidade)) return;
                source.turn.extra = { habilidade: ef.habilidade };
                Engine.log(state, `${Engine.label(source)} ganha um uso extra de ${Engine.def(ef.habilidade).nome}`);
            },
        },
        // A fonte salta sobre o alvo escolhido e para na zona atrás dele (acontece mesmo se a Jogada de Ataque errar).
        saltarSobre: {
            global: true,
            run(state, source, ability, ef, { choice }) {
                const alvo = Rules.pieceById(state, choice);
                const dest = source && alvo && Engine.zonaAtras(source, alvo);
                if (!dest || !Engine.zonaLivre(state, dest)) {
                    if (source) Engine.log(state, `${Engine.label(source)} não tem onde aterrissar (${ability.nome})`);
                    return;
                }
                Engine.moveTo(state, source, dest, {
                    caminho: [{ q: source.q, r: source.r }, { q: alvo.q, r: alvo.r }, dest],
                });
                Engine.log(
                    state,
                    `${Engine.label(source)} salta sobre ${Engine.label(alvo)} e aterrissa em (${dest.q}, ${dest.r})`,
                );
            },
        },
        // Salto até a zona escolhida ao lado do alvo (alvo 'salto'); acontece mesmo se a Jogada de Ataque errar.
        saltarPara: {
            global: true,
            run(state, source, ability, ef, { choice }) {
                const c = Engine.parseSalto(choice),
                    alvo = c && Rules.pieceById(state, c.id);
                if (!source || !c || !Engine.isAlive(source)) return;
                if (c.q === source.q && c.r === source.r) return; // já estava ao lado do alvo
                if (!Engine.zonaLivre(state, c)) {
                    Engine.log(state, `${Engine.label(source)} não tem onde aterrissar (${ability.nome})`);
                    return;
                }
                Engine.moveTo(
                    state,
                    source,
                    { q: c.q, r: c.r },
                    {
                        caminho: [
                            { q: source.q, r: source.r },
                            { q: c.q, r: c.r },
                        ],
                    },
                );
                Engine.log(
                    state,
                    `${Engine.label(source)} pula${alvo ? ` até ${Engine.label(alvo)}` : ''} e aterrissa em (${c.q}, ${c.r})`,
                );
            },
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
                Engine.log(
                    state,
                    `${Engine.label(source)} consome ${Engine.textoRecurso(ef.recurso, n)} e recupera ${source.stats.amago - antes} Âmago (${ability.nome})`,
                );
            },
        },
        // Zera o movimento restante do alvo neste turno (não altera a Agilidade).
        zerarMovimento: {
            run(state, source, ability, ef, { target }) {
                if (!target.turn) return;
                target.turn.movimentoZerado = true;
                Engine.log(state, `${Engine.label(target)} não pode mais se mover neste turno (${ability.nome})`);
            },
        },
        // Movimento forçado. direcao: 'afastar' (empurra para longe da fonte), 'aproximar', 'atravessar' (por cima da
        // fonte, para a zona oposta).
        deslocar: {
            run(state, source, ability, ef, ctx) {
                if (source) Engine.forcedMove(state, source, ctx.target, ef, ability, ctx);
            },
        },
        // A fonte se move para a zona que o alvo ocupava antes da habilidade (se estiver livre).
        ocuparOrigemDoAlvo: {
            run(state, source, ability, ef, { target, origens }) {
                const o = origens.get(target.id);
                if (!source || !o || !Rules.isHexOnBoard(o.q, o.r) || Rules.pieceAt(state, o.q, o.r)) return;
                Engine.moveTo(state, source, o, {});
                Engine.log(state, `${Engine.label(source)} avança para (${o.q}, ${o.r})`);
            },
        },
        // Enfileira uma habilidade interna com escolha de alvo própria (excluindo os alvos deste uso).
        acionarHabilidade: {
            global: true,
            run(state, source, ability, ef, { targets }) {
                if (!source) return;
                state.triggers.push({
                    donoId: source.id,
                    abilityId: ef.habilidade,
                    origemId: source.id,
                    excluir: targets.map((t) => t.id),
                });
            },
        },
        // Ganha (ou perde, valor < 0) um recurso especial, até o máximo. umaVezPorTurno: só um ganho por turno da
        // Estrela.
        recurso: {
            run(state, source, ability, ef, { target }) {
                const cfg = CONFIG.recursos[ef.recurso];
                if (!cfg || !target.recursos) return;
                const t = target.turn;
                if (ef.umaVezPorTurno && t && t.recursoGanho && t.recursoGanho[ef.recurso]) return;
                const antes = target.recursos[ef.recurso] || 0;
                // ex.: { stat: 'magico' }
                const valor = typeof ef.valor === 'number' ? ef.valor : Engine.valorDe(target, ef.valor, target);
                target.recursos[ef.recurso] = Math.max(0, Math.min(cfg.max ?? Infinity, antes + valor));
                const d = target.recursos[ef.recurso] - antes;
                if (!d) return;
                if (ef.umaVezPorTurno && t) t.recursoGanho = { ...(t.recursoGanho || {}), [ef.recurso]: true };
                Engine.log(
                    state,
                    `${Engine.label(target)}: ${d > 0 ? '+' : ''}${d} ${Math.abs(d) === 1 ? cfg.singular : cfg.nome} (${target.recursos[ef.recurso]}/${cfg.max})`,
                );
            },
        },
        recuperarAmago: {
            global: true,
            run(state, source, ability, ef) {
                if (!source) return;
                const pago = source.turn && source.turn.custoPago && source.turn.custoPago[ability.id];
                const v =
                    ef.valor === 'custo' ? (pago ?? Engine.custo(source, ability)) : Engine.valorDe(source, ef.valor);
                if (v <= 0) return;
                Rules.restoreAmago(source, v);
                Engine.log(state, `${Engine.label(source)} recupera ${v} Âmago (${ability.nome})`);
            },
        },
    },
};
