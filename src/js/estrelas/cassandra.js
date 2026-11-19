// ── Cassandra ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Engine } from '../motor/engine.js';
import retratoCassandra from '../../assets/retratos/cassandra.webp';

definirEstrela({
    cor: '#2563eb',
    retrato: retratoCassandra,
    ficha: {
        nome: 'Cassandra', vida: 13, amago: 11, armadura: 1, agilidade: 2, fisico: 2, magico: 0,
        habilidades: ['cassandra_egide', 'cassandra_punir', 'cassandra_compelir', 'cassandra_tenente']
    },
    habilidades: {
        // imune: lista de tipos de efeito que a Estrela ignora ('movimentoInvoluntario' = empurrões/puxões/deslocamentos).
        cassandra_egide: {
            nome: 'Égide da Coroa', tipo: 'passiva', imune: ['movimentoInvoluntario'],
            descricao: 'Cassandra é imune a efeitos de movimentação involuntária. No entanto, dano e outros Debuffs causados por habilidades com essa característica continuam se aplicando.'
        },
        cassandra_punir: {
            nome: 'Proteger e Punir', tipo: 'ataque', custo: 2,
            descricao: 'Cassandra realiza uma Jogada de Ataque contra uma Estrela inimiga adjacente, causando dano igual ao seu Poder Físico e recuperando +1 de Âmago em um acerto.',
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'fisico' } },
                { tipo: 'recuperarAmago', valor: { fixo: 1 }, se: (source, alvos) => alvos.length > 0 }
            ]
        },
        cassandra_compelir: {
            nome: 'Compelir', tipo: 'reacao', custo: 2, repetivel: true,
            descricao: 'Sempre que uma Estrela inimiga entrar nos arredores de Cassandra, ela pode ativar esta habilidade para reduzir a movimentação restante daquela Estrela para 0.',
            gatilho: { evento: 'inimigoEntrouNosArredores' },
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [{ tipo: 'zerarMovimento' }]
        },
        cassandra_tenente: {
            nome: 'Tenente Imperial', tipo: 'instantanea', custo: 4,
            descricao: 'Cassandra canaliza sua energia brilhante para aumentar a resistência. Ela ganha +1 de Armadura, até o máximo de +3, para cada Estrela inimiga adjacente, até o início do próximo turno do jogador.',
            // requer(dono, state): sem inimigo adjacente a habilidade não teria efeito, então fica indisponível.
            alvo: { tipo: 'proprio', requer: (dono, state) => Engine.inRange(state, dono, 1, 'inimigos').length > 0, motivo: 'Nenhum inimigo adjacente' },
            efeitos: [{ tipo: 'escudo', valor: (source, target, state) => Math.min(3, Engine.inRange(state, source, 1, 'inimigos').length), duracao: { ate: 'inicio-proximo-turno' } }]
        }
    }
});
