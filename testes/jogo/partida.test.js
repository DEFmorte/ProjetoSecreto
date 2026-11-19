// Partida (lógica pura): criação, ações válidas/inválidas e sorteios repetíveis.
import { afterEach, describe, expect, it } from 'vitest';
import { CONFIG, Partida, Rules } from '../../src/js/motor/index.js';
import { partidaAleatoria } from '../../ferramentas/simulacao.js';

afterEach(() => Partida.semente(null));

describe('Partida.criar', () => {
    it.each(Object.keys(CONFIG.modos))('modo %s: cria as Estrelas de cada jogador', (modo) => {
        const { equipes } = partidaAleatoria({ modo, semente: 1 });
        const s = Partida.criar({ modo, equipes });
        const def = CONFIG.modos[modo];
        expect(s.winner).toBeNull();
        expect(s.round).toBe(1);
        expect([...s.ordem].sort()).toEqual([...def.jogadores].sort());
        for (const j of def.jogadores) {
            const minhas = s.pieces.filter((p) => p.player === j);
            expect(minhas.map((p) => p.color)).toEqual(equipes[j]);
            for (const p of minhas) expect(Rules.isHexOnBoard(p.q, p.r)).toBe(true);
        }
    });

    it('erro claro para modo desconhecido', () => {
        expect(() => Partida.criar({ modo: 'nao-existe', equipes: {} })).toThrow(/Modo de jogo desconhecido/);
    });
});

describe('Partida.aplicar', () => {
    const nova = () => Partida.criar(partidaAleatoria({ semente: 5 }));

    it('ação inválida devolve false e não muda o estado', () => {
        const s = nova();
        const antes = JSON.stringify(s);
        expect(Partida.aplicar(s, { tipo: 'mover', pieceId: 9999, path: [] })).toBe(false);
        expect(Partida.aplicar(s, { tipo: 'nada' })).toBe(false);
        expect(Partida.aplicar(s, null)).toBe(false);
        expect(JSON.stringify(s)).toBe(antes);
    });

    it('encerrar a jogada de uma Estrela da vez é aceito', () => {
        const s = nova();
        const p = Rules.pieceById(s, Rules.pendingIds(s)[0]);
        expect(Partida.aplicar(s, { tipo: 'encerrar', pieceId: p.id })).toBe(true);
        expect(Rules.pieceById(s, p.id).turn.done).toBe(true);
    });
});

describe('Partida.semente', () => {
    it('a mesma semente sorteia a mesma ordem', () => {
        const ordem = () => {
            Partida.semente(42);
            return Array.from({ length: 5 }, () => Partida.sortearOrdem([1, 2, 3, 4]).join(''));
        };
        expect(ordem()).toEqual(ordem());
    });
});
