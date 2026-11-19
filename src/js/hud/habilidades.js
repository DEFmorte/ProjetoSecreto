// ── Barra de habilidades ──
// Botões das habilidades da Estrela selecionada, a caixa de prévia (setPreview) e o alcance mostrado no tabuleiro.
import { descricaoComTermos, notasDeTermos } from '../interface/glossario.js';
import { COR, esc, icRenome } from '../interface/icones.js';
import { resumoHab } from '../interface/resumos.js';
import { custoHTML, selectedPiece, startAbilityMode } from '../interface/selecao.js';
import { ui } from '../interface/ui.js';
import { CONFIG } from '../motor/config.js';
import { Engine } from '../motor/engine.js';
import { Rules } from '../motor/regras.js';
import { $ } from '../nucleo/dom.js';
import { collectRenome } from '../partida/acoes.js';
import { state } from '../partida/estado.js';
import { refreshRenderCache } from '../render/desenho.js';
import { ehCompacto, HUD } from '../render/tela.js';
import { tagTipoHTML } from './cartoes.js';
import { tipoLabel } from './turno.js';

// Por que a habilidade não pode ser usada agora (texto curto para o botão/dica).
export function motivoIndisponivel(piece, a) {
    const car = Engine.caracteristicas(piece, a);
    if (!Engine.modosPagamento(piece, a, car).length) return a.custoAlternativo ? 'Sem Âmago nem Penas' : 'Sem Âmago';
    if (!Engine.podeUsarNaRodada(piece, a, car)) return 'Já usada neste turno';
    if (a.naoAcumula && Engine.efeitoAtivo(piece, a.id)) return 'Efeito ainda ativo';
    const livre = Engine.isFree(piece, a, car);
    if (car.ultraRapida && !livre) return 'Só antes de outra habilidade';
    if (
        a.repeteCom &&
        piece.turn &&
        (piece.turn.usos[a.id] || 0) > 0 &&
        Engine.recurso(piece, a.repeteCom.recurso) < a.repeteCom.valor
    )
        return `Sem ${(CONFIG.recursos[a.repeteCom.recurso] || {}).singular || a.repeteCom.recurso} para repetir`;
    if (piece.turn && !livre && !piece.turn.extra && Engine.usouOutraHabilidade(piece))
        return piece.turn.actionUsed ? 'Ação já usada' : 'Já usou outra habilidade';
    const alvo = Engine.alvoDe(piece, a);
    if (alvo && alvo.motivo) return typeof alvo.motivo === 'function' ? alvo.motivo(piece, state) : alvo.motivo;
    return 'Sem alvo no alcance';
}

export function updateAbilityBar() {
    const bar = $('ability-bar');
    const p = state && !state.winner && !state.pending && !ui.mode ? selectedPiece() : null;
    const abilities =
        p && Rules.canSelect(state, p)
            ? Engine.abilitiesOf(p).filter((a) => a.tipo !== 'passiva' && a.tipo !== 'reacao')
            : [];
    bar.innerHTML = '';
    ui.atalhos = abilities.map((a) => a.id);
    const marcador = p && Rules.canSelect(state, p) ? Rules.renomeEm(state, p.q, p.r) : null;
    if (!abilities.length && !marcador) {
        bar.classList.add('hidden');
        setPreview(null);
        return;
    }
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
            if (ui.toqueHab && ui.previewId !== a.id) {
                setPreview(a.id);
                return;
            } // toque: 1º mostra, 2º usa
            if (ok) startAbilityMode(a.id);
        });
        b.addEventListener('pointerenter', (e) => {
            if (e.pointerType === 'mouse') setPreview(a.id);
        });
        b.addEventListener('pointerleave', (e) => {
            if (e.pointerType === 'mouse') setPreview(null);
        });
        bar.appendChild(b);
    });
    bar.classList.remove('hidden');
    if (ui.previewId && !ui.atalhos.includes(ui.previewId)) setPreview(null);
    else if (ui.previewId) setPreview(ui.previewId, true);
}

