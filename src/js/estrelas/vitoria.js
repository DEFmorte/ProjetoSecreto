// ── Vitória ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import retratoVitoria from '../../assets/retratos/vitoria.webp';

definirEstrela({
    cor: '#818cf8',
    retrato: retratoVitoria,
    ficha: {
        nome: 'Vitória',
        vida: 9,
        amago: 16,
        armadura: 0,
        agilidade: 3,
        fisico: 0,
        magico: 2,
        habilidades: ['vitoria_veu', 'vitoria_cortina', 'vitoria_recompensa', 'vitoria_presente'],
    },
    habilidades: {
        vitoria_veu: {
            nome: 'Véu do Luar',
            tipo: 'passiva',
            imutavel: 'secundarios',
            descricao: 'Os status secundários de Vitória não podem ser alterados.',
            resumo: 'Seus atributos secundários não podem ser alterados.',
        },
        vitoria_cortina: {
            nome: "Cortina D'Água",
            tipo: 'reacao',
            custo: 2,
            descricao:
                "Quando um aliado adjacente a Vitória receber dano de uma Estrela inimiga, Vitória pode ativar esta habilidade para projetar um escudo d'água sobre o aliado, reduzindo o dano sofrido em 1.",
            resumo: 'Reduz em 1 o dano que um aliado adjacente sofrer.',
            visual: { e: 'apoio', c: '#7dd3fc', x: 'agua' },
            gatilho: { evento: 'aliadoRecebeDano' },
            efeitoReacao: 'reducaoDano',
            reducao: 1,
            alvo: { tipo: 'escolha', alcance: 1, quem: 'aliados' }, // define o alcance da proteção (o aliado atingido)
        },
        vitoria_recompensa: {
            nome: 'Recompensa da Lua',
            tipo: 'ataque',
            custo: 3,
            descricao:
                'Vitória dispara um brilho intenso contra uma Estrela inimiga no alcance. Em um acerto, Vitória causa 1 de dano e reduz em 1 o dano causado por aquela Estrela na sua próxima Jogada de Ataque.',
            resumo: 'Ataca no alcance: 1 de dano e −1 no dano do próximo ataque do alvo.',
            visual: { e: 'feixe', c: '#c7d2fe', i: 'energia' },
            alvo: { tipo: 'inimigo', alcance: 3 },
            efeitos: [
                { tipo: 'dano', valor: { fixo: 1 } },
                {
                    tipo: 'estado',
                    estado: 'recompensa_lua',
                    nome: 'Recompensa da Lua',
                    danoAtaque: -1,
                    acumula: true,
                    debuff: true,
                    duracao: { ate: 'ser-gasto' },
                },
            ],
        },
        vitoria_presente: {
            nome: 'Presente da Lua',
            tipo: 'instantanea',
            custo: 4,
            descricao:
                'Vitória cura a si e uma Estrela aliada adjacente. Ela restaura Pontos de Vida dela e de uma Estrela aliada em valor igual ao seu Poder Mágico. Caso a vida de Vitória esteja completa, ela cura outra Estrela aliada adjacente além da primeira.',
            resumo: 'Cura {M} de Vida dela e de um aliado adjacente.',
            visual: { e: 'apoio', c: '#a5b4fc', x: 'cura' },
            alvo: {
                tipo: 'escolha',
                alcance: 1,
                quem: 'aliados',
                proprioSe: (piece) => piece.stats.vida < piece.stats.vidaMax,
            },
            efeitos: [
                {
                    tipo: 'acionarHabilidade',
                    habilidade: 'vitoria_presente_extra',
                    se: (source, alvos) => source.stats.vida >= source.stats.vidaMax && !alvos.includes(source),
                },
                { tipo: 'alterarStatus', stat: 'vida', valor: { stat: 'magico' }, excetoFonte: true },
                { tipo: 'alterarStatus', stat: 'vida', valor: { stat: 'magico' }, naFonte: true },
            ],
        },
        // Habilidade interna: segundo aliado do Presente da Lua (quando Vitória está com a vida completa).
        vitoria_presente_extra: {
            nome: 'Presente da Lua',
            tipo: 'efeito',
            oculta: true,
            descricao: 'Outro aliado adjacente recupera Pontos de Vida iguais ao Poder Mágico de Vitória.',
            visual: { e: 'apoio', c: '#a5b4fc', x: 'cura' },
            alvo: { tipo: 'escolha', alcance: 1, quem: 'aliados' },
            efeitos: [{ tipo: 'alterarStatus', stat: 'vida', valor: { stat: 'magico' } }],
        },
    },
});
