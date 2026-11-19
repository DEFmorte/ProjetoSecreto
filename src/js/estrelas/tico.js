// ── Tico ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
definirEstrela({
    cor: '#9f1239',
    retrato: 'assets/retratos/tico.webp',
    ficha: {
        nome: 'Tico', vida: 9, amago: 16, armadura: 0, agilidade: 3, fisico: 2, magico: 0,
        habilidades: ['tico_chegada', 'tico_folga', 'tico_desse', 'tico_pulguento']
    },
    habilidades: {
        // Chegada: ao fim da jogada de Tico, ele escolhe o aliado protegido (estado com limiteDano). O limite só vale com
        // Tico vivo e adjacente a ele; unicoDaFonte: escolher outro tira a proteção do anterior. semAlcance: qualquer aliado.
        tico_chegada: {
            nome: 'Chegada', tipo: 'passiva',
            descricao: 'Quando Tico está adjacente a uma Estrela aliada, esta não sofre mais que 2 de dano por instância. Ao final de sua jogada, Tico deve designar qual Estrela aliada receberá essa proteção. Apenas uma Estrela pode se beneficiar deste efeito por vez.',
            gatilho: { evento: 'fimAtivacao', condicao: (c, dono) => c.peca.id === dono.id },
            alvo: { tipo: 'escolha', alcance: 99, semAlcance: true, quem: 'aliados', pergunta: 'escolha a Estrela aliada que recebe a proteção (destacada)' },
            efeitos: [{ tipo: 'estado', estado: 'chegada', nome: 'Chegada', limiteDano: 2, usos: null, unicoDaFonte: true, duracao: { ate: 'permanente' } }]
        },
        // gastaAoUsar: o desconto sai na primeira habilidade que a Estrela ativar (inclusive reações).
        tico_folga: {
            nome: 'Folga', tipo: 'instantanea', custo: 3,
            descricao: 'Tico escolhe uma Estrela aliada no alcance e compartilha um pouco de sua energia com ela. Até o início do próximo turno do jogador, a primeira vez que aquela Estrela ativar uma habilidade, o custo de Âmago dessa habilidade é reduzido em -1.',
            alvo: { tipo: 'escolha', alcance: 2, quem: 'aliados' },
            efeitos: [{ tipo: 'modificarHabilidade', caracteristica: 'custo', valor: -1, gastaAoUsar: true, duracao: { ate: 'inicio-proximo-turno' } }]
        },
        // efeitoReacao 'rerolagem': oferecida no meio da Jogada de Ataque (ver Engine.rerolagemDisponivel), quando o
        // resultado é ruim para o aliado: ele atacou e errou (rola o ataque de novo) ou foi atingido (rola a esquiva de novo).
        tico_desse: {
            nome: 'Desse Daí!', tipo: 'reacao', custo: 3, efeitoReacao: 'rerolagem',
            descricao: 'Quando uma Estrela aliada no alcance estiver realizando uma rolagem de ataque ou esquiva, Tico pode ativar essa habilidade para garantir uma rerolagem nos dados daquela Estrela.',
            gatilho: { evento: 'rolagemAliado' },
            alvo: { tipo: 'escolha', alcance: 2, quem: 'aliados' }
        },
        // Alvo 'salto': escolha "id:q,r" = inimigo no alcance + zona ao lado dele onde Tico aterrissa (o pulo acontece mesmo se errar).
        tico_pulguento: {
            nome: 'Pulguento', tipo: 'ataque', custo: 2,
            descricao: 'Tico pula na direção de uma Estrela inimiga no alcance, aterrissando em uma zona adjacente a ela. Durante o pulo, ele realiza uma Jogada de Ataque contra aquela Estrela, causando dano igual ao seu Poder Físico em um acerto.',
            alvo: { tipo: 'salto', alcance: 2, quem: 'inimigos', motivo: 'Nenhum inimigo no alcance com zona livre ao lado' },
            efeitos: [
                { tipo: 'saltarPara' },
                { tipo: 'dano', valor: { stat: 'fisico' } }
            ]
        }
    }
});
