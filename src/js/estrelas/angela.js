// ── Ângela ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Rules } from '../motor/regras.js';
import retratoAngela from '../../assets/retratos/angela.webp';

definirEstrela({
    cor: '#fde68a',
    retrato: retratoAngela,
    ficha: {
        nome: 'Ângela',
        vida: 14,
        amago: 11,
        armadura: 0,
        agilidade: 3,
        fisico: 2,
        magico: 0,
        recursos: { penitencia: 0 },
        habilidades: ['angela_penitente', 'angela_retribuicao', 'angela_expiacao', 'angela_consagracao'],
    },
    habilidades: {
        // consomeRecurso: ao acertar uma Jogada de Ataque, Ângela é perguntada (um marcador por vez) se consome
        // Penitência.
        angela_penitente: {
            nome: 'Penitente',
            tipo: 'passiva',
            consomeRecurso: 'penitencia',
            descricao:
                'Sempre que Ângela receber dano, ela recebe um marcador de Penitência. Ela pode acumular até três marcadores de Penitência simultaneamente. Sempre que Ângela acertar uma Jogada de Ataque contra uma Estrela, ela pode consumir qualquer quantidade de marcadores de Penitência para causar +1 de dano para cada marcador consumido.',
            gatilho: { evento: 'sofreuDano' },
            alvo: { tipo: 'proprio' },
            efeitos: [{ tipo: 'recurso', recurso: 'penitencia', valor: 1 }],
        },
        // Evento 'errouAtaqueContra': enfileirado quando um inimigo adjacente erra uma Jogada de Ataque nela.
        angela_retribuicao: {
            nome: 'Retribuição',
            tipo: 'reacao',
            custo: 2,
            repetivel: true,
            efeitoReacao: 'ataque',
            descricao:
                'Quando uma Estrela inimiga adjacente falhar em uma Jogada de Ataque contra Ângela, ela pode imediatamente realizar uma Jogada de Ataque contra aquela Estrela, causando dano igual ao seu Poder Físico em um acerto.',
            gatilho: {
                evento: 'errouAtaqueContra',
                ainda: (dono, state, t) => {
                    const f = t && Rules.pieceById(state, t.origemId);
                    return !!f && Rules.hexDistance(f, dono) === 1;
                },
            },
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }],
        },
        angela_expiacao: {
            nome: 'Expiação',
            tipo: 'ataque',
            custo: 2,
            descricao:
                'Ângela investe com sua espada contra uma Estrela inimiga adjacente, causando dano igual ao seu Poder Físico em um acerto.',
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }],
        },
        // bonus_rolagem: soma em todas as rolagens de ataque enquanto durar (não é gasto como o bonus_ataque).
        angela_consagracao: {
            nome: 'Consagração',
            tipo: 'instantanea',
            custo: 2,
            naoAcumula: true,
            descricao:
                'Ângela causa 1 de dano a si mesma ao consagrar sua espada. Pela duração, todas as Jogadas de Ataque de Ângela recebem +1 nas rolagens.',
            alvo: { tipo: 'proprio' },
            efeitos: [
                { tipo: 'dano', valor: { fixo: 1 } },
                { tipo: 'modificador', stat: 'bonus_rolagem', valor: 1, duracao: { turnos: 2 } },
            ],
        },
    },
});
