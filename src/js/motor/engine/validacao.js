// ── Engine: validação da configuração ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { CONFIG } from '../config.js';
import { Rules } from '../regras.js';
import { Engine } from '../engine.js';

export default {
    // Avisos no console para erros de configuração (tipos, stats e características desconhecidos).
    validarConfig() {
        const avisos = [];
        const statOk = (k) => !!Rules.categoriaStat(k) || !!CONFIG.stats[k];
        const chaves = new Set([
            'id',
            'nome',
            'tipo',
            'descricao',
            'resumo',
            'visual',
            'alvo',
            'efeitos',
            'gatilho',
            'naoAcumula',
            'concede',
            'efeitoReacao',
            'bonus',
            'reducao',
            'imutavel',
            'oculta',
            'reduzDano',
            'ultraContraMarca',
            'custoAlternativo',
            'custoAdicional',
            'imune',
            'jogadaDeAtaque',
            'repeteCom',
            'consomeRecurso',
            ...Object.keys(CONFIG.habilidades.secundarias).filter((k) => k !== 'alcance' && k !== 'duracao'),
        ]);
        for (const [id, a] of Object.entries(CONFIG.abilities)) {
            if (!CONFIG.habilidades.primarias[a.tipo] && !(a.tipo === 'efeito' && a.oculta))
                avisos.push(`${id}: tipo desconhecido '${a.tipo}'`);
            for (const k of Object.keys(a))
                if (!chaves.has(k)) avisos.push(`${id}: característica desconhecida '${k}'`);
            for (const ef of a.efeitos || []) {
                if (!Engine.EFFECTS[ef.tipo]) avisos.push(`${id}: efeito desconhecido '${ef.tipo}'`);
                const stats = [ef.stat, ef.valor && ef.valor.stat].filter(Boolean);
                for (const k of stats.flatMap((x) => Rules.expandStats(x)))
                    if (!statOk(k)) avisos.push(`${id}: status desconhecido '${k}'`);
                if (
                    ef.tipo === 'modificador' &&
                    Rules.expandStats(ef.stat).some((k) => Rules.categoriaStat(k) === 'primarios')
                )
                    avisos.push(`${id}: 'modificador' é para status secundários; use 'alterarStatus' para primários`);
                if (ef.tipo === 'modificarHabilidade' && !CONFIG.habilidades.secundarias[ef.caracteristica])
                    avisos.push(`${id}: característica '${ef.caracteristica}' não existe`);
            }
        }
        for (const [cor, h] of Object.entries(CONFIG.estrelas)) {
            for (const k of [...CONFIG.stats.primarios, ...CONFIG.stats.secundarios])
                if (typeof h[k] !== 'number') avisos.push(`Estrela ${h.nome || cor}: status '${k}' ausente`);
            for (const id of h.habilidades || [])
                if (!CONFIG.abilities[id]) avisos.push(`Estrela ${h.nome || cor}: habilidade '${id}' não existe`);
            for (const r of Object.keys(h.recursos || {}))
                if (!CONFIG.recursos[r]) avisos.push(`Estrela ${h.nome || cor}: recurso '${r}' não existe`);
            for (const o of h.objetos || [])
                if (!CONFIG.objetos[o]) avisos.push(`Estrela ${h.nome || cor}: objeto '${o}' não existe`);
        }
        const mapaAtivo = Rules.mapa;
        for (const [id, m] of Object.entries(CONFIG.mapas)) {
            Rules.usarMapa(id);
            const ocupado = new Set();
            for (const [j, lista] of Object.entries(m.spawns || {})) {
                if (lista.length < CONFIG.teamSize)
                    avisos.push(`Mapa ${id}: jogador ${j} tem só ${lista.length} posições iniciais`);
                for (const z of lista) {
                    if (!Rules.isHexOnBoard(z.q, z.r))
                        avisos.push(`Mapa ${id}: posição inicial (${z.q}, ${z.r}) fora do tabuleiro`);
                    if (ocupado.has(`${z.q},${z.r}`))
                        avisos.push(`Mapa ${id}: posição inicial (${z.q}, ${z.r}) repetida`);
                    ocupado.add(`${z.q},${z.r}`);
                }
            }
            for (const z of m.renome || [])
                if (!Rules.isHexOnBoard(z.q, z.r)) avisos.push(`Mapa ${id}: Renome (${z.q}, ${z.r}) fora do tabuleiro`);
        }
        for (const [id, md] of Object.entries(CONFIG.modos)) {
            if (!CONFIG.mapas[md.mapa]) avisos.push(`Modo ${id}: mapa '${md.mapa}' não existe`);
            else
                for (const j of md.jogadores) {
                    if (!CONFIG.players[j]) avisos.push(`Modo ${id}: jogador ${j} sem tema em CONFIG.players`);
                    if (!(CONFIG.mapas[md.mapa].spawns || {})[j])
                        avisos.push(`Modo ${id}: mapa sem posições do jogador ${j}`);
                }
        }
        Rules.mapa = null;
        Rules.usarMapa(mapaAtivo ? Object.keys(CONFIG.mapas).find((k) => CONFIG.mapas[k] === mapaAtivo) : 'classico');
        avisos.forEach((m) => console.warn('[CONFIG]', m));
        return avisos;
    },
};
