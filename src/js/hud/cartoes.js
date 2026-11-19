import { $ } from '../nucleo/dom.js';
import { CONFIG } from '../motor/config.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';
import { state } from '../partida/estado.js';
import { Tutorial } from '../menus/tutorial.js';
import { ui } from '../interface/ui.js';
import { COR, esc, iconeHTML, icRenome } from '../interface/icones.js';
import { resumoHab } from '../interface/resumos.js';
import { estrelaBg, retratoSrc } from '../menus/escolha-equipe.js';
import { ehCompacto, HUD } from '../render/tela.js';
import { motivoIndisponivel, situacaoHabilidade } from './hud.js';

// Cor da vida pela fração restante (verde → amarelo → vermelho).
export const corVida = (f) => f > 0.5 ? COR.vida : f > 0.25 ? '#facc15' : '#ef4444';

const NOME_ATRIB = { agilidade: 'Agilidade', fisico: 'Físico', magico: 'Mágico' };
const LEGENDA_STAT = { amago: 'energia das habilidades', armadura: 'absorve o dano' };
const ROTULO_TIPO = { ataque: 'ATAQUE', instantanea: 'INSTANTÂNEA', reacao: 'REAÇÃO', passiva: 'PASSIVA' };
export const tagTipoHTML = (a, car = {}) => `<span class="hab-tag tag-${a.tipo}">${ROTULO_TIPO[a.tipo] || esc(a.tipo)}</span>${car.ultraRapida ? '<span class="hab-tag tag-ultra">ULTRA RÁPIDA</span>' : ''}`;
const pontosHTML = (n, cheios, cls = '') => Array.from({ length: n }, (_, i) => `<i class="${i < cheios ? 'on' : ''} ${cls}"></i>`).join('');

// Barra de Vida/Âmago: dividida em pontos (dá para contar de olho); máximos grandes usam a barra contínua.
function barraHTML(f, v, max, cor, extra = '') {
    const pct = Math.max(0, Math.min(100, Math.round(100 * v / (max || 1))));
    const barra = max > 0 && max <= 24
        ? `<div class="barra-seg">${Array.from({ length: max }, (_, i) => `<i${i < v ? ` style="background:${cor}"` : ''}></i>`).join('')}</div>`
        : `<div class="h-1.5 mt-1 rounded-full bg-gray-700/80 overflow-hidden"><div class="h-full rounded-full transition-all duration-300" style="width:${pct}%;background:${cor}"></div></div>`;
    return `<div title="${esc(f.desc || '')}"><div class="flex justify-between items-baseline"><span class="text-gray-300">${f.label}${LEGENDA_STAT[f.key] ? ` <span class="leg">${LEGENDA_STAT[f.key]}</span>` : ''}</span>
        <span class="text-sm" style="color:${cor}">${v}<span class="text-gray-500 text-[10px]">/${max}</span>${extra}</span></div>${barra}</div>`;
}

// Armadura: número + escudinhos (cheio = atual, azul = extra temporária). Uma barra para 1–3 pontos não ajuda.
function armaduraHTML(f, piece) {
    const s = piece.stats, extra = Rules.armaduraExtra(piece), max = s[f.max] || 0;
    const pips = Math.max(max, s.armadura) + extra <= 10
        ? `<span class="pips-arm">${pontosHTML(Math.max(max, s.armadura), s.armadura)}${pontosHTML(extra, extra, 'extra')}</span>` : '';
    return `<div class="flex justify-between items-center" title="${esc(f.desc || '')}"><span class="text-gray-300">${f.label} <span class="leg">${LEGENDA_STAT.armadura}</span></span>
        <span class="flex items-center gap-2">${pips}<span class="text-sm" style="color:${f.cor}">${s.armadura}<span class="text-gray-500 text-[10px]">/${max}</span>${extra ? ` <span class="text-sky-300 text-[11px]">+${extra}</span>` : ''}</span></span></div>`;
}

