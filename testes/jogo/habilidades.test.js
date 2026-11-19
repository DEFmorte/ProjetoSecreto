// Cada habilidade de cada Estrela, usada de verdade em todos os alvos possíveis.
// Montagem: a Estrela testada no centro do tabuleiro, 2 inimigas e 1 aliada ao lado, as outras a 2 zonas; todas
// com 1 de Vida a menos (para curas e danos aparecerem). Os ataques sempre acertam e as reações oferecidas são
// usadas. Depois de cada uso, o estado tem que continuar válido (ver testes/ajuda.js).
// Habilidade que não dá para usar nesta montagem aparece como "skipped" no resultado.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CONFIG, Engine, Partida, Rules } from '../../src/js/motor/index.js';
import { IA } from '../../src/js/bot/ia.js';
import { conferirEstado } from '../ajuda.js';

const cores = Object.keys(CONFIG.estrelas);
let rolagem;
beforeAll(() => {
    rolagem = CONFIG.rules.attackRoll.mode;
    CONFIG.rules.attackRoll.mode = 'manual'; // a rolagem fica pendente e o teste decide: acerto
});
afterAll(() => {
    CONFIG.rules.attackRoll.mode = rolagem;
    Partida.semente(null);
});

// Estado com `cor` (jogador 1) no centro, cercada. Recursos (Cargas, Penitências...) pela metade do máximo.
// objetosNoTabuleiro: os objetos da Estrela (ex.: shuriken) já lançados, a 2 zonas dela em linha reta.
function montar(cor, { objetosNoTabuleiro = false } = {}) {
    const outras = cores.filter((c) => c !== cor);
    const i = cores.indexOf(cor);
    const pegar = (k) => outras[(i * 5 + k) % outras.length];
    Partida.semente(1);
    const s = Partida.criar({
        modo: 'duelo',
        equipes: { 1: [cor, pegar(0), pegar(1)], 2: [pegar(2), pegar(3), pegar(4)] },
        ordem: [1, 2],
    });
    const [eu, aliada, aliadaLonge] = s.pieces.filter((p) => p.player === 1);
    const [inimiga1, inimiga2, inimigaLonge] = s.pieces.filter((p) => p.player === 2);
    const pos = [
        [eu, 0, 0],
        [inimiga1, 1, 0],
        [inimiga2, 1, -1],
        [aliada, -1, 0],
        [aliadaLonge, -2, 0],
        [inimigaLonge, 2, -1],
    ];
    for (const [p, q, r] of pos) {
        p.q = q;
        p.r = r;
        if (p.stats.vidaMax > 1) p.stats.vida = p.stats.vidaMax - 1;
        for (const rec of Object.keys(p.recursos || {}))
            p.recursos[rec] = Math.ceil((CONFIG.recursos[rec].max || 2) / 2);
    }
    if (objetosNoTabuleiro) for (const id of Object.keys(eu.objetos || {})) eu.objetos[id] = { q: 2, r: 0 };
    return { s, eu };
}

// Responde às decisões pendentes (acerto nas rolagens, usa reações, 1ª opção nas escolhas).
function resolverPendentes(s) {
    for (let i = 0; i < 30 && s.pending && !s.winner; i++) {
        const pd = s.pending;
        const acao =
            pd.tipo === 'rolagem'
                ? { tipo: 'rolagem', hit: true }
                : pd.tipo === 'reacao'
                  ? { tipo: 'reacao', usar: true }
                  : { tipo: 'escolha', targetId: pd.opcoes[0] };
        if (!Partida.aplicar(s, acao)) {
            // não deu (ex.: reação sem Âmago): recusa / deixa a IA decidir
            const alt = pd.tipo === 'reacao' ? { tipo: 'reacao', usar: false } : IA.decidir(s);
            expect(Partida.aplicar(s, alt), `decisão pendente ${pd.tipo}`).toBe(true);
        }
        conferirEstado(s);
    }
    expect(s.pending && !s.winner ? s.pending.tipo : null, 'decisão pendente sem fim').toBeNull();
}

const casos = cores.flatMap((cor) =>
    CONFIG.estrelas[cor].habilidades
        .map((id) => CONFIG.abilities[id])
        .filter((a) => a.tipo === 'ataque' || a.tipo === 'instantanea')
        .map((a) => [CONFIG.estrelas[cor].nome, a.nome, cor, a.id]),
);

describe.each(cores.map((c) => [CONFIG.estrelas[c].nome, c]))('%s', (nome, cor) => {
    it.for(casos.filter((c) => c[2] === cor).map((c) => [c[1], c[3]]))('%s', ([, id], ctx) => {
        let s, eu, usos;
        for (const opcoes of [{}, { objetosNoTabuleiro: true }]) {
            ({ s, eu } = montar(cor, opcoes));
            resolverPendentes(s); // passivas de início de turno podem pedir uma decisão antes
            expect(Rules.canSelect(s, eu), 'a Estrela testada pode agir').toBe(true);
            usos = IA.acoes(s, eu).filter((a) => a.tipo === 'habilidade' && a.abilityId === id);
            if (usos.length) break;
        }
        if (!usos.length) ctx.skip(); // não dá para usar nesta montagem (ex.: precisa de uma marca no alvo)
        for (const uso of usos) {
            const c = JSON.parse(JSON.stringify(s));
            Partida.semente(2);
            expect(Partida.aplicar(c, uso), `${id} com escolha ${JSON.stringify(uso.choice)}`).toBe(true);
            conferirEstado(c);
            resolverPendentes(c);
        }
    });
});

describe('cobertura', () => {
    it('toda Estrela tem ao menos uma habilidade de ataque ou instantânea', () => {
        for (const cor of cores)
            expect(
                casos.some((c) => c[2] === cor),
                CONFIG.estrelas[cor].nome,
            ).toBe(true);
    });

    it('as Estrelas da montagem começam válidas', () => {
        for (const cor of cores) conferirEstado(montar(cor).s);
        expect(Engine.validarConfig()).toEqual([]);
    });
});
