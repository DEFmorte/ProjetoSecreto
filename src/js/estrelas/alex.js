// ── Alex ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Rules } from '../motor/regras.js';
import retratoAlex from '../../assets/retratos/alex.webp';

definirEstrela({
    cor: '#f97316',
    retrato: retratoAlex,
    ficha: {
        nome: 'Alex',
        vida: 8,
        amago: 12,
        armadura: 0,
        agilidade: 3,
        fisico: 1,
        magico: 2,
        habilidades: ['alex_marca', 'alex_adaga', 'alex_mergulhar', 'alex_avante'],
    },
    habilidades: {
        alex_marca: {
            nome: 'Marca da Precursora',
            tipo: 'passiva',
            descricao:
                'As Jogadas de Ataque de Alex marcam os inimigos danificados até o final do próximo turno do jogador, efeitos que removem Debuffs removem as Marcas. Inimigos podem receber mais de uma Marca simultaneamente.',
            gatilho: {
                evento: 'causouDano',
                alvo: 'alvo',
                condicao: (c, dono) =>
                    c.fonte &&
                    c.fonte.id === dono.id &&
                    c.habilidade &&
                    c.habilidade.tipo === 'ataque' &&
                    c.alvo.player !== dono.player,
            },
            efeitos: [{ tipo: 'marca', marca: 'precursora' }],
        },
        alex_adaga: {
            nome: 'Lançar Adaga',
            tipo: 'ataque',
            custo: 1,
            descricao:
                'Alex arremessa uma de suas adagas contra o oponente alvo, em um acerto ela causa dano igual ao seu Poder Físico.',
            alvo: { tipo: 'inimigo', alcance: 2 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }],
        },
        alex_mergulhar: {
            nome: 'Mergulhar',
            tipo: 'instantanea',
            custo: 3,
            ultraRapida: true,
            descricao:
                'Alex avança até 2 zonas em linha reta. Se a zona onde ela iria parar estiver ocupada, ela pode escolher terminar seu avanço em uma zona adjacente àquela. Esta habilidade causa dano igual ao seu Poder Mágico e aplica Marca da Precursora a todas as Estrelas inimigas no percurso.',
            alvo: { tipo: 'avanco', alcance: 2, quem: 'inimigos', pousoAdjacente: true },
            efeitos: [
                { tipo: 'avancar' },
                { tipo: 'dano', valor: { stat: 'magico' } },
                { tipo: 'marca', marca: 'precursora' },
            ],
        },
        alex_avante: {
            nome: 'Avante e Cortante',
            tipo: 'instantanea',
            custo: 3,
            descricao:
                'Alex avança até 3 zonas em linha reta até uma zona desocupada, causando 1 de dano e +1 de dano adicional para cada Marca da Precursora que as Estrelas inimigas no percurso possuírem. O custo de Âmago desta habilidade é recuperado se duas ou mais Estrelas atingidas estiverem marcadas.',
            alvo: { tipo: 'avanco', alcance: 3, quem: 'inimigos' },
            efeitos: [
                { tipo: 'avancar' },
                { tipo: 'dano', valor: (source, target) => 1 + Rules.marks(target, 'precursora') },
                {
                    tipo: 'recuperarAmago',
                    valor: 'custo',
                    se: (source, alvos) => alvos.filter((t) => Rules.marks(t, 'precursora') > 0).length >= 2,
                },
            ],
        },
    },
});