const chipHTML = (rotulo, valor, cor, title = '') =>
    `<div class="rounded-lg bg-gray-800/70 border border-gray-700 py-1 text-center" title="${esc(title)}"><div class="text-[9px] text-gray-400">${rotulo}</div><div class="text-sm" style="color:${cor}">${valor}</div></div>`;

// Conteúdo do cartão de uma Estrela (painel da Estrela selecionada e painel de inspeção).
function pieceCardHTML(piece) {
    const s = piece.stats;
    let html = CONFIG.statFields.filter(f => f.max).map(f => {
        if (f.key === 'armadura') return armaduraHTML(f, piece);
        const cor = f.key === 'vida' ? corVida(s.vida / s.vidaMax) : f.cor;
        return barraHTML(f, s[f.key], s[f.max], cor);
    }).join('');
    // Atributos (▲/▼ = alterado por efeitos): nome por extenso; no celular deitado, a sigla.
    html += `<div class="grid grid-cols-3 gap-1.5 pt-1">` + CONFIG.statFields.filter(f => !f.max).map(f => {
        const eff = Rules.stat(piece, f.key), d = eff - s[f.key];
        const seta = d ? `<span class="text-[9px] ${d > 0 ? 'text-green-400' : 'text-red-400'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span>` : '';
        return `<div class="atrib" title="${esc(`${f.label}${d ? ` (base ${s[f.key]})` : ''}: ${f.desc}`)}"><div class="atrib-v" style="color:${f.cor}">${eff}${seta}</div>
            <div class="atrib-n"><span class="nome-longo">${NOME_ATRIB[f.key] || f.label}</span><span class="nome-curto">${f.curto}</span></div></div>`;
    }).join('') + `</div>`;
    html += `<div class="flex justify-between items-center pt-1" title="${esc(`Pontos de Renome desta Estrela. A equipe vence ao juntar ${Rules.metaRenome(state) || ''}.`)}"><span class="text-gray-300">RENOME</span> <span class="text-sm" style="color:${CONFIG.renome.cor}">${icRenome()} ${piece.renome || 0}</span></div>`;
    for (const [r, n] of Object.entries(piece.recursos || {})) {
        const c = CONFIG.recursos[r] || { nome: r, cor: '#fff', icone: '' };
        html += `<div class="flex justify-between items-center" title="${esc(c.desc || '')}"><span class="text-gray-300">${c.nome.toUpperCase()}</span> <span class="text-sm" style="color:${c.cor}">${c.icone} ${n}<span class="text-gray-500 text-[10px]">/${c.max}</span></span></div>`;
    }
    for (const [o, pos] of Object.entries(piece.objetos || {})) {
        const c = CONFIG.objetos[o] || { nome: o, cor: '#fff' };
        html += `<div class="flex justify-between items-center" title="${esc(c.desc || '')}"><span class="text-gray-300">${c.nome.toUpperCase()}</span> <span class="text-xs font-bold" style="color:${pos ? '#fca5a5' : c.cor}">${pos ? 'NO TABULEIRO' : 'COM ELE'}</span></div>`;
    }
    if (piece.turn) {
        const acao = piece.turn.done ? 'JÁ AGIU' : piece.turn.extra ? 'EXTRA' : (Engine.usouOutraHabilidade(piece) ? 'USADA' : 'PRONTA');
        const resta = Rules.movementLeft(piece), total = CONFIG.rules.movementRange(piece);
        const mov = total > 0 && total <= 8 && resta <= total ? `<span class="pontos-mov">${pontosHTML(total, resta)}</span>` : `<b style="color:${COR.vida}">${resta}/${total}</b>`;
        html += `<div class="turno-linha"><div title="Movimento restante: ${resta} de ${total} zona(s)"><span>MOVIMENTO</span>${mov}</div>
            <div title="Cada Estrela tem 1 ação por jogada: usar uma habilidade ou coletar Renome."><span>AÇÃO</span><b style="color:${acao === 'PRONTA' || acao === 'EXTRA' ? '#fb923c' : '#6b7280'}">${acao}</b></div></div>`;
    }
    const efeitos = (piece.effects || []).filter(e => e.tipo !== 'marca');
    const marcas = Object.entries(CONFIG.marks).filter(([id]) => Rules.marks(piece, id));
    if (efeitos.length || marcas.length) {
        html += `<div class="border-t border-gray-600 pt-2 mt-2 text-[11px]"><div class="text-gray-400 mb-1">EFEITOS ATIVOS</div><div class="ef-lista">` +
            efeitos.map(e => {
                const txt = e.stat ? `${e.origem}: ${(CONFIG.stats.rotulosInternos || {})[e.stat] || e.stat} ${e.delta > 0 ? '+' : ''}${e.delta}` : (e.tipo === 'escudo' ? `${e.origem}: armadura +${e.restante}`
                    : e.caracteristica ? `${e.origem}: ${(CONFIG.habilidades.secundarias[e.caracteristica] || {}).label || e.caracteristica} ${e.maximo != null ? `máx. ${e.maximo}` : typeof e.delta === 'number' ? (e.delta > 0 ? '+' : '') + e.delta : (e.delta ? '✓' : '✗')}`
                    : e.travaArmadura ? `${e.origem}: armadura convertida (0)`
                    : e.limiteDano != null ? `${e.origem}: dano máx. ${e.limiteDano} (com ${((Rules.pieceById(state, e.fonteId) || {}).stats || {}).nome || '?'} ao lado)`
                    : e.danoAtaque ? `${e.origem}: próximo ataque ${e.danoAtaque > 0 ? '+' : ''}${e.danoAtaque} de dano`
                    : e.origem);
                const ruim = Engine.isDebuff(e), n = e.turnosRestantes;
                return `<span class="ef-chip ${ruim ? 'ef-ruim' : 'ef-bom'}">${ruim ? '▼' : '▲'} ${esc(txt)}${n ? ` <span class="ef-dur">${n} turno${n > 1 ? 's' : ''}</span>` : ''}</span>`;
            }).join('') +
            marcas.map(([id, m]) => `<span class="ef-chip" style="color:${m.cor};border-color:${m.cor}66;background:${m.cor}1f">${iconeHTML(m.icone)} ${m.nome} ×${Rules.marks(piece, id)}</span>`).join('') + `</div></div>`;
    }
    const abilities = Engine.abilitiesOf(piece);
    if (abilities.length) {
        // Motivo de não poder usar: só para quem pode agir agora (é o que interessa para planejar a jogada).
        const podeAgir = !!(state && !state.winner && !state.pending && Rules.canSelect(state, piece));
        html += `<div class="border-t border-gray-600 pt-2 mt-2 text-[11px]"><div class="text-gray-400 mb-1">HABILIDADES</div>` +
            abilities.map(a => {
                const st = situacaoHabilidade(piece, a), car = Engine.caracteristicas(piece, a);
                const ativa = a.tipo !== 'passiva' && a.tipo !== 'reacao';
                const usada = st.txt === 'USADA';
                const motivo = usada ? 'Já usada neste turno' : podeAgir && ativa && !Engine.canUse(state, piece, a) ? motivoIndisponivel(piece, a) : '';
                const custo = a.tipo === 'passiva' ? '' : `<span class="${st.cls} shrink-0">${st.txt.replace(' · REAÇÃO', '')}</span>`;
                const resumo = resumoHab(piece, a);
                return `<div class="hab-card${motivo ? ' hab-off' : ''}" title="${esc(Engine.descreverCaracteristicas(piece, a) + '\n' + a.descricao)}">
                    <div class="hab-topo"><span class="hab-nome">${a.nome}${tagTipoHTML(a, car)}</span>${custo}</div>
                    ${resumo ? `<div class="hab-resumo">${resumo}</div>` : ''}${motivo ? `<div class="hab-motivo">${esc(motivo)}</div>` : ''}</div>`;
            }).join('') + `</div>`;
    }
    return html;
}

