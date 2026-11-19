function tipoLabel(a, piece) {
    const c = Engine.caracteristicas(piece, a);
    return ((CONFIG.habilidades.primarias[a.tipo] || {}).label || a.tipo) + (c.ultraRapida ? ' · Ultra Rápida' : '');
}

const rotuloJogador = (theme) => theme.label.charAt(0) + theme.label.slice(1).toLowerCase(); // "JOGADOR 1" → "Jogador 1"
function updateTurnBannerUI() {
    if (!state) return;
    const banner = $('turn-banner');
    const text = $('turn-text');
    const block = Rules.currentBlock(state);
    const active = Rules.activePiece(state);
    const theme = CONFIG.players[state.winner] || CONFIG.players[(block && block.player) || 1];
    banner.style.backgroundColor = theme.bannerBg;
    banner.style.borderColor = theme.bannerBorder;
    text.style.color = theme.bannerText;
    const voce = block && ((Rede.ativo() && block.player === Rede.eu) || (Bot.ativo() && !Bot.ehBot(block.player))) ? ' (você)' : '';
    if (state.winner) {
        text.innerHTML = state.winner === 'empate' ? 'EMPATE!'
            : `${theme.label} VENCEU!${state.vencedorRenome === state.winner ? ` (${icRenome()} ${Rules.metaRenome(state)} de Renome)` : ''}`;
    } else if (active) {
        text.innerText = `Rodada ${state.round} · ${rotuloJogador(theme)}${voce} — ${active.stats.nome} agindo`;
    } else {
        const n = Rules.pendingIds(state).length;
        text.innerText = block && Bot.ehBot(block.player) ? `Rodada ${state.round} · ${rotuloJogador(theme)} — pensando…`
            : `Rodada ${state.round} · ${rotuloJogador(theme)}${voce} — escolha ${ehCompacto() ? '' : 'uma Estrela '}(${n} ${n === 1 ? 'falta' : 'faltam'})`;
    }
}

function updateInitiativeBar() {
    const list = $('initiative-list');
    if (!state) { list.innerHTML = ''; return; }
    const stat = CONFIG.rules.initiative.stat;
    const byInitiative = CONFIG.rules.turnMode === 'initiative';
    const inspId = (inspectedPiece() || {}).id;
    // Contagem do Renome extra (partida travada: uma equipe com só 1 Estrela).
    const extra = $('ini-extra'), rx = state.renomeExtra, cfgX = CONFIG.renome.extra;
    extra.classList.toggle('hidden', !rx || !cfgX || !!state.winner);
    if (rx && cfgX) {
        const n = Math.max(0, Math.round(Number(rx.faltam) || 0));
        const recem = rx.ultimo && rx.ultimo.rodada === state.round && rx.ultimo.bloco === state.blockIndex;
        extra.innerHTML = `${recem ? `${icRenome()} <b>Novo Renome</b> no tabuleiro! ` : `${icRenome()} `}${recem ? 'Próximo' : 'Novo Renome'} em <b>${n}</b> ${n === 1 ? 'rodada' : 'rodadas'}`;
        extra.title = `Uma equipe está com só ${cfgX.quandoEquipeCom === 1 ? '1 Estrela' : `${cfgX.quandoEquipeCom} Estrelas`}: a cada ${cfgX.rodadas} rodadas, no começo da rodada, surge um marcador de Renome numa zona vazia sorteada.`;
    }
    $('initiative-title').innerText = byInitiative ? 'BLOCOS DE AÇÃO (por agilidade)' : 'ORDEM DOS TURNOS';
    list.innerHTML = state.blocks.map((b, bi) => {
        const theme = CONFIG.players[b.player];
        const isCurrent = bi === state.blockIndex && !state.winner;
        const rows = b.ids.map(id => {
            const p = Rules.pieceById(state, id);
            if (!p) return '';
            const isActive = state.activeId === id;
            const mark = p.turn.done ? '✓' : (isActive ? '▶' : '');
            const style = `border-left:3px solid ${theme.bannerBorder};` +
                (isActive ? 'background:rgba(255,255,255,0.15);' : '') +
                (p.turn.done ? 'opacity:0.4;' : '');
            return `<div data-id="${p.id}" class="flex items-center gap-2 px-2 py-1 rounded-lg text-xs mono font-bold cursor-pointer hover:bg-white/10${inspId === p.id ? ' ini-insp' : ''}" title="${esc(p.stats.nome)}" style="${style}">
                ${(src => src ? `<span class="ini-ret" style="border-color:${p.color};background-image:url('${src}')"></span>` : `<span class="w-3 h-3 rounded-full shrink-0" style="background:${p.color}"></span>`)(retratoSrc(p.stats.nome))}
                <span class="flex-1 ini-nome">${p.stats.nome}</span>
                ${p.renome ? `<span style="color:${CONFIG.renome.cor}">${icRenome()}${p.renome}</span>` : ''}
                <span style="color:${COR[stat] || '#60a5fa'}" title="${esc((CONFIG.statFields.find(f => f.key === stat) || {}).label || stat)}">${Rules.stat(p, stat)}</span>
                <span class="w-3 text-center">${mark}</span>
            </div>`;
        }).join('');
        if (!rows) return '';
        const wrap = `border:1px solid ${isCurrent ? theme.bannerBorder : 'transparent'};` +
            (bi < state.blockIndex ? 'opacity:0.35;' : '');
        return `<div class="rounded-lg p-1 flex flex-col gap-1${isCurrent ? ' bloco-atual' : ''}" style="${wrap}">
            <p class="text-[10px] font-bold tracking-widest px-1" style="color:${theme.bannerText}">${byInitiative ? `BLOCO ${bi + 1}` : 'TURNO'} · ${theme.label} <span style="color:${CONFIG.renome.cor}">${icRenome()} ${Rules.renomeTime(state, b.player)}${Rules.metaRenome(state) ? '/' + Rules.metaRenome(state) : ''}</span></p>${rows}
        </div>`;
    }).join('');
}