// "Agora": o que a habilidade alcançaria na situação atual (alvos no alcance / atingidos).
export function agoraHab(p, a) {
    try {
        if (!state || a.tipo === 'passiva' || a.tipo === 'reacao') return '';
        const alvo = Engine.alvoDe(p, a),
            nomes = (ids) =>
                ids
                    .map((id) => (Rules.pieceById(state, id) || {}).stats)
                    .filter(Boolean)
                    .map((s) => esc(s.nome));
        const ch = Engine.choices(state, p, alvo, Engine.restrict(state, p, a));
        if (alvo.tipo === 'inimigo' || alvo.tipo === 'escolha') {
            const n = nomes(ch.filter((id) => id !== p.id));
            if (ch.length === 1 && ch[0] === p.id) return 'Agora: só pode ser usada em si mesma.';
            return n.length
                ? `Agora: ${n.length === 1 ? 'alvo' : n.length + ' alvos'} no alcance — ${n.join(', ')}`
                : 'Agora: nenhum alvo no alcance.';
        }
        if (alvo.tipo === 'ao-redor') {
            const n = nomes(Engine.affected(state, p, alvo, null).map((x) => (typeof x === 'object' && x ? x.id : x)));
            return n.length ? `Agora: atingiria ${n.join(', ')}` : 'Agora: ninguém ao redor.';
        }
        if (alvo.tipo === 'linha' || alvo.tipo === 'arco')
            return ch.length
                ? `Agora: ${ch.length} direç${ch.length === 1 ? 'ão atinge' : 'ões atingem'} alguém.`
                : 'Agora: nenhuma direção atinge alguém.';
        if (alvo.tipo === 'avanco')
            return ch.length ? `Agora: ${ch.length} destino(s) possível(is).` : 'Agora: nenhum destino livre.';
        if (alvo.tipo === 'varios') {
            const n = nomes([...new Set(ch.flatMap((x) => Engine.parseVarios(x)))]);
            return n.length
                ? `Agora: ${n.length === 1 ? 'só 1 inimigo' : n.length + ' inimigos'} no alcance — ${n.join(', ')}`
                : 'Agora: nenhum inimigo no alcance.';
        }
        if (alvo.tipo === 'zona')
            return ch.length ? `Agora: ${ch.length} zona(s) atingem alguém.` : 'Agora: nenhuma Estrela no alcance.';
        if (alvo.tipo === 'salto') {
            const n = nomes([...new Set(ch.map((x) => Engine.parseSalto(x).id))]);
            return n.length
                ? `Agora: ${n.length === 1 ? 'alvo' : n.length + ' alvos'} no alcance — ${n.join(', ')}`
                : 'Agora: nenhum inimigo no alcance com zona livre ao lado.';
        }
        if (alvo.tipo === 'trajeto') {
            if (!alvo.destino) return `Agora: ${ch.length} zona(s) de destino.`;
            const n = nomes(ch.length ? Engine.affected(state, p, alvo, ch[0]) : []);
            return n.length ? `Agora: atingiria ${n.join(', ')}` : 'Agora: ninguém no caminho.';
        }
    } catch (e) {
        /* só informativo */
    }
    return '';
}

