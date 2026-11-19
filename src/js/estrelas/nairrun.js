// ── Nair'run ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
definirEstrela({
    cor: '#10b981',
    retrato: 'assets/retratos/nairrun.webp',
    ficha: {
        nome: 'Nair\'run', vida: 12, amago: 11, armadura: 2, agilidade: 2, fisico: 0, magico: 1,
        habilidades: ['nairrun_reator', 'nairrun_pancada', 'nairrun_projecao', 'nairrun_sobrecarga']
    },
    habilidades: {
        nairrun_reator: {
            nome: 'Reator de AA', tipo: 'passiva',
            descricao: 'Quando Nair\'run recebe dano baseado no Poder Mágico de uma Estrela, ele reduz esse dano em 1 (mínimo de 1) e aumenta seu próprio Poder Mágico em 1 até o final do próximo turno do jogador.',
            // reduzDano: redução aplicada ao dano recebido; base: só vale para dano calculado a partir desse status.
            // Os efeitos rodam no próprio Nair'run a cada acionamento.
            reduzDano: { valor: 1, minimo: 1, base: 'magico' },
            efeitos: [{ tipo: 'modificador', stat: 'magico', valor: 1, duracao: { ate: 'fim-proximo-turno' } }]
        },
        nairrun_pancada: {
            nome: 'Pancada', tipo: 'ataque', custo: 2,
            descricao: 'Nair\'run desfere um golpe carregado contra uma Estrela adjacente, em um acerto ele causa dano igual ao seu Poder Mágico.',
            alvo: { tipo: 'escolha', alcance: 1, quem: 'todos' }, // aliados também podem ser alvo
            efeitos: [{ tipo: 'dano', valor: { stat: 'magico' } }]
        },
        nairrun_projecao: {
            nome: 'Projeção AA', tipo: 'instantanea', custo: 3,
            descricao: 'Nair\'run ativa uma zona de proteção ao seu redor. Todas as Estrelas aliadas adjacentes a ele compartilham metade dos danos recebidos por elas (arredondados para baixo) com Nair\'run pela duração.',
            alvo: { tipo: 'proprio' },
            efeitos: [{ tipo: 'estado', estado: 'projecao_aa', nome: 'Projeção AA', compartilhaDano: 0.5, usos: null, duracao: { turnos: 2 } }]
        },
        nairrun_sobrecarga: {
            nome: 'Sobrecarregar Reator', tipo: 'instantanea', custo: 4,
            descricao: 'Nair\'run energiza seu reator, criando um fino escudo de energia que o cobre. Escolha um:\n• Converta todo o seu Poder Mágico em Armadura adicional até o início do próximo turno do jogador;\n• Converta toda a sua Armadura em Poder Mágico adicional até o final do próximo turno do jogador.\nO atributo convertido fica zerado pela duração.',
            // modos: o jogador escolhe uma opção (choice = índice); cada efeito com `modo` só roda na opção correspondente.
            // converter: transfere todo o valor atual de um atributo para o outro (não é cópia — a origem fica em 0).
            alvo: { tipo: 'proprio', modos: ['Poder Mágico → Armadura', 'Armadura → Poder Mágico'] },
            efeitos: [
                { tipo: 'converter', modo: 0, de: 'magico', para: 'armadura', duracao: { ate: 'inicio-proximo-turno' } },
                { tipo: 'converter', modo: 1, de: 'armadura', para: 'magico', duracao: { ate: 'fim-proximo-turno' } }
            ]
        }
    }
});