// Passar o mouse / clicar num nome da ordem dos turnos inspeciona a Estrela.
(() => {
    const list = $('initiative-list');
    const idDe = (e) => { const row = e.target.closest('[data-id]'); return row ? Number(row.dataset.id) : null; };
    list.addEventListener('mouseover', e => setHover(idDe(e), true));
    list.addEventListener('mouseleave', () => setHover(null));
    list.addEventListener('click', e => {
        const id = idDe(e);
        if (id == null) return;
        const p = Rules.pieceById(state, id);
        if (p && Rules.canSelect(state, p)) { selectPiece(p); return; }
        ui.pinId = ui.pinId === id ? null : id;
        updateInspectPanel();
    });
})();

// Por que a habilidade não pode ser usada agora (texto curto para o botão/dica).
function motivoIndisponivel(piece, a) {
    const car = Engine.caracteristicas(piece, a);
    if (!Engine.modosPagamento(piece, a, car).length) return a.custoAlternativo ? 'Sem Âmago nem Penas' : 'Sem Âmago';
    if (!Engine.podeUsarNaRodada(piece, a, car)) return 'Já usada neste turno';
    if (a.naoAcumula && Engine.efeitoAtivo(piece, a.id)) return 'Efeito ainda ativo';
    const livre = Engine.isFree(piece, a, car);
    if (car.ultraRapida && !livre) return 'Só antes de outra habilidade';
    if (a.repeteCom && piece.turn && (piece.turn.usos[a.id] || 0) > 0 && Engine.recurso(piece, a.repeteCom.recurso) < a.repeteCom.valor)
        return `Sem ${(CONFIG.recursos[a.repeteCom.recurso] || {}).singular || a.repeteCom.recurso} para repetir`;
    if (piece.turn && !livre && !piece.turn.extra && Engine.usouOutraHabilidade(piece)) return piece.turn.actionUsed ? 'Ação já usada' : 'Já usou outra habilidade';
    const alvo = Engine.alvoDe(piece, a);
    if (alvo && alvo.motivo) return typeof alvo.motivo === 'function' ? alvo.motivo(piece, state) : alvo.motivo;
    return 'Sem alvo no alcance';
}

