// ── Toppich ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Rules } from '../motor/regras.js';
import retratoToppich from '../../assets/retratos/toppich.webp';

definirEstrela({
    cor: '#84cc16',
    retrato: retratoToppich,
    ficha: {
        nome: 'Toppich',
        vida: 11,
        amago: 7,
        armadura: 2,
        agilidade: 2,
        fisico: 2,
        magico: 0,
        habilidades: ['toppich_impulso', 'toppich_martelada', 'toppich_projecao', 'toppich_trinvestida'],
    },
    habilidades: {
        toppich_impulso: {
            nome: 'Impulso Bestial',
            tipo: 'passiva',
            descricao:
                'Sempre que Toppich se mover em linha reta por duas ou mais zonas durante sua jogada, ele recupera +1 de Âmago.',
            gatilho: {
                evento: 'moveu',
                condicao: (c, dono, state) =>
                    c.peca.id === dono.id &&
                    !c.forcado &&
                    state.activeId === dono.id &&
                    Rules.straightRuns(c.trilha, 2) > Rules.straightRuns(c.trilhaAntes, 2),
            },
            efeitos: [{ tipo: 'recuperarAmago', valor: { fixo: 1 } }],
        },
        toppich_martelada: {
            nome: 'Martelada',
            tipo: 'ataque',
            custo: 2,
            descricao:
                'Toppich desfere um golpe pesado com seu martelo contra uma Estrela adjacente, em um acerto ele causa dano igual ao seu Poder Físico.',
            alvo: { tipo: 'escolha', alcance: 1, quem: 'todos' }, // aliados também podem ser alvo
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }],
        },
        toppich_projecao: {
            nome: 'Projeção Territorial',
            tipo: 'instantanea',
            custo: 3,
            descricao:
                'Toppich arremessa uma Estrela inimiga adjacente sobre sua cabeça, movendo-a para a zona oposta à sua posição atual e causando 1 de dano.',
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [
                { tipo: 'deslocar', direcao: 'atravessar' },
                { tipo: 'dano', valor: { fixo: 1 } },
            ],
        },
        toppich_trinvestida: {
            nome: 'Trinvestida',
            tipo: 'instantanea',
            custo: 3,
            descricao:
                'Toppich investe contra uma Estrela inimiga adjacente, empurrando-a uma zona em linha reta para trás. Em seguida, Toppich se move para a zona que a Estrela inimiga ocupava. Caso esse movimento faça a Estrela inimiga colidir com o terreno ou com outra Estrela, ela sofre 1 de dano.',
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [
                {
                    tipo: 'deslocar',
                    direcao: 'afastar',
                    distancia: 1,
                    aoColidir: [{ tipo: 'dano', valor: { fixo: 1 } }],
                },
                { tipo: 'ocuparOrigemDoAlvo' },
            ],
        },
    },
});
