// ── Como jogar (abas) ──
import { $ } from '../nucleo/dom.js';
import { CONFIG } from '../motor/config.js';
import { Rules } from '../motor/regras.js';
import { Engine } from '../motor/engine.js';
import { Rede } from '../online/rede.js';
import { ui } from '../interface/ui.js';
import { COR, esc, iconeHTML, ICONES, icRenome } from '../interface/icones.js';
import { descricaoComTermos, GLOSSARIO, GLOSSARIO_ORDEM, GLOSSARIO_SECOES } from '../interface/glossario.js';
import { chipsStatus, estrelaExemplo, estrelasEmOrdem, retratoSrc } from './escolha-equipe.js';
import { abrirPausa, fecharPausa } from './pausa.js';
import { setPreview } from '../hud/habilidades.js';

let ajudaVolta = null; // null = menu principal, 'pausa' = volta ao menu de pausa, 'jogo' = volta à partida
const ABAS_AJUDA = [
    { id: 'objetivo', nome: 'Objetivo' },
    { id: 'turno', nome: 'Turno' },
    { id: 'combate', nome: 'Combate' },
    { id: 'estrelas', nome: 'Estrelas' },
    { id: 'glossario', nome: 'Glossário' },
    { id: 'controles', nome: 'Controles' },
];

export function mostrarAjuda(aba = ui.abaAjuda, volta = null) {
    ajudaVolta = volta;
    if (volta === 'pausa') fecharPausa();
    setPreview(null);
    ui.abaAjuda = ABAS_AJUDA.some((t) => t.id === aba) ? aba : 'objetivo';
    // só pelo menu principal (não abandona partida)
    $('tutorial-box').classList.toggle('hidden', volta !== null || Rede.ativo());
    renderAjuda();
    const tela = $('help-screen');
    tela.classList.remove('hidden');
    tela.classList.add('flex');
    tela.scrollTop = 0;
}

export function fecharAjuda(voltar = true) {
    const tela = $('help-screen');
    const aberta = !tela.classList.contains('hidden');
    tela.classList.add('hidden');
    tela.classList.remove('flex');
    if (aberta && voltar && ajudaVolta === 'pausa') abrirPausa();
    ajudaVolta = null;
}

export function trocarAbaAjuda(passo) {
    const i = ABAS_AJUDA.findIndex((t) => t.id === ui.abaAjuda);
    ui.abaAjuda = ABAS_AJUDA[(i + passo + ABAS_AJUDA.length) % ABAS_AJUDA.length].id;
    renderAjuda();
    $('help-screen').scrollTop = 0;
}

function renderAjuda() {
    const tabs = $('help-tabs');
    tabs.innerHTML = '';
    ABAS_AJUDA.forEach((t) => {
        const b = document.createElement('button');
        b.className = `tab-btn ${t.id === ui.abaAjuda ? 'ativa' : ''}`;
        b.innerText = t.nome;
        b.addEventListener('click', () => {
            ui.abaAjuda = t.id;
            renderAjuda();
        });
        tabs.appendChild(b);
    });
    $('help-content').innerHTML = conteudoAjuda(ui.abaAjuda);
}