function updateAbilityBar() {
    const bar = $('ability-bar');
    const p = state && !state.winner && !state.pending && !ui.mode ? selectedPiece() : null;
    const abilities = p && Rules.canSelect(state, p) ? Engine.abilitiesOf(p).filter(a => a.tipo !== 'passiva' && a.tipo !== 'reacao') : [];
    bar.innerHTML = '';
    ui.atalhos = abilities.map(a => a.id);
    const marcador = p && Rules.canSelect(state, p) ? Rules.renomeEm(state, p.q, p.r) : null;
    if (!abilities.length && !marcador) { bar.classList.add('hidden'); setPreview(null); return; }
    if (marcador) {
        const b = document.createElement('button');
        b.disabled = !Rules.podeColetar(state, p);
        b.title = 'Usa a ação da Estrela para pegar o marcador de Renome desta zona.';
        b.className = 'hab-btn hab-renome';
        b.style.color = CONFIG.renome.cor;
        b.innerHTML = `<span class="kbd">C</span><span>${icRenome()} Coletar Renome <span class="text-white">· ${marcador.valor}</span>
            <span class="sub-hab block text-gray-400">Usa a ação</span></span>`;
        b.addEventListener('click', collectRenome);
        bar.appendChild(b);
    }
    abilities.forEach((a, i) => {
        const ok = Engine.canUse(state, p, a);
        const car = Engine.caracteristicas(p, a);
        const b = document.createElement('button');
        b.dataset.ability = a.id;
        b.setAttribute('aria-disabled', String(!ok)); // sem `disabled`: o mouse ainda mostra o alcance e o motivo
        b.className = `hab-btn${ok ? '' : ' off'}`;
        const sub = ok ? `${tipoLabel(a, p)}${car.alcance ? ` · Alc. ${car.alcance}` : ''}` : motivoIndisponivel(p, a);
        b.innerHTML = `<span class="kbd">${i + 1}</span><span><span class="hab-btn-nome">${a.nome} ${custoHTML(p, a, car)}</span>
            <span class="sub-hab block ${!ok ? 'text-red-300' : car.ultraRapida ? 'text-cyan-300' : 'text-gray-400'}">${ok ? sub : '✖ ' + sub}</span></span>`;
        b.addEventListener('click', () => {
            if (ui.toqueHab && ui.previewId !== a.id) { setPreview(a.id); return; } // toque: 1º mostra, 2º usa
            if (ok) startAbilityMode(a.id);
        });
        b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setPreview(a.id); });
        b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') setPreview(null); });
        bar.appendChild(b);
    });
    bar.classList.remove('hidden');
    if (ui.previewId && !ui.atalhos.includes(ui.previewId)) setPreview(null); else if (ui.previewId) setPreview(ui.previewId, true);
}

// "Agora": o que a habilidade alcançaria na situação atual (alvos no alcance / atingidos).
function agoraHab(p, a) {
    try {
        if (!state || a.tipo === 'passiva' || a.tipo === 'reacao') return '';
        const alvo = Engine.alvoDe(p, a), nomes = ids => ids.map(id => (Rules.pieceById(state, id) || {}).stats).filter(Boolean).map(s => esc(s.nome));
        const ch = Engine.choices(state, p, alvo, Engine.restrict(state, p, a));
        if (alvo.tipo === 'inimigo' || alvo.tipo === 'escolha') {
            const n = nomes(ch.filter(id => id !== p.id));
            if (ch.length === 1 && ch[0] === p.id) return 'Agora: só pode ser usada em si mesma.';
            return n.length ? `Agora: ${n.length === 1 ? 'alvo' : n.length + ' alvos'} no alcance — ${n.join(', ')}` : 'Agora: nenhum alvo no alcance.';
        }
        if (alvo.tipo === 'ao-redor') {
            const n = nomes(Engine.affected(state, p, alvo, null).map(x => typeof x === 'object' && x ? x.id : x));
            return n.length ? `Agora: atingiria ${n.join(', ')}` : 'Agora: ninguém ao redor.';
        }
        if (alvo.tipo === 'linha' || alvo.tipo === 'arco') return ch.length ? `Agora: ${ch.length} direç${ch.length === 1 ? 'ão atinge' : 'ões atingem'} alguém.` : 'Agora: nenhuma direção atinge alguém.';
        if (alvo.tipo === 'avanco') return ch.length ? `Agora: ${ch.length} destino(s) possível(is).` : 'Agora: nenhum destino livre.';
        if (alvo.tipo === 'varios') {
            const n = nomes([...new Set(ch.flatMap(x => Engine.parseVarios(x)))]);
            return n.length ? `Agora: ${n.length === 1 ? 'só 1 inimigo' : n.length + ' inimigos'} no alcance — ${n.join(', ')}` : 'Agora: nenhum inimigo no alcance.';
        }
        if (alvo.tipo === 'zona') return ch.length ? `Agora: ${ch.length} zona(s) atingem alguém.` : 'Agora: nenhuma Estrela no alcance.';
        if (alvo.tipo === 'salto') {
            const n = nomes([...new Set(ch.map(x => Engine.parseSalto(x).id))]);
            return n.length ? `Agora: ${n.length === 1 ? 'alvo' : n.length + ' alvos'} no alcance — ${n.join(', ')}` : 'Agora: nenhum inimigo no alcance com zona livre ao lado.';
        }
        if (alvo.tipo === 'trajeto') {
            if (!alvo.destino) return `Agora: ${ch.length} zona(s) de destino.`;
            const n = nomes(ch.length ? Engine.affected(state, p, alvo, ch[0]) : []);
            return n.length ? `Agora: atingiria ${n.join(', ')}` : 'Agora: ninguém no caminho.';
        }
    } catch (e) { /* só informativo */ }
    return '';
}

