// ── Engine: uso de habilidades ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { Rules } from '../regras.js';
import { Engine } from '../engine.js';

export default {
    slot(state, piece, a) {
        const t = piece.turn;
        if (!t || a.oculta) return null;
        const car = Engine.caracteristicas(piece, a); // calculadas uma vez por consulta
        if (!Engine.modosPagamento(piece, a, car).length || !Engine.podeUsarNaRodada(piece, a, car)) return null;
        // não acumula: espera o efeito anterior ser gasto/expirar
        if (a.naoAcumula && Engine.efeitoAtivo(piece, a.id)) return null;
        const alvo = Engine.alvoDe(piece, a, car);
        const ex = t.extra;
        // extra: { tipo, alvoId } (Manter Pressão: mais um ataque contra o mesmo alvo) | { habilidade } (concederUso:
        // mais um uso dela).
        if (
            ex &&
            (ex.habilidade
                ? ex.habilidade === a.id && Engine.choices(state, piece, alvo).length
                : ex.tipo === a.tipo && Engine.choices(state, piece, alvo, [ex.alvoId]).length)
        )
            return 'extra';
        const free = Engine.isFree(piece, a, car);
        if (car.ultraRapida && !free) return null;
        // Usar outra habilidade (mesmo um uso extra, ex.: Pegar e Jogar → Shuriken) gasta a ação da jogada.
        let kind = free ? 'livre' : !Engine.usouOutraHabilidade(piece) ? 'acao' : null;
        // repeteCom (Disparo Arcano): já usada na rodada → pode repetir pagando o recurso, sem gastar a ação.
        if (
            !kind &&
            a.repeteCom &&
            (t.usos[a.id] || 0) > 0 &&
            Engine.recurso(piece, a.repeteCom.recurso) >= a.repeteCom.valor
        )
            kind = 'repeticao';
        return kind && Engine.choices(state, piece, alvo).length ? kind : null;
    },
    podeUsarNaRodada(piece, a, car = null) {
        const usos = (piece.turn && piece.turn.usos) || {};
        return (usos[a.id] || 0) === 0 || (car || Engine.caracteristicas(piece, a)).repetivel;
    },
    restrict(state, piece, a) {
        return Engine.slot(state, piece, a) === 'extra' && !piece.turn.extra.habilidade
            ? [piece.turn.extra.alvoId]
            : undefined;
    },
    canUse(state, piece, a) {
        if (!a || a.tipo === 'passiva' || a.tipo === 'reacao') return false;
        return !!Engine.slot(state, piece, a);
    },
    hasUsableAction(state, piece) {
        return Rules.podeColetar(state, piece) || Engine.abilitiesOf(piece).some((a) => Engine.canUse(state, piece, a));
    },
    // Registro para os efeitos visuais (state.fx). Só a partida em jogo tem a lista; as simulações dos Bots não
    // registram. Eventos: hab (uso: de, h, q/r do usuário, al = [id, q, r] dos alvos, z = zonas da área, p =
    // passiva/efeito), rol (de, para, ok), dano (de, para, v, abs, vida, h), mov (id, cam, f = forçado), renome (id,
    // v).
    fx(state, ev) {
        if (!state || !Array.isArray(state.fx)) return;
        ev.n = state.fxN = (state.fxN || 0) + 1;
        state.fx.push(ev);
        if (state.fx.length > 60) state.fx.splice(0, state.fx.length - 60);
    },
    fxHab(state, piece, a, choice, ids = null, passiva = false) {
        if (!state || !Array.isArray(state.fx) || !piece || !a) return;
        const alvo = Engine.alvoDe(piece, a) || {};
        const al = (ids || Engine.affected(state, piece, alvo, choice))
            .map((id) => Rules.pieceById(state, id))
            .filter(Boolean)
            .map((p) => [p.id, p.q, p.r]);
        let z = [];
        if (alvo.tipo === 'linha') z = Engine.linha(piece, choice, alvo.comprimento, true);
        else if (alvo.tipo === 'avanco') {
            const c = Engine.parseAvanco(choice);
            if (c) z = Engine.linha(piece, c.dir, c.passos, true);
        } else if (alvo.tipo === 'trajeto') {
            const c = Engine.parseTrajeto(choice);
            if (c) z = Engine.linha(piece, c.dir, c.passos, true);
        } else if (alvo.tipo === 'arco') z = Engine.arcoZonas(piece, choice, alvo);
        else if (alvo.tipo === 'ao-redor')
            z = Rules.neighbors(piece.q, piece.r).filter((h) => Rules.isHexOnBoard(h.q, h.r));
        else if (alvo.tipo === 'zona') {
            const h = Engine.parseZona(choice);
            if (h) z = Engine.areaZona(h, alvo);
        } // zona escolhida primeiro
        else if (alvo.tipo === 'salto') {
            const c = Engine.parseSalto(choice);
            if (c) z = [{ q: c.q, r: c.r }];
        }
        const ev = { k: 'hab', de: piece.id, h: a.id, q: piece.q, r: piece.r, al, z: z.map((h) => [h.q, h.r]) };
        if (passiva) ev.p = 1;
        Engine.fx(state, ev);
    },
    // pagamento: 'amago' | 'alternativo' (padrão: Âmago se der, senão o custo alternativo).
    use(state, piece, abilityId, choice = null, pagamento = null) {
        const a = Engine.def(abilityId);
        if (!a || !(piece.habilidades || []).includes(abilityId)) return false;
        if (!Rules.canSelect(state, piece) || !Engine.canUse(state, piece, a)) return false;
        const restrict = Engine.restrict(state, piece, a);
        if (!Engine.choices(state, piece, Engine.alvoDe(piece, a), restrict).includes(choice)) return false;
        const slot = Engine.slot(state, piece, a);
        const modos = Engine.modosPagamento(piece, a);
        const modo = pagamento ? (modos.includes(pagamento) ? pagamento : null) : modos[0];
        if (!modo) return false;
        const custo = modo === 'alternativo' ? 0 : Engine.custo(piece, a);
        const recursoPago = modo === 'alternativo' ? a.custoAlternativo : a.custoAdicional || null;
        const repete = slot === 'repeticao' ? a.repeteCom : null;

        Rules.beginActivation(state, piece);
        Engine.novoGrupoLog(state);
        Rules.spendAmago(piece, custo);
        if (recursoPago) piece.recursos[recursoPago.recurso] -= recursoPago.valor;
        if (repete) piece.recursos[repete.recurso] -= repete.valor;
        piece.turn.custoPago = { ...(piece.turn.custoPago || {}), [abilityId]: custo };
        piece.turn.pagamento = { ...(piece.turn.pagamento || {}), [abilityId]: modo };

        // livreSeUltra: se esta habilidade passar a contar como Ultra Rápida (Graciosa), a ação é devolvida.
        piece.turn.ultimoUso = { abilityId, livreSeUltra: slot === 'acao' && !Engine.usouOutraHabilidade(piece) };
        piece.turn.usos[abilityId] = (piece.turn.usos[abilityId] || 0) + 1;
        if (slot === 'extra') piece.turn.extra = null;
        else if (slot !== 'livre' && slot !== 'repeticao') piece.turn.actionUsed = true;

        const gastos = [
            custo ? `-${custo} Âmago` : '',
            recursoPago ? `-${Engine.textoRecurso(recursoPago.recurso, recursoPago.valor)}` : '',
            repete ? `-${Engine.textoRecurso(repete.recurso, repete.valor)}` : '',
        ]
            .filter(Boolean)
            .join(', ');
        Engine.log(
            state,
            `${Engine.label(piece)} usa ${a.nome}${slot === 'extra' ? ' [uso extra]' : slot === 'repeticao' ? ' [repetição]' : ''}${gastos ? ` (${gastos})` : ''}`,
        );
        Engine.gastarDescontos(state, piece, a);
        Engine.fxHab(state, piece, a, choice);
        // antes dos efeitos (ex.: Aura Revitalizante)
        Engine.emit(state, 'ativouHabilidade', { peca: piece, habilidade: a, custo });

        if (a.tipo === 'ataque' || a.jogadaDeAtaque)
            Engine.realizarAtaque(
                state,
                piece,
                a,
                choice,
                Engine.affected(state, piece, Engine.alvoDe(piece, a), choice),
            );
        else Engine.aplicarComReacoes(state, piece, a, choice);
        Engine.resolveQueue(state);
        return true;
    },
};
