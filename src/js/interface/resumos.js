// ── Resumo de 1 linha das habilidades (cartão da Estrela, seleção e caixa da habilidade) ──
// O texto fica em `resumo`, na definição de cada habilidade (js/estrelas/). {F} / {M} = Poder Físico / Mágico atual
// da Estrela; {F+2}, {M-1}… aplicam o ajuste. O texto completo continua em `descricao`.
import { Rules } from '../motor/regras.js';
import { COR, esc } from './icones.js';

export function resumoHab(piece, a) {
    const t = a && a.resumo;
    if (!t) return '';
    return esc(t).replace(/\{([FM])([+-]\d+)?\}/g, (_, k, d) => {
        const key = k === 'F' ? 'fisico' : 'magico';
        const v = Math.max(0, (piece ? Rules.stat(piece, key) : 0) + (d ? Number(d) : 0));
        return `<b style="color:${COR[key]}">${v}</b>`;
    });
}