// Habilidade sob o mouse: alcance + alvos no tabuleiro e um cartão com a descrição completa, perto do botão.
function setPreview(id, forcar = false) {
    const tip = $('ability-tip');
    if (ui.previewId !== id || forcar) { ui.previewId = id; refreshRenderCache(); }
    document.querySelectorAll('#ability-bar [data-ability]').forEach(b => b.classList.toggle('em-foco', b.dataset.ability === id));
    const p = selectedPiece(), a = id && Engine.def(id);
    if (!a || !p || !state) { tip.classList.add('hidden'); return; }
    const ok = Engine.canUse(state, p, a), car = Engine.caracteristicas(p, a), automatica = a.tipo === 'passiva' || a.tipo === 'reacao';
    const alvo = Engine.alvoDe(p, a);
    const custoTxt = a.tipo === 'passiva' ? '' : `◆ ${car.custo} Âmago${a.custoAlternativo ? ` ou ${Engine.textoRecurso(a.custoAlternativo.recurso, a.custoAlternativo.valor)}` : ''}${a.custoAdicional ? ` + ${Engine.textoRecurso(a.custoAdicional.recurso, a.custoAdicional.valor)}` : ''}`;
    const fatos = [];
    if (alvo.tipo === 'proprio') fatos.push(['Alvo', 'A própria Estrela']);
    else if (car.alcance) fatos.push(['Alcance', `${car.alcance} zona${car.alcance > 1 ? 's' : ''}`]);
    if (car.area) fatos.push(['Área', car.area]);
    if (car.duracao) fatos.push(['Duração', Engine.descreverDuracao(car.duracao)]);
    const extras = [car.repetivel ? '<span class="hab-tag tag-extra">REPETÍVEL</span>' : ''].join('');
    const resumo = resumoHab(p, a), agora = ok ? agoraHab(p, a) : '';
    const custoTxtR = custoTxt + (a.repeteCom ? ` · repete: +${(CONFIG.recursos[a.repeteCom.recurso] || {}).icone || ''}${a.repeteCom.valor}` : '');
    tip.innerHTML = `<div class="tip-topo"><b>${a.nome}</b><span style="color:${COR.amago}">${custoTxtR}</span></div>
        <div class="tip-tags">${tagTipoHTML(a, car)}${extras}</div>
        ${fatos.length ? `<div class="tip-fatos">${fatos.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
        ${resumo ? `<div class="tip-resumo">${resumo}</div>` : ''}
        <div class="tip-desc">${descricaoComTermos(a.descricao, false)}</div>
        ${(n => n ? `<div class="tip-notas">${n}</div>` : '')(notasDeTermos(a.descricao))}
        ${agora ? `<div class="tip-agora">${agora}</div>` : ''}
        <div class="tip-status ${automatica ? '' : ok ? 'ok' : 'nao'}">${automatica
            ? (a.tipo === 'passiva' ? 'Passiva: funciona sozinha, sem precisar ser usada.' : 'Reação: é oferecida automaticamente quando a condição acontece.')
            : ok && ui.toqueHab
            ? 'Toque de novo na habilidade para usar e escolha o alvo destacado.'
            : ok
            ? `Clique (ou tecla ${ui.atalhos.indexOf(a.id) + 1}) e escolha o alvo destacado. Zonas claras = alcance.`
            : `✖ Indisponível: ${esc(motivoIndisponivel(p, a))}`}</div>`;
    if (ehCompacto()) { // compacto: cobre a coluna esquerda (CSS), deixando o tabuleiro livre
        tip.style.bottom = tip.style.left = tip.style.right = tip.style.width = tip.style.transform = '';
        tip.classList.remove('hidden');
        return;
    }
    // Tela larga: logo acima do botão da habilidade, sem invadir as colunas laterais.
    const bar = $('ability-bar').getBoundingClientRect();
    const btn = document.querySelector(`#ability-bar [data-ability="${id}"]`);
    const ref = btn ? btn.getBoundingClientRect() : bar;
    const col = window.innerWidth >= HUD.larga ? $('hud-esq').getBoundingClientRect().right + 8 : 8;
    const larg = Math.min(352, window.innerWidth - 2 * col);
    tip.style.width = `${larg}px`;
    tip.style.transform = 'none';
    tip.style.right = 'auto';
    tip.style.bottom = `${window.innerHeight - bar.top + 8}px`;
    tip.style.left = `${Math.round(Math.max(col, Math.min(window.innerWidth - col - larg, ref.left + ref.width / 2 - larg / 2)))}px`;
    tip.classList.remove('hidden');
}

// Zonas dentro do alcance (andando só por zonas existentes) — para mostrar antes de escolher o alvo.
function alcanceHexes(piece, a) {
    const alvo = Engine.alvoDe(piece, a);
    if (alvo.tipo === 'proprio') return [{ q: piece.q, r: piece.r }];
    if (alvo.tipo === 'linha' || alvo.tipo === 'avanco' || alvo.tipo === 'trajeto') {
        const n = alvo.comprimento ?? alvo.alcance ?? 1;
        return Rules.DIRS.flatMap((_, i) => Engine.linha(piece, i, n, true));
    }
    const R = alvo.alcance ?? alvo.raio ?? 1;
    return Rules.zonas().filter(z => { const d = Rules.distancia(piece, z); return d >= 1 && d <= R; });
}

function promptButton(label, cls, fn) {
    const b = document.createElement('button');
    b.className = `${cls} text-white text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-lg transition`;
    b.innerText = label;
    b.addEventListener('click', fn);
    return b;
}

function updatePromptBar() {
    const bar = $('prompt-bar');
    const text = $('prompt-text');
    const box = $('prompt-buttons');
    box.innerHTML = '';
    let msg = null;

    if (state && !state.winner && state.pending) {
        const pd = state.pending;
        const decide = Rules.pieceById(state, pd.tipo === 'rolagem' ? pd.pieceId : pd.donoId);
        if ((Rede.ativo() && decide && decide.player !== Rede.eu) || (decide && Bot.ehBot(decide.player))) {
            const a = Engine.def(pd.abilityId);
            msg = `Aguardando o ${CONFIG.players[decide.player].label} decidir${a ? `: ${a.nome}` : ''}…`;
        } else if (pd.tipo === 'escolha') {
            const owner = Rules.pieceById(state, pd.donoId);
            const a = Engine.def(pd.abilityId);
            const c = ehToque() ? 'toque' : 'clique', mover = !!(a.alvo && a.alvo.livre);
            msg = pd.opcional && mover ? `${CONFIG.players[owner.player].label} — ${a.nome}: ${owner.stats.nome} pode se mover uma zona (${c} numa zona destacada) ou ficar onde está`
                : `${CONFIG.players[owner.player].label} — ${a.nome}: ${a.alvo && a.alvo.pergunta ? a.alvo.pergunta : `${c} no alvo (destacado)`}`;
            if (pd.opcional) box.appendChild(promptButton(mover ? 'Ficar' : 'Não usar', 'bg-gray-700 hover:bg-gray-600', () => resolveChoice(null)));
        } else if (pd.tipo === 'rolagem') {
            const a = Engine.def(pd.abilityId);
            const alvo = Rules.pieceById(state, pd.alvos[pd.i]);
            const cfg = CONFIG.rules.attackRoll;
            const { ignoraEsquiva, bonus } = Engine.bonusDefesa(Rules.pieceById(state, pd.pieceId), alvo, pd.ignora);
            const atkTxt = pd.i > 0 ? 'atacante usa o mesmo valor já rolado' :
                `atacante rola ${cfg.attackerDice.count}D${cfg.attackerDice.sides}${pd.alvos.length > 1 ? ' (uma vez para todos os alvos)' : ''}`;
            const atkTxtB = pd.bonusAtk && pd.i === 0 ? `${atkTxt} + ${pd.bonusAtk} de bônus` : atkTxt;
            msg = `${a.nome} em ${Engine.label(alvo)} (${pd.i + 1}/${pd.alvos.length}): ${atkTxtB}; ` +
                `defensor rola ${cfg.defenderDice.count}D${cfg.defenderDice.sides}${bonus ? ` + ${bonus}` : ''}${ignoraEsquiva ? ' (Esq. Ignorada)' : ''}.` +
                (pd.fixo ? (pd.fixo.def != null ? ` Rerolagem só do ataque (esquiva fica ${pd.fixo.def}).` : ` Rerolagem só da esquiva (ataque fica ${pd.fixo.atk}).`) : '') + ' O ataque acertou?';
            box.appendChild(promptButton('Acertou', 'bg-green-600 hover:bg-green-500', () => resolveRoll(true)));
            box.appendChild(promptButton('Esquivou', 'bg-red-700 hover:bg-red-600', () => resolveRoll(false)));
        } else if (pd.tipo === 'reacao') {
            const a = Engine.def(pd.abilityId);
            const alvo = Rules.pieceById(state, pd.alvoId);
            const custo = Engine.custo(Rules.pieceById(state, pd.donoId), a);
            const fonte = Rules.pieceById(state, pd.fonteId);
            msg = pd.pergunta ? pd.pergunta : !pd.apoio ? (pd.alvoId === pd.donoId ? `Deseja usar a reação ${a.nome}? (Custo: ${custo} Âmago)` : `Deseja usar a reação ${a.nome} contra ${alvo.stats.nome}? (Custo: ${custo} Âmago)`)
                : a.efeitoReacao === 'reducaoDano' ? `Usar ${a.nome} em ${alvo.stats.nome}? (-${a.reducao || 1} no dano de ${fonte ? fonte.stats.nome : 'inimigo'}, custo: ${custo} Âmago)`
                : `Usar ${a.nome} no ataque de ${alvo.stats.nome}? (+${a.bonus || 1} de dano, custo: ${custo} Âmago)`;
            const [sim, nao] = pd.rotulos || ['Usar', 'Ignorar'];
            box.appendChild(promptButton(sim, 'bg-blue-600 hover:bg-blue-500', () => resolveReaction(true)));
            box.appendChild(promptButton(nao, 'bg-gray-700 hover:bg-gray-600', () => resolveReaction(false)));
        }
    } else if (state && !state.winner && ui.mode) {
        const a = Engine.def(ui.mode.abilityId);
        const dica = ui.mode.etapa ? ({ arco: 'escolha a 2ª zona da área (destacada, vizinha da 1ª)', varios: 'escolha o 2º inimigo (destacado)',
                salto: 'escolha onde aterrissar (zona destacada ao lado do alvo)',
                zona: `área destacada — ${ehToque() ? 'toque' : 'clique'} nela (ou em Confirmar) para usar` }[a.alvo.tipo] || 'zona final ocupada — escolha onde parar (adjacente)')
            : (c => ({ inimigo: `${c} no inimigo (destacado)`, salto: `${c} no inimigo (destacado) — depois escolha onde aterrissar`, 'ao-redor': 'atinge adjacentes — confirme', linha: `${c} na direção (destacada)`, proprio: 'aplica a si mesmo — confirme', escolha: `${c} na Estrela (destacada)`, avanco: `${c} na zona de destino (destacada)`, trajeto: a.alvo.destino ? `${c} na zona do objeto (destacada)` : `${c} na zona de destino (em linha reta)`, arco: `${c} em uma zona da área (2 zonas vizinhas)`,
                varios: `${c} em ${a.alvo.quantidade ?? 2} inimigos diferentes (destacados)`, zona: `${c} na zona central da área (destacada)` }))(ehToque() ? 'toque' : 'clique')[a.alvo.tipo] || 'escolha o alvo';
        msg = `${a.nome}: ${dica}`;
        const modosHab = a.alvo.modos ? Engine.modosDe(selectedPiece(), a.alvo, state) || [] : null;
        if (modosHab) {
            msg = `${a.nome}: ${a.alvo.pergunta || 'escolha um efeito'}`;
            modosHab.forEach((nome, i) => box.appendChild(promptButton(nome, 'bg-green-600 hover:bg-green-500', () => useAbility(a.id, i))));
        } else if (a.alvo.tipo === 'ao-redor' || a.alvo.tipo === 'proprio') {
            box.appendChild(promptButton('Confirmar', 'bg-green-600 hover:bg-green-500', () => useAbility(a.id, null)));
        } else if (a.alvo.tipo === 'zona' && ui.mode.etapa) {
            const ch = ui.mode.etapa;
            box.appendChild(promptButton('Confirmar', 'bg-green-600 hover:bg-green-500', () => useAbility(a.id, ch)));
        }
        const piece = selectedPiece();
        const modos = piece && (a.custoAlternativo || a.custoAdicional) ? Engine.modosPagamento(piece, a) : [];
        if (a.custoAlternativo && modos.length) {
            const r = CONFIG.recursos[a.custoAlternativo.recurso] || {};
            const rotulo = { amago: `◆${Engine.custo(piece, a)} Âmago`, alternativo: `${r.icone || ''}${a.custoAlternativo.valor} ${a.custoAlternativo.valor === 1 ? r.singular : r.nome}` };
            if (modos.length > 1) {
                modos.forEach(m => box.appendChild(promptButton(rotulo[m], ui.mode.pagamento === m ? 'bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-300' : 'bg-gray-700 hover:bg-gray-600', () => trocarPagamento(m))));
                msg += ehToque() ? ' · pagar com:' : ` · pagar com (${'P'} troca):`;
            } else msg += ` · paga com ${rotulo[modos[0]]}`;
        }
        box.appendChild(promptButton(ui.mode.etapa ? 'Voltar' : 'Cancelar', 'bg-gray-700 hover:bg-gray-600', cancelAbilityMode));
    }

    if (msg) { text.innerText = msg; bar.classList.remove('hidden'); } else { bar.classList.add('hidden'); }
}

// Ícone de cada linha do log pelo tipo de acontecimento (acompanha a cor de logLinhaCls).
function logIcone(l) {
    if (/foi derrotado/.test(l)) return '✖';
    if (/vence|alcança/.test(l)) return '★';
    if (/sofre \d+ de dano/.test(l)) return '▼';
    if (/não sofre dano|ESQUIVA/.test(l)) return '○';
    if (/recupera|: vida \+|armadura \+|Renome/.test(l)) return '▲';
    if (/ACERTO/.test(l)) return '◎';
    return '·';
}
// Cor de cada linha do log pelo tipo de acontecimento.
function logLinhaCls(l) {
    if (/foi derrotado|vence|alcança/.test(l)) return 'text-red-400 font-bold';
    if (/sofre \d+ de dano/.test(l)) return 'text-red-300';
    if (/não sofre dano|ESQUIVA/.test(l)) return 'text-gray-400';
    if (/recupera|: vida \+|armadura \+|Renome/.test(l)) return 'text-green-300';
    if (/ACERTO/.test(l)) return 'text-amber-300';
    return 'text-gray-300';
}

// Log em acontecimentos: cada ação (e tudo o que ela causou) é um bloco separado por linha; o mais recente em destaque.
// Redesenhado no máximo uma vez por quadro (refazer o HTML e rolar até o fim força o navegador a recalcular a página).
let logAgendado = false;
function updateLogPanel() {
    if (logAgendado) return;
    logAgendado = true;
    requestAnimationFrame(() => { logAgendado = false; desenharLog(); });
}
function desenharLog() {
    const panel = $('log-panel');
    if (!state) { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    $('log-toggle-icon').innerText = ui.logAberto ? '▾' : '▸';
    const list = $('log-list');
    list.classList.toggle('hidden', !ui.logAberto);
    if (!ui.logAberto) return;
    const grupos = Engine.gruposLog(state).slice(-6);
    const html = grupos.map((g, i) => {
        const atual = i === grupos.length - 1;
        const [titulo, ...resto] = g;
        return `<div class="py-1.5 ${i ? 'border-t border-gray-600/70' : ''} ${atual ? 'log-atual' : 'opacity-60'}">
            <div class="font-bold ${atual ? 'text-white' : 'text-gray-300'}">${titulo}</div>
            ${resto.map(l => `<div class="log-l ${logLinhaCls(l)}"><span class="log-ic">${logIcone(l)}</span><span>${l}</span></div>`).join('')}
        </div>`;
    }).join('');
    if (list._html !== html) { list.innerHTML = html; list._html = html; list.scrollTop = list.scrollHeight; }
}
$('log-toggle').addEventListener('click', () => { ui.logAberto = !ui.logAberto; desenharLog(); });
$('ability-bar').addEventListener('pointerdown', (e) => { ui.toqueHab = e.pointerType !== 'mouse'; }, true);
$('ability-tip').addEventListener('click', () => setPreview(null)); // compacto: tocar no cartão fecha

function updateActionBar() {
    $('btn-undo').disabled = undoStack.length === 0;
    const p = state && !state.winner ? (Rules.activePiece(state) || selectedPiece()) : null;
    $('btn-skip').disabled = !(p && Rules.canSelect(state, p));
    $('turn-hint').innerText = dicaTurno();
    updateAbilityBar();
    Tutorial.verificar();
}

// Linha de ajuda sob o banner: o que dá para fazer agora.
function dicaTurno() {
    if (!state || state.winner || state.pending || ui.mode) return '';
    const p = selectedPiece();
    const bloco = Rules.currentBlock(state);
    if (Rede.ativo() && bloco && bloco.player !== Rede.eu) return `Vez do ${CONFIG.players[bloco.player].label} — aguardando a jogada…`;
    if (bloco && Bot.ehBot(bloco.player)) return `Vez do ${CONFIG.players[bloco.player].label} — ${Bot.texto || 'pensando…'}`;
    const toque = ehToque();
    if (!p || !Rules.canSelect(state, p)) return toque ? 'Toque numa Estrela com anel para agir' : 'Clique numa Estrela com anel para agir';
    const partes = [];
    if (ui.reachable.length > 1) partes.push(toque ? 'Mover: toque 2× numa zona verde' : 'Mover: 2 cliques numa zona verde');
    if (Engine.hasUsableAction(state, p)) partes.push(toque ? 'ou use uma habilidade' : 'Habilidade: teclas 1–9');
    if (!toque) partes.push('Encerrar: E');
    return partes.join(' · ');
}

function refreshHUD() {
    refreshRenderCache();
    updateTurnBannerUI();
    updateInitiativeBar();
    updateActionBar();
    updatePromptBar();
    updateLogPanel();
    updateInspectPanel();
}

// Situação de cada habilidade na rodada (para planejar: reação pronta, habilidade já usada, sem Âmago).
function situacaoHabilidade(piece, a) {
    const usada = ((piece.turn && piece.turn.usos) || {})[a.id] > 0 && !Engine.podeUsarNaRodada(piece, a);
    if (a.tipo === 'passiva') return { txt: 'PASSIVA', cls: 'text-gray-400' };
    if (usada) return { txt: 'USADA', cls: 'text-gray-500' };
    const custo = Engine.custo(piece, a);
    const alt = a.custoAlternativo ? ` / ${(CONFIG.recursos[a.custoAlternativo.recurso] || {}).icone || ''}${a.custoAlternativo.valor}` : '';
    if (!Engine.modosPagamento(piece, a).length) return { txt: `◆${custo}${alt} · SEM ${alt ? 'CUSTO' : 'ÂMAGO'}`, cls: 'text-red-400' };
    if (alt) return { txt: `◆${custo}${alt}`, cls: 'text-sky-400' };
    if (a.tipo === 'reacao') return { txt: `◆${custo} · REAÇÃO`, cls: 'text-green-400' };
    return { txt: `◆${custo}`, cls: 'text-sky-400' };
}
