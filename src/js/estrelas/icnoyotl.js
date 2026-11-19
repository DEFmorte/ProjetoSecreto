// ── Icnoyotl ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';
import retratoIcnoyotl from '../../assets/retratos/icnoyotl.webp';

definirEstrela({
    cor: '#d97706',
    retrato: retratoIcnoyotl,
    ficha: {
        nome: 'Icnoyotl', vida: 11, amago: 9, armadura: 0, agilidade: 3, fisico: 0, magico: 3,
        recursos: { penas: 0 },
        habilidades: ['icnoyotl_penas', 'icnoyotl_revigorar', 'icnoyotl_vivacidade', 'icnoyotl_doacao']
    },
    habilidades: {
        icnoyotl_penas: {
            nome: 'Penas Energizadas', tipo: 'passiva',
            descricao: 'Icnoyotl energiza uma pena com Âmago sempre que cura uma Estrela aliada. Apenas uma pena pode ser energizada por turno, e Icnoyotl pode armazenar até 5 Penas Energizadas simultaneamente. Todas as habilidades de Icnoyotl possuem um custo alternativo em Penas Energizadas.',
            gatilho: { evento: 'curou', condicao: (c, dono) => c.fonte && c.fonte.id === dono.id && c.alvo.player === dono.player && c.alvo.id !== dono.id },
            efeitos: [{ tipo: 'recurso', recurso: 'penas', valor: 1, umaVezPorTurno: true }]
        },
        icnoyotl_revigorar: {
            nome: 'Revigorar', tipo: 'instantanea', custo: 3, custoAlternativo: { recurso: 'penas', valor: 1 },
            descricao: 'Icnoyotl recupera +1 Ponto de Vida de uma Estrela aliada no alcance. Se esta habilidade for ativada pagando seu custo em Penas Energizadas, a Estrela aliada também recebe +1 na sua próxima rolagem de ataque até o final do turno do jogador.',
            alvo: { tipo: 'escolha', alcance: 2, quem: 'aliados' },
            efeitos: [
                { tipo: 'alterarStatus', stat: 'vida', valor: { fixo: 1 } },
                { tipo: 'modificador', stat: 'bonus_ataque', valor: 1, duracao: { ate: 'fim-turno' }, se: (source) => Engine.pagouAlternativo(source, 'icnoyotl_revigorar') }
            ]
        },
        icnoyotl_vivacidade: {
            nome: 'Vivacidade', tipo: 'instantanea', custo: 3, custoAlternativo: { recurso: 'penas', valor: 2 },
            descricao: 'Icnoyotl dispara uma rajada revigorante em uma Estrela aliada no alcance, recuperando Pontos de Vida iguais ao Poder Mágico -1 de Icnoyotl. Se esta habilidade for ativada pagando seu custo em Penas Energizadas, a cura aumenta para Poder Mágico +1.',
            alvo: { tipo: 'escolha', alcance: 3, quem: 'aliados', filtro: (dono, t) => t.stats.vida < t.stats.vidaMax },
            efeitos: [{ tipo: 'alterarStatus', stat: 'vida', valor: (source) => Rules.stat(source, 'magico') + (Engine.pagouAlternativo(source, 'icnoyotl_vivacidade') ? 1 : -1) }]
        },
        icnoyotl_doacao: {
            nome: 'Doação', tipo: 'ataque', custo: 3, custoAlternativo: { recurso: 'penas', valor: 1 },
            descricao: 'Icnoyotl arremessa uma oferenda em uma Estrela inimiga no alcance, em um acerto ele causa dano igual ao seu Poder Mágico -1 e reduz a Agilidade do alvo em 1 até o início do próximo turno do jogador. Se esta habilidade for ativada pagando seu custo em Penas Energizadas, o alvo tem sua Agilidade reduzida em 2.',
            alvo: { tipo: 'inimigo', alcance: 2 },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'magico', fixo: -1 } },
                { tipo: 'modificador', stat: 'agilidade', valor: (source) => Engine.pagouAlternativo(source, 'icnoyotl_doacao') ? -2 : -1, duracao: { ate: 'inicio-proximo-turno' } }
            ]
        }
    }
});
