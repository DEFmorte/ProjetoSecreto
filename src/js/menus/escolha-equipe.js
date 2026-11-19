// ── Escolha das equipes ──
// Tela de seleção de Estrelas: botões com retrato, ficha resumida e sorteio de equipe.
import { $ } from '../nucleo/dom.js';
import { CONFIG } from '../motor/config.js';
import { RETRATOS } from '../estrelas/estrelas.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';
import { teams } from '../partida/estado.js';
import { Bot } from '../bot/bot.js';
import { Rede } from '../online/rede.js';
import { botsDoModo, jogadoresDoModo, modoAtual } from '../partida/partida.js';
import { esc } from '../interface/icones.js';
import { resumoHab, RESUMOS } from '../interface/resumos.js';
import { ehCompacto, ehToque } from '../render/tela.js';
import { tagTipoHTML } from '../hud/cartoes.js';

export let currentSelectingPlayer = 1;
export function definirCurrentSelectingPlayer(valor) {
    currentSelectingPlayer = valor;
    return valor;
} // para outros módulos trocarem "currentSelectingPlayer"
export let selectedColorsForMenu = [];
export function definirSelectedColorsForMenu(valor) {
    selectedColorsForMenu = valor;
    return valor;
} // para outros módulos trocarem "selectedColorsForMenu"

export function renderSelectionTitle() {
    const title = $('selection-title');
    Bot.rotulos(modoAtual());
    const md = CONFIG.modos[modoAtual()],
        doBot = !Rede.ativo() && botsDoModo(modoAtual()).includes(currentSelectingPlayer);
    const sub = doBot
        ? `Monte a equipe do ${CONFIG.players[currentSelectingPlayer].label === 'BOT' ? 'Bot' : CONFIG.players[currentSelectingPlayer].label}`
        : `Monte sua equipe${jogadoresDoModo().length > 2 ? ` · ${md.nome}` : ''}`;
    title.className = `text-2xl md:text-3xl font-black mb-4 uppercase text-center tracking-wide ${CONFIG.players[currentSelectingPlayer].menuTitleClass}`;
    title.innerHTML = `${CONFIG.players[currentSelectingPlayer].label}${Rede.ativo() ? ' (você)' : ''}<br><span class="text-white text-lg font-normal">${sub}</span>`;
    $('selection-hint').innerText = `ESCOLHA ${CONFIG.teamSize} ESTRELAS:`;
    const jog = jogadoresDoModo(),
        anterior = jog[jog.indexOf(currentSelectingPlayer) - 1];
    $('btn-sel-back').innerText = Rede.ativo()
        ? '← Sair'
        : anterior
          ? `← ${CONFIG.players[anterior].label}`
          : '← Jogadores';
    mostrarInfoEstrela(null);
}

// Estrela de exemplo (fora de partida) para ler habilidades/características.
export const estrelaExemplo = (color) => Rules.createPieces([color], [])[0];

export function chipsStatus(base, piece = null) {
    return CONFIG.statFields
        .map(
            (f) =>
                `<span class="px-2 py-0.5 rounded-md bg-gray-900/80 border border-gray-700 whitespace-nowrap" title="${esc(f.desc)}"><span class="text-gray-400 text-[10px]">${f.curto}</span> <b style="color:${f.cor}">${base[f.key]}</b></span>`,
        )
        .join('');
}

// Resumo da Estrela sob o mouse na seleção.
function infoEstrelaHTML(color) {
    const h = CONFIG.estrelas[color],
        p = estrelaExemplo(color);
    return `<div class="font-black text-sm mb-2 tracking-wide" style="color:${color}">${h.nome}</div>
        <div class="flex flex-wrap gap-1.5 mb-2">${chipsStatus(h)}</div>
        <div class="sel-habs">${Engine.abilitiesOf(p)
            .map(
                (a) =>
                    `<div><b class="text-white">${a.nome}</b>${tagTipoHTML(a)}${RESUMOS[a.id] ? `<span class="text-gray-400"> — ${resumoHab(p, a)}</span>` : ''}</div>`,
            )
            .join('')}</div>`;
}
// Reserva a altura da maior ficha: sem isso a caixa cresce ao passar o mouse, a tela (centralizada) sobe
// e a Estrela sai de baixo do mouse, piscando sem parar.
function reservarAlturaInfo(box) {
    if (ehCompacto()) {
        box.style.minHeight = '';
        box._resW = null;
        return;
    }
    if (!box.offsetParent || box._resW === `${window.innerWidth}x${window.innerHeight}`) return;
    box._resW = `${window.innerWidth}x${window.innerHeight}`;
    box.style.minHeight = '';
    let max = 0;
    for (const c of Object.keys(CONFIG.estrelas)) {
        box.innerHTML = infoEstrelaHTML(c);
        max = Math.max(max, box.offsetHeight);
    }
    box.style.minHeight = `${max}px`;
}
function mostrarInfoEstrela(color) {
    const box = $('selection-info');
    reservarAlturaInfo(box);
    if (!color) {
        box.innerHTML = `<p class="text-gray-500 text-center py-5">${ehToque() ? 'Toque numa Estrela para ver atributos e habilidades (toque de novo para tirar).' : 'Passe o mouse sobre uma Estrela para ver atributos e habilidades.'}<br>Detalhes completos em <b class="text-gray-300">Como jogar → Estrelas</b>.</p>`;
        return;
    }
    box.innerHTML = infoEstrelaHTML(color);
}