// Habilidade sob o mouse: alcance + alvos no tabuleiro e um cartão com a descrição completa, perto do botão.
export function setPreview(id, forcar = false) {
    const tip = $('ability-tip');
    if (ui.previewId !== id || forcar) {
        ui.previewId = id;
        refreshRenderCache();
    }
    document
        .querySelectorAll('#ability-bar [data-ability]')
        .forEach((b) => b.classList.toggle('em-foco', b.dataset.ability === id));
    const p = selectedPiece(),
        a = id && Engine.def(id);
    if (!a || !p || !state) {
        tip.classList.add('hidden');
        return;
    }
    const ok = Engine.canUse(state, p, a),
        car = Engine.caracteristicas(p, a),
        automatica = a.tipo === 'passiva' || a.tipo === 'reacao';
    const alvo = Engine.alvoDe(p, a);
    const custoTxt =
        a.tipo === 'passiva'
            ? ''
            : `◆ ${car.custo} Âmago${a.custoAlternativo ? ` ou ${Engine.textoRecurso(a.custoAlternativo.recurso, a.custoAlternativo.valor)}` : ''}${a.custoAdicional ? ` + ${Engine.textoRecurso(a.custoAdicional.recurso, a.custoAdicional.valor)}` : ''}`;
    const fatos = [];
    if (alvo.tipo === 'proprio') fatos.push(['Alvo', 'A própria Estrela']);
    else if (car.alcance) fatos.push(['Alcance', `${car.alcance} zona${car.alcance > 1 ? 's' : ''}`]);
    if (car.area) fatos.push(['Área', car.area]);
    if (car.duracao) fatos.push(['Duração', Engine.descreverDuracao(car.duracao)]);
    const extras = [car.repetivel ? '<span class="hab-tag tag-extra">REPETÍVEL</span>' : ''].join('');
    const resumo = resumoHab(p, a),
        agora = ok ? agoraHab(p, a) : '';
    const custoTxtR =
        custoTxt +
        (a.repeteCom
            ? ` · repete: +${(CONFIG.recursos[a.repeteCom.recurso] || {}).icone || ''}${a.repeteCom.valor}`
            : '');
    tip.innerHTML = `<div class="tip-topo"><b>${a.nome}</b><span style="color:${COR.amago}">${custoTxtR}</span></div>
        <div class="tip-tags">${tagTipoHTML(a, car)}${extras}</div>
        ${fatos.length ? `<div class="tip-fatos">${fatos.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
        ${resumo ? `<div class="tip-resumo">${resumo}</div>` : ''}
        <div class="tip-desc">${descricaoComTermos(a.descricao, false)}</div>
        ${((n) => (n ? `<div class="tip-notas">${n}</div>` : ''))(notasDeTermos(a.descricao))}
        ${agora ? `<div class="tip-agora">${agora}</div>` : ''}
        <div class="tip-status ${automatica ? '' : ok ? 'ok' : 'nao'}">${
            automatica
                ? a.tipo === 'passiva'
                    ? 'Passiva: funciona sozinha, sem precisar ser usada.'
                    : 'Reação: é oferecida automaticamente quando a condição acontece.'
                : ok && ui.toqueHab
                  ? 'Toque de novo na habilidade para usar e escolha o alvo destacado.'
                  : ok
                    ? `Clique (ou tecla ${ui.atalhos.indexOf(a.id) + 1}) e escolha o alvo destacado. Zonas claras = alcance.`
                    : `✖ Indisponível: ${esc(motivoIndisponivel(p, a))}`
        }</div>`;
    if (ehCompacto()) {
        // compacto: cobre a coluna esquerda (CSS), deixando o tabuleiro livre
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
export function alcanceHexes(piece, a) {
    const alvo = Engine.alvoDe(piece, a);
    if (alvo.tipo === 'proprio') return [{ q: piece.q, r: piece.r }];
    if (alvo.tipo === 'linha' || alvo.tipo === 'avanco' || alvo.tipo === 'trajeto') {
        const n = alvo.comprimento ?? alvo.alcance ?? 1;
        return Rules.DIRS.flatMap((_, i) => Engine.linha(piece, i, n, true));
    }
    const R = alvo.alcance ?? alvo.raio ?? 1;
    return Rules.zonas().filter((z) => {
        const d = Rules.distancia(piece, z);
        return d >= 1 && d <= R;
    });
}

// Situação de cada habilidade na rodada (para planejar: reação pronta, habilidade já usada, sem Âmago).
export function situacaoHabilidade(piece, a) {
    const usada = ((piece.turn && piece.turn.usos) || {})[a.id] > 0 && !Engine.podeUsarNaRodada(piece, a);
    if (a.tipo === 'passiva') return { txt: 'PASSIVA', cls: 'text-gray-400' };
    if (usada) return { txt: 'USADA', cls: 'text-gray-500' };
    const custo = Engine.custo(piece, a);
    const alt = a.custoAlternativo
        ? ` / ${(CONFIG.recursos[a.custoAlternativo.recurso] || {}).icone || ''}${a.custoAlternativo.valor}`
        : '';
    if (!Engine.modosPagamento(piece, a).length)
        return { txt: `◆${custo}${alt} · SEM ${alt ? 'CUSTO' : 'ÂMAGO'}`, cls: 'text-red-400' };
    if (alt) return { txt: `◆${custo}${alt}`, cls: 'text-sky-400' };
    if (a.tipo === 'reacao') return { txt: `◆${custo} · REAÇÃO`, cls: 'text-green-400' };
    return { txt: `◆${custo}`, cls: 'text-sky-400' };
}
