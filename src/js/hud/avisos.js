// ── Barra de avisos e decisões ──
// Pedidos ao jogador durante a partida: escolher alvo, usar ou não uma reação, rolar os dados.
import { Bot } from '../bot/bot.js';
import { cancelAbilityMode, selectedPiece, trocarPagamento } from '../interface/selecao.js';
import { ui } from '../interface/ui.js';
import { CONFIG } from '../motor/config.js';
import { Engine } from '../motor/engine.js';
import { Rules } from '../motor/regras.js';
import { $ } from '../nucleo/dom.js';
import { Rede } from '../online/rede.js';
import { resolveChoice, resolveReaction, resolveRoll, useAbility } from '../partida/acoes.js';
import { state } from '../partida/estado.js';
import { ehToque } from '../render/tela.js';

export function promptButton(label, cls, fn) {
    const b = document.createElement('button');
    b.className = `${cls} text-white text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-lg transition`;
    b.innerText = label;
    b.addEventListener('click', fn);
    return b;
}

export function updatePromptBar() {
    const bar = $('prompt-bar');
    const text = $('prompt-text');
    const box = $('prompt-buttons');
    box.innerHTML = '';
    let msg = null;

    if (state && !state.winner && state.pending) {
        const pd = state.pending;
        const decide = Rules.pieceById(state, pd.tipo === 'rolagem' ? pd.pieceId : pd.donoId);
        if ((Rede.ativo() && decide && decide.player !== Rede.eu) || (decide && Bot.ehBot(decide.player))) {
            const a = Engine.def(pd.abilityId);
            msg = `Aguardando o ${CONFIG.players[decide.player].label} decidir${a ? `: ${a.nome}` : ''}…`;
        } else if (pd.tipo === 'escolha') {
            const owner = Rules.pieceById(state, pd.donoId);
            const a = Engine.def(pd.abilityId);
            const c = ehToque() ? 'toque' : 'clique',
                mover = !!(a.alvo && a.alvo.livre);
            msg =
                pd.opcional && mover
                    ? `${CONFIG.players[owner.player].label} — ${a.nome}: ${owner.stats.nome} pode se mover uma zona (${c} numa zona destacada) ou ficar onde está`
                    : `${CONFIG.players[owner.player].label} — ${a.nome}: ${a.alvo && a.alvo.pergunta ? a.alvo.pergunta : `${c} no alvo (destacado)`}`;
            if (pd.opcional)
                box.appendChild(
                    promptButton(mover ? 'Ficar' : 'Não usar', 'bg-gray-700 hover:bg-gray-600', () =>
                        resolveChoice(null),
                    ),
                );
        } else if (pd.tipo === 'rolagem') {
            const a = Engine.def(pd.abilityId);
            const alvo = Rules.pieceById(state, pd.alvos[pd.i]);
            const cfg = CONFIG.rules.attackRoll;
            const { ignoraEsquiva, bonus } = Engine.bonusDefesa(Rules.pieceById(state, pd.pieceId), alvo, pd.ignora);
            const atkTxt =
                pd.i > 0
                    ? 'atacante usa o mesmo valor já rolado'
                    : `atacante rola ${cfg.attackerDice.count}D${cfg.attackerDice.sides}${pd.alvos.length > 1 ? ' (uma vez para todos os alvos)' : ''}`;
            const atkTxtB = pd.bonusAtk && pd.i === 0 ? `${atkTxt} + ${pd.bonusAtk} de bônus` : atkTxt;
            msg =
                `${a.nome} em ${Engine.label(alvo)} (${pd.i + 1}/${pd.alvos.length}): ${atkTxtB}; ` +
                `defensor rola ${cfg.defenderDice.count}D${cfg.defenderDice.sides}${bonus ? ` + ${bonus}` : ''}${ignoraEsquiva ? ' (Esq. Ignorada)' : ''}.` +
                (pd.fixo
                    ? pd.fixo.def != null
                        ? ` Rerolagem só do ataque (esquiva fica ${pd.fixo.def}).`
                        : ` Rerolagem só da esquiva (ataque fica ${pd.fixo.atk}).`
                    : '') +
                ' O ataque acertou?';
            box.appendChild(promptButton('Acertou', 'bg-green-600 hover:bg-green-500', () => resolveRoll(true)));
            box.appendChild(promptButton('Esquivou', 'bg-red-700 hover:bg-red-600', () => resolveRoll(false)));
        } else if (pd.tipo === 'reacao') {
            const a = Engine.def(pd.abilityId);
            const alvo = Rules.pieceById(state, pd.alvoId);
            const custo = Engine.custo(Rules.pieceById(state, pd.donoId), a);
            const fonte = Rules.pieceById(state, pd.fonteId);
            msg = pd.pergunta
                ? pd.pergunta
                : !pd.apoio
                  ? pd.alvoId === pd.donoId
                      ? `Deseja usar a reação ${a.nome}? (Custo: ${custo} Âmago)`
                      : `Deseja usar a reação ${a.nome} contra ${alvo.stats.nome}? (Custo: ${custo} Âmago)`
                  : a.efeitoReacao === 'reducaoDano'
                    ? `Usar ${a.nome} em ${alvo.stats.nome}? (-${a.reducao || 1} no dano de ${fonte ? fonte.stats.nome : 'inimigo'}, custo: ${custo} Âmago)`
                    : `Usar ${a.nome} no ataque de ${alvo.stats.nome}? (+${a.bonus || 1} de dano, custo: ${custo} Âmago)`;
            const [sim, nao] = pd.rotulos || ['Usar', 'Ignorar'];
            box.appendChild(promptButton(sim, 'bg-blue-600 hover:bg-blue-500', () => resolveReaction(true)));
            box.appendChild(promptButton(nao, 'bg-gray-700 hover:bg-gray-600', () => resolveReaction(false)));
        }
    } else if (state && !state.winner && ui.mode) {
        const a = Engine.def(ui.mode.abilityId);
        const dica = ui.mode.etapa
            ? {
                  arco: 'escolha a 2ª zona da área (destacada, vizinha da 1ª)',
                  varios: 'escolha o 2º inimigo (destacado)',
                  salto: 'escolha onde aterrissar (zona destacada ao lado do alvo)',
                  zona: `área destacada — ${ehToque() ? 'toque' : 'clique'} nela (ou em Confirmar) para usar`,
              }[a.alvo.tipo] || 'zona final ocupada — escolha onde parar (adjacente)'
            : ((c) => ({
                  inimigo: `${c} no inimigo (destacado)`,
                  salto: `${c} no inimigo (destacado) — depois escolha onde aterrissar`,
                  'ao-redor': 'atinge adjacentes — confirme',
                  linha: `${c} na direção (destacada)`,
                  proprio: 'aplica a si mesmo — confirme',
                  escolha: `${c} na Estrela (destacada)`,
                  avanco: `${c} na zona de destino (destacada)`,
                  trajeto: a.alvo.destino
                      ? `${c} na zona do objeto (destacada)`
                      : `${c} na zona de destino (em linha reta)`,
                  arco: `${c} em uma zona da área (2 zonas vizinhas)`,
                  varios: `${c} em ${a.alvo.quantidade ?? 2} inimigos diferentes (destacados)`,
                  zona: `${c} na zona central da área (destacada)`,
              }))(ehToque() ? 'toque' : 'clique')[a.alvo.tipo] || 'escolha o alvo';
        msg = `${a.nome}: ${dica}`;
        const modosHab = a.alvo.modos ? Engine.modosDe(selectedPiece(), a.alvo, state) || [] : null;
        if (modosHab) {
            msg = `${a.nome}: ${a.alvo.pergunta || 'escolha um efeito'}`;
            modosHab.forEach((nome, i) =>
                box.appendChild(promptButton(nome, 'bg-green-600 hover:bg-green-500', () => useAbility(a.id, i))),
            );
        } else if (a.alvo.tipo === 'ao-redor' || a.alvo.tipo === 'proprio') {
            box.appendChild(promptButton('Confirmar', 'bg-green-600 hover:bg-green-500', () => useAbility(a.id, null)));
        } else if (a.alvo.tipo === 'zona' && ui.mode.etapa) {
            const ch = ui.mode.etapa;
            box.appendChild(promptButton('Confirmar', 'bg-green-600 hover:bg-green-500', () => useAbility(a.id, ch)));
        }
        const piece = selectedPiece();
        const modos = piece && (a.custoAlternativo || a.custoAdicional) ? Engine.modosPagamento(piece, a) : [];
        if (a.custoAlternativo && modos.length) {
            const r = CONFIG.recursos[a.custoAlternativo.recurso] || {};
            const rotulo = {
                amago: `◆${Engine.custo(piece, a)} Âmago`,
                alternativo: `${r.icone || ''}${a.custoAlternativo.valor} ${a.custoAlternativo.valor === 1 ? r.singular : r.nome}`,
            };
            if (modos.length > 1) {
                modos.forEach((m) =>
                    box.appendChild(
                        promptButton(
                            rotulo[m],
                            ui.mode.pagamento === m
                                ? 'bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-300'
                                : 'bg-gray-700 hover:bg-gray-600',
                            () => trocarPagamento(m),
                        ),
                    ),
                );
                msg += ehToque() ? ' · pagar com:' : ` · pagar com (${'P'} troca):`;
            } else msg += ` · paga com ${rotulo[modos[0]]}`;
        }
        box.appendChild(
            promptButton(ui.mode.etapa ? 'Voltar' : 'Cancelar', 'bg-gray-700 hover:bg-gray-600', cancelAbilityMode),
        );
    }

    if (msg) {
        text.innerText = msg;
        bar.classList.remove('hidden');
    } else {
        bar.classList.add('hidden');
    }
}
