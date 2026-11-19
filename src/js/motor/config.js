const CONFIG = {
    // Tabuleiro hexagonal (hexágonos "deitados"). O formato vem do mapa do modo de jogo (CONFIG.mapas).
    // hexRadius: tamanho máximo do hexágono em px (diminui para caber na tela) até hexRadiusMin;
    // abaixo disso o mapa não encolhe mais e passa a ser arrastado (deslizar a tela).
    board: {
        hexRadius: 72, hexRadiusMin: 44,
        visual: { zona: '#1f2937', contorno: '#374151', contornoLargura: 1 }
    },
    teamSize: 3,

    // ── Mapas ──
    // raio: anéis a partir do centro (3 → 37 zonas, 4 → 61) + semZona: posições sem zona (buracos) — funcionam como terreno:
    // não se entra nelas e linhas param ali; o alcance dá a volta neles (Rules.distancia).
    // Para formatos livres, use zonas: [{ q, r }, ...] (lista explícita) no lugar de raio/semZona.
    // spawns: posições iniciais de cada jogador (na ordem das Estrelas escolhidas). renome: marcadores de Renome iniciais.
    mapas: {
        classico: {
            nome: 'Clássico', raio: 3,
            semZona: [{ q: -1, r: 1 }, { q: 1, r: -1 }],
            spawns: {
                1: [{ q: -3, r: 0 }, { q: -3, r: 1 }, { q: -3, r: 2 }],
                2: [{ q: 3, r: 0 }, { q: 3, r: -1 }, { q: 3, r: -2 }]
            },
            renome: [{ q: 0, r: 0, valor: 1 }] // só o centro
        },
        // Mapa de 3 jogadores: 61 zonas com 4 buracos em losango ao redor do centro (formato livre, lista explícita).
        // Equipes em três lados (inferior esquerdo, superior e direito); cada Renome fica a 3 zonas de duas equipes e a 7 da terceira.
        arena3: {
            nome: 'Arena Tripla',
            zonas: [
                { q: -5, r: 2 }, { q: -5, r: 3 }, { q: -5, r: 4 },
                { q: -4, r: 0 }, { q: -4, r: 1 }, { q: -4, r: 2 }, { q: -4, r: 3 }, { q: -4, r: 4 },
                { q: -3, r: -1 }, { q: -3, r: 0 }, { q: -3, r: 1 }, { q: -3, r: 2 }, { q: -3, r: 3 }, { q: -3, r: 4 },
                { q: -2, r: -2 }, { q: -2, r: -1 }, { q: -2, r: 0 }, { q: -2, r: 2 }, { q: -2, r: 3 }, { q: -2, r: 4 },
                { q: -1, r: -3 }, { q: -1, r: -2 }, { q: -1, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }, { q: -1, r: 2 }, { q: -1, r: 3 }, { q: -1, r: 4 },
                { q: 0, r: -3 }, { q: 0, r: -1 }, { q: 0, r: 0 }, { q: 0, r: 1 }, { q: 0, r: 3 },
                { q: 1, r: -4 }, { q: 1, r: -3 }, { q: 1, r: -2 }, { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 1, r: 1 }, { q: 1, r: 2 }, { q: 1, r: 3 },
                { q: 2, r: -4 }, { q: 2, r: -3 }, { q: 2, r: -2 }, { q: 2, r: 0 }, { q: 2, r: 1 }, { q: 2, r: 2 },
                { q: 3, r: -4 }, { q: 3, r: -3 }, { q: 3, r: -2 }, { q: 3, r: -1 }, { q: 3, r: 0 }, { q: 3, r: 1 },
                { q: 4, r: -4 }, { q: 4, r: -3 }, { q: 4, r: -2 }, { q: 4, r: -1 }, { q: 4, r: 0 },
                { q: 5, r: -4 }, { q: 5, r: -3 }, { q: 5, r: -2 }
            ],
            spawns: {
                1: [{ q: -3, r: 4 }, { q: -2, r: 4 }, { q: -1, r: 3 }],
                2: [{ q: -2, r: -2 }, { q: -1, r: -3 }, { q: 0, r: -3 }],
                3: [{ q: 5, r: -3 }, { q: 5, r: -2 }, { q: 4, r: -1 }]
            },
            renome: [{ q: -3, r: 1, valor: 1 }, { q: 2, r: 2, valor: 1 }, { q: 3, r: -4, valor: 1 }]
        },
        // Antigo mapa provisório de 3 jogadores: mantido só para carregar partidas salvas nele.
        triangulo: {
            nome: 'Triângulo (antigo)', raio: 4,
            semZona: [],
            spawns: {
                1: [{ q: -4, r: 1 }, { q: -4, r: 2 }, { q: -4, r: 3 }],
                2: [{ q: 1, r: -4 }, { q: 2, r: -4 }, { q: 3, r: -4 }],
                3: [{ q: 3, r: 1 }, { q: 2, r: 2 }, { q: 1, r: 3 }]
            },
            renome: [{ q: 2, r: -1, valor: 1 }, { q: -1, r: -1, valor: 1 }, { q: -1, r: 2, valor: 1 }] // sem o centro
        }
    },

    // ── Modos de jogo ── jogadores: quem participa (a ordem dos turnos é sorteada no início da partida, state.ordem).
    // metaRenome: Renome que a equipe precisa somar para vencer nesse modo (sem ela vale CONFIG.renome.metaVitoria).
    modos: {
        // Online (pessoas em aparelhos diferentes): não aparecem no menu local.
        duelo: { nome: '2 jogadores', desc: 'Um contra um', jogadores: [1, 2], mapa: 'classico', metaRenome: 3, soOnline: true },
        trio:  { nome: '3 jogadores', desc: 'Todos contra todos', jogadores: [1, 2, 3], mapa: 'arena3', metaRenome: 5, soOnline: true },
        // Local: você (Jogador 1) contra Bots. bots: jogadores controlados pelo computador (ver Bot), cada um por si.
        // Você monta todas as equipes (ou sorteia); tecla: atalho no menu.
        bot:   { nome: 'Contra 1 Bot', desc: 'Você contra o computador', jogadores: [1, 2], mapa: 'classico', metaRenome: 3, bots: [2], tecla: '1' },
        bots2: { nome: 'Contra 2 Bots', desc: 'Você e 2 Bots, todos contra todos', jogadores: [1, 2, 3], mapa: 'arena3', metaRenome: 5, bots: [2, 3], tecla: '2' }
    },
    modoPadrao: 'duelo',      // online
    modoLocalPadrao: 'bot',   // menu local

    players: {
        1: {
            label: 'JOGADOR 1',
            bannerBg: '#1e3a8a', bannerBorder: '#3b82f6', bannerText: '#bfdbfe',
            menuTitleClass: 'text-blue-400',
            pieceBorder: '#ffffff', pieceText: '#000000'
        },
        2: {
            label: 'JOGADOR 2',
            bannerBg: '#7f1d1d', bannerBorder: '#ef4444', bannerText: '#fecaca',
            menuTitleClass: 'text-red-400',
            pieceBorder: '#000000', pieceText: '#ffffff'
        },
        3: {
            label: 'JOGADOR 3',
            bannerBg: '#14532d', bannerBorder: '#22c55e', bannerText: '#bbf7d0',
            menuTitleClass: 'text-green-400',
            pieceBorder: '#22c55e', pieceText: '#ffffff'
        }
    },

    // ── Status das Estrelas ──
    // Primários: recursos atuais com máximo (vida, âmago). Habilidades interagem com eles recuperando/reduzindo o valor atual.
    // Secundários: atributos (armadura, agilidade, físico, mágico). Habilidades interagem com eles via modificadores.
    // Nas habilidades, `stat` aceita uma chave ('fisico'), uma categoria ('primarios' | 'secundarios') ou uma lista.
    stats: {
        primarios:   ['vida', 'amago'],
        secundarios: ['armadura', 'agilidade', 'fisico', 'magico'],
        internos:    ['ignora_esquiva', 'bonus_ataque', 'bonus_rolagem'], // marcadores de regra usados por efeitos (não aparecem na ficha)
        // Texto dos marcadores internos na lista de efeitos da ficha.
        rotulosInternos: { ignora_esquiva: 'ignora a Esquiva no próximo ataque', bonus_ataque: 'próxima rolagem de ataque', bonus_rolagem: 'rolagens de ataque' }
    },

    // Recursos especiais (custos alternativos/adicionais das habilidades). Ficam em piece.recursos.
    // Habilidade: custoAlternativo { recurso, valor } (paga Âmago OU o recurso) | custoAdicional { recurso, valor } (Âmago E o recurso).
    recursos: {
        penas: { nome: 'Penas Energizadas', singular: 'Pena Energizada', icone: '🪶', cor: '#fcd34d', max: 5,
                 desc: 'Recurso especial de Icnoyotl, ganho ao curar Estrelas aliadas. Pode pagar o custo alternativo das habilidades dele.' },
        // valorBot: quanto cada marcador vale para o Bot (evita gastar à toa).
        carga: { nome: 'Cargas do Núcleo', singular: 'Carga do Núcleo', icone: '⚡', cor: '#5eead4', max: 6, valorBot: 0.8,
                 desc: 'Recurso especial de Aurora, ganho no fim do turno do jogador (igual ao Poder Mágico dela). Repete o Disparo Arcano e vira Âmago com Absorver Carga.' },
        penitencia: { nome: 'Penitências', singular: 'Penitência', icone: '🩸', cor: '#fca5a5', max: 3, valorBot: 1.5,
                 desc: 'Recurso especial de Ângela, ganho ao receber dano. Ao acertar uma Jogada de Ataque, ela pode consumir quantas quiser: +1 de dano por marcador.' }
    },

    // Objetos no tabuleiro (ex.: a shuriken de Ricardinho). Ficam em piece.objetos: null = com a Estrela; { q, r } = na zona onde caiu.
    // Estrela: objetos: ['id']. recolheNoFim: a Estrela recupera o objeto se terminar a jogada na zona dele. re: termo colorido nas descrições.
    objetos: {
        shuriken: { nome: 'Shuriken', cor: '#e2e8f0', recolheNoFim: true, re: '[Ss]huriken',
                    desc: 'Arma de Ricardinho. Depois de arremessada, fica na zona onde caiu (mesmo embaixo de uma Estrela) até ele recuperá-la: terminando a jogada na mesma zona, com Pegar e Jogar a Shuriken ou puxando-a com SASUKE!!. Enquanto ela não volta, Shuriken Grandona fica indisponível.' }
    },

    // ── Características das habilidades ──
    // Primária: o tipo da habilidade (exatamente um). 'efeito' é reservado a habilidades internas (oculta: true).
    // Secundárias: regras paralelas comuns a todas. Leia sempre via Engine.caracteristicas(peca, hab),
    // que já aplica efeitos que as alteram (ver efeito 'modificarHabilidade').
    habilidades: {
        primarias: {
            ataque:      { label: 'Jogada de Ataque' },
            instantanea: { label: 'Instantânea' },
            reacao:      { label: 'Reação' },
            passiva:     { label: 'Passiva' }
        },
        secundarias: {
            alcance:     { label: 'Alcance',     tipo: 'numero' },   // definido em alvo (alcance | raio | comprimento)
            custo:       { label: 'Custo',       tipo: 'numero' },   // Âmago
            duracao:     { label: 'Duração',     tipo: 'duracao' },  // definida nos efeitos ({ turnos } | { ate })
            repetivel:   { label: 'Repetível',   tipo: 'booleano' }, // pode ser usada mais de uma vez por rodada
            ultraRapida: { label: 'Ultra Rápida', tipo: 'booleano' }, // não gasta a ação se for a primeira habilidade do turno
            area:        { label: 'Área',        tipo: 'texto' }     // derivada do alvo (ao-redor | linha | avanco | arco); alvo único = sem Área
        }
    },

    // Estrelas e habilidades: um arquivo por Estrela em js/estrelas/ (preenchem estes dois objetos ao carregar).
    estrelas: {},

    // Marcas: debuffs empilháveis sem stat associado. Efeitos que removem debuffs também removem marcas.
    marks: {
        precursora: { nome: 'Marca da Precursora', sigla: 'P', icone: 'precursora', cor: '#f97316', debuff: true, duracao: { ate: 'fim-proximo-turno' } },
        graciosa: { nome: 'Marca de Graciosa', sigla: 'G', icone: 'graciosa', cor: '#e2e8f0', debuff: true, unica: true, duracao: { ate: 'fim-turno' } }
    },

    abilities: {},

    statFields: [
        // Ficha (painéis, seleção e Como Jogar). `cor` é usada em todo lugar (barras, números, custos), `curto` nos chips.
        { key: 'vida',      max: 'vidaMax',     label: 'VIDA',      curto: 'VIDA', cor: '#4ade80',
          desc: 'Vida atual da Estrela. Ao chegar a 0, a Estrela é derrotada e sai do tabuleiro.' },
        { key: 'amago',     max: 'amagoMax',    label: 'ÂMAGO',     curto: 'ÂMAGO', cor: '#38bdf8',
          desc: 'Energia gasta para ativar habilidades (o custo ◆ de cada uma). Parte dele é recuperada no início do turno do jogador.' },
        { key: 'armadura',  max: 'armaduraMax', label: 'ARMADURA',  curto: 'ARM', cor: '#cbd5e1',
          desc: 'Absorve o dano antes dos Pontos de Vida e volta ao máximo no início do turno do jogador. “+N” indica Armadura extra temporária.' },
        { key: 'agilidade', label: 'AGILIDADE', curto: 'AGI', cor: '#2dd4bf',
          desc: 'Quantas zonas a Estrela pode se mover por turno. Também é somada à defesa contra Jogadas de Ataque.' },
        { key: 'fisico',    label: 'P. FÍSICO', curto: 'FÍS', cor: '#fb923c',
          desc: 'Base do dano das habilidades físicas.' },
        { key: 'magico',    label: 'P. MÁGICO', curto: 'MÁG', cor: '#c084fc',
          desc: 'Base do dano, das curas e de vários efeitos mágicos.' }
    ],

    rules: {
        movementRange: (piece) => Rules.stat(piece, 'agilidade'),
        piecesBlockMovement: true,
        turnMode: 'alternate',
        startingPlayer: 1,
        initiative: { stat: 'agilidade', tieBreakStats: ['amago', 'vida'], alternateOnTie: true },
        amagoRegenPerTurn: 2,
        isAlive: (piece) => piece.stats.vida > 0,
        turnStart: (piece) => {
            const s = piece.stats;
            s.armadura = (piece.effects || []).some(e => e.travaArmadura) ? 0 : s.armaduraMax; // Armadura convertida não volta
            s.amago = Math.min(s.amagoMax, s.amago + CONFIG.rules.amagoRegenPerTurn);
        },
        hasUsableAction: (state, piece) => Engine.hasUsableAction(state, piece),
        attackRoll: {
            mode: 'auto',
            attackerDice: { count: 2, sides: 6 },
            defenderDice: { count: 1, sides: 6 },
            defenderAddsStat: 'agilidade',
            hit: (attackerTotal, defenderTotal) => attackerTotal > defenderTotal
        },
        passivesTriggerOnAbsorbedDamage: true,
        checkVictory: (state) => {
            if (state.vencedorRenome) return state.vencedorRenome; // primeiro time a bater a meta
            const withPieces = (state.jogadores || [1, 2]).filter(pl => state.pieces.some(p => p.player === pl));
            if (withPieces.length === 0) return 'empate';
            return withPieces.length === 1 ? withPieces[0] : null;
        }
    },

    // ── Pontos de Renome ──
    // Marcadores no tabuleiro (cada um vale `valor` pontos; posições iniciais vêm do mapa). Coletar = estar na zona + usar a ação.
    // Abate: a Estrela que derrota uma inimiga recebe `porAbate` + todo o Renome que o derrotado carregava.
    // Derrotar uma aliada (ex.: dano em área) não dá Renome: o Renome dela cai no tabuleiro, como numa derrota sem autor.
    // Se ninguém recebe (derrota sem autor), o Renome da Estrela derrotada cai como marcador na zona onde ela estava.
    renome: {
        porAbate: 1,
        metaVitoria: 5, // padrão: o primeiro time a somar esse Renome vence na hora (null = só eliminação). Cada modo pode ter a sua (metaRenome).
        // Contra partidas travadas: quando alguma equipe fica com só `quandoEquipeCom` Estrela, começa uma contagem e, a cada
        // `rodadas` rodadas completas, surge (no início da rodada) um marcador de `valor` Renome numa zona vazia sorteada,
        // de preferência longe das Estrelas (a 2+ zonas de todas). null = desligado.
        extra: { quandoEquipeCom: 1, rodadas: 5, valor: 1 },
        cor: '#facc15',
        icone: 'renome' // chave em ICONES (sem imagem: estrela desenhada)
    },

    input: { doubleClickMs: 400 },
    maxUndo: 50,
    logMax: 40
};
