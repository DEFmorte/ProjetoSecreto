// ── Engine: características das habilidades (alcance, área, custo, duração) ──
// Parte do Engine (motor de regras). Os métodos são juntados em engine.js; use sempre Engine.nome(...).
import { CONFIG } from '../config.js';
import { Engine } from '../engine.js';

export default {
    // ── Características secundárias ──
    alcanceBase(alvo) {
        if (!alvo || !alvo.tipo || alvo.tipo === 'proprio' || alvo.semAlcance) return 0;
        return alvo.alcance ?? alvo.raio ?? alvo.comprimento ?? 1;
    },
    // Área: extensão afetada. Só aparece em habilidades que atingem mais de uma zona.
    areaBase(alvo) {
        if (!alvo) return null;
        const zonas = (n) => `${n} ${n === 1 ? 'zona' : 'zonas'}`;
        switch (alvo.tipo) {
            case 'ao-redor':
                return (alvo.raio ?? 1) === 1 ? 'arredores' : `raio de ${zonas(alvo.raio)}`;
            case 'linha':
                return `linha de ${zonas(alvo.comprimento)}`;
            case 'avanco':
                return 'percurso em linha reta';
            case 'trajeto':
                return alvo.destino
                    ? alvo.incluiDestino
                        ? 'caminho até o objeto, com a zona dele'
                        : 'caminho até o objeto'
                    : 'caminho em linha reta';
            case 'zona':
                return alvo.raioArea ? 'zona escolhida e arredores' : null;
            case 'varios':
                return `${alvo.quantidade ?? 2} alvos diferentes`;
            case 'arco':
                return `${zonas(alvo.zonas ?? 2)} adjacentes`;
            default:
                return null;
        }
    },
    duracaoBase(a) {
        if (a.alvo && a.alvo.modos) return null; // cada opção tem a própria duração (ver descrição)
        const ef = (a.efeitos || []).find((e) => e.duracao) || null;
        if (ef) return ef.duracao.ate === 'permanente' ? null : ef.duracao;
        const m = (a.efeitos || []).find((e) => e.tipo === 'marca' && CONFIG.marks[e.marca]);
        return m ? CONFIG.marks[m.marca].duracao || null : null;
    },
    // Filtro de efeitos que alteram habilidades: { habilidade: id | [ids], tipo: tipo primário | [tipos] }.
    filtroHabilidade(f, a) {
        if (!f) return true;
        const has = (v, x) => (Array.isArray(v) ? v.includes(x) : v === x);
        return (f.habilidade === undefined || has(f.habilidade, a.id)) && (f.tipo === undefined || has(f.tipo, a.tipo));
    },
    // Características da habilidade para a Estrela (base + efeitos 'modificarHabilidade' ativos na Estrela).
    caracteristicas(piece, a) {
        const c = {
            tipo: a.tipo,
            alcance: Engine.alcanceBase(a.alvo),
            custo: a.custo || 0,
            duracao: Engine.duracaoBase(a),
            repetivel: !!a.repetivel,
            ultraRapida: !!a.ultraRapida,
            area: Engine.areaBase(a.alvo),
        };
        const maximos = {}; // efeitos com `maximo` (ex.: Fumacê: alcance no máximo 1), aplicados depois dos bônus
        for (const e of (piece && piece.effects) || []) {
            if (!e.caracteristica || !Engine.filtroHabilidade(e.filtro, a)) continue;
            const def = CONFIG.habilidades.secundarias[e.caracteristica];
            if (!def) continue;
            if (e.maximo != null && def.tipo === 'numero')
                maximos[e.caracteristica] = Math.min(maximos[e.caracteristica] ?? Infinity, e.maximo);
            else if (def.tipo === 'booleano') c[e.caracteristica] = !!e.delta;
            else if (def.tipo === 'numero') c[e.caracteristica] += e.delta;
            else if (def.tipo === 'duracao' && c.duracao && c.duracao.turnos)
                c.duracao = { ...c.duracao, turnos: c.duracao.turnos + e.delta };
        }
        for (const [k, m] of Object.entries(maximos)) c[k] = Math.min(c[k], m);
        c.custo = Math.max(0, c.custo);
        if (Engine.alcanceBase(a.alvo) > 0) c.alcance = Math.max(1, c.alcance);
        return c;
    },
    custo(piece, a) {
        return Engine.caracteristicas(piece, a).custo;
    },
    // Alvo com o alcance efetivo aplicado (mesmo objeto quando não há alteração).
    alvoDe(piece, a, car = null) {
        const alvo = a.alvo || {};
        const base = Engine.alcanceBase(alvo);
        if (!base || !((piece && piece.effects) || []).some((e) => e.caracteristica === 'alcance')) return alvo;
        const ef = (car || Engine.caracteristicas(piece, a)).alcance;
        if (!base || ef === base) return alvo;
        const campo =
            alvo.alcance !== undefined
                ? 'alcance'
                : alvo.raio !== undefined
                  ? 'raio'
                  : alvo.comprimento !== undefined
                    ? 'comprimento'
                    : 'alcance';
        return { ...alvo, [campo]: ef };
    },
    descreverDuracao(d) {
        if (!d) return '';
        if (d.turnos) return `${d.turnos} turno(s)`;
        return (
            {
                'fim-turno': 'até o final do turno',
                'fim-proximo-turno': 'até o final do próximo turno',
                'inicio-proximo-turno': 'até o início do próximo turno',
                'ser-gasto': 'até ser gasto',
            }[d.ate] || ''
        );
    },
    // Texto curto: "Jogada de Ataque · Custo 2 · Alcance 3 · Repetível".
    descreverCaracteristicas(piece, a) {
        const c = Engine.caracteristicas(piece, a),
            L = CONFIG.habilidades;
        const parts = [(L.primarias[c.tipo] || {}).label || c.tipo];
        if (c.tipo !== 'passiva')
            parts.push(
                `${L.secundarias.custo.label} ${c.custo}` +
                    (a.custoAdicional
                        ? ` + ${Engine.textoRecurso(a.custoAdicional.recurso, a.custoAdicional.valor)}`
                        : '') +
                    (a.custoAlternativo
                        ? ` ou ${Engine.textoRecurso(a.custoAlternativo.recurso, a.custoAlternativo.valor)}`
                        : ''),
            );
        if (c.alcance) parts.push(`${L.secundarias.alcance.label} ${c.alcance}`);
        if (c.area) parts.push(`${L.secundarias.area.label}: ${c.area}`);
        if (c.duracao) parts.push(`${L.secundarias.duracao.label}: ${Engine.descreverDuracao(c.duracao)}`);
        if (c.repetivel) parts.push(L.secundarias.repetivel.label);
        if (c.ultraRapida) parts.push(L.secundarias.ultraRapida.label);
        return parts.join(' · ');
    },
};
