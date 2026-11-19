// ── Rules: criação das Estrelas da partida ──
// Parte do Rules (regras básicas). Os métodos são juntados em regras.js; use sempre Rules.nome(...).
import { CONFIG } from '../config.js';
import { Rules } from '../regras.js';

export default {
    makeStats(color) {
        const { habilidades, ...base } = CONFIG.estrelas[color];
        return { ...base, vidaMax: base.vida, amagoMax: base.amago, armaduraMax: base.armadura };
    },
    // equipes: { jogador: [cores] } (ou duas listas: createPieces(j1, j2)). Posições iniciais vêm do mapa ativo.
    createPieces(equipes, p2Colors) {
        const pieces = [];
        let id = 1;
        const teams = Array.isArray(equipes) ? { 1: equipes, 2: p2Colors || [] } : equipes;
        for (const player of Object.keys(teams)
            .map(Number)
            .sort((a, b) => a - b)) {
            (teams[player] || []).forEach((color, i) => {
                const spawn = Rules.spawn(player, i);
                pieces.push({
                    id: id++,
                    player,
                    color,
                    q: spawn.q,
                    r: spawn.r,
                    stats: Rules.makeStats(color),
                    habilidades: [...(CONFIG.estrelas[color].habilidades || [])],
                    ...(CONFIG.estrelas[color].recursos ? { recursos: { ...CONFIG.estrelas[color].recursos } } : {}),
                    ...(CONFIG.estrelas[color].objetos
                        ? { objetos: Object.fromEntries(CONFIG.estrelas[color].objetos.map((o) => [o, null])) }
                        : {}),
                    effects: [],
                    renome: 0,
                    turn: null,
                });
            });
        }
        return pieces;
    },
};