// Preenche um painel de Estrela (prefixo 'stats' ou 'inspect'): retrato/cor, nome e cartão.
function fillPiecePanel(prefix, piece) {
    const dot = $(`${prefix}-color-dot`);
    const tem = !!retratoSrc(piece.stats.nome);
    estrelaBg(dot, piece.stats.nome, piece.color);
    dot.style.width = dot.style.height = tem ? (ehCompacto() ? '30px' : '48px') : '';
    dot.style.border = tem ? `2px solid ${piece.color}` : '';
    dot.style.boxShadow = `0 0 12px ${piece.color}`;
    const theme = CONFIG.players[piece.player];
    const vez = state && !state.winner && Rules.canSelect(state, piece) ? '<span class="hab-tag tag-vez">PODE AGIR</span>' : piece.turn && piece.turn.done ? '<span class="hab-tag tag-passiva">JÁ AGIU</span>' : '';
    const tags = (prefix === 'stats' ? `<span class="hab-tag" style="background:${theme.bannerBg};color:${theme.bannerText}">${theme.label}</span>` : '') + vez;
    const nomeHTML = `${esc(piece.stats.nome)}${tags ? `<span class="nome-tags">${tags}</span>` : ''}`;
    if ($(`${prefix}-name`)._html !== nomeHTML) { $(`${prefix}-name`).innerHTML = nomeHTML; $(`${prefix}-name`)._html = nomeHTML; }
    const list = $(`${prefix}-list`);
    const html = pieceCardHTML(piece);
    if (list._html !== html) { list.innerHTML = html; list._html = html; } // só reescreve o DOM se mudou
}

