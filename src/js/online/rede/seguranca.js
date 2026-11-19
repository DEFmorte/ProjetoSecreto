// ── Rede: segurança: quem pode agir e validação do que chega pela rede ──
// Parte do Rede (modo online). Os métodos são juntados em rede.js; use sempre Rede.nome(...).
import { CONFIG } from '../../motor/config.js';
import { Rules } from '../../motor/regras.js';
import { state } from '../../partida/estado.js';

export default {
    // Quem pode fazer a ação: dono da decisão pendente (escolha/reação), atacante na rolagem, senão o dono da Estrela.
    podeAgir(acao, jogador) {
        if (!state || state.winner || !acao) return false;
        const pd = state.pending;
        const dono = (id) => {
            const p = Rules.pieceById(state, id);
            return p ? p.player : null;
        };
        if (acao.tipo === 'escolha' || acao.tipo === 'reacao')
            return !!pd && pd.tipo === acao.tipo && dono(pd.donoId) === jogador;
        if (acao.tipo === 'rolagem') return !!pd && pd.tipo === 'rolagem' && dono(pd.pieceId) === jogador;
        return !pd && dono(acao.pieceId) === jogador;
    },
    // ── Segurança: nada que chega pela rede vira código ──
    // Convidado: o estado vem do anfitrião, que pode ter um jogo adulterado. Textos perdem os caracteres que formam
    // HTML (< > " `), nomes e habilidades das Estrelas são refeitos a partir do CONFIG local e números são conferidos.
    estadoSeguro(json) {
        if (typeof json !== 'string' || json.length > 2e6) return null;
        let s;
        try {
            s = JSON.parse(json);
        } catch (e) {
            return null;
        }
        const proibidas = new Set(['__proto__', 'constructor', 'prototype']);
        const limpar = (v, prof) => {
            if (prof > 30) return null;
            if (typeof v === 'string') return v.replace(/[<>"`]/g, '');
            if (Array.isArray(v)) return v.map((x) => limpar(x, prof + 1));
            if (v && typeof v === 'object') {
                const o = {};
                for (const [k, x] of Object.entries(v))
                    if (!proibidas.has(k)) o[k.replace(/[<>"`]/g, '')] = limpar(x, prof + 1);
                return o;
            }
            return typeof v === 'number' ? (Number.isFinite(v) ? v : 0) : v; // números, booleanos e null
        };
        s = limpar(s, 0);
        if (!s || typeof s !== 'object' || Array.isArray(s) || !Array.isArray(s.pieces)) return null;
        const tem = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
        const num = (v) => (typeof v === 'number' ? v : 0);
        s.pieces = s.pieces.filter(
            (p) =>
                p && typeof p === 'object' && tem(CONFIG.estrelas, p.color) && p.stats && typeof p.stats === 'object',
        );
        for (const p of s.pieces) {
            ['id', 'player', 'q', 'r', 'renome'].forEach((k) => {
                p[k] = num(p[k]);
            });
            for (const k of Object.keys(p.stats)) if (k !== 'nome') p.stats[k] = num(p.stats[k]);
            p.stats.nome = CONFIG.estrelas[p.color].nome;
            p.habilidades = (
                Array.isArray(p.habilidades) ? p.habilidades : CONFIG.estrelas[p.color].habilidades || []
            ).filter((id) => tem(CONFIG.abilities, id));
            if (!Array.isArray(p.effects)) p.effects = [];
            // Objetos (shuriken): só os da Estrela, com posição numérica ou null (com ela).
            const objs = CONFIG.estrelas[p.color].objetos;
            if (objs)
                p.objetos = Object.fromEntries(
                    objs.map((o) => {
                        const v = p.objetos && p.objetos[o];
                        return [o, v && typeof v === 'object' ? { q: num(v.q), r: num(v.r) } : null];
                    }),
                );
            else delete p.objetos;
        }
        if (!Array.isArray(s.log)) s.log = [];
        s.log = s.log.map((l) => String(l ?? ''));
        // Efeitos visuais: só eventos conhecidos, números e habilidades do CONFIG local.
        const par = (x) => (Array.isArray(x) ? x.slice(0, 3).map(num) : null);
        s.fx = (Array.isArray(s.fx) ? s.fx.slice(-60) : [])
            .filter((e) => e && typeof e === 'object' && ['hab', 'rol', 'dano', 'mov', 'renome'].includes(e.k))
            .map((e) => {
                const o = { k: e.k };
                for (const k of ['n', 'de', 'para', 'id', 'q', 'r', 'v', 'abs', 'vida', 'ok', 'f', 'p'])
                    if (k in e) o[k] = e[k] === null || !Number.isFinite(Number(e[k])) ? null : num(e[k]);
                for (const k of ['al', 'cam', 'z'])
                    if (Array.isArray(e[k])) o[k] = e[k].slice(0, 40).map(par).filter(Boolean);
                if (tem(CONFIG.abilities, e.h)) o.h = e.h;
                return o;
            });
        s.fxN = num(s.fxN);
        if (
            'ordem' in s &&
            !(Array.isArray(s.ordem) && s.ordem.every((j) => typeof j === 'number' && tem(CONFIG.players, String(j))))
        )
            delete s.ordem;
        return s;
    },
    // Anfitrião: ação do convidado refeita só com campos conhecidos e tipos esperados (o motor ainda valida as regras).
    normalizarAcao(a) {
        if (!a || typeof a !== 'object') return null;
        const inteiro = (v) => Number.isInteger(v) && Math.abs(v) < 1e6;
        const tipos = ['mover', 'habilidade', 'escolha', 'rolagem', 'reacao', 'coletar', 'encerrar'];
        if (!tipos.includes(a.tipo)) return null;
        const out = { tipo: a.tipo };
        if (a.pieceId !== undefined) {
            if (!inteiro(a.pieceId)) return null;
            out.pieceId = a.pieceId;
        }
        if (a.tipo === 'mover') {
            if (!Array.isArray(a.path) || a.path.length > 64 || !a.path.every((h) => h && inteiro(h.q) && inteiro(h.r)))
                return null;
            out.path = a.path.map((h) => ({ q: h.q, r: h.r }));
        }
        if (a.tipo === 'habilidade') {
            if (typeof a.abilityId !== 'string' || !Object.prototype.hasOwnProperty.call(CONFIG.abilities, a.abilityId))
                return null;
            out.abilityId = a.abilityId;
            const ch = a.choice;
            if (ch === undefined || ch === null) out.choice = null;
            // inteiro (Estrela/direção/opção) | avanço "dir:passos:q,r" | trajeto "dir:passos" | zona "q,r" | várias
            // Estrelas "id" / "id1,id2" | salto "id:q,r"
            else if (
                inteiro(ch) ||
                (typeof ch === 'string' &&
                    /^(-?\d{1,3}:-?\d{1,3}:-?\d{1,3},-?\d{1,3}|\d{1,2}:\d{1,2}|-?\d{1,3},-?\d{1,3}|\d{1,6}(,\d{1,6})?|\d{1,6}:-?\d{1,3},-?\d{1,3})$/.test(
                        ch,
                    ))
            )
                out.choice = ch;
            else return null;
            if (a.pagamento !== undefined && a.pagamento !== null) {
                if (a.pagamento !== 'amago' && a.pagamento !== 'alternativo') return null;
                out.pagamento = a.pagamento;
            }
        }
        // escolha: Estrela (inteiro), zona "q,r" (Dar no Pé) ou null (não usar uma passiva opcional)
        if (a.tipo === 'escolha') {
            if (
                a.targetId !== null &&
                !inteiro(a.targetId) &&
                !(typeof a.targetId === 'string' && /^-?\d{1,3},-?\d{1,3}$/.test(a.targetId))
            )
                return null;
            out.targetId = a.targetId;
        }
        if (a.tipo === 'rolagem') out.hit = a.hit === true;
        if (a.tipo === 'reacao') out.usar = a.usar === true;
        return out;
    },
};
