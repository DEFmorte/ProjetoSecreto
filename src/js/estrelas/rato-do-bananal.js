// ── Rato do Bananal ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Rules } from '../motor/regras.js';
import retratoRatoDoBananal from '../../assets/retratos/rato-do-bananal.webp';

definirEstrela({
    cor: '#eab308',
    retrato: retratoRatoDoBananal,
    ficha: {
        nome: 'Rato do Bananal', vida: 11, amago: 14, armadura: 0, agilidade: 2, fisico: 0, magico: 3,
        habilidades: ['rato_bananation', 'rato_bananada', 'rato_cacho', 'rato_bananeira']
    },
    habilidades: {
        rato_bananation: {
            nome: 'Bananation', tipo: 'passiva',
            descricao: 'Sempre que Rato do Bananal causar dano a uma Estrela que recebeu dano dele no turno anterior, ele recupera +1 de Âmago.',
            gatilho: {
                evento: 'causouDano',
                condicao: (c, dono, state) => c.fonte && c.fonte.id === dono.id && Rules.feriuNoTurno(state, dono, c.alvo, -1)
            },
            efeitos: [{ tipo: 'recuperarAmago', valor: { fixo: 1 } }]
        },
        rato_bananada: {
            nome: 'Bananada', tipo: 'ataque', custo: 4,
            descricao: 'Rato do Bananal arremessa uma dinamite contra uma Estrela inimiga no alcance, em um acerto ele causa dano igual ao seu Poder Mágico +1.',
            alvo: { tipo: 'inimigo', alcance: 3 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'magico', fixo: 1 } }]
        },
        rato_cacho: {
            nome: 'Cacho de Bananas', tipo: 'ataque', custo: 5,
            descricao: 'Rato do Bananal arremessa um amontoado de dinamites que caem ao longo de 3 zonas em linha reta a partir dele. Ele realiza uma Jogada de Ataque contra todas as Estrelas na área atingida, causando dano igual ao seu Poder Mágico em um acerto.',
            alvo: { tipo: 'linha', comprimento: 3 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'magico' } }]
        },
        rato_bananeira: {
            nome: 'Plantar Bananeira', tipo: 'instantanea', custo: 2, naoAcumula: true,
            descricao: 'Rato do Bananal se envolve em um cinturão de dinamites. Na próxima vez, pela duração, que Rato do Bananal receber dano, uma Estrela adjacente à sua escolha recebe dano igual ao seu Poder Mágico -1.',
            alvo: { tipo: 'proprio' },
            efeitos: [{ tipo: 'estado', estado: 'cinturao_dinamite', nome: 'Cinturão de Dinamites', gatilho: 'sofreuDano', aciona: 'rato_bananeira_explosao', usos: 1, duracao: { turnos: 2 } }]
        },
        // Habilidade interna (não aparece na ficha): disparada pelo Cinturão de Dinamites.
        rato_bananeira_explosao: {
            nome: 'Explosão da Bananeira', tipo: 'efeito', oculta: true,
            descricao: 'Dano igual ao Poder Mágico -1 em uma Estrela adjacente à sua escolha.',
            alvo: { tipo: 'escolha', alcance: 1, quem: 'todos' },
            efeitos: [{ tipo: 'dano', valor: { stat: 'magico', fixo: -1 } }]
        }
    }
});
