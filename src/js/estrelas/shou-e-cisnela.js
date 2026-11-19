// ── Shou & Cisnela ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';
import retratoShouECisnela from '../../assets/retratos/shou-e-cisnela.webp';

definirEstrela({
    cor: '#cbd5e1',
    retrato: retratoShouECisnela,
    ficha: {
        nome: 'Shou & Cisnela',
        vida: 9,
        amago: 11,
        armadura: 0,
        agilidade: 3,
        fisico: 3,
        magico: 0,
        habilidades: ['shou_graciosa', 'shou_confianca', 'shou_comando', 'shou_garca'],
    },
    habilidades: {
        shou_graciosa: {
            nome: 'Graciosa (Cisnela)',
            tipo: 'passiva',
            descricao:
                'No início do turno do jogador, Cisnela cria uma Marca na Estrela inimiga mais próxima de Shou, essa Marca perdura até o final do turno do jogador. A primeira habilidade de Shou a causar dano em uma Estrela marcada é considerada como tendo a propriedade Ultra Rápida.',
            resumo: 'Marca o inimigo mais próximo; o 1º dano de Shou nele é Ultra Rápido.',
            visual: { e: 'projetil', f: 'pena', c: '#f1f5f9', i: 'brilho' },
            // inicioTurno: acionada depois da recuperação de Armadura/Âmago. ultraContraMarca: ver
            // Engine.ultraContraMarca.
            gatilho: { evento: 'inicioTurno' },
            ultraContraMarca: 'graciosa',
            alvo: {
                tipo: 'escolha',
                alcance: 99,
                quem: 'inimigos',
                filtro: (dono, t, state) => Rules.distancia(dono, t) === Engine.menorDistancia(state, dono, 'inimigos'),
            },
            efeitos: [{ tipo: 'marca', marca: 'graciosa', unica: true }],
        },
        shou_confianca: {
            nome: 'Confiança (Shou)',
            tipo: 'ataque',
            custo: 2,
            descricao:
                'Shou realiza uma Jogada de Ataque com sua lança contra uma Estrela inimiga adjacente, em um acerto ele causa dano igual ao seu Poder Físico.',
            resumo: 'Ataca um inimigo adjacente: dano {F}.',
            visual: { e: 'corpo', f: 'estocada', c: '#e2e8f0', i: 'corte' },
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }],
        },
        shou_comando: {
            nome: 'Comando Elegante (Cisnela)',
            tipo: 'instantanea',
            custo: 1,
            ultraRapida: true,
            descricao:
                'Shou ordena que Cisnela avance em direção a uma Estrela no alcance. Cisnela então transfere a Marca de Graciosa para essa Estrela até o final do turno do jogador.',
            resumo: 'Passa a Marca de Graciosa para uma Estrela no alcance.',
            visual: { e: 'projetil', f: 'pena', c: '#f8fafc', i: 'brilho' },
            alvo: {
                tipo: 'escolha',
                alcance: 2,
                quem: 'todos',
                filtro: (dono, t) => !Engine.temMarcaDe(t, 'graciosa', dono),
            },
            efeitos: [{ tipo: 'marca', marca: 'graciosa', unica: true }],
        },
        shou_garca: {
            nome: 'Graça da Garça (Shou)',
            tipo: 'ataque',
            custo: 3,
            descricao:
                'Shou executa um corte em uma área de 2 zonas adjacentes nos seus arredores, causando dano igual ao seu Poder Físico em um acerto.',
            resumo: 'Ataca uma área de 2 zonas adjacentes: dano {F}.',
            visual: { e: 'leque', c: '#e2e8f0', i: 'corte' },
            alvo: { tipo: 'arco', zonas: 2, quem: 'inimigos' },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }],
        },
    },
});
