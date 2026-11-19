// ── Garyn ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Engine } from '../motor/engine.js';
import retratoGaryn from '../../assets/retratos/garyn.webp';

definirEstrela({
    cor: '#ef4444',
    retrato: retratoGaryn,
    ficha: {
        nome: 'Garyn', vida: 14, amago: 10, armadura: 1, agilidade: 2, fisico: 2, magico: 0,
        habilidades: ['garyn_defesa', 'garyn_machadada', 'garyn_investida', 'garyn_circular']
    },
    habilidades: {
        garyn_defesa: {
            nome: 'Defesa Erguida', tipo: 'passiva',
            descricao: 'Se Garyn não se mover voluntariamente durante sua jogada, ele recebe +1 de Armadura até o início do próximo turno do jogador.',
            gatilho: {
                evento: 'fimAtivacao',
                condicao: (c, dono) => c.peca.id === dono.id && !dono.turn.moveuVoluntario
            },
            efeitos: [{ tipo: 'escudo', valor: { fixo: 1 }, duracao: { ate: 'inicio-proximo-turno' } }]
        },
        garyn_machadada: {
            nome: 'Machadada', tipo: 'reacao', custo: 2,
            descricao: 'Quando uma Estrela inimiga adjacente a Garyn se mover voluntariamente para fora de seus arredores, Garyn pode ativar esta habilidade para realizar uma Jogada de Ataque contra aquela Estrela, causando dano igual ao seu Poder Físico em um acerto.',
            gatilho: { evento: 'inimigoSaiuDosArredores' },
            efeitoReacao: 'ataque',
            alvo: { tipo: 'inimigo', alcance: 1 }, // o alvo já saiu dos arredores ao resolver; o alcance não é revalidado
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        },
        garyn_investida: {
            nome: 'Investida', tipo: 'instantanea', custo: 3,
            descricao: 'Garyn avança até 2 zonas em linha reta até uma zona desocupada, causando dano igual ao seu Poder Físico -1 a todos os inimigos no percurso. Se Garyn terminar seu movimento adjacente a duas ou mais Estrelas inimigas, ele ativa Defesa Erguida.',
            alvo: { tipo: 'avanco', alcance: 2, quem: 'inimigos' },
            efeitos: [
                { tipo: 'avancar' },
                { tipo: 'dano', valor: { stat: 'fisico', fixo: -1 } },
                { tipo: 'ativarHabilidade', habilidade: 'garyn_defesa', se: (source, alvos, state) => Engine.inRange(state, source, 1, 'inimigos').length >= 2 }
            ]
        },
        garyn_circular: {
            nome: 'Golpe Circular', tipo: 'ataque', custo: 3,
            descricao: 'Garyn gira e realiza uma Jogada de Ataque contra todas as Estrelas inimigas adjacentes, em um acerto ele causa dano igual ao seu Poder Físico.',
            alvo: { tipo: 'ao-redor', raio: 1, quem: 'inimigos' },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        }
    }
});