function conteudoAjuda(aba) {
    const R = CONFIG.rules,
        ren = CONFIG.renome,
        atk = R.attackRoll;
    const dado = (d) => `${d.count}D${d.sides}`;
    const statDe = (k) => CONFIG.statFields.find((f) => f.key === k) || { label: k, cor: '#fff' };
    const st = (k) =>
        `<b style="color:${statDe(k).cor}">${statDe(k).label.charAt(0) + statDe(k).label.slice(1).toLowerCase()}</b>`;
    const star = `<b style="color:${ren.cor}">${icRenome()} Renome</b>`;
    const termo = (t, d, cor) =>
        `<div class="termo"><b${cor ? ` style="color:${cor}"` : ''}>${t}</b><span>${d}</span></div>`;
    const kbd = (k) => `<span class="kbd">${k}</span>`;
    const L = CONFIG.habilidades;
    if (aba === 'objetivo')
        return `
        <h3>Objetivo</h3>
        <p>Dois ou três jogadores (todos contra todos), cada um com uma equipe de <b>${CONFIG.teamSize} Estrelas</b>, se enfrentam num tabuleiro de zonas hexagonais. Vence quem primeiro:</p>
        <ul>${Rules.textoMetaRenome() ? `<li>somar <b style="color:${ren.cor}">${icRenome()} ${Rules.textoMetaRenome()} de Renome</b> no time (a soma do que as Estrelas carregam), ou</li>` : ''}
            <li>derrotar <b>todas as Estrelas adversárias</b> (ser o último de pé). Se os últimos times caírem juntos, é empate.</li></ul>
        <h3 class="mt-4">${star}</h3>
        <ul><li>Os marcadores ${icRenome()} no tabuleiro valem Renome: pare na zona e use a ação <b>Coletar Renome</b> ${kbd('C')}.</li>
            <li>Derrotar uma Estrela <b>inimiga</b> dá <b>+${ren.porAbate || 0}</b> a quem derrotou, mais todo o Renome que a Estrela derrotada carregava.</li>
            <li>Derrotar uma <b>aliada</b> (ex.: com dano em área) não dá Renome.</li>
            <li>Se ninguém leva o crédito (ou foi uma aliada), o Renome da Estrela derrotada cai como marcador na zona onde ela estava.</li>
            ${ren.extra ? `<li><b>Contra partidas travadas:</b> quando alguma equipe fica com só ${ren.extra.quandoEquipeCom === 1 ? '1 Estrela' : `${ren.extra.quandoEquipeCom} Estrelas`}, começa uma contagem: a cada <b>${ren.extra.rodadas} rodadas</b> surge, no começo da rodada, um novo marcador ${icRenome()} numa zona vazia sorteada (longe das Estrelas, se der). A contagem aparece na ordem dos turnos.</li>` : ''}</ul>
        <h3 class="mt-4">Começando</h3>
        <ol class="list-decimal pl-5"><li>Cada jogador escolhe ${CONFIG.teamSize} Estrelas (passe o mouse para ver os atributos).</li>
            <li>Na sua vez, mova e use uma habilidade com cada Estrela.</li>
            <li>Na dúvida, passe o mouse sobre Estrelas e habilidades: a ficha e o alcance aparecem na tela.</li></ol>`;
    if (aba === 'turno')
        return `
        <h3>Ordem</h3>
        <p>${R.turnMode === 'initiative' ? `As Estrelas agem em blocos por ordem de ${st(R.initiative.stat)} (a barra no topo mostra a ordem).` : 'Os jogadores alternam turnos, numa ordem <b>sorteada no início</b> da partida (vale a partida toda). No seu turno, cada Estrela do time age uma vez, na ordem que você quiser.'}</p>
        <h3 class="mt-4">Início do turno do jogador</h3>
        <ul><li>${st('armadura')} volta ao máximo.</li><li>Cada Estrela ganha <b style="color:${COR.amago}">+${R.amagoRegenPerTurn} Âmago</b> (até o máximo).</li></ul>
        <h3 class="mt-4">Jogada de uma Estrela</h3>
        <ul><li>Estrela com <b>anel</b> ainda pode agir. Clique nela para selecionar.</li>
            <li><b>Movimento:</b> até ${st('agilidade')} zonas. Arraste da Estrela pelas <b class="text-green-400">zonas verdes</b> e dê <b>2 cliques</b> no destino. Dá para dividir o movimento antes e depois da ação. Estrelas bloqueiam o caminho; buracos não podem ser atravessados.</li>
            <li><b>Ação:</b> uma habilidade (custa <b style="color:${COR.amago}">◆ Âmago</b>) ou <b>Coletar Renome</b>.</li>
            <li><b>Custos especiais:</b> algumas habilidades mostram outro recurso além do ◆ (ex.: <b style="color:${CONFIG.recursos.penas.cor}">${CONFIG.recursos.penas.icone} Penas</b>). <b>Custo adicional</b> (<b>+</b>): paga o Âmago <i>e</i> o recurso. <b>Custo alternativo</b> (<b>/</b>): escolha pagar o Âmago <i>ou</i> só o recurso — ao usar a habilidade, escolha na barra de cima ou aperte ${kbd('P')}.</li>
            <li>Cada habilidade só pode ser usada uma vez por turno da Estrela, exceto as <b>${L.secundarias.repetivel.label}s</b>. Uma habilidade <b>${L.secundarias.ultraRapida.label}</b> não gasta a ação se for a primeira do turno.</li>
            <li>Depois que uma Estrela começa a agir, termine com ela antes de passar a outra: <b>Encerrar jogada</b> ${kbd('E')}. Quando todas agiram, o turno passa.</li>
            <li>Errou? <b>Desfazer</b> ${kbd('Ctrl+Z')} volta qualquer ação, inclusive rolagens (só contra Bots).</li>
            <li><b>Contra Bots:</b> em <b>Jogar contra Bots</b>, escolha <b>Contra 1 Bot</b> (um contra um) ou <b>Contra 2 Bots</b> (três equipes, todos contra todos). Você monta a sua equipe e a de cada Bot (ou usa <b>🎲 Sortear</b>); eles jogam sozinhos na vez deles (e decidem as próprias reações). Abaixo dos modos, escolha o <b>nível</b>: <b>Normal</b> (às vezes escolhe uma jogada pior) ou <b>Difícil</b> (pensa um pouco mais e prevê a sua resposta antes de agir). As rolagens são automáticas e <b>Desfazer</b> volta à sua última decisão.</li>
            <li><b>Online:</b> em <b>Jogar online</b>, um jogador cria a sala e envia o código; o outro entra com ele. Cada um controla só a própria equipe, as rolagens são automáticas e não há desfazer.</li></ul>`;
    if (aba === 'combate')
        return `
        <h3>Tipos de habilidade</h3>
        ${termo(L.primarias.ataque.label, `Exige rolagem: o atacante rola <b>${dado(atk.attackerDice)}</b>, o defensor rola <b>${dado(atk.defenderDice)}</b>${atk.defenderAddsStat ? ` + ${st(atk.defenderAddsStat)}` : ''}. Acerta se o total do atacante for <b>maior</b>; empate = esquiva.`)}
        ${termo(L.primarias.instantanea.label, 'Funciona direto, sem rolagem.')}
        ${termo(L.primarias.reacao.label, 'Usada fora da sua vez, quando o gatilho acontece. O jogo pergunta ao dono se quer usar (custa Âmago).')}
        ${termo(L.primarias.passiva.label, 'Sempre ativa, sem custo.')}
        <h3 class="mt-4">Dano</h3>
        <ul><li>${st('armadura')} absorve o dano primeiro; o resto sai da ${st('vida')}. Armadura extra temporária aparece como <b>+N</b>.</li>
            <li>Com Vida 0 a Estrela é derrotada e sai do tabuleiro.</li></ul>
        <h3 class="mt-4">Alcance</h3>
        <ul><li>Contado andando só pelas zonas que existem (contorna os buracos). Estrelas <b>não</b> bloqueiam alcance.</li>
            <li>Linhas e investidas seguem reto e param em buracos e na borda.</li>
            <li>Passe o mouse numa habilidade: zonas claras = alcance; zonas pulsando = alvos válidos (<b class="text-orange-400">laranja</b> inimigos, <b class="text-green-400">verde</b> aliados).</li></ul>
        <h3 class="mt-4">Efeitos</h3>
        <ul><li><b class="text-green-400">▲</b> bônus e <b class="text-red-400">▼</b> penalidade ativos na Estrela (detalhes na ficha).</li>
            ${Object.values(CONFIG.marks)
                .map(
                    (m) =>
                        `<li><b style="color:${m.cor}">${m.icone && ICONES[m.icone] ? iconeHTML(m.icone) : '◆ ' + m.sigla}</b> — ${m.nome}: ${m.unica ? 'uma por vez' : 'marca empilhável'}${m.debuff ? ' (conta como debuff)' : ''}.</li>`,
                )
                .join('')}</ul>`;
    if (aba === 'estrelas')
        return `<div class="grid md:grid-cols-2 gap-3">${estrelasEmOrdem()
            .map((color) => [color, CONFIG.estrelas[color]])
            .map(([color, h]) => {
                const p = estrelaExemplo(color),
                    src = retratoSrc(h.nome);
                return `<div class="rounded-2xl border border-gray-700 bg-gray-800/40 p-3">
            <div class="flex items-center gap-3 mb-2"><span class="w-10 h-10 rounded-full shrink-0 border-2 border-gray-900" style="background:${color}${src ? ` url('${src}') center/cover` : ''}"></span>
                <b class="text-base" style="color:${color}">${h.nome}</b></div>
            <div class="flex flex-wrap gap-1 mb-2 text-xs">${chipsStatus(h)}</div>
            ${Engine.abilitiesOf(p)
                .map(
                    (
                        a,
                    ) => `<div class="mt-2 text-xs"><b>${a.nome}</b> <span class="text-gray-500">· ${Engine.descreverCaracteristicas(p, a)}</span>
                <div class="text-gray-400 leading-snug whitespace-pre-line">${descricaoComTermos(a.descricao)}</div></div>`,
                )
                .join('')}
        </div>`;
            })
            .join('')}</div>`;
    if (aba === 'glossario')
        return GLOSSARIO_ORDEM.map(
            (secao, i) => `
        <h3${i ? ' class="mt-4"' : ''}>${secao}</h3>
        ${GLOSSARIO_SECOES[secao] ? `<p class="text-gray-300 leading-snug mb-2">${GLOSSARIO_SECOES[secao]}</p>` : ''}
        ${GLOSSARIO.filter((g) => g.secao === secao)
            .map((g) => termo((g.icone ? iconeHTML(g.icone) + ' ' : '') + esc(g.nome), g.desc, g.cor))
            .join('')}`,
        ).join('');
    if (aba === 'controles')
        return `
        <h3>Toque (celular)</h3>
        <ul><li>O jogo fica <b>na horizontal</b>; no Android, use o botão <b>Tela cheia</b> no menu principal ou na pausa (o mesmo botão sai dela).</li>
            <li><b>Toque</b> numa Estrela com anel para selecionar; numa Estrela que não pode agir, fixa a ficha dela (toque de novo para soltar).</li>
            <li><b>Toque numa zona verde</b> para traçar o caminho e <b>toque de novo</b> nela para mover (ou arraste pelo caminho).</li>
            <li><b>Habilidade:</b> o 1º toque mostra a descrição e o alcance; o 2º toque usa. Toque no cartão ou no tabuleiro para fechar.</li></ul>
        <h3 class="mt-4">Mouse</h3>
        <ul><li><b>Clique</b> numa Estrela: seleciona (Estrela que não pode agir: fixa a ficha dela para leitura).</li>
            <li><b>Arraste</b> pelas zonas verdes para traçar o caminho; <b>2 cliques</b> no destino para mover.</li>
            <li><b>Passe o mouse</b> numa Estrela para ver a ficha; numa habilidade para ver alcance, alvos e descrição.</li>
            <li>Mapa maior que a tela: <b>arraste</b> a partir de uma área vazia (ou com o botão do meio), use a <b>roda do mouse</b> ou as <b>setas</b> para deslizar.</li></ul>
        <h3 class="mt-4">Teclado</h3>
        ${termo(kbd('1') + ' – ' + kbd('9'), 'Usar a habilidade da barra inferior')}
        ${termo(kbd('C'), 'Coletar Renome (Estrela sobre um marcador ' + icRenome() + ')')}
        ${termo(kbd('P'), 'Trocar a forma de pagamento (habilidade com custo alternativo)')}
        ${termo(kbd('E'), 'Encerrar jogada')}
        ${termo(kbd('Ctrl+Z'), 'Desfazer')}
        ${termo(kbd('Esc'), 'Cancelar habilidade/caminho; sem nada para cancelar, abre o menu')}
        ${termo(kbd('H'), 'Como jogar')}
        ${termo(kbd('←') + ' ' + kbd('↑') + ' ' + kbd('→') + ' ' + kbd('↓'), 'Deslizar o mapa (quando não cabe na tela)')}
        ${termo(kbd('Enter'), 'Confirmar nos menus')}
        <h3 class="mt-4">No tabuleiro</h3>
        ${termo('<span style="color:' + COR.vida + '">▬</span> Barra verde', 'Vida (fica amarela e vermelha quando baixa). O número é a Vida atual.')}
        ${termo('<span style="color:' + COR.amago + '">▬ ◆</span> Barra azul', 'Âmago atual.')}
        ${termo('<svg width="11" height="12" viewBox="0 0 10 12" style="display:inline;vertical-align:-1px"><path d="M5 0 9.2 2.4 8.7 7 5 12 1.3 7 .8 2.4Z" fill="#475569" stroke="' + COR.armadura + '"/></svg> Escudo', 'Armadura atual (incluindo a extra).')}
        ${termo(icRenome() + ' Renome', 'No chão, marcador para coletar; numa Estrela, o Renome que ela carrega.')}
        ${termo('Anel pulsante', 'Estrela que ainda pode agir neste turno.')}`;
    return '';
}
