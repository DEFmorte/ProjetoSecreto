// ── Aurora ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { CONFIG } from '../motor/config.js';
import { definirEstrela } from './estrelas.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';
import retratoAurora from '../../assets/retratos/aurora.webp';

definirEstrela({
    cor: '#2dd4bf',
    retrato: retratoAurora,
    ficha: {
        nome: 'Aurora',
        vida: 11,
        amago: 14,
        armadura: 0,
        agilidade: 2,
        fisico: 0,
        magico: 3,
        recursos: { carga: 0 },
        habilidades: ['aurora_nucleo', 'aurora_disparo', 'aurora_absorver', 'aurora_descarga'],
    },
    habilidades: {
        aurora_nucleo: {
            nome: 'Carregamento do Núcleo',
            tipo: 'passiva',
            descricao:
                'Ao final do turno do jogador, Aurora ganha marcadores de Carga do Núcleo equivalentes ao seu valor de Poder Mágico. Aurora pode armazenar até 6 marcadores de Carga do Núcleo ao mesmo tempo.',
            resumo: 'Fim do turno: ganha Cargas do Núcleo igual ao Poder Mágico (máx. 6).',
            visual: { e: 'proprio', c: '#5eead4', x: 'aura' },
            gatilho: {
                evento: 'fimTurno',
                condicao: (c, dono) =>
                    Engine.recurso(dono, 'carga') < CONFIG.recursos.carga.max && Rules.stat(dono, 'magico') > 0,
            },
            alvo: { tipo: 'proprio' },
            efeitos: [{ tipo: 'recurso', recurso: 'carga', valor: { stat: 'magico' } }],
        },
        // repeteCom: depois de usada na rodada, pode ser usada de novo sem gastar a ação, pagando o custo + o recurso.
        aurora_disparo: {
            nome: 'Disparo Arcano',
            tipo: 'ataque',
            custo: 1,
            repetivel: true,
            repeteCom: { recurso: 'carga', valor: 1 },
            descricao:
                'Aurora dispara um feixe de energia contra uma Estrela inimiga no alcance. Em um acerto, Aurora causa 1 de dano ao alvo. Além disso, Aurora pode consumir 1 marcador de Carga do Núcleo para ativar esta habilidade novamente.',
            resumo: 'Ataca um inimigo no alcance: dano 1. Repete pagando +1 Carga, sem gastar a ação.',
            visual: { e: 'feixe', c: '#5eead4', i: 'energia' },
            alvo: { tipo: 'inimigo', alcance: 3 },
            efeitos: [{ tipo: 'dano', valor: { fixo: 1 } }],
        },
        // modos(dono): uma opção por quantidade de Cargas (escolha 0 = 1 Carga, 1 = 2 Cargas...).
        aurora_absorver: {
            nome: 'Absorver Carga',
            tipo: 'instantanea',
            custo: 1,
            ultraRapida: true,
            descricao:
                'Aurora absorve a energia do núcleo. Ela pode consumir marcadores de Carga do Núcleo para recuperar +1 ponto de Âmago por marcador consumido.',
            resumo: 'Ultra Rápida: troca Cargas do Núcleo por Âmago (1 por 1).',
            visual: { e: 'proprio', c: '#99f6e4', x: 'anel' },
            alvo: {
                tipo: 'proprio',
                pergunta: 'quantas Cargas do Núcleo consumir?',
                motivo: 'Sem Carga do Núcleo',
                modos: (dono) =>
                    Array.from({ length: Engine.recurso(dono, 'carga') }, (_, i) => `${i + 1} ⚡ → +${i + 1} Âmago`),
            },
            efeitos: [{ tipo: 'trocarRecurso', recurso: 'carga' }],
        },
        // ultraSeZerarArmadura: se o dano zerar a Armadura (com a extra) de quem tinha alguma, a Descarga vira Ultra
        // Rápida.
        aurora_descarga: {
            nome: 'Descarga',
            tipo: 'instantanea',
            custo: 2,
            descricao:
                'Aurora concentra um feixe arcano em 2 zonas, em linha reta, a partir dela. Todas as Estrelas na área afetada sofrem 1 de dano. Se esta habilidade causar dano suficiente para reduzir a Armadura de uma Estrela atingida a 0, ela ganha o traço Ultra Rápida.',
            resumo: 'Linha de 2 zonas: dano 1 em todos. Zerou uma Armadura: vira Ultra Rápida.',
            visual: { e: 'pilares', c: '#2dd4bf', i: 'energia' },
            alvo: { tipo: 'linha', comprimento: 2, quem: 'todos' },
            efeitos: [{ tipo: 'dano', valor: { fixo: 1 }, ultraSeZerarArmadura: true }],
        },
    },
});
