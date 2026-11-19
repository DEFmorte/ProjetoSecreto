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

    estrelas: {
        '#06b6d4': {
            nome: 'Diamante', vida: 10, amago: 8, armadura: 2, agilidade: 2, fisico: 1, magico: 1,
            habilidades: ['diamante_reflexo', 'diamante_punho', 'diamante_soco_chao', 'diamante_pisao']
        },
        '#ec4899': {
            nome: 'Lorena', vida: 10, amago: 10, armadura: 0, agilidade: 4, fisico: 2, magico: 0,
            habilidades: ['lorena_flecha', 'lorena_preciso', 'lorena_cadeia', 'lorena_ignora_esquiva']
        },
        '#f97316': {
            nome: 'Alex', vida: 8, amago: 12, armadura: 0, agilidade: 3, fisico: 1, magico: 2,
            habilidades: ['alex_marca', 'alex_adaga', 'alex_mergulhar', 'alex_avante']
        },
        '#84cc16': {
            nome: 'Toppich', vida: 11, amago: 7, armadura: 2, agilidade: 2, fisico: 2, magico: 0,
            habilidades: ['toppich_impulso', 'toppich_martelada', 'toppich_projecao', 'toppich_trinvestida']
        },
        '#eab308': {
            nome: 'Rato do Bananal', vida: 11, amago: 14, armadura: 0, agilidade: 2, fisico: 0, magico: 3,
            habilidades: ['rato_bananation', 'rato_bananada', 'rato_cacho', 'rato_bananeira']
        },
        '#ef4444': {
            nome: 'Garyn', vida: 14, amago: 10, armadura: 1, agilidade: 2, fisico: 2, magico: 0,
            habilidades: ['garyn_defesa', 'garyn_machadada', 'garyn_investida', 'garyn_circular']
        },
        '#a855f7': {
            nome: 'Amina', vida: 9, amago: 16, armadura: 0, agilidade: 2, fisico: 0, magico: 3,
            habilidades: ['amina_selo', 'amina_luz', 'amina_pulso', 'amina_benevolencia']
        },
        '#818cf8': {
            nome: 'Vitória', vida: 9, amago: 16, armadura: 0, agilidade: 3, fisico: 0, magico: 2,
            habilidades: ['vitoria_veu', 'vitoria_cortina', 'vitoria_recompensa', 'vitoria_presente']
        },
        '#10b981': {
            nome: 'Nair\'run', vida: 12, amago: 11, armadura: 2, agilidade: 2, fisico: 0, magico: 1,
            habilidades: ['nairrun_reator', 'nairrun_pancada', 'nairrun_projecao', 'nairrun_sobrecarga']
        },
        '#f0abfc': {
            nome: 'Siff', vida: 11, amago: 9, armadura: 0, agilidade: 4, fisico: 0, magico: 2,
            habilidades: ['siff_aura', 'siff_vento', 'siff_correcao', 'siff_poder']
        },
        '#cbd5e1': {
            nome: 'Shou & Cisnela', vida: 9, amago: 11, armadura: 0, agilidade: 3, fisico: 3, magico: 0,
            habilidades: ['shou_graciosa', 'shou_confianca', 'shou_comando', 'shou_garca']
        },
        '#d97706': {
            nome: 'Icnoyotl', vida: 11, amago: 9, armadura: 0, agilidade: 3, fisico: 0, magico: 3,
            recursos: { penas: 0 },
            habilidades: ['icnoyotl_penas', 'icnoyotl_revigorar', 'icnoyotl_vivacidade', 'icnoyotl_doacao']
        },
        '#2563eb': {
            nome: 'Cassandra', vida: 13, amago: 11, armadura: 1, agilidade: 2, fisico: 2, magico: 0,
            habilidades: ['cassandra_egide', 'cassandra_punir', 'cassandra_compelir', 'cassandra_tenente']
        },
        '#64748b': {
            nome: 'Ricardinho', vida: 10, amago: 15, armadura: 0, agilidade: 3, fisico: 2, magico: 0,
            objetos: ['shuriken'],
            habilidades: ['ricardinho_shuriken', 'ricardinho_mortal', 'ricardinho_pegar', 'ricardinho_sasuke']
        },
        '#b08968': {
            nome: 'Billy', vida: 9, amago: 11, armadura: 0, agilidade: 3, fisico: 3, magico: 0,
            habilidades: ['billy_pe', 'billy_coceira', 'billy_fumace', 'billy_sentenca']
        },
        '#9f1239': {
            nome: 'Tico', vida: 9, amago: 16, armadura: 0, agilidade: 3, fisico: 2, magico: 0,
            habilidades: ['tico_chegada', 'tico_folga', 'tico_desse', 'tico_pulguento']
        },
        '#2dd4bf': {
            nome: 'Aurora', vida: 11, amago: 14, armadura: 0, agilidade: 2, fisico: 0, magico: 3,
            recursos: { carga: 0 },
            habilidades: ['aurora_nucleo', 'aurora_disparo', 'aurora_absorver', 'aurora_descarga']
        },
        '#fde68a': {
            nome: 'Ângela', vida: 14, amago: 11, armadura: 0, agilidade: 3, fisico: 2, magico: 0,
            recursos: { penitencia: 0 },
            habilidades: ['angela_penitente', 'angela_retribuicao', 'angela_expiacao', 'angela_consagracao']
        }
    },

    // Marcas: debuffs empilháveis sem stat associado. Efeitos que removem debuffs também removem marcas.
    marks: {
        precursora: { nome: 'Marca da Precursora', sigla: 'P', icone: 'precursora', cor: '#f97316', debuff: true, duracao: { ate: 'fim-proximo-turno' } },
        graciosa: { nome: 'Marca de Graciosa', sigla: 'G', icone: 'graciosa', cor: '#e2e8f0', debuff: true, unica: true, duracao: { ate: 'fim-turno' } }
    },

    abilities: {
        diamante_reflexo: {
            nome: 'Reflexivo', tipo: 'passiva',
            descricao: 'Sempre que Diamante sofrer dano, ele causa 1 de dano a uma Estrela adjacente à sua escolha.',
            gatilho: { evento: 'sofreuDano' },
            alvo: { tipo: 'escolha', alcance: 1, quem: 'todos' },
            efeitos: [{ tipo: 'dano', valor: { fixo: 1 } }]
        },
        diamante_punho: {
            nome: 'Soco de Cristal', tipo: 'ataque', custo: 2,
            descricao: 'Diamante fortalece o punho e desfere um golpe poderoso contra uma Estrela inimiga adjacente, causando dano igual ao seu Poder Físico em um acerto.',
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        },
        diamante_soco_chao: {
            nome: 'Campo de Cristal', tipo: 'instantanea', custo: 3,
            descricao: 'Diamante soca o chão, fazendo brotar cristais ao seu redor. Causa dano igual ao seu Poder Mágico em todas as Estrelas nos arredores e reduz a Agilidade delas em 1 até o início do próximo turno do jogador.',
            alvo: { tipo: 'ao-redor', raio: 1, quem: 'todos' },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'magico' } },
                { tipo: 'modificador', stat: 'agilidade', valor: -1, duracao: { ate: 'inicio-proximo-turno' } }
            ]
        },
        diamante_pisao: {
            nome: 'Pilares de Cristal', tipo: 'instantanea', custo: 3,
            descricao: 'Com um pisão preciso, Diamante cria cristais em 2 zonas em linha reta a partir de sua posição, causando dano igual ao seu Poder Mágico em todas as Estrelas atingidas e reduzindo a Agilidade delas em 1 até o final do próximo turno do jogador.',
            alvo: { tipo: 'linha', comprimento: 2 },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'magico' } },
                { tipo: 'modificador', stat: 'agilidade', valor: -1, duracao: { ate: 'fim-proximo-turno' } }
            ]
        },
        
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
        },

        alex_marca: {
            nome: 'Marca da Precursora', tipo: 'passiva',
            descricao: 'As Jogadas de Ataque de Alex marcam os inimigos danificados até o final do próximo turno do jogador, efeitos que removem Debuffs removem as Marcas. Inimigos podem receber mais de uma Marca simultaneamente.',
            gatilho: {
                evento: 'causouDano', alvo: 'alvo',
                condicao: (c, dono) => c.fonte && c.fonte.id === dono.id && c.habilidade && c.habilidade.tipo === 'ataque' && c.alvo.player !== dono.player
            },
            efeitos: [{ tipo: 'marca', marca: 'precursora' }]
        },
        alex_adaga: {
            nome: 'Lançar Adaga', tipo: 'ataque', custo: 1,
            descricao: 'Alex arremessa uma de suas adagas contra o oponente alvo, em um acerto ela causa dano igual ao seu Poder Físico.',
            alvo: { tipo: 'inimigo', alcance: 2 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        },
        alex_mergulhar: {
            nome: 'Mergulhar', tipo: 'instantanea', custo: 3, ultraRapida: true,
            descricao: 'Alex avança até 2 zonas em linha reta. Se a zona onde ela iria parar estiver ocupada, ela pode escolher terminar seu avanço em uma zona adjacente àquela. Esta habilidade causa dano igual ao seu Poder Mágico e aplica Marca da Precursora a todas as Estrelas inimigas no percurso.',
            alvo: { tipo: 'avanco', alcance: 2, quem: 'inimigos', pousoAdjacente: true },
            efeitos: [
                { tipo: 'avancar' },
                { tipo: 'dano', valor: { stat: 'magico' } },
                { tipo: 'marca', marca: 'precursora' }
            ]
        },
        alex_avante: {
            nome: 'Avante e Cortante', tipo: 'instantanea', custo: 3,
            descricao: 'Alex avança até 3 zonas em linha reta até uma zona desocupada, causando 1 de dano e +1 de dano adicional para cada Marca da Precursora que as Estrelas inimigas no percurso possuírem. O custo de Âmago desta habilidade é recuperado se duas ou mais Estrelas atingidas estiverem marcadas.',
            alvo: { tipo: 'avanco', alcance: 3, quem: 'inimigos' },
            efeitos: [
                { tipo: 'avancar' },
                { tipo: 'dano', valor: (source, target) => 1 + Rules.marks(target, 'precursora') },
                { tipo: 'recuperarAmago', valor: 'custo', se: (source, alvos) => alvos.filter(t => Rules.marks(t, 'precursora') > 0).length >= 2 }
            ]
        },

        toppich_impulso: {
            nome: 'Impulso Bestial', tipo: 'passiva',
            descricao: 'Sempre que Toppich se mover em linha reta por duas ou mais zonas durante sua jogada, ele recupera +1 de Âmago.',
            gatilho: {
                evento: 'moveu',
                condicao: (c, dono, state) => c.peca.id === dono.id && !c.forcado && state.activeId === dono.id
                    && Rules.straightRuns(c.trilha, 2) > Rules.straightRuns(c.trilhaAntes, 2)
            },
            efeitos: [{ tipo: 'recuperarAmago', valor: { fixo: 1 } }]
        },
        toppich_martelada: {
            nome: 'Martelada', tipo: 'ataque', custo: 2,
            descricao: 'Toppich desfere um golpe pesado com seu martelo contra uma Estrela adjacente, em um acerto ele causa dano igual ao seu Poder Físico.',
            alvo: { tipo: 'escolha', alcance: 1, quem: 'todos' }, // aliados também podem ser alvo
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        },
        toppich_projecao: {
            nome: 'Projeção Territorial', tipo: 'instantanea', custo: 3,
            descricao: 'Toppich arremessa uma Estrela inimiga adjacente sobre sua cabeça, movendo-a para a zona oposta à sua posição atual e causando 1 de dano.',
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [
                { tipo: 'deslocar', direcao: 'atravessar' },
                { tipo: 'dano', valor: { fixo: 1 } }
            ]
        },
        toppich_trinvestida: {
            nome: 'Trinvestida', tipo: 'instantanea', custo: 3,
            descricao: 'Toppich investe contra uma Estrela inimiga adjacente, empurrando-a uma zona em linha reta para trás. Em seguida, Toppich se move para a zona que a Estrela inimiga ocupava. Caso esse movimento faça a Estrela inimiga colidir com o terreno ou com outra Estrela, ela sofre 1 de dano.',
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [
                { tipo: 'deslocar', direcao: 'afastar', distancia: 1, aoColidir: [{ tipo: 'dano', valor: { fixo: 1 } }] },
                { tipo: 'ocuparOrigemDoAlvo' }
            ]
        },

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
        },

        garyn_defesa: {
            nome: 'Defesa Erguida', tipo: 'passiva',
            descricao: 'Se Garyn não se mover voluntariamente durante sua jogada, ele recebe +1 de Armadura até o início do próximo turno do jogador.',
            gatilho: {
                evento: 'fimAtivacao',
                condicao: (c, dono) => c.peca.id === dono.id && !dono.turn.moveuVoluntario
            },
            efeitos: [{ tipo: 'escudo', valor: { fixo: 1 }, duracao: { ate: 'inicio-proximo-turno' } }]
        },
        garyn_machadada: {
            nome: 'Machadada', tipo: 'reacao', custo: 2,
            descricao: 'Quando uma Estrela inimiga adjacente a Garyn se mover voluntariamente para fora de seus arredores, Garyn pode ativar esta habilidade para realizar uma Jogada de Ataque contra aquela Estrela, causando dano igual ao seu Poder Físico em um acerto.',
            gatilho: { evento: 'inimigoSaiuDosArredores' },
            efeitoReacao: 'ataque',
            alvo: { tipo: 'inimigo', alcance: 1 }, // o alvo já saiu dos arredores ao resolver; o alcance não é revalidado
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        },
        garyn_investida: {
            nome: 'Investida', tipo: 'instantanea', custo: 3,
            descricao: 'Garyn avança até 2 zonas em linha reta até uma zona desocupada, causando dano igual ao seu Poder Físico -1 a todos os inimigos no percurso. Se Garyn terminar seu movimento adjacente a duas ou mais Estrelas inimigas, ele ativa Defesa Erguida.',
            alvo: { tipo: 'avanco', alcance: 2, quem: 'inimigos' },
            efeitos: [
                { tipo: 'avancar' },
                { tipo: 'dano', valor: { stat: 'fisico', fixo: -1 } },
                { tipo: 'ativarHabilidade', habilidade: 'garyn_defesa', se: (source, alvos, state) => Engine.inRange(state, source, 1, 'inimigos').length >= 2 }
            ]
        },
        garyn_circular: {
            nome: 'Golpe Circular', tipo: 'ataque', custo: 3,
            descricao: 'Garyn gira e realiza uma Jogada de Ataque contra todas as Estrelas inimigas adjacentes, em um acerto ele causa dano igual ao seu Poder Físico.',
            alvo: { tipo: 'ao-redor', raio: 1, quem: 'inimigos' },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        },

        amina_selo: {
            nome: 'Selo do Império', tipo: 'reacao', custo: 2,
            descricao: 'Quando um aliado no alcance causar dano com uma Jogada de Ataque, Amina pode ativar esta habilidade para conceder +1 de dano para a Jogada de Ataque daquele aliado.',
            gatilho: { evento: 'aliadoCausaDanoComAtaque' },
            efeitoReacao: 'bonusDano', bonus: 1,
            alvo: { tipo: 'escolha', alcance: 2, quem: 'aliados' } // define o alcance do apoio (o aliado que ataca)
        },
        amina_luz: {
            nome: 'Luz Inquisidora', tipo: 'ataque', custo: 3,
            descricao: 'Amina dispara um feixe contra uma Estrela inimiga no alcance, em um acerto ela causa dano igual ao seu Poder Mágico -1 e reduz o Âmago atual do alvo em 1.',
            alvo: { tipo: 'inimigo', alcance: 2 },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'magico', fixo: -1 } },
                { tipo: 'alterarStatus', stat: 'amago', valor: { fixo: 1 }, reduzir: true }
            ]
        },
        amina_pulso: {
            nome: 'Pulso Restaurador', tipo: 'instantanea', custo: 3, naoAcumula: true,
            descricao: 'Pela duração, sempre que um aliado adjacente a Amina usar uma Jogada de Ataque, ele recupera +1 Ponto de Vida.',
            alvo: { tipo: 'proprio' },
            efeitos: [{ tipo: 'estado', estado: 'pulso_restaurador', nome: 'Pulso Restaurador', aoEvento: 'usouAtaque', aciona: 'amina_pulso_cura', usos: null, duracao: { turnos: 2 } }]
        },
        // Habilidade interna: acionada pelo Pulso Restaurador (dono do estado = Amina).
        amina_pulso_cura: {
            nome: 'Pulso Restaurador', tipo: 'efeito', oculta: true,
            descricao: 'O aliado adjacente que usou a Jogada de Ataque recupera +1 Ponto de Vida.',
            gatilho: {
                evento: 'usouAtaque', alvo: 'alvo',
                condicao: (c, dono) => c.peca.player === dono.player && c.peca.id !== dono.id && Rules.hexDistance(c.peca, dono) === 1
            },
            efeitos: [{ tipo: 'alterarStatus', stat: 'vida', valor: { fixo: 1 } }]
        },
        amina_benevolencia: {
            nome: 'Luz de Benevolência', tipo: 'instantanea', custo: 3,
            descricao: 'Escolha uma Estrela aliada no alcance. Até o início do próximo turno do jogador, a próxima vez que aquela Estrela causar dano com uma Jogada de Ataque, ela recupera Pontos de Vida iguais ao Poder Mágico de Amina.',
            alvo: { tipo: 'escolha', alcance: 2, quem: 'aliados' },
            efeitos: [{ tipo: 'estado', estado: 'luz_benevolencia', nome: 'Luz de Benevolência', aoEvento: 'causouDano', aciona: 'amina_benevolencia_cura', usos: 1, valor: { stat: 'magico' }, duracao: { ate: 'inicio-proximo-turno' } }]
        },
        // Habilidade interna: acionada pela Luz de Benevolência (dono do estado = aliado abençoado).
        amina_benevolencia_cura: {
            nome: 'Luz de Benevolência', tipo: 'efeito', oculta: true,
            descricao: 'O aliado recupera Pontos de Vida iguais ao Poder Mágico de Amina no momento em que a cura ativa.',
            gatilho: { evento: 'causouDano', alvo: 'dono', condicao: (c, dono) => c.fonte.id === dono.id && Engine.ehAtaque(c.habilidade) },
            efeitos: [{ tipo: 'alterarStatus', stat: 'vida', valor: 'estado' }]
        },

        vitoria_veu: {
            nome: 'Véu do Luar', tipo: 'passiva', imutavel: 'secundarios',
            descricao: 'Os status secundários de Vitória não podem ser alterados.'
        },
        vitoria_cortina: {
            nome: 'Cortina D\'Água', tipo: 'reacao', custo: 2,
            descricao: 'Quando um aliado adjacente a Vitória receber dano de uma Estrela inimiga, Vitória pode ativar esta habilidade para projetar um escudo d\'água sobre o aliado, reduzindo o dano sofrido em 1.',
            gatilho: { evento: 'aliadoRecebeDano' },
            efeitoReacao: 'reducaoDano', reducao: 1,
            alvo: { tipo: 'escolha', alcance: 1, quem: 'aliados' } // define o alcance da proteção (o aliado atingido)
        },
        vitoria_recompensa: {
            nome: 'Recompensa da Lua', tipo: 'ataque', custo: 3,
            descricao: 'Vitória dispara um brilho intenso contra uma Estrela inimiga no alcance. Em um acerto, Vitória causa 1 de dano e reduz em 1 o dano causado por aquela Estrela na sua próxima Jogada de Ataque.',
            alvo: { tipo: 'inimigo', alcance: 3 },
            efeitos: [
                { tipo: 'dano', valor: { fixo: 1 } },
                { tipo: 'estado', estado: 'recompensa_lua', nome: 'Recompensa da Lua', danoAtaque: -1, acumula: true, debuff: true, duracao: { ate: 'ser-gasto' } }
            ]
        },
        vitoria_presente: {
            nome: 'Presente da Lua', tipo: 'instantanea', custo: 4,
            descricao: 'Vitória cura a si e uma Estrela aliada adjacente. Ela restaura Pontos de Vida dela e de uma Estrela aliada em valor igual ao seu Poder Mágico. Caso a vida de Vitória esteja completa, ela cura outra Estrela aliada adjacente além da primeira.',
            alvo: { tipo: 'escolha', alcance: 1, quem: 'aliados', proprioSe: (piece) => piece.stats.vida < piece.stats.vidaMax },
            efeitos: [
                { tipo: 'acionarHabilidade', habilidade: 'vitoria_presente_extra', se: (source, alvos) => source.stats.vida >= source.stats.vidaMax && !alvos.includes(source) },
                { tipo: 'alterarStatus', stat: 'vida', valor: { stat: 'magico' }, excetoFonte: true },
                { tipo: 'alterarStatus', stat: 'vida', valor: { stat: 'magico' }, naFonte: true }
            ]
        },
        // Habilidade interna: segundo aliado do Presente da Lua (quando Vitória está com a vida completa).
        vitoria_presente_extra: {
            nome: 'Presente da Lua', tipo: 'efeito', oculta: true,
            descricao: 'Outro aliado adjacente recupera Pontos de Vida iguais ao Poder Mágico de Vitória.',
            alvo: { tipo: 'escolha', alcance: 1, quem: 'aliados' },
            efeitos: [{ tipo: 'alterarStatus', stat: 'vida', valor: { stat: 'magico' } }]
        },

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
        },

        siff_aura: {
            nome: 'Aura Revitalizante', tipo: 'passiva',
            descricao: 'Estrelas aliadas adjacentes a Siff que ativarem uma habilidade que custe Âmago ganham +1 de Poder Mágico até o final do turno do jogador. Este efeito só pode beneficiar cada Estrela uma vez por turno.',
            gatilho: {
                evento: 'ativouHabilidade', alvo: 'alvo',
                condicao: (c, dono) => c.custo > 0 && c.peca.player === dono.player && c.peca.id !== dono.id && Rules.hexDistance(c.peca, dono) === 1
                    && !Engine.imutavel(c.peca, 'magico') && !c.peca.effects.some(e => e.habilidade === 'siff_aura') // 1x por turno (o bônus dura o turno)
            },
            efeitos: [{ tipo: 'modificador', stat: 'magico', valor: 1, duracao: { ate: 'fim-turno' } }]
        },
        siff_vento: {
            nome: 'Vento Cintilante', tipo: 'ataque', custo: 2,
            descricao: 'Siff dispara uma borrifada cintilante na direção de uma Estrela inimiga no alcance, em um acerto ela causa dano igual ao seu Poder Mágico e pode recuperar +1 Ponto de Vida de uma Estrela aliada adjacente.',
            alvo: { tipo: 'inimigo', alcance: 2 },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'magico' } },
                { tipo: 'acionarHabilidade', habilidade: 'siff_vento_cura', se: (source, alvos) => alvos.length > 0 }
            ]
        },
        // Habilidade interna: cura do Vento Cintilante (só oferece aliados feridos).
        siff_vento_cura: {
            nome: 'Vento Cintilante', tipo: 'efeito', oculta: true,
            descricao: 'Uma Estrela aliada adjacente a Siff recupera +1 Ponto de Vida.',
            alvo: { tipo: 'escolha', alcance: 1, quem: 'aliados', filtro: (dono, t) => t.stats.vida < t.stats.vidaMax },
            efeitos: [{ tipo: 'alterarStatus', stat: 'vida', valor: { fixo: 1 } }]
        },
        siff_correcao: {
            nome: 'Correção de Vitalidade', tipo: 'passiva',
            descricao: 'Ao final do turno do jogador, Siff cura uma Estrela aliada adjacente. O valor da cura é equivalente à diferença entre o Poder Mágico de Siff e o Poder Mágico da Estrela alvo.',
            // fimTurno: acionada antes de os efeitos "até o fim do turno" expirarem; o jogador escolhe o aliado (só os que seriam curados).
            gatilho: { evento: 'fimTurno' },
            alvo: { tipo: 'escolha', alcance: 1, quem: 'aliados', filtro: (dono, t) => t.stats.vida < t.stats.vidaMax && Rules.stat(dono, 'magico') !== Rules.stat(t, 'magico') },
            efeitos: [{ tipo: 'alterarStatus', stat: 'vida', valor: (source, target) => Math.abs(Rules.stat(source, 'magico') - Rules.stat(target, 'magico')) }]
        },
        siff_poder: {
            nome: 'Podeeeerrrr!!!', tipo: 'instantanea', custo: 3,
            descricao: 'Com um bater de asas, Siff potencializa as capacidades mágicas de uma Estrela aliada no alcance, aumentando o Poder Mágico do alvo em 1 até o final do turno do jogador.',
            alvo: { tipo: 'escolha', alcance: 2, quem: 'aliados' },
            efeitos: [{ tipo: 'modificador', stat: 'magico', valor: 1, duracao: { ate: 'fim-turno' } }]
        },

        shou_graciosa: {
            nome: 'Graciosa (Cisnela)', tipo: 'passiva',
            descricao: 'No início do turno do jogador, Cisnela cria uma Marca na Estrela inimiga mais próxima de Shou, essa Marca perdura até o final do turno do jogador. A primeira habilidade de Shou a causar dano em uma Estrela marcada é considerada como tendo a propriedade Ultra Rápida.',
            // inicioTurno: acionada depois da recuperação de Armadura/Âmago. ultraContraMarca: ver Engine.ultraContraMarca.
            gatilho: { evento: 'inicioTurno' },
            ultraContraMarca: 'graciosa',
            alvo: { tipo: 'escolha', alcance: 99, quem: 'inimigos', filtro: (dono, t, state) => Rules.distancia(dono, t) === Engine.menorDistancia(state, dono, 'inimigos') },
            efeitos: [{ tipo: 'marca', marca: 'graciosa', unica: true }]
        },
        shou_confianca: {
            nome: 'Confiança (Shou)', tipo: 'ataque', custo: 2,
            descricao: 'Shou realiza uma Jogada de Ataque com sua lança contra uma Estrela inimiga adjacente, em um acerto ele causa dano igual ao seu Poder Físico.',
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        },
        shou_comando: {
            nome: 'Comando Elegante (Cisnela)', tipo: 'instantanea', custo: 1, ultraRapida: true,
            descricao: 'Shou ordena que Cisnela avance em direção a uma Estrela no alcance. Cisnela então transfere a Marca de Graciosa para essa Estrela até o final do turno do jogador.',
            alvo: { tipo: 'escolha', alcance: 2, quem: 'todos', filtro: (dono, t) => !Engine.temMarcaDe(t, 'graciosa', dono) },
            efeitos: [{ tipo: 'marca', marca: 'graciosa', unica: true }]
        },
        shou_garca: {
            nome: 'Graça da Garça (Shou)', tipo: 'ataque', custo: 3,
            descricao: 'Shou executa um corte em uma área de 2 zonas adjacentes nos seus arredores, causando dano igual ao seu Poder Físico em um acerto.',
            alvo: { tipo: 'arco', zonas: 2, quem: 'inimigos' },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        },

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
        },

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
        },

        // Shuriken (CONFIG.objetos): piece.objetos.shuriken = null (com Ricardinho) | { q, r } (na zona onde caiu).
        // Alvo 'trajeto': escolhe uma zona em linha reta no alcance (para em buracos e na borda); atinge as Estrelas
        // entre Ricardinho e essa zona, sem contar a que estiver na própria zona (incluiDestino: conta também a da zona).
        ricardinho_shuriken: {
            nome: 'Shuriken Grandona', tipo: 'ataque', custo: 3, repetivel: true,
            descricao: 'Ricardinho arremessa uma shuriken em linha reta até uma zona no alcance. Ele realiza uma Jogada de Ataque contra todas as Estrelas no caminho, exceto a da zona alvo, causando dano igual ao seu Poder Físico em um acerto. Ricardinho só pode ativar essa habilidade novamente após recuperar a shuriken. A shuriken permanece na zona alvo até ser recolhida. Ricardinho deve estar na mesma zona que a shuriken ao final da jogada para recuperá-la.',
            alvo: { tipo: 'trajeto', alcance: 3, quem: 'todos', requer: dono => Engine.objetoComDono(dono, 'shuriken'), motivo: 'A shuriken não está com ele' },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'fisico' } },
                { tipo: 'lancarObjeto', objeto: 'shuriken' }
            ]
        },
        // jogadaDeAtaque: Instantânea que rola como uma Jogada de Ataque (o salto acontece mesmo se errar).
        ricardinho_mortal: {
            nome: 'Mortalzinho Zika', tipo: 'instantanea', custo: 2, ultraRapida: true, jogadaDeAtaque: true,
            descricao: 'Ricardinho salta sobre uma Estrela inimiga adjacente e aterrissa atrás dela. Durante a acrobacia, Ricardinho realiza uma Jogada de Ataque contra a Estrela inimiga. Em um acerto, Ricardinho causa dano igual ao seu Poder Físico -1.',
            // A zona atrás do alvo (do outro lado dele, em linha reta) precisa existir e estar livre.
            alvo: { tipo: 'inimigo', alcance: 1, filtro: (dono, alvo, state) => Engine.zonaLivre(state, Engine.zonaAtras(dono, alvo)), motivo: 'Nenhum inimigo adjacente com a zona de trás livre' },
            efeitos: [
                { tipo: 'saltarSobre' },
                { tipo: 'dano', valor: { stat: 'fisico', fixo: -1 } }
            ]
        },
        ricardinho_pegar: {
            nome: 'Pegar e Jogar a Shuriken', tipo: 'reacao', custo: 1,
            descricao: 'Quando Ricardinho estiver na mesma zona que sua shuriken, ele pode ativar esta habilidade para arremessá-la novamente. Ricardinho recebe uma nova ativação de Shuriken Grandona.',
            // Oferecida quando Ricardinho para na zona da shuriken durante a própria jogada (movimento ou salto).
            // O uso extra não gasta a ação, mas Shuriken Grandona ainda paga o próprio custo.
            gatilho: {
                evento: 'moveu',
                condicao: (c, dono, state) => c.peca.id === dono.id && state.activeId === dono.id && Engine.objetoNaZonaDe(dono, 'shuriken'),
                ainda: dono => Engine.objetoNaZonaDe(dono, 'shuriken')
            },
            alvo: { tipo: 'proprio' },
            efeitos: [
                { tipo: 'recolherObjeto', objeto: 'shuriken' },
                { tipo: 'concederUso', habilidade: 'ricardinho_shuriken' }
            ]
        },
        ricardinho_sasuke: {
            nome: 'SASUKE!!', tipo: 'instantanea', custo: 4,
            descricao: 'Se a shuriken estiver ao alcance, Ricardinho a puxa para sua zona, causando dano igual ao seu Poder Físico a todas as Estrelas no caminho, inclusive a que estiver na zona de onde a shuriken sai. Ricardinho só pode puxar a shuriken em linha reta.',
            // destino: a única zona que pode ser escolhida (a da shuriken). Atinge quem está no caminho e na zona dela, sem rolagem.
            alvo: { tipo: 'trajeto', alcance: 4, quem: 'todos', incluiDestino: true, destino: dono => Engine.objetoNoTabuleiro(dono, 'shuriken'),
                    motivo: dono => Engine.objetoNoTabuleiro(dono, 'shuriken') ? 'Shuriken fora do alcance ou da linha reta' : 'A shuriken já está com ele' },
            efeitos: [
                { tipo: 'dano', valor: { stat: 'fisico' } },
                { tipo: 'recolherObjeto', objeto: 'shuriken', puxar: true }
            ]
        },

        // Alvo 'zona': escolha "q,r" = uma zona no alcance. raioArea: atinge as Estrelas nessa zona e nas zonas a até
        // raioArea dela. livre: só zonas vazias (não atinge ninguém; ex.: para onde se mover). opcional (passiva com escolha):
        // o dono pode recusar (escolha null = fica onde está).
        // Alvo 'varios': `quantidade` Estrelas diferentes no alcance (escolha "id1,id2"); com só uma no alcance, ataca só ela.
        billy_pe: {
            nome: 'Dar no Pé', tipo: 'passiva',
            descricao: 'Sempre que Billy sofrer dano de uma Jogada de Ataque, ele pode se mover uma zona.',
            // Não gasta movimento e não conta como movimento voluntário (não aciona Machadada nem Compelir).
            gatilho: { evento: 'sofreuDano', condicao: c => Engine.ehAtaque(c.habilidade) },
            alvo: { tipo: 'zona', alcance: 1, livre: true, opcional: true },
            efeitos: [{ tipo: 'moverPara' }]
        },
        billy_coceira: {
            nome: 'Coceira e Espirro', tipo: 'ataque', custo: 3,
            descricao: 'Billy demonstra sua maestria como pistoleiro e realiza uma Jogada de Ataque contra duas Estrelas inimigas diferentes no alcance, causando dano igual ao seu Poder Físico-1.',
            alvo: { tipo: 'varios', alcance: 2, quantidade: 2, quem: 'inimigos' },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico', fixo: -1 } }]
        },
        billy_fumace: {
            nome: 'Fumacê', tipo: 'instantanea', custo: 4,
            descricao: 'Billy arremessa uma bomba de fumaça em uma zona no alcance. Todas as zonas adjacentes à zona escolhida são afetadas pelo efeito dessa habilidade. Estrelas dentro dessas zonas têm seu alcance de habilidades reduzido para 1 até o início do próximo turno do jogador.',
            // Atinge quem está na zona escolhida e nas adjacentes no momento do uso (aliados e o próprio Billy também).
            alvo: { tipo: 'zona', alcance: 3, raioArea: 1, quem: 'todos' },
            efeitos: [{ tipo: 'modificarHabilidade', caracteristica: 'alcance', maximo: 1, debuff: true, duracao: { ate: 'inicio-proximo-turno' } }]
        },
        billy_sentenca: {
            nome: 'Sentença', tipo: 'ataque', custo: 3,
            descricao: 'Billy saca sua espingarda e realiza uma Jogada de Ataque contra uma Estrela no alcance, causando dano igual ao seu Poder Físico. Se a armadura atual do alvo for menor que o dano de Sentença, a habilidade ignora a armadura do alvo.',
            alvo: { tipo: 'escolha', alcance: 3, quem: 'todos' }, // aliados também podem ser alvo
            // ignoraArmaduraSeMenor: Armadura atual (com a extra) menor que o dano → o dano vai direto para a Vida.
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' }, ignoraArmaduraSeMenor: true }]
        },

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
        },

        aurora_nucleo: {
            nome: 'Carregamento do Núcleo', tipo: 'passiva',
            descricao: 'Ao final do turno do jogador, Aurora ganha marcadores de Carga do Núcleo equivalentes ao seu valor de Poder Mágico. Aurora pode armazenar até 6 marcadores de Carga do Núcleo ao mesmo tempo.',
            gatilho: { evento: 'fimTurno', condicao: (c, dono) => Engine.recurso(dono, 'carga') < CONFIG.recursos.carga.max && Rules.stat(dono, 'magico') > 0 },
            alvo: { tipo: 'proprio' },
            efeitos: [{ tipo: 'recurso', recurso: 'carga', valor: { stat: 'magico' } }]
        },
        // repeteCom: depois de usada na rodada, pode ser usada de novo sem gastar a ação, pagando o custo + o recurso.
        aurora_disparo: {
            nome: 'Disparo Arcano', tipo: 'ataque', custo: 1, repetivel: true, repeteCom: { recurso: 'carga', valor: 1 },
            descricao: 'Aurora dispara um feixe de energia contra uma Estrela inimiga no alcance. Em um acerto, Aurora causa 1 de dano ao alvo. Além disso, Aurora pode consumir 1 marcador de Carga do Núcleo para ativar esta habilidade novamente.',
            alvo: { tipo: 'inimigo', alcance: 3 },
            efeitos: [{ tipo: 'dano', valor: { fixo: 1 } }]
        },
        // modos(dono): uma opção por quantidade de Cargas (escolha 0 = 1 Carga, 1 = 2 Cargas...).
        aurora_absorver: {
            nome: 'Absorver Carga', tipo: 'instantanea', custo: 1, ultraRapida: true,
            descricao: 'Aurora absorve a energia do núcleo. Ela pode consumir marcadores de Carga do Núcleo para recuperar +1 ponto de Âmago por marcador consumido.',
            alvo: { tipo: 'proprio', pergunta: 'quantas Cargas do Núcleo consumir?', motivo: 'Sem Carga do Núcleo',
                    modos: dono => Array.from({ length: Engine.recurso(dono, 'carga') }, (_, i) => `${i + 1} ⚡ → +${i + 1} Âmago`) },
            efeitos: [{ tipo: 'trocarRecurso', recurso: 'carga' }]
        },
        // ultraSeZerarArmadura: se o dano zerar a Armadura (com a extra) de quem tinha alguma, a Descarga vira Ultra Rápida.
        aurora_descarga: {
            nome: 'Descarga', tipo: 'instantanea', custo: 2,
            descricao: 'Aurora concentra um feixe arcano em 2 zonas, em linha reta, a partir dela. Todas as Estrelas na área afetada sofrem 1 de dano. Se esta habilidade causar dano suficiente para reduzir a Armadura de uma Estrela atingida a 0, ela ganha o traço Ultra Rápida.',
            alvo: { tipo: 'linha', comprimento: 2, quem: 'todos' },
            efeitos: [{ tipo: 'dano', valor: { fixo: 1 }, ultraSeZerarArmadura: true }]
        },

        // consomeRecurso: ao acertar uma Jogada de Ataque, Ângela é perguntada (um marcador por vez) se consome Penitência.
        angela_penitente: {
            nome: 'Penitente', tipo: 'passiva', consomeRecurso: 'penitencia',
            descricao: 'Sempre que Ângela receber dano, ela recebe um marcador de Penitência. Ela pode acumular até três marcadores de Penitência simultaneamente. Sempre que Ângela acertar uma Jogada de Ataque contra uma Estrela, ela pode consumir qualquer quantidade de marcadores de Penitência para causar +1 de dano para cada marcador consumido.',
            gatilho: { evento: 'sofreuDano' },
            alvo: { tipo: 'proprio' },
            efeitos: [{ tipo: 'recurso', recurso: 'penitencia', valor: 1 }]
        },
        // Evento 'errouAtaqueContra': enfileirado quando um inimigo adjacente erra uma Jogada de Ataque nela.
        angela_retribuicao: {
            nome: 'Retribuição', tipo: 'reacao', custo: 2, repetivel: true, efeitoReacao: 'ataque',
            descricao: 'Quando uma Estrela inimiga adjacente falhar em uma Jogada de Ataque contra Ângela, ela pode imediatamente realizar uma Jogada de Ataque contra aquela Estrela, causando dano igual ao seu Poder Físico em um acerto.',
            gatilho: { evento: 'errouAtaqueContra', ainda: (dono, state, t) => { const f = t && Rules.pieceById(state, t.origemId); return !!f && Rules.hexDistance(f, dono) === 1; } },
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        },
        angela_expiacao: {
            nome: 'Expiação', tipo: 'ataque', custo: 2,
            descricao: 'Ângela investe com sua espada contra uma Estrela inimiga adjacente, causando dano igual ao seu Poder Físico em um acerto.',
            alvo: { tipo: 'inimigo', alcance: 1 },
            efeitos: [{ tipo: 'dano', valor: { stat: 'fisico' } }]
        },
        // bonus_rolagem: soma em todas as rolagens de ataque enquanto durar (não é gasto como o bonus_ataque).
        angela_consagracao: {
            nome: 'Consagração', tipo: 'instantanea', custo: 2, naoAcumula: true,
            descricao: 'Ângela causa 1 de dano a si mesma ao consagrar sua espada. Pela duração, todas as Jogadas de Ataque de Ângela recebem +1 nas rolagens.',
            alvo: { tipo: 'proprio' },
            efeitos: [
                { tipo: 'dano', valor: { fixo: 1 } },
                { tipo: 'modificador', stat: 'bonus_rolagem', valor: 1, duracao: { turnos: 2 } }
            ]
        }
    },

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
Object.entries(CONFIG.abilities).forEach(([id, a]) => { a.id = id; });
