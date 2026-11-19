// ── Partida guiada (tutorial opcional, aberto em Como jogar) ──
// Uma partida local normal (2 jogadores, equipes prontas) com um guia passo a passo; não é salva em "Continuar
// partida".
import { $ } from '../nucleo/dom.js';
import { CONFIG } from '../motor/config.js';
import { Rules } from '../motor/regras.js';
import { definirModoEscolhido, definirTeams, equipesVazias, state, teams } from '../partida/estado.js';
import { Rede } from '../online/rede.js';
import { ui } from '../interface/ui.js';
import { selectedPiece } from '../interface/selecao.js';
import { ehCompacto, ehToque, HUD } from '../render/tela.js';
import { inspectedPiece, updateInspectPanel } from '../hud/cartoes.js';
import { startGame } from '../partida/loop.js';
import { fecharAjuda } from './ajuda.js';

export const Tutorial = {
    partida: false, // a partida atual é a guiada (não salva)
    ativo: false, // o guia está na tela
    passo: 0,
    base: null,
    notaAtual: null,
    notasVistas: {},
    equipes: { 1: ['Lorena', 'Garyn', 'Diamante'], 2: ['Toppich', 'Amina', 'Vitória'] },
    passos: [
        {
            titulo: 'Bem-vindo à partida guiada!',
            botao: 'Começar',
            texto: () =>
                `Você joga com o <b>Jogador 1</b> (azul) contra o <b>Bot</b> (vermelho), que joga sozinho na vez dele. Nesta partida você começa.<br>Vence quem juntar <b>${Rules.metaRenome(state)} de Renome</b> ou derrotar todas as Estrelas inimigas.`,
        },
        {
            titulo: 'Escolha uma Estrela',
            texto: () =>
                `${ehToque() ? 'Toque' : 'Clique'} numa das suas Estrelas com <b>anel azul</b>: são as que ainda podem agir neste turno.`,
            feito: () => {
                const p = selectedPiece();
                return !!p && p.player === 1;
            },
        },
        {
            titulo: 'O cartão da Estrela',
            alvo: 'stats-panel',
            botao: 'Entendi',
            texto: 'Aqui ficam a <b>Vida</b>, o <b>Âmago</b> (energia gasta pelas habilidades), a <b>Armadura</b> (absorve o dano) e os atributos. Embaixo, cada habilidade com um resumo do que faz.',
        },
        {
            titulo: 'Mova-se',
            texto: () =>
                ehToque()
                    ? 'As zonas <b>verdes</b> mostram até onde a Estrela anda. Toque numa delas para ver o caminho e toque de novo para mover.'
                    : 'As zonas <b>verdes</b> mostram até onde a Estrela anda. Dê <b>2 cliques</b> numa delas para mover (ou arraste o caminho e solte).',
            feito: () => Tutorial.base !== null && Tutorial.posicoes() !== Tutorial.base,
        },
        {
            titulo: 'Conheça o inimigo',
            texto: () => `${ehToque() ? 'Toque' : 'Passe o mouse'} numa Estrela <b>vermelha</b> para ver a ficha dela.`,
            feito: () => {
                const p = inspectedPiece();
                if (!p || p.player === 1) return false;
                ui.pinId = p.id;
                return true;
            },
        }, // fixa a ficha para ler com calma
        {
            titulo: 'Inspeção',
            alvo: 'inspect-panel',
            botao: 'Entendi',
            texto: () =>
                `Esse painel mostra a ficha da Estrela inimiga: vida, armadura e o que as habilidades dela fazem. Use para planejar seus ataques.${ehToque() ? '' : '<br>Dica: <b>clique</b> numa Estrela inimiga para fixar a ficha (📌); clique fora para soltar.'}`,
        },
        {
            titulo: 'Habilidades',
            alvo: 'ability-bar',
            botao: 'Entendi',
            texto: () =>
                `Embaixo ficam as habilidades da Estrela selecionada. ${ehToque() ? 'Toque uma vez para ver a descrição e o alcance; toque de novo para usar.' : 'Passe o mouse para ver a descrição e o alcance; clique (ou tecla 1–9) para usar.'} Se nenhuma tiver alvo, tudo bem: dá para só encerrar.`,
        },
        {
            titulo: 'Encerre a jogada',
            alvo: 'btn-skip',
            texto: () =>
                `Cada Estrela pode se mover e usar <b>1 ação</b> por jogada. Quando terminar, ${ehToque() ? 'toque em' : 'clique em'} <b>Encerrar jogada</b>${ehToque() ? '' : ' (ou tecla E)'}.`,
            feito: () =>
                !!state &&
                (state.pieces.some((p) => p.player === 1 && p.turn && p.turn.done) ||
                    (Rules.currentBlock(state) || {}).player !== 1),
        },
        {
            titulo: 'Ordem dos turnos',
            alvo: 'initiative-bar',
            botao: 'Entendi',
            texto: 'Aqui aparece quem já agiu (✓) e quem falta. Quando todas as suas Estrelas agirem, a vez passa ao <b>Bot</b>.',
        },
        {
            titulo: 'Renome',
            botao: 'Entendi',
            texto: () =>
                `As zonas com o símbolo dourado guardam <b>Renome</b>. Pare em cima com uma Estrela e use <b>Coletar Renome</b> (gasta a ação). Juntar ${Rules.metaRenome(state)} vence a partida!`,
        },
        {
            titulo: 'Tudo pronto!',
            botao: 'Concluir',
            texto: 'Continue jogando para praticar contra o Bot. Nas partidas normais, a ordem dos turnos é sorteada no início. Todos os termos do jogo estão em <b>Menu → Como jogar</b>.',
        },
    ],
    // Avisos que aparecem uma vez, quando a situação acontece pela primeira vez.
    notas: {
        rolagem:
            'Jogada de Ataque! Rolem os dados indicados na mensagem (atacante e defensor) e informem o resultado em <b>Acertou</b> ou <b>Esquivou</b>.',
        reacao: 'Uma <b>Reação</b> pode ser usada agora, mesmo fora da vez. Escolha <b>Usar</b> (gasta Âmago) ou <b>Ignorar</b>.',
        escolha: 'Escolha no tabuleiro a Estrela (ou zona) destacada para completar o efeito.',
    },
    posicoes() {
        return state
            ? state.pieces
                  .filter((p) => p.player === 1)
                  .map((p) => `${p.q},${p.r}`)
                  .join(';')
            : '';
    },
    iniciar() {
        if (Rede.ativo()) return;
        const C = CONFIG.estrelas,
            cor = (n) => Object.keys(C).find((k) => C[k].nome === n);
        fecharAjuda(false);
        definirModoEscolhido('bot');
        definirTeams(equipesVazias());
        for (const j of [1, 2]) teams[j] = this.equipes[j].map(cor).filter(Boolean);
        Object.assign(this, { partida: true, ativo: true, passo: 0, base: null, notaAtual: null, notasVistas: {} });
        startGame();
        setTimeout(() => this.mostrar(), 560);
    },
    fechar() {
        this.ativo = false;
        this.destacar(null);
        $('tutorial').classList.add('hidden');
        updateInspectPanel();
    },
    parar() {
        this.fechar();
        this.partida = false;
    },
    destacar(id) {
        document.querySelectorAll('.tut-alvo').forEach((el) => el.classList.remove('tut-alvo'));
        if (id && $(id)) $(id).classList.add('tut-alvo');
    },
    avancar() {
        if ((this.passos[this.passo] || {}).alvo === 'inspect-panel' && ui.pinId != null) {
            ui.pinId = null;
            updateInspectPanel();
        }
        this.passo++;
        if (this.passo >= this.passos.length) {
            this.fechar();
            return;
        }
        this.mostrar();
    },
    mostrar() {
        if (!this.ativo || !state) return;
        const p = this.passos[this.passo],
            txt = (v) => (typeof v === 'function' ? v() : v);
        $('tut-passo').innerText = `Passo ${this.passo + 1} de ${this.passos.length}`;
        $('tut-titulo').innerText = p.titulo;
        $('tut-texto').innerHTML = txt(p.texto);
        $('tut-proximo').classList.toggle('hidden', !p.botao);
        $('tut-proximo').innerText = p.botao || '';
        $('tut-espera').classList.toggle('hidden', !!p.botao);
        this.destacar(p.alvo);
        this.encolher(false); // passo novo: mostra as instruções
        $('tutorial').classList.remove('hidden');
        this.posicionar();
        updateInspectPanel(); // a ficha inspecionada se ajusta ao espaço que sobra
    },
    // Tela larga: na coluna direita, logo acima dos botões (não cobre o tabuleiro). Sem espaço: centralizado abaixo da
    // faixa do turno.
    posicionar() {
        const box = $('tutorial'),
            banner = $('turn-banner'),
            acoes = $('action-bar'),
            ini = $('initiative-bar');
        box.classList.remove('tut-coluna');
        box.style.top = box.style.bottom = '';
        if (ehCompacto()) return;
        if (window.innerWidth >= HUD.larga && !acoes.classList.contains('hidden')) {
            const fim = acoes.getBoundingClientRect().top - 12;
            const livre = fim - (ini.classList.contains('hidden') ? 16 : ini.getBoundingClientRect().bottom + 12);
            box.classList.add('tut-coluna');
            if (box.offsetHeight <= livre) {
                box.style.bottom = `${window.innerHeight - fim}px`;
                return;
            }
            box.classList.remove('tut-coluna');
        }
        if (!banner.classList.contains('hidden')) box.style.top = `${banner.getBoundingClientRect().bottom + 8}px`;
    },
    encolher(sim) {
        $('tutorial').classList.toggle('tut-min', sim);
        $('tut-min').innerText = sim ? 'Abrir' : 'Encolher';
        this.posicionar();
    },
    naColuna() {
        const box = $('tutorial');
        return this.ativo && box.classList.contains('tut-coluna') && !box.classList.contains('hidden');
    },
    // Chamado a cada mudança da interface: conclui o passo atual quando o jogador faz o que foi pedido.
    verificar() {
        if (!this.ativo || !state || this.verificando) return;
        this.verificando = true;
        try {
            if (this.base === null) this.base = this.posicoes();
            const pd = state.pending,
                tipo = pd && this.notas[pd.tipo] && !this.notasVistas[pd.tipo] ? pd.tipo : null;
            if (this.notaAtual && this.notaAtual !== tipo) {
                this.notasVistas[this.notaAtual] = true;
                this.notaAtual = null;
            }
            if (tipo && !this.notaAtual) this.notaAtual = tipo;
            const nota = this.notaAtual ? this.notas[this.notaAtual] : '';
            if ($('tut-nota').innerHTML !== nota) {
                $('tut-nota').innerHTML = nota;
                $('tut-nota').classList.toggle('hidden', !nota);
                if (nota) this.encolher(false);
                else this.posicionar();
            }
            const p = this.passos[this.passo];
            if (p && p.feito && p.feito()) this.avancar();
        } finally {
            this.verificando = false;
        }
    },
};

// Executado uma vez na inicialização do jogo (main.js), na ordem certa em relação aos outros módulos.
export function iniciarTutorial() {
    $('tut-proximo').addEventListener('click', () => Tutorial.avancar());
    $('tut-fechar').addEventListener('click', () => Tutorial.fechar());
    $('tut-min').addEventListener('click', () => Tutorial.encolher(!$('tutorial').classList.contains('tut-min')));
    window.addEventListener('resize', () => {
        if (Tutorial.ativo) Tutorial.posicionar();
    });
    $('btn-tutorial').addEventListener('click', () => Tutorial.iniciar());
}
