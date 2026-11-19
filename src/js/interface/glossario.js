// ── Glossário ──
// Fonte única: a aba Glossário mostra todos os termos por seção; os que têm `re` ficam coloridos nas descrições
// (com a explicação ao passar o mouse). nota: true = termo menos comum, explicado também no rodapé do cartão da habilidade.
const GLOSSARIO = (() => {
    const atk = CONFIG.rules.attackRoll, dado = d => `${d.count}D${d.sides}`, ren = CONFIG.renome;
    const stat = k => CONFIG.statFields.find(f => f.key === k);
    const sec = CONFIG.habilidades.secundarias, mk = CONFIG.marks;
    const st = (k, nome, re) => ({ secao: 'Atributos', nome, re, cor: stat(k).cor, desc: stat(k).desc });
    return [
        st('vida', 'Pontos de Vida', 'Pontos? de Vida'),
        st('amago', 'Âmago', 'Âmago'),
        st('armadura', 'Armadura', 'Armadura'),
        st('agilidade', 'Agilidade', 'Agilidade'),
        st('fisico', 'Poder Físico', 'Poder Físico'),
        st('magico', 'Poder Mágico', 'Poder Mágico'),

        { secao: 'Fluxo de jogo', nome: 'Rodadas', desc: 'Uma Rodada consiste em um ciclo completo onde todos os jogadores realizam seus respectivos Turnos. As rodadas compreendem um conjunto de turnos de todos os jogadores, do primeiro ao último, fechando o ciclo quando o primeiro jogador joga novamente e inicia uma nova rodada.' },
        { secao: 'Fluxo de jogo', nome: 'Turnos', desc: 'O Turno é o momento individual de ação de um jogador. Durante seu turno, você recupera Âmago, restaura Armaduras e ativa as Jogadas de suas Estrelas. Os turnos são individuais de cada jogador e abrangem todo o processo de ações daquele jogador.' },
        { secao: 'Fluxo de jogo', nome: 'Jogadas', re: 'jogadas?', cor: '#93c5fd', nota: true, desc: 'A Jogada é a unidade básica de ação de uma Estrela individual. Cada Estrela ativa sua jogada para se mover e utilizar uma de suas habilidades disponíveis.' },

        { secao: 'Tabuleiro', nome: 'Estrela', desc: 'Cada personagem do jogo. Quando um texto diz apenas “Estrela”, vale para qualquer uma, aliada ou inimiga; “Estrela aliada” e “Estrela inimiga” restringem o alvo.' },
        { secao: 'Tabuleiro', nome: 'Zona', desc: 'Cada hexágono do tabuleiro. Zonas que faltam são buracos: nenhuma Estrela entra nelas.' },
        { secao: 'Tabuleiro', nome: 'Arredores / Adjacente', re: 'arredores', cor: '#a5b4fc', nota: true, desc: 'As 6 zonas vizinhas a uma Estrela. Uma Estrela nos arredores de outra está adjacente a ela.' },
        { secao: 'Tabuleiro', nome: 'Renome', icone: ren.icone, cor: ren.cor, desc: `Pontos de vitória.${Rules.textoMetaRenome() ? ` O jogador cuja equipe somar ${Rules.textoMetaRenome()} de Renome vence.` : ''}` },

        { secao: 'Habilidades', nome: '◆ Custo', cor: stat('amago').cor, desc: 'Âmago gasto para ativar a habilidade.' },
        { secao: 'Habilidades', nome: 'Custo adicional (+)', desc: 'Recurso extra pago junto com o Âmago.' },
        { secao: 'Habilidades', nome: 'Custo alternativo (/)', desc: 'Recurso que pode ser pago no lugar do Âmago. Alguns efeitos ficam mais fortes quando a habilidade é paga assim.' },
        { secao: 'Habilidades', nome: sec.alcance.label, desc: 'Distância máxima, em zonas, entre a Estrela e o alvo. “No alcance” significa dentro dessa distância.' },
        { secao: 'Habilidades', nome: sec.area.label, desc: 'Define a extensão espacial afetada pela habilidade. Pode ser uma única zona, múltiplas zonas adjacentes ou padrões específicos.' },
        { secao: 'Habilidades', nome: sec.duracao.label, re: '[Pp]ela duração', cor: '#a5b4fc', nota: true, desc: 'Por quanto tempo o efeito permanece ativo. “Pela duração” se refere a esse período, mostrado nas características da habilidade.' },
        { secao: 'Habilidades', nome: sec.repetivel.label, desc: 'Pode ser ativada mais de uma vez no mesmo turno.' },
        { secao: 'Habilidades', nome: sec.ultraRapida.label, re: sec.ultraRapida.label, cor: '#fde047', nota: true, desc: 'Não gasta a ação se for a primeira habilidade ativada no turno.' },
        { secao: 'Habilidades', nome: 'Jogada de Ataque', re: 'Jogadas? de Ataque', cor: '#fdba74',
          desc: `Rolagem contra cada alvo: o atacante rola ${dado(atk.attackerDice)} e o defensor ${dado(atk.defenderDice)}${atk.defenderAddsStat ? ' + ' + stat(atk.defenderAddsStat).label.charAt(0) + stat(atk.defenderAddsStat).label.slice(1).toLowerCase() : ''}. Os efeitos só se aplicam aos alvos atingidos.` },
        { secao: 'Habilidades', nome: 'Acerto / Esquiva', desc: 'Acerto: o total do atacante é maior que o do defensor e os efeitos se aplicam. Esquiva: o ataque não supera a defesa e não tem efeito.' },

        { secao: 'Efeitos', nome: 'Buffs e Debuffs', re: '[Dd]ebuffs?|[Bb]uffs?', cor: '#fca5a5', nota: true, desc: 'São efeitos temporários que alteram os atributos ou capacidades de uma Estrela durante a partida. Buffs (▲) representam bônus, aumentando valores ou concedendo vantagens, enquanto Debuffs (▼) representam penalidades, reduzindo atributos ou impondo limitações. Esses efeitos podem modificar qualquer característica da Estrela, como <i>Armadura</i>, <i>Poder Físico</i>, <i>Poder Mágico</i>, <i>Agilidade</i> ou outras grandezas indicadas por habilidades. Salvo indicação contrária, múltiplos Buffs e Debuffs do mesmo tipo são cumulativos e permanecem ativos até o término de sua duração ou até serem removidos por outro efeito.' },
        { secao: 'Efeitos', nome: 'Marcas', re: 'Marcas?', cor: '#fdba74', nota: true, desc: 'São efeitos especiais aplicados a uma Estrela para indicar que ela foi afetada por uma habilidade ou condição específica. Diferentemente de Buffs e Debuffs, as Marcas normalmente não alteram atributos diretamente, mas servem como referência para ativar efeitos adicionais quando determinadas condições são atendidas. Salvo indicação contrária, diferentes tipos de Marcas podem coexistir na mesma Estrela e seus efeitos são resolvidos conforme descrito pela habilidade que as aplicou.' },
        { secao: 'Efeitos', nome: mk.precursora.nome, icone: mk.precursora.icone, re: mk.precursora.nome, cor: mk.precursora.cor, nota: true, desc: 'Marca aplicada pelas Jogadas de Ataque de Alex. Uma Estrela pode ter várias ao mesmo tempo. Dura até o final do próximo turno do jogador.' },
        { secao: 'Efeitos', nome: mk.graciosa.nome, icone: mk.graciosa.icone, re: mk.graciosa.nome, cor: '#f1f5f9', nota: true, desc: 'Marca aplicada por Cisnela no início do turno do jogador. Só existe uma por vez. Dura até o final do turno do jogador.' },
        { secao: 'Efeitos', nome: 'Imunidade', re: 'imunes?', cor: '#a5b4fc', nota: true, desc: 'Uma Estrela imune a um efeito (como dano, movimentação involuntária ou perda de Âmago) ignora totalmente esse efeito. Os outros efeitos da mesma habilidade continuam se aplicando.' },
        { secao: 'Efeitos', nome: 'Movimentação involuntária', re: '[Mm]ovimentação involuntária', cor: '#5eead4', nota: true, desc: 'Empurrões, puxões e deslocamentos causados por habilidades. Não inclui o movimento da própria Estrela.' },
        ...Object.values(CONFIG.objetos).map(o => ({ secao: 'Tabuleiro', nome: o.nome, re: o.re, cor: '#cbd5e1', nota: true, desc: o.desc })),
        ...Object.values(CONFIG.recursos).map(r => ({ secao: 'Efeitos', nome: `${r.icone} ${r.nome}`, re: r.nome + '|' + r.singular, cor: r.cor, nota: true,
            desc: `${r.desc} Guarda até ${r.max}. Aparece na ficha e ao lado da Estrela no tabuleiro.` }))
    ];
})();
const GLOSSARIO_SECOES = {
    'Fluxo de jogo': 'A partida flui através da sucessão de Rodadas, Turnos e Jogadas. Essa hierarquia organiza o uso de recursos, a ativação de habilidades e a movimentação no tabuleiro, permitindo que cada jogador execute sua estratégia de forma ordenada. Para fins de simplificação e coesão entre todos os modos de jogo, os turnos são mais referenciados do que as rodadas.',
    'Causando e recebendo dano': 'Todo dano é resolvido por meio de <b>instâncias de dano</b>. Uma instância representa uma aplicação individual de dano, independentemente do valor causado. Sempre que uma habilidade, efeito ou reação causar dano, cria-se uma nova instância que é resolvida separadamente das demais. Ao receber uma instância de dano, a Estrela reduz primeiro sua <i>Armadura</i>; apenas o dano excedente afeta seus <i>Pontos de Vida</i>. Caso uma habilidade cause dano múltiplas vezes, cada aplicação é considerada uma instância distinta e deve ser resolvida individualmente. Isso é importante para efeitos e habilidades que utilizam gatilhos como <b>“ao causar dano”</b>, <b>“ao receber dano”</b> ou <b>“sempre que sofrer dano”</b>, pois esses gatilhos verificam cada instância separadamente. Por exemplo, uma habilidade que causa 2 de dano três vezes gera três instâncias de dano, podendo ativar efeitos relacionados ao dano três vezes, em vez de apenas uma.'
};
// Ordem das seções na aba Glossário.
const GLOSSARIO_ORDEM = ['Atributos', 'Fluxo de jogo', 'Tabuleiro', 'Habilidades', 'Causando e recebendo dano', 'Efeitos'];
const semTags = t => String(t).replace(/<[^>]+>/g, '');
const GLOSSARIO_RE = new RegExp(`(?<!\\p{L})(${GLOSSARIO.filter(g => g.re).flatMap(g => g.re.split('|')).sort((a, b) => b.length - a.length).join('|')})(?!\\p{L})`, 'gu');
const termoDoGlossario = (txt) => GLOSSARIO.find(g => g.re && new RegExp(`^(?:${g.re})$`, 'u').test(txt));

// Descrição escapada com os termos coloridos. comTitulo: explicação ao passar o mouse.
function descricaoComTermos(texto, comTitulo = true) {
    return esc(texto || '').replace(GLOSSARIO_RE, m => {
        const g = termoDoGlossario(m);
        return g ? `<span class="termo-gl${comTitulo ? ' com-dica' : ''}" style="color:${g.cor}"${comTitulo ? ` title="${esc(g.nome + ': ' + semTags(g.desc))}"` : ''}>${m}</span>` : m;
    });
}

// Rodapé do cartão da habilidade: explicação curta dos termos menos comuns usados na descrição.
function notasDeTermos(texto) {
    const vistos = [];
    for (const m of String(texto || '').matchAll(GLOSSARIO_RE)) {
        const g = termoDoGlossario(m[0]);
        if (g && g.nota && !vistos.includes(g)) vistos.push(g);
    }
    return vistos.map(g => `<div><b style="color:${g.cor}">${g.icone ? iconeHTML(g.icone) + ' ' : ''}${g.nome}:</b> ${g.desc}</div>`).join('');
}
