// Funções comuns dos testes.
import { expect } from 'vitest';

// Regras que valem depois de qualquer ação da partida.
export function conferirEstado(s) {
    const zonas = new Set();
    for (const p of s.pieces) {
        const st = p.stats;
        expect(st.vida, `${st.nome}: vida`).toBeGreaterThan(0);
        expect(st.vida, `${st.nome}: vida acima do máximo`).toBeLessThanOrEqual(st.vidaMax);
        expect(st.amago, `${st.nome}: Âmago`).toBeGreaterThanOrEqual(0);
        expect(st.amago, `${st.nome}: Âmago acima do máximo`).toBeLessThanOrEqual(st.amagoMax);
        expect(st.armadura, `${st.nome}: Armadura`).toBeGreaterThanOrEqual(0);
        expect(p.renome, `${st.nome}: Renome`).toBeGreaterThanOrEqual(0);
        const z = `${p.q},${p.r}`;
        expect(zonas.has(z), `duas Estrelas na zona ${z}`).toBe(false);
        zonas.add(z);
    }
}