// Retrato (data URL) da Estrela, ou null se não houver.
export const retratoSrc = (nome) => RETRATOS[nome] || null;

// Retrato carregado (Image) da Estrela, ou null enquanto não houver/carregar.
const retratoCache = {};
export function retrato(nome) {
    const src = retratoSrc(nome);
    if (!src) return null;
    let img = retratoCache[nome];
    if (!img) {
        img = retratoCache[nome] = new Image();
        img.src = src;
    }
    return img.complete && img.naturalWidth ? img : null;
}

// Fundo de um círculo do menu/painel: retrato (se houver) sobre a cor da Estrela.
export function estrelaBg(el, nome, color) {
    if (el._bg === nome + color) return; // o retrato é uma string grande: só reaplica quando muda
    el._bg = nome + color;
    el.style.backgroundColor = color;
    const src = retratoSrc(nome);
    el.style.backgroundImage = src ? `url("${src}")` : '';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
}

function estrelaNomeLabel(nome) {
    return `<span class="text-white font-bold text-[11px] leading-tight text-center break-words pointer-events-none" style="text-shadow:0 0 3px #000,0 0 3px #000,0 1px 2px #000">${nome}</span>`;
}

// Cores das Estrelas ordenadas pelo nome (seleção e glossário).
export function estrelasEmOrdem() {
    return Object.keys(CONFIG.estrelas).sort((a, b) =>
        CONFIG.estrelas[a].nome.localeCompare(CONFIG.estrelas[b].nome, 'pt-BR', { sensitivity: 'base' }),
    );
}

export function buildColorButtons() {
    const box = $('color-options');
    box.innerHTML = '';
    estrelasEmOrdem().forEach((color) => {
        const b = document.createElement('button');
        b.dataset.color = color;
        b.title = CONFIG.estrelas[color].nome;
        b.className =
            'w-20 h-20 rounded-full hover:scale-110 transition-transform cursor-pointer border-2 border-transparent flex items-end justify-center p-1';
        b.innerHTML = estrelaNomeLabel(CONFIG.estrelas[color].nome);
        estrelaBg(b, CONFIG.estrelas[color].nome, color);
        b.style.boxShadow = `0 0 15px ${color}`;
        b.addEventListener('click', () => toggleColor(color));
        b.addEventListener('mouseenter', () => mostrarInfoEstrela(color));
        b.addEventListener('focus', () => mostrarInfoEstrela(color));
        b.addEventListener('mouseleave', () => mostrarInfoEstrela(null));
        box.appendChild(b);
    });
}

// "Sortear": escolhe Estrelas ao acaso para a equipe que está sendo montada (útil para as equipes dos Bots).
export function sortearEquipe() {
    if (Rede.ativo() && teams[Rede.eu].length) return; // online: equipe já confirmada
    const todas = estrelasEmOrdem().slice();
    for (let i = todas.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1));
        [todas[i], todas[k]] = [todas[k], todas[i]];
    }
    selectedColorsForMenu = todas.slice(0, CONFIG.teamSize);
    updateSelectionUI();
}

function toggleColor(color) {
    if (Rede.ativo() && teams[Rede.eu].length) return; // online: equipe já confirmada
    const i = selectedColorsForMenu.indexOf(color);
    if (i > -1) selectedColorsForMenu.splice(i, 1);
    else if (selectedColorsForMenu.length < CONFIG.teamSize) selectedColorsForMenu.push(color);
    updateSelectionUI();
}

export function updateSelectionUI() {
    const slots = $('selected-slots');
    slots.innerHTML = '';
    for (let i = 0; i < CONFIG.teamSize; i++) {
        const div = document.createElement('div');
        div.className = 'w-20 h-20 rounded-full border-2 flex items-end justify-center transition-all duration-300 p-1';
        if (selectedColorsForMenu[i]) {
            const color = selectedColorsForMenu[i];
            div.innerHTML = estrelaNomeLabel(CONFIG.estrelas[color].nome);
            estrelaBg(div, CONFIG.estrelas[color].nome, color);
            div.style.borderColor = 'white';
            div.classList.add('shadow-lg', 'scale-110', 'cursor-pointer');
            div.title = 'Clique para remover';
            div.onclick = () => toggleColor(color);
        } else {
            div.className += ' border-gray-600 bg-gray-800 border-dashed opacity-50';
        }
        slots.appendChild(div);
    }
    $('btn-confirm-team').disabled =
        selectedColorsForMenu.length !== CONFIG.teamSize || (Rede.ativo() && teams[Rede.eu].length > 0);
    $('btn-sel-sortear').disabled = Rede.ativo() && teams[Rede.eu].length > 0;

    document.querySelectorAll('#color-options button').forEach((btn) => {
        const on = selectedColorsForMenu.includes(btn.dataset.color);
        btn.classList.toggle('opacity-20', on);
        btn.classList.toggle('scale-90', on);
    });
}
