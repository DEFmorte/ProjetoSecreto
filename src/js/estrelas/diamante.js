// ── Diamante ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import retratoDiamante from '../../assets/retratos/diamante.webp';

definirEstrela({
    cor: '#06b6d4',
    retrato: retratoDiamante,
    ficha: {
        nome: 'Diamante',
        vida: 10,
        amago: 8,
        armadura: 2,
        agilidade: 2,
        fisico: 1,
        magico: 1,
        habilidades: ['diamante_reflexo', 'diamante_punho', 'diamante_soco_chao', 'diamante_pisao'],
    },
    habilidades: {
        diamante_reflexo: {
            nome: 'Reflexivo',
            tipo: 'passiva',
            descricao: 'Sempre que Diamante sofrer dano, ele causa 1 de dano a uma Estrela adjacente à sua escolha.',
            gatilho: { evento: 'sofreuDano' },
            alvo: { tipo: 'escolha', alcance: 1, quem: 'todos' },
            efeitos: [{ tipo: 'dano', valor: { fixo: 1 } }],
        },
        diamante_punho: {
            nome: 'Soco de Cristal',
            tipo: 'ataque',
            custo: 2,
            descricao:
                'Diamante fortalece o punho e desfere um golpe poderoso contra uma Estrela inimiga adjacente, causando dano igual ao seu Poder Físico em um acerto.',
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }],
        },
        diamante_soco_chao: {
            nome: 'Campo de Cristal',
            tipo: 'instantanea',
            custo: 3,
            descricao:
                'Diamante soca o chão, fazendo brotar cristais ao seu redor. Causa dano igual ao seu Poder Mágico em todas as Estrelas nos arredores e reduz a Agilidade delas em 1 até o início do próximo turno do jogador.',
            alvo: { tipo: 'ao-redor', raio: 1, quem: 'todos' },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'magico' } },
                { tipo: 'modificador', stat: 'agilidade', valor: -1, duracao: { ate: 'inicio-proximo-turno' } },
            ],
        },
        diamante_pisao: {
            nome: 'Pilares de Cristal',
            tipo: 'instantanea',
            custo: 3,
            descricao:
                'Com um pisão preciso, Diamante cria cristais em 2 zonas em linha reta a partir de sua posição, causando dano igual ao seu Poder Mágico em todas as Estrelas atingidas e reduzindo a Agilidade delas em 1 até o final do próximo turno do jogador.',
            alvo: { tipo: 'linha', comprimento: 2 },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'magico' } },
                { tipo: 'modificador', stat: 'agilidade', valor: -1, duracao: { ate: 'fim-proximo-turno' } },
            ],
        },
    },
});