export function updateStatsPanel(piece) {
    const panel = $('stats-panel');
    if (!piece) {
        panel.classList.add('hidden');
        panel.dataset.pieceId = '';
        updateInspectPanel();
        return;
    }
    fillPiecePanel('stats', piece);
    panel.style.borderLeftColor = piece.color;

    // A animação de entrada só toca quando o painel aparece ou troca de Estrela.
    if (panel.dataset.pieceId !== String(piece.id) || panel.classList.contains('hidden')) {
        panel.dataset.pieceId = String(piece.id);
        panel.classList.remove('hidden');
        // Web Animations: reinicia a animação sem forçar reflow do layout.
        if (panel.animate) panel.animate(
            [{ transform: 'translateX(-30px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
            { duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    }
    updateInspectPanel();
}

// Inspeção: Estrela sob o cursor (ou fixada com clique) — inclusive oponentes —, ao lado do painel da Estrela selecionada.
export function inspectedPiece() {
    if (!state) return null;
    const id = ui.hoverId ?? ui.pinId;
    const p = id != null && id !== ui.selectedId ? Rules.pieceById(state, id) : null;
    return p && Engine.isAlive(p) ? p : null;
}

export function updateInspectPanel() {
    const panel = $('inspect-panel');
    const piece = inspectedPiece();
    const ini = $('initiative-bar');
    ini.classList.remove('resumida');
    panel.classList.remove('ao-lado-ordem');
    document.querySelectorAll('#initiative-list [data-id]').forEach(r => r.classList.toggle('ini-insp', !!piece && Number(r.dataset.id) === piece.id));
    if (!piece) { panel.classList.add('hidden'); return; }
    const theme = CONFIG.players[piece.player];
    $('inspect-title').innerHTML = `${ui.hoverId == null ? '📌 ' : ''}INSPECIONANDO · <span style="color:${theme.bannerText}">${theme.label}</span>`;
    fillPiecePanel('inspect', piece);
    panel.style.borderLeftColor = theme.bannerBorder;
    if (ehCompacto()) {
        panel.classList.remove('ao-lado', 'na-direita');
        const banner = $('turn-banner'), log = $('log-panel'), gap = 6;
        const topo = banner.classList.contains('hidden') ? gap : banner.getBoundingClientRect().bottom + gap;
        const fim = log.classList.contains('hidden') ? window.innerHeight - gap : log.getBoundingClientRect().top - gap;
        panel.style.top = `${topo}px`;
        panel.style.maxHeight = `${Math.max(120, fim - topo)}px`;
        panel.classList.remove('hidden');
        return;
    }
    // Tela larga: coluna direita, entre a ordem dos turnos e os botões (não cobre o tabuleiro nem o cartão da selecionada).
    if (window.innerWidth >= HUD.larga) {
        const acoes = $('action-bar'), gap = 12, semOrdem = ini.classList.contains('hidden');
        let fim = acoes.classList.contains('hidden') ? window.innerHeight - 16 : acoes.getBoundingClientRect().top - gap;
        if (Tutorial.naColuna()) fim = Math.min(fim, $('tutorial').getBoundingClientRect().top - gap); // o guia fica logo acima dos botões
        // Inspecionando pela própria ordem dos turnos: o cartão abre ao lado dela, sem cobri-la nem mudá-la de tamanho.
        if (ui.hoverDaOrdem && ui.hoverId != null && !semOrdem) {
            const bn = $('turn-banner'), br = bn.getBoundingClientRect();
            const topo = Math.max(ini.getBoundingClientRect().top, !bn.classList.contains('hidden') && br.right > window.innerWidth - 2 * HUD.lateral ? br.bottom + 8 : 0);
            panel.classList.remove('ao-lado');
            panel.classList.add('na-direita', 'ao-lado-ordem');
            panel.style.top = `${topo}px`;
            const base = $('hud-base').getBoundingClientRect(), esq = window.innerWidth - 2 * HUD.lateral; // não cobre a barra de habilidades
            const baixo = base.height && base.right > esq ? base.top - 8 : window.innerHeight - 16;
            panel.style.maxHeight = `${Math.max(220, baixo - topo)}px`;
            panel.classList.remove('hidden');
            return;
        }
        let topo = semOrdem ? 16 : ini.getBoundingClientRect().bottom + gap;
        // Pouco espaço abaixo da ordem dos turnos: ela fica resumida (só retratos) enquanto inspeciona, e o cartão vem logo abaixo.
        if (!semOrdem && fim - topo < 430) { ini.classList.add('resumida'); topo = ini.getBoundingClientRect().bottom + gap; }
        if (fim - topo >= 220) {
            panel.classList.remove('ao-lado');
            panel.classList.add('na-direita');
            panel.style.top = `${topo}px`;
            panel.style.maxHeight = `${fim - topo}px`;
            panel.classList.remove('hidden');
            return;
        }
    }
    panel.classList.remove('na-direita');
    ini.classList.remove('resumida');
    // Sem espaço à direita: com uma Estrela selecionada, fica ao lado do painel dela; sem seleção, ocupa o lugar dele.
    const aoLado = !$('stats-panel').classList.contains('hidden');
    panel.classList.toggle('ao-lado', aoLado);
    // Ao lado: começa abaixo da faixa do turno, para não cobri-la. No lugar do painel: termina acima do registro.
    const banner = $('turn-banner'), log = $('log-panel');
    const sr = $('stats-panel').getBoundingClientRect(), br = banner.getBoundingClientRect();
    const topo = aoLado && !banner.classList.contains('hidden') && br.left < sr.right + 12 + sr.width ? br.bottom + 8 : null;
    panel.style.top = topo ? `${topo}px` : '';
    panel.style.maxHeight = topo ? `calc(100vh - ${topo}px - 6.5rem)`
        : !aoLado && !log.classList.contains('hidden') ? `${Math.max(160, log.getBoundingClientRect().top - panel.offsetTop - 12)}px` : '';
    panel.classList.remove('hidden');
}

export function setHover(id, daOrdem = false) {
    const origem = id != null && daOrdem; // passou o mouse na ordem dos turnos (o cartão não pode cobri-la)
    if (ui.hoverId === id && ui.hoverDaOrdem === origem) return;
    ui.hoverDaOrdem = origem;
    ui.hoverId = id;
    updateInspectPanel();
    Tutorial.verificar();
}
