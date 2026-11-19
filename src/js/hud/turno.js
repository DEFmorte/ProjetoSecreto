// ── Faixa do turno, ordem dos turnos e barra de ações ──
// Quem está jogando (faixa no topo), a ordem dos turnos (lista à direita) e os botões Encerrar/Desfazer.
import { Bot } from '../bot/bot.js';
import { COR, esc, icRenome } from '../interface/icones.js';
import { selectedPiece } from '../interface/selecao.js';
import { ui } from '../interface/ui.js';
import { retratoSrc } from '../menus/escolha-equipe.js';
import { Tutorial } from '../menus/tutorial.js';
import { CONFIG } from '../motor/config.js';
import { Engine } from '../motor/engine.js';
import { Rules } from '../motor/regras.js';
import { $ } from '../nucleo/dom.js';
import { Rede } from '../online/rede.js';
import { state, undoStack } from '../partida/estado.js';
import { ehCompacto, ehToque } from '../render/tela.js';
import { inspectedPiece } from './cartoes.js';
import { updateAbilityBar } from './habilidades.js';

export function tipoLabel(a, piece) {
    const c = Engine.caracteristicas(piece, a);
    return ((CONFIG.habilidades.primarias[a.tipo] || {}).label || a.tipo) + (c.ultraRapida ? ' · Ultra Rápida' : '');
}

// "JOGADOR 1" → "Jogador 1"
export const rotuloJogador = (theme) => theme.label.charAt(0) + theme.label.slice(1).toLowerCase();

export function updateTurnBannerUI() {
    if (!state) return;
    const banner = $('turn-banner');
    const text = $('turn-text');
    const block = Rules.currentBlock(state);
    const active = Rules.activePiece(state);
    const theme = CONFIG.players[state.winner] || CONFIG.players[(block && block.player) || 1];
    banner.style.backgroundColor = theme.bannerBg;
    banner.style.borderColor = theme.bannerBorder;
    text.style.color = theme.bannerText;
    const voce =
        block && ((Rede.ativo() && block.player === Rede.eu) || (Bot.ativo() && !Bot.ehBot(block.player)))
            ? ' (você)'
            : '';
    if (state.winner) {
        text.innerHTML =
            state.winner === 'empate'
                ? 'EMPATE!'
                : `${theme.label} VENCEU!${state.vencedorRenome === state.winner ? ` (${icRenome()} ${Rules.metaRenome(state)} de Renome)` : ''}`;
    } else if (active) {
        text.innerText = `Rodada ${state.round} · ${rotuloJogador(theme)}${voce} — ${active.stats.nome} agindo`;
    } else {
        const n = Rules.pendingIds(state).length;
        text.innerText =
            block && Bot.ehBot(block.player)
                ? `Rodada ${state.round} · ${rotuloJogador(theme)} — pensando…`
                : `Rodada ${state.round} · ${rotuloJogador(theme)}${voce} — escolha ${ehCompacto() ? '' : 'uma Estrela '}(${n} ${n === 1 ? 'falta' : 'faltam'})`;
    }
}

