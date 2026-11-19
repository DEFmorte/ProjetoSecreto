// Estrelas e configuração: tudo o que os arquivos de src/js/estrelas/ e motor/config.js definem está coerente.
import { describe, expect, it } from 'vitest';
import { CONFIG, Engine } from '../../src/js/motor/index.js';
import { RETRATOS } from '../../src/js/estrelas/index.js';

const estrelas = Object.entries(CONFIG.estrelas);
const ATRIBUTOS = ['vida', 'amago', 'armadura', 'agilidade', 'fisico', 'magico'];

describe('configuração', () => {
    it('não tem avisos de Engine.validarConfig()', () => {
        expect(Engine.validarConfig()).toEqual([]);
    });

    it('tem as 18 Estrelas', () => {
        expect(estrelas).toHaveLength(18);
    });
});

describe.each(estrelas.map(([cor, e]) => [e.nome, cor, e]))('%s', (nome, cor, e) => {
    it('tem cor válida e nome', () => {
        expect(cor).toMatch(/^#[0-9a-f]{6}$/i);
        expect(nome).toBeTruthy();
    });

    it('tem todos os atributos como números', () => {
        for (const k of ATRIBUTOS) expect(e[k], k).toEqual(expect.any(Number));
        expect(e.vida).toBeGreaterThan(0);
    });

    it('tem 4 habilidades, todas definidas, com nome, tipo e descrição', () => {
        expect(e.habilidades).toHaveLength(4);
        for (const id of e.habilidades) {
            const a = CONFIG.abilities[id];
            expect(a, `habilidade ${id}`).toBeDefined();
            expect(a.nome).toBeTruthy();
            expect(['passiva', 'ataque', 'instantanea', 'reacao']).toContain(a.tipo);
            expect(a.descricao).toBeTruthy();
        }
    });

    it('toda habilidade da ficha tem resumo de 1 linha (cartões e botões)', () => {
        for (const id of e.habilidades) expect(CONFIG.abilities[id].resumo, id).toEqual(expect.any(String));
    });

    it('tem retrato', () => {
        expect(RETRATOS[nome]).toBeTruthy();
    });
});

describe('habilidades', () => {
    it('ids únicos e iguais à chave', () => {
        for (const [id, a] of Object.entries(CONFIG.abilities)) expect(a.id).toBe(id);
    });

    it('toda habilidade pertence a alguma Estrela (pelo prefixo do id)', () => {
        const prefixos = new Set(estrelas.flatMap(([, e]) => e.habilidades.map((h) => h.split('_')[0])));
        for (const id of Object.keys(CONFIG.abilities)) expect(prefixos.has(id.split('_')[0]), id).toBe(true);
    });
});
