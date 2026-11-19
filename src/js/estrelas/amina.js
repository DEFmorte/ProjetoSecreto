// ── Amina ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';
import retratoAmina from '../../assets/retratos/amina.webp';

definirEstrela({
    cor: '#a855f7',
    retrato: retratoAmina,
    ficha: {
        nome: 'Amina', vida: 9, amago: 16, armadura: 0, agilidade: 2, fisico: 0, magico: 3,
        habilidades: ['amina_selo', 'amina_luz', 'amina_pulso', 'amina_benevolencia']
    },
    habilidades: {
        amina_selo: {
            nome: 'Selo do Império', tipo: 'reacao', custo: 2,
            descricao: 'Quando um aliado no alcance causar dano com uma Jogada de Ataque, Amina pode ativar esta habilidade para conceder +1 de dano para a Jogada de Ataque daquele aliado.',
            gatilho: { evento: 'aliadoCausaDanoComAtaque' },
            efeitoReacao: 'bonusDano', bonus: 1,
            alvo: { tipo: 'escolha', alcance: 2, quem: 'aliados' } // define o alcance do apoio (o aliado que ataca)
        },
        amina_luz: {
            nome: 'Luz Inquisidora', tipo: 'ataque', custo: 3,
            descricao: 'Amina dispara um feixe contra uma Estrela inimiga no alcance, em um acerto ela causa dano igual ao seu Poder Mágico -1 e reduz o Âmago atual do alvo em 1.',
            alvo: { tipo: 'inimigo', alcance: 2 },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'magico', fixo: -1 } },
                { tipo: 'alterarStatus', stat: 'amago', valor: { fixo: 1 }, reduzir: true }
            ]
        },
        amina_pulso: {
            nome: 'Pulso Restaurador', tipo: 'instantanea', custo: 3, naoAcumula: true,
            descricao: 'Pela duração, sempre que um aliado adjacente a Amina usar uma Jogada de Ataque, ele recupera +1 Ponto de Vida.',
            alvo: { tipo: 'proprio' },
            efeitos: [{ tipo: 'estado', estado: 'pulso_restaurador', nome: 'Pulso Restaurador', aoEvento: 'usouAtaque', aciona: 'amina_pulso_cura', usos: null, duracao: { turnos: 2 } }]
        },
        // Habilidade interna: acionada pelo Pulso Restaurador (dono do estado = Amina).
        amina_pulso_cura: {
            nome: 'Pulso Restaurador', tipo: 'efeito', oculta: true,
            descricao: 'O aliado adjacente que usou a Jogada de Ataque recupera +1 Ponto de Vida.',
            gatilho: {
                evento: 'usouAtaque', alvo: 'alvo',
                condicao: (c, dono) => c.peca.player === dono.player && c.peca.id !== dono.id && Rules.hexDistance(c.peca, dono) === 1
            },
            efeitos: [{ tipo: 'alterarStatus', stat: 'vida', valor: { fixo: 1 } }]
        },
        amina_benevolencia: {
            nome: 'Luz de Benevolência', tipo: 'instantanea', custo: 3,
            descricao: 'Escolha uma Estrela aliada no alcance. Até o início do próximo turno do jogador, a próxima vez que aquela Estrela causar dano com uma Jogada de Ataque, ela recupera Pontos de Vida iguais ao Poder Mágico de Amina.',
            alvo: { tipo: 'escolha', alcance: 2, quem: 'aliados' },
            efeitos: [{ tipo: 'estado', estado: 'luz_benevolencia', nome: 'Luz de Benevolência', aoEvento: 'causouDano', aciona: 'amina_benevolencia_cura', usos: 1, valor: { stat: 'magico' }, duracao: { ate: 'inicio-proximo-turno' } }]
        },
        // Habilidade interna: acionada pela Luz de Benevolência (dono do estado = aliado abençoado).
        amina_benevolencia_cura: {
            nome: 'Luz de Benevolência', tipo: 'efeito', oculta: true,
            descricao: 'O aliado recupera Pontos de Vida iguais ao Poder Mágico de Amina no momento em que a cura ativa.',
            gatilho: { evento: 'causouDano', alvo: 'dono', condicao: (c, dono) => c.fonte.id === dono.id && Engine.ehAtaque(c.habilidade) },
            efeitos: [{ tipo: 'alterarStatus', stat: 'vida', valor: 'estado' }]
        }
    }
});