export function updateInitiativeBar() {
    const list = $('initiative-list');
    if (!state) {
        list.innerHTML = '';
        return;
    }
    const stat = CONFIG.rules.initiative.stat;
    const byInitiative = CONFIG.rules.turnMode === 'initiative';
    const inspId = (inspectedPiece() || {}).id;
    // Contagem do Renome extra (partida travada: uma equipe com só 1 Estrela).
    const extra = $('ini-extra'),
        rx = state.renomeExtra,
        cfgX = CONFIG.renome.extra;
    extra.classList.toggle('hidden', !rx || !cfgX || !!state.winner);
    if (rx && cfgX) {
        const n = Math.max(0, Math.round(Number(rx.faltam) || 0));
        const recem = rx.ultimo && rx.ultimo.rodada === state.round && rx.ultimo.bloco === state.blockIndex;
        extra.innerHTML = `${recem ? `${icRenome()} <b>Novo Renome</b> no tabuleiro! ` : `${icRenome()} `}${recem ? 'Próximo' : 'Novo Renome'} em <b>${n}</b> ${n === 1 ? 'rodada' : 'rodadas'}`;
        extra.title = `Uma equipe está com só ${cfgX.quandoEquipeCom === 1 ? '1 Estrela' : `${cfgX.quandoEquipeCom} Estrelas`}: a cada ${cfgX.rodadas} rodadas, no começo da rodada, surge um marcador de Renome numa zona vazia sorteada.`;
    }
    $('initiative-title').innerText = byInitiative ? 'BLOCOS DE AÇÃO (por agilidade)' : 'ORDEM DOS TURNOS';
    list.innerHTML = state.blocks
        .map((b, bi) => {
            const theme = CONFIG.players[b.player];
            const isCurrent = bi === state.blockIndex && !state.winner;
            const rows = b.ids
                .map((id) => {
                    const p = Rules.pieceById(state, id);
                    if (!p) return '';
                    const isActive = state.activeId === id;
                    const mark = p.turn.done ? '✓' : isActive ? '▶' : '';
                    const style =
                        `border-left:3px solid ${theme.bannerBorder};` +
                        (isActive ? 'background:rgba(255,255,255,0.15);' : '') +
                        (p.turn.done ? 'opacity:0.4;' : '');
                    return `<div data-id="${p.id}" class="flex items-center gap-2 px-2 py-1 rounded-lg text-xs mono font-bold cursor-pointer hover:bg-white/10${inspId === p.id ? ' ini-insp' : ''}" title="${esc(p.stats.nome)}" style="${style}">
                ${((src) => (src ? `<span class="ini-ret" style="border-color:${p.color};background-image:url('${src}')"></span>` : `<span class="w-3 h-3 rounded-full shrink-0" style="background:${p.color}"></span>`))(retratoSrc(p.stats.nome))}
                <span class="flex-1 ini-nome">${p.stats.nome}</span>
                ${p.renome ? `<span style="color:${CONFIG.renome.cor}">${icRenome()}${p.renome}</span>` : ''}
                <span style="color:${COR[stat] || '#60a5fa'}" title="${esc((CONFIG.statFields.find((f) => f.key === stat) || {}).label || stat)}">${Rules.stat(p, stat)}</span>
                <span class="w-3 text-center">${mark}</span>
            </div>`;
                })
                .join('');
            if (!rows) return '';
            const wrap =
                `border:1px solid ${isCurrent ? theme.bannerBorder : 'transparent'};` +
                (bi < state.blockIndex ? 'opacity:0.35;' : '');
            return `<div class="rounded-lg p-1 flex flex-col gap-1${isCurrent ? ' bloco-atual' : ''}" style="${wrap}">
            <p class="text-[10px] font-bold tracking-widest px-1" style="color:${theme.bannerText}">${byInitiative ? `BLOCO ${bi + 1}` : 'TURNO'} · ${theme.label} <span style="color:${CONFIG.renome.cor}">${icRenome()} ${Rules.renomeTime(state, b.player)}${Rules.metaRenome(state) ? '/' + Rules.metaRenome(state) : ''}</span></p>${rows}
        </div>`;
        })
        .join('');
}

// compacto: tocar no cartão fecha

export function updateActionBar() {
    $('btn-undo').disabled = undoStack.length === 0;
    const p = state && !state.winner ? Rules.activePiece(state) || selectedPiece() : null;
    $('btn-skip').disabled = !(p && Rules.canSelect(state, p));
    $('turn-hint').innerText = dicaTurno();
    updateAbilityBar();
    Tutorial.verificar();
}

// Linha de ajuda sob o banner: o que dá para fazer agora.
export function dicaTurno() {
    if (!state || state.winner || state.pending || ui.mode) return '';
    const p = selectedPiece();
    const bloco = Rules.currentBlock(state);
    if (Rede.ativo() && bloco && bloco.player !== Rede.eu)
        return `Vez do ${CONFIG.players[bloco.player].label} — aguardando a jogada…`;
    if (bloco && Bot.ehBot(bloco.player))
        return `Vez do ${CONFIG.players[bloco.player].label} — ${Bot.texto || 'pensando…'}`;
    const toque = ehToque();
    if (!p || !Rules.canSelect(state, p))
        return toque ? 'Toque numa Estrela com anel para agir' : 'Clique numa Estrela com anel para agir';
    const partes = [];
    if (ui.reachable.length > 1)
        partes.push(toque ? 'Mover: toque 2× numa zona verde' : 'Mover: 2 cliques numa zona verde');
    if (Engine.hasUsableAction(state, p)) partes.push(toque ? 'ou use uma habilidade' : 'Habilidade: teclas 1–9');
    if (!toque) partes.push('Encerrar: E');
    return partes.join(' · ');
}
