// IA do Bot: decide sem alterar o estado, só sugere ações válidas e joga partidas inteiras até o fim.
// Para análises maiores (centenas de partidas, vitórias por Estrela): npm run simular.
import { describe, expect, it } from 'vitest';
import { CONFIG, Partida } from '../../src/js/motor/index.js';
import { IA } from '../../src/js/bot/ia.js';
import { partidaAleatoria, simularPartida } from '../../ferramentas/simulacao.js';
import { conferirEstado } from '../ajuda.js';

const cores = Object.keys(CONFIG.estrelas);

describe('IA.decidir', () => {
    it('não altera o estado recebido e devolve uma ação aceita pela partida', () => {
        const s = Partida.criar(partidaAleatoria({ semente: 11 }));
        for (let i = 0; i < 30 && !s.winner; i++) {
            const antes = JSON.stringify(s);
            const acao = IA.decidir(s, { nivel: 'normal' });
            expect(JSON.stringify(s)).toBe(antes);
            expect(acao).toBeTruthy();
            expect(Partida.aplicar(s, acao), JSON.stringify(acao)).toBe(true);
        }
    });
});

describe('partidas Bot contra Bot', () => {
    // 3 partidas que juntas usam as 18 Estrelas (6 por partida: 3 de cada lado).
    const grupos = [0, 1, 2].map((g) => cores.slice(g * 6, g * 6 + 6));
    it.each(grupos.map((g, i) => [i + 1, g]))('partida %i (cobre 6 Estrelas) termina sem erro', (_, g) => {
        const r = simularPartida({
            equipes: { 1: g.slice(0, 3), 2: g.slice(3) },
            semente: 1000 + g.length,
            aoAgir: conferirEstado,
        });
        expect(r.erro).toBeNull();
        expect(r.travou).toBeNull();
        expect(r.invalidas).toBe(0);
        expect([1, 2]).toContain(r.vencedor);
    });

    it.each([7, 8, 9])('partida sorteada (semente %i) termina sem erro', (semente) => {
        const r = simularPartida({ ...partidaAleatoria({ semente }), semente, aoAgir: conferirEstado });
        expect(r.erro).toBeNull();
        expect(r.travou).toBeNull();
        expect(r.invalidas).toBe(0);
    });

    it('a mesma semente repete a mesma partida', () => {
        const config = partidaAleatoria({ semente: 3 });
        const a = simularPartida({ ...config, semente: 3 });
        const b = simularPartida({ ...config, semente: 3 });
        expect([b.vencedor, b.rodadas, b.acoes]).toEqual([a.vencedor, a.rodadas, a.acoes]);
    });
});
