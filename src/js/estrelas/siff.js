// ── Siff ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';
import retratoSiff from '../../assets/retratos/siff.webp';

definirEstrela({
    cor: '#f0abfc',
    retrato: retratoSiff,
    ficha: {
        nome: 'Siff',
        vida: 11,
        amago: 9,
        armadura: 0,
        agilidade: 4,
        fisico: 0,
        magico: 2,
        habilidades: ['siff_aura', 'siff_vento', 'siff_correcao', 'siff_poder'],
    },
    habilidades: {
        siff_aura: {
            nome: 'Aura Revitalizante',
            tipo: 'passiva',
            descricao:
                'Estrelas aliadas adjacentes a Siff que ativarem uma habilidade que custe Âmago ganham +1 de Poder Mágico até o final do turno do jogador. Este efeito só pode beneficiar cada Estrela uma vez por turno.',
            resumo: 'Aliados adjacentes que usam habilidade com custo ganham +1 de Mágico.',
            visual: { e: 'apoio', c: '#f5d0fe', x: 'buff' },
            gatilho: {
                evento: 'ativouHabilidade',
                alvo: 'alvo',
                condicao: (c, dono) =>
                    c.custo > 0 &&
                    c.peca.player === dono.player &&
                    c.peca.id !== dono.id &&
                    Rules.hexDistance(c.peca, dono) === 1 &&
                    !Engine.imutavel(c.peca, 'magico') &&
                    !c.peca.effects.some((e) => e.habilidade === 'siff_aura'), // 1x por turno (o bônus dura o turno)
            },
            efeitos: [{ tipo: 'modificador', stat: 'magico', valor: 1, duracao: { ate: 'fim-turno' } }],
        },
        siff_vento: {
            nome: 'Vento Cintilante',
            tipo: 'ataque',
            custo: 2,
            descricao:
                'Siff dispara uma borrifada cintilante na direção de uma Estrela inimiga no alcance, em um acerto ela causa dano igual ao seu Poder Mágico e pode recuperar +1 Ponto de Vida de uma Estrela aliada adjacente.',
            resumo: 'Ataca no alcance: dano {M} e pode curar 1 de um aliado adjacente.',
            visual: { e: 'projetil', f: 'vento', c: '#f5d0fe', i: 'brilho' },
            alvo: { tipo: 'inimigo', alcance: 2 },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'magico' } },
                { tipo: 'acionarHabilidade', habilidade: 'siff_vento_cura', se: (source, alvos) => alvos.length > 0 },
            ],
        },
        // Habilidade interna: cura do Vento Cintilante (só oferece aliados feridos).
        siff_vento_cura: {
            nome: 'Vento Cintilante',
            tipo: 'efeito',
            oculta: true,
            descricao: 'Uma Estrela aliada adjacente a Siff recupera +1 Ponto de Vida.',
            visual: { e: 'apoio', c: '#86efac', x: 'cura' },
            alvo: { tipo: 'escolha', alcance: 1, quem: 'aliados', filtro: (dono, t) => t.stats.vida < t.stats.vidaMax },
            efeitos: [{ tipo: 'alterarStatus', stat: 'vida', valor: { fixo: 1 } }],
        },
        siff_correcao: {
            nome: 'Correção de Vitalidade',
            tipo: 'passiva',
            descricao:
                'Ao final do turno do jogador, Siff cura uma Estrela aliada adjacente. O valor da cura é equivalente à diferença entre o Poder Mágico de Siff e o Poder Mágico da Estrela alvo.',
            resumo: 'No fim do turno, cura um aliado adjacente (diferença de Mágico).',
            visual: { e: 'apoio', c: '#86efac', x: 'cura' },
            // fimTurno: acionada antes de os efeitos "até o fim do turno" expirarem; o jogador escolhe o aliado (só os
            // que seriam curados).
            gatilho: { evento: 'fimTurno' },
            alvo: {
                tipo: 'escolha',
                alcance: 1,
                quem: 'aliados',
                filtro: (dono, t) =>
                    t.stats.vida < t.stats.vidaMax && Rules.stat(dono, 'magico') !== Rules.stat(t, 'magico'),
            },
            efeitos: [
                {
                    tipo: 'alterarStatus',
                    stat: 'vida',
                    valor: (source, target) => Math.abs(Rules.stat(source, 'magico') - Rules.stat(target, 'magico')),
                },
            ],
        },
        siff_poder: {
            nome: 'Podeeeerrrr!!!',
            tipo: 'instantanea',
            custo: 3,
            descricao:
                'Com um bater de asas, Siff potencializa as capacidades mágicas de uma Estrela aliada no alcance, aumentando o Poder Mágico do alvo em 1 até o final do turno do jogador.',
            resumo: 'Dá +1 de Mágico a um aliado no alcance neste turno.',
            visual: { e: 'apoio', c: '#f0abfc', x: 'buff' },
            alvo: { tipo: 'escolha', alcance: 2, quem: 'aliados' },
            efeitos: [{ tipo: 'modificador', stat: 'magico', valor: 1, duracao: { ate: 'fim-turno' } }],
        },
    },
});
