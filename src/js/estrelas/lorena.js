// ── Lorena ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Rules } from '../motor/regras.js';
import retratoLorena from '../../assets/retratos/lorena.webp';

definirEstrela({
    cor: '#ec4899',
    retrato: retratoLorena,
    ficha: {
        nome: 'Lorena', vida: 10, amago: 10, armadura: 0, agilidade: 4, fisico: 2, magico: 0,
        habilidades: ['lorena_flecha', 'lorena_preciso', 'lorena_cadeia', 'lorena_ignora_esquiva']
    },
    habilidades: {
        lorena_flecha: {
            nome: 'Tiro de Flecha', tipo: 'ataque', custo: 2, repetivel: true,
            descricao: 'Lorena dispara uma flecha contra uma Estrela inimiga no alcance, em um acerto ela causa dano igual ao seu Poder Físico.',
            alvo: { tipo: 'inimigo', alcance: 3 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        },
        lorena_preciso: {
            nome: 'Disparo Energizado', tipo: 'ataque', custo: 3,
            descricao: 'Lorena realiza um disparo preciso contra uma Estrela inimiga no alcance, em um acerto ela causa dano igual ao seu Poder Físico. Se o oponente tiver menos de 6 Pontos de Vida atuais, o dano aumenta para Poder Físico +2.',
            alvo: { tipo: 'inimigo', alcance: 2 },
            efeitos: [{ tipo: 'dano', valor: (source, target) => Rules.stat(source, 'fisico') + (target.stats.vida < 6 ? 2 : 0) }]
        },
        lorena_cadeia: {
            nome: 'Manter Pressão', tipo: 'reacao', custo: 1,
            descricao: 'Caso Lorena seja bem-sucedida em uma Jogada de Ataque contra uma Estrela inimiga, ela pode usar esta habilidade para ativar mais uma Jogada de Ataque contra a mesma Estrela atingida pela Jogada de Ataque anterior.',
            gatilho: { evento: 'acertouAtaque', quem: 'inimigos' },
            concede: { tipo: 'ataque' }
        },
        lorena_ignora_esquiva: {
            nome: 'Mira Precisa', tipo: 'instantanea', custo: 2, naoAcumula: true,
            descricao: 'A próxima Jogada de Ataque realizada por Lorena ignora bônus de esquiva do alvo.',
            alvo: { tipo: 'proprio' },
            efeitos: [{ tipo: 'modificador', stat: 'ignora_esquiva', valor: 1, duracao: { ate: 'ser-gasto' } }]
        }
    }
});
