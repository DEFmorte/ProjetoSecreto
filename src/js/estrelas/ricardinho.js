// ── Ricardinho ──
// Ficha (atributos e lista de habilidades), habilidades e retrato. Formato explicado em js/estrelas/estrelas.js.
import { definirEstrela } from './estrelas.js';
import { Engine } from '../motor/engine.js';
import retratoRicardinho from '../../assets/retratos/ricardinho.webp';

definirEstrela({
    cor: '#64748b',
    retrato: retratoRicardinho,
    ficha: {
        nome: 'Ricardinho',
        vida: 10,
        amago: 15,
        armadura: 0,
        agilidade: 3,
        fisico: 2,
        magico: 0,
        objetos: ['shuriken'],
        habilidades: ['ricardinho_shuriken', 'ricardinho_mortal', 'ricardinho_pegar', 'ricardinho_sasuke'],
    },
    habilidades: {
        // Shuriken (CONFIG.objetos): piece.objetos.shuriken = null (com Ricardinho) | { q, r } (na zona onde caiu).
        // Alvo 'trajeto': escolhe uma zona em linha reta no alcance (para em buracos e na borda); atinge as Estrelas
        // entre Ricardinho e essa zona, sem contar a que estiver na própria zona (incluiDestino: conta também a da
        // zona).
        ricardinho_shuriken: {
            nome: 'Shuriken Grandona',
            tipo: 'ataque',
            custo: 3,
            repetivel: true,
            descricao:
                'Ricardinho arremessa uma shuriken em linha reta até uma zona no alcance. Ele realiza uma Jogada de Ataque contra todas as Estrelas no caminho, exceto a da zona alvo, causando dano igual ao seu Poder Físico em um acerto. Ricardinho só pode ativar essa habilidade novamente após recuperar a shuriken. A shuriken permanece na zona alvo até ser recolhida. Ricardinho deve estar na mesma zona que a shuriken ao final da jogada para recuperá-la.',
            alvo: {
                tipo: 'trajeto',
                alcance: 3,
                quem: 'todos',
                requer: (dono) => Engine.objetoComDono(dono, 'shuriken'),
                motivo: 'A shuriken não está com ele',
            },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'fisico' } },
                { tipo: 'lancarObjeto', objeto: 'shuriken' },
            ],
        },
        // jogadaDeAtaque: Instantânea que rola como uma Jogada de Ataque (o salto acontece mesmo se errar).
        ricardinho_mortal: {
            nome: 'Mortalzinho Zika',
            tipo: 'instantanea',
            custo: 2,
            ultraRapida: true,
            jogadaDeAtaque: true,
            descricao:
                'Ricardinho salta sobre uma Estrela inimiga adjacente e aterrissa atrás dela. Durante a acrobacia, Ricardinho realiza uma Jogada de Ataque contra a Estrela inimiga. Em um acerto, Ricardinho causa dano igual ao seu Poder Físico -1.',
            // A zona atrás do alvo (do outro lado dele, em linha reta) precisa existir e estar livre.
            alvo: {
                tipo: 'inimigo',
                alcance: 1,
                filtro: (dono, alvo, state) => Engine.zonaLivre(state, Engine.zonaAtras(dono, alvo)),
                motivo: 'Nenhum inimigo adjacente com a zona de trás livre',
            },
            efeitos: [{ tipo: 'saltarSobre' }, { tipo: 'dano', valor: { stat: 'fisico', fixo: -1 } }],
        },
        ricardinho_pegar: {
            nome: 'Pegar e Jogar a Shuriken',
            tipo: 'reacao',
            custo: 1,
            descricao:
                'Quando Ricardinho estiver na mesma zona que sua shuriken, ele pode ativar esta habilidade para arremessá-la novamente. Ricardinho recebe uma nova ativação de Shuriken Grandona.',
            // Oferecida quando Ricardinho para na zona da shuriken durante a própria jogada (movimento ou salto).
            // O uso extra não gasta a ação, mas Shuriken Grandona ainda paga o próprio custo.
            gatilho: {
                evento: 'moveu',
                condicao: (c, dono, state) =>
                    c.peca.id === dono.id && state.activeId === dono.id && Engine.objetoNaZonaDe(dono, 'shuriken'),
                ainda: (dono) => Engine.objetoNaZonaDe(dono, 'shuriken'),
            },
            alvo: { tipo: 'proprio' },
            efeitos: [
                { tipo: 'recolherObjeto', objeto: 'shuriken' },
                { tipo: 'concederUso', habilidade: 'ricardinho_shuriken' },
            ],
        },
        ricardinho_sasuke: {
            nome: 'SASUKE!!',
            tipo: 'instantanea',
            custo: 4,
            descricao:
                'Se a shuriken estiver ao alcance, Ricardinho a puxa para sua zona, causando dano igual ao seu Poder Físico a todas as Estrelas no caminho, inclusive a que estiver na zona de onde a shuriken sai. Ricardinho só pode puxar a shuriken em linha reta.',
            // destino: a única zona que pode ser escolhida (a da shuriken). Atinge quem está no caminho e na zona dela,
            // sem rolagem.
            alvo: {
                tipo: 'trajeto',
                alcance: 4,
                quem: 'todos',
                incluiDestino: true,
                destino: (dono) => Engine.objetoNoTabuleiro(dono, 'shuriken'),
                motivo: (dono) =>
                    Engine.objetoNoTabuleiro(dono, 'shuriken')
                        ? 'Shuriken fora do alcance ou da linha reta'
                        : 'A shuriken já está com ele',
            },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'fisico' } },
                { tipo: 'recolherObjeto', objeto: 'shuriken', puxar: true },
            ],
        },
    },
});
