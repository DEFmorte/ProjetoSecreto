// ── Billy ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Engine } from '../motor/engine.js';
import retratoBilly from '../../assets/retratos/billy.webp';

definirEstrela({
    cor: '#b08968',
    retrato: retratoBilly,
    ficha: {
        nome: 'Billy',
        vida: 9,
        amago: 11,
        armadura: 0,
        agilidade: 3,
        fisico: 3,
        magico: 0,
        habilidades: ['billy_pe', 'billy_coceira', 'billy_fumace', 'billy_sentenca'],
    },
    habilidades: {
        // Alvo 'zona': escolha "q,r" = uma zona no alcance. raioArea: atinge as Estrelas nessa zona e nas zonas a até
        // raioArea dela. livre: só zonas vazias (não atinge ninguém; ex.: para onde se mover). opcional (passiva com
        // escolha): o dono pode recusar (escolha null = fica onde está).
        // Alvo 'varios': `quantidade` Estrelas diferentes no alcance (escolha "id1,id2"); com só uma no alcance, ataca
        // só ela.
        billy_pe: {
            nome: 'Dar no Pé',
            tipo: 'passiva',
            descricao: 'Sempre que Billy sofrer dano de uma Jogada de Ataque, ele pode se mover uma zona.',
            resumo: 'Ao sofrer dano de uma Jogada de Ataque, pode se mover 1 zona.',
            visual: { e: 'proprio', c: '#d6b38a', x: 'aura' },
            // Não gasta movimento e não conta como movimento voluntário (não aciona Machadada nem Compelir).
            gatilho: { evento: 'sofreuDano', condicao: (c) => Engine.ehAtaque(c.habilidade) },
            alvo: { tipo: 'zona', alcance: 1, livre: true, opcional: true },
            efeitos: [{ tipo: 'moverPara' }],
        },
        billy_coceira: {
            nome: 'Coceira e Espirro',
            tipo: 'ataque',
            custo: 3,
            descricao:
                'Billy demonstra sua maestria como pistoleiro e realiza uma Jogada de Ataque contra duas Estrelas inimigas diferentes no alcance, causando dano igual ao seu Poder Físico-1.',
            resumo: 'Ataca 2 inimigos diferentes no alcance: dano {F-1}.',
            visual: { e: 'projetil', f: 'bala', c: '#fde68a', i: 'tiro', disparo: 1 },
            alvo: { tipo: 'varios', alcance: 2, quantidade: 2, quem: 'inimigos' },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico', fixo: -1 } }],
        },
        billy_fumace: {
            nome: 'Fumacê',
            tipo: 'instantanea',
            custo: 4,
            descricao:
                'Billy arremessa uma bomba de fumaça em uma zona no alcance. Todas as zonas adjacentes à zona escolhida são afetadas pelo efeito dessa habilidade. Estrelas dentro dessas zonas têm seu alcance de habilidades reduzido para 1 até o início do próximo turno do jogador.',
            resumo: 'Fumaça numa zona e arredores: o alcance das habilidades de quem estiver lá vira 1.',
            visual: { e: 'nuvem', f: 'bomba', c: '#cbd5e1' },
            // Atinge quem está na zona escolhida e nas adjacentes no momento do uso (aliados e o próprio Billy também).
            alvo: { tipo: 'zona', alcance: 3, raioArea: 1, quem: 'todos' },
            efeitos: [
                {
                    tipo: 'modificarHabilidade',
                    caracteristica: 'alcance',
                    maximo: 1,
                    debuff: true,
                    duracao: { ate: 'inicio-proximo-turno' },
                },
            ],
        },
        billy_sentenca: {
            nome: 'Sentença',
            tipo: 'ataque',
            custo: 3,
            descricao:
                'Billy saca sua espingarda e realiza uma Jogada de Ataque contra uma Estrela no alcance, causando dano igual ao seu Poder Físico. Se a armadura atual do alvo for menor que o dano de Sentença, a habilidade ignora a armadura do alvo.',
            resumo: 'Ataca uma Estrela no alcance: dano {F}; ignora Armadura menor que o dano.',
            visual: { e: 'projetil', f: 'bala', c: '#fcd34d', i: 'pesado', disparo: 1, chumbo: 1, forte: 1 },
            alvo: { tipo: 'escolha', alcance: 3, quem: 'todos' }, // aliados também podem ser alvo
            // ignoraArmaduraSeMenor: Armadura atual (com a extra) menor que o dano → o dano vai direto para a Vida.
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' }, ignoraArmaduraSeMenor: true }],
        },
    },
});
