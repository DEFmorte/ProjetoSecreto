// ── Menus do modo online ──
// Telas de criar/entrar na sala, código e link de convite, e a entrada na seleção de equipes online.
import {
    definirCurrentSelectingPlayer,
    definirSelectedColorsForMenu,
    renderSelectionTitle,
    updateSelectionUI,
} from '../menus/escolha-equipe.js';
import { CONFIG } from '../motor/config.js';
import { $ } from '../nucleo/dom.js';
import { definirTeams, equipesVazias } from '../partida/estado.js';
import { botsDoModo } from '../partida/partida.js';
import { Rede } from './rede.js';

export function mostrarCodigoSala() {
    if (!Rede.codigo) return;
    $('sala-codigo').innerText = Rede.codigo;
    $('sala-box').classList.replace('hidden', 'flex');
}

// Menu online: dentro de uma sala some a parte de criar/entrar e o botão vira "Sair da sala".
export function atualizarMenuOnline() {
    const dentro = Rede.ativo() && Rede.naSala;
    $('online-entrada').classList.toggle('hidden', dentro);
    $('online-entrada').classList.toggle('flex', !dentro);
    $('btn-online-back').innerHTML = `${dentro ? '← Sair da sala' : '← Menu'} <span class="kbd">Esc</span>`;
}

export const dicaEquipeConfirmada = () =>
    `EQUIPE CONFIRMADA — AGUARDANDO ${Rede.jogadoresSala().length > 2 ? 'OS OUTROS JOGADORES' : 'O ADVERSÁRIO'}…`;

export function montarBotoesCriarSala() {
    const box = $('criar-sala-botoes');
    box.innerHTML = '';
    Object.entries(CONFIG.modos)
        .filter(([id]) => !botsDoModo(id).length)
        .forEach(([id, md], i) => {
            const b = document.createElement('button');
            b.id = i === 0 ? 'btn-criar-sala' : `btn-criar-sala-${id}`;
            b.dataset.modo = id;
            b.className = 'pointer-events-auto menu-btn primario';
            b.innerHTML = `<span class="text-left"><span class="block">Criar sala · ${md.nome}</span><span class="block text-[10px] font-semibold normal-case tracking-normal text-blue-100">${md.desc} · mapa ${CONFIG.mapas[md.mapa].nome}</span></span>`;
            b.addEventListener('click', () => Rede.criarSala(id));
            box.appendChild(b);
        });
}

export function mostrarPainelMenu(id) {
    ['main-menu', 'modo-menu', 'online-menu', 'selection-menu'].forEach((x) => {
        const el = $(x);
        el.classList.toggle('hidden', x !== id);
        if (x !== 'main-menu') el.classList.toggle('flex', x === id);
    });
}

export function abrirMenuOnline() {
    mostrarPainelMenu('online-menu');
    if (!Rede.ativo()) Rede.status('');
    $('input-codigo').focus();
}

export function sairMenuOnline() {
    Rede.encerrar();
    mostrarPainelMenu('main-menu');
}

export const emSelecaoOnline = () => Rede.ativo() && !$('selection-menu').classList.contains('hidden');

// Seleção online: cada jogador monta a própria equipe ao mesmo tempo.
export function entrarSelecaoOnline() {
    definirTeams(equipesVazias());
    definirSelectedColorsForMenu([]);
    definirCurrentSelectingPlayer(Rede.eu);
    const menu = $('menu-screen');
    menu.style.display = 'flex';
    menu.classList.remove('hidden-menu');
    mostrarPainelMenu('selection-menu');
    renderSelectionTitle();
    updateSelectionUI();
    Rede.atualizarStatus();
}

export function copiarLinkSala() {
    if (!Rede.codigo) return;
    const link = `${location.href.split(/[?#]/)[0]}?sala=${Rede.codigo}`;
    const ok = () =>
        Rede.status(
            location.protocol === 'file:'
                ? 'Link copiado (só funciona com o jogo hospedado na internet).'
                : `Link copiado! Envie ${Rede.jogadoresSala().length > 2 ? 'aos outros jogadores' : 'ao adversário'}.`,
        );
    if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(link).then(ok, () => prompt('Copie o link:', link));
    else prompt('Copie o link:', link);
}
