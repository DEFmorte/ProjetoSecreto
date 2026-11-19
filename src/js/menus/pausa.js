// ── Pausa / fim de partida ──
import { $ } from '../nucleo/dom.js';
import { CONFIG } from '../motor/config.js';
import { Rules } from '../motor/regras.js';
import { state, undoStack } from '../partida/estado.js';
import { Bot } from '../bot/bot.js';
import { Rede } from '../online/rede.js';
import { jogarDeNovo, novaPartida, OPCOES_VOTO } from '../partida/partida.js';
import { undo } from '../partida/acoes.js';
import { icRenome } from '../interface/icones.js';
import { showMenu } from './menu-principal.js';
import { ehToque, TelaCheia } from '../render/tela.js';
import { gameRunning } from '../partida/loop.js';
import { beginMatch } from '../partida/sorteio.js';
import { VFX } from '../render/vfx.js';
import { mostrarAjuda } from './ajuda.js';
import { setPreview } from '../hud/habilidades.js';

export function abrirPausa(vitoria = false) {
    if (!gameRunning || !state) return;
    const w = state.winner;
    setPreview(null);
    const titulo = $('pause-title'),
        sub = $('pause-sub');
    const box = $('pause-buttons');
    box.innerHTML = '';
    const botao = (txt, kbd, cls, fn) => {
        const b = document.createElement('button');
        b.className = `menu-btn ${cls}`;
        b.innerHTML = `<span class="text-left">${txt}</span>${kbd ? `<span class="kbd shrink-0">${kbd}</span>` : ''}`;
        b.addEventListener('click', fn);
        box.appendChild(b);
    };
    if (w) {
        const theme = w === 'empate' ? null : CONFIG.players[w];
        titulo.innerText = theme ? `${theme.label} VENCEU!` : 'EMPATE!';
        titulo.style.color = theme ? theme.bannerText : '#e5e7eb';
        sub.innerHTML = !theme
            ? 'Nenhuma Estrela ficou de pé.'
            : state.vencedorRenome === w
              ? `Chegou primeiro a ${icRenome()} ${Rules.metaRenome(state)} de Renome.`
              : 'Derrotou todas as Estrelas adversárias.';
        const sub2 = (t, cor = 'text-gray-400') =>
            `<span class="block text-[10px] font-semibold normal-case tracking-normal ${cor}">${t}</span>`;
        if (Rede.ativo()) {
            const js = Rede.jogadoresSala(),
                meu = Rede.votos[Rede.eu];
            const n = (op) => js.filter((j) => Rede.votos[j] === op).length;
            const opcao = (op, desc, kbd, cls, fn) =>
                botao(
                    `<span class="block">${OPCOES_VOTO[op]}${meu === op ? ' ✓' : ''}</span>${sub2(`${desc} · ${n(op)}/${js.length} votos${meu === op ? ' · seu voto' : ''}`, cls ? 'text-blue-100' : 'text-gray-400')}`,
                    kbd,
                    cls,
                    fn,
                );
            const info = document.createElement('p');
            info.className = 'text-[11px] text-gray-400 text-center leading-relaxed';
            info.innerHTML = Rede.textoVotos();
            box.appendChild(info);
            opcao('revanche', 'Mesmas equipes', 'Enter', 'primario', jogarDeNovo);
            opcao('nova', 'Todos escolhem novas Estrelas', 'N', '', novaPartida);
        } else {
            botao(
                `<span class="block">Jogar de novo</span>${sub2('Mesmas equipes', 'text-blue-100')}`,
                'Enter',
                'primario',
                jogarDeNovo,
            );
            botao(`<span class="block">Nova partida</span>${sub2('Escolher novas Estrelas')}`, 'N', '', novaPartida);
        }
        botao('Ver tabuleiro', 'Esc', '', fecharPausa);
        if (undoStack.length && !Rede.ativo())
            botao('Desfazer jogada', 'Ctrl+Z', '', () => {
                fecharPausa();
                undo();
            });
        botao('Sair para o menu', '', 'perigo', showMenu);
    } else {
        const block = Rules.currentBlock(state);
        titulo.innerText = 'PAUSA';
        titulo.style.color = '';
        sub.innerText = `Rodada ${state.round} · vez do ${CONFIG.players[(block && block.player) || 1].label}${Rede.ativo() ? ' · online, a partida não para' : Bot.ativo() ? ` · ${Bot.jogadores().length > 1 ? 'Bots' : 'Bot'} ${Bot.nivel().nome}` : ''}`;
        botao('Continuar', 'Esc', 'primario', fecharPausa);
        botao('Como jogar', 'H', '', () => mostrarAjuda(undefined, 'pausa'));
        botao(`Efeitos visuais: ${VFX.NOMES[VFX.nivel]}`, '', '', () => {
            VFX.alternar();
            abrirPausa();
        });
        if (ehToque() && TelaCheia.disponivel())
            botao(TelaCheia.ativa() ? 'Sair da tela cheia' : 'Tela cheia', '', '', () => {
                fecharPausa();
                TelaCheia.alternar();
            });
        if (!Rede.ativo())
            botao('Reiniciar partida', '', 'perigo', () => {
                fecharPausa();
                beginMatch();
            });
        botao('Sair para o menu', '', 'perigo', showMenu);
    }
    const tela = $('pause-screen');
    tela.classList.remove('hidden');
    tela.classList.add('flex');
}

export function fecharPausa() {
    const tela = $('pause-screen');
    tela.classList.add('hidden');
    tela.classList.remove('flex');
}

export const pausaAberta = () => !$('pause-screen').classList.contains('hidden');
export const ajudaAberta = () => !$('help-screen').classList.contains('hidden');
