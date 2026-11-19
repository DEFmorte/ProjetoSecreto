// ── Registro de combate ──
// Painel com o histórico da partida (state.log), agrupado por acontecimento.
import { ui } from '../interface/ui.js';
import { Engine } from '../motor/engine.js';
import { $ } from '../nucleo/dom.js';
import { state } from '../partida/estado.js';

// Ícone de cada linha do log pelo tipo de acontecimento (acompanha a cor de logLinhaCls).
export function logIcone(l) {
    if (/foi derrotado/.test(l)) return '✖';
    if (/vence|alcança/.test(l)) return '★';
    if (/sofre \d+ de dano/.test(l)) return '▼';
    if (/não sofre dano|ESQUIVA/.test(l)) return '○';
    if (/recupera|: vida \+|armadura \+|Renome/.test(l)) return '▲';
    if (/ACERTO/.test(l)) return '◎';
    return '·';
}

// Cor de cada linha do log pelo tipo de acontecimento.
export function logLinhaCls(l) {
    if (/foi derrotado|vence|alcança/.test(l)) return 'text-red-400 font-bold';
    if (/sofre \d+ de dano/.test(l)) return 'text-red-300';
    if (/não sofre dano|ESQUIVA/.test(l)) return 'text-gray-400';
    if (/recupera|: vida \+|armadura \+|Renome/.test(l)) return 'text-green-300';
    if (/ACERTO/.test(l)) return 'text-amber-300';
    return 'text-gray-300';
}

// Log em acontecimentos: cada ação (e tudo o que ela causou) é um bloco separado por linha; o mais recente em destaque.
// Redesenhado no máximo uma vez por quadro (refazer o HTML e rolar até o fim força o navegador a recalcular a página).
export let logAgendado = false;

export function updateLogPanel() {
    if (logAgendado) return;
    logAgendado = true;
    requestAnimationFrame(() => {
        logAgendado = false;
        desenharLog();
    });
}

export function desenharLog() {
    const panel = $('log-panel');
    if (!state) {
        panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');
    $('log-toggle-icon').innerText = ui.logAberto ? '▾' : '▸';
    const list = $('log-list');
    list.classList.toggle('hidden', !ui.logAberto);
    if (!ui.logAberto) return;
    const grupos = Engine.gruposLog(state).slice(-6);
    const html = grupos
        .map((g, i) => {
            const atual = i === grupos.length - 1;
            const [titulo, ...resto] = g;
            return `<div class="py-1.5 ${i ? 'border-t border-gray-600/70' : ''} ${atual ? 'log-atual' : 'opacity-60'}">
            <div class="font-bold ${atual ? 'text-white' : 'text-gray-300'}">${titulo}</div>
            ${resto.map((l) => `<div class="log-l ${logLinhaCls(l)}"><span class="log-ic">${logIcone(l)}</span><span>${l}</span></div>`).join('')}
        </div>`;
        })
        .join('');
    if (list._html !== html) {
        list.innerHTML = html;
        list._html = html;
        list.scrollTop = list.scrollHeight;
    }
}
