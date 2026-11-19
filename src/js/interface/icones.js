// ── Ícones (PNG em assets/icones/) ──
// Chave → imagem. Usados no tabuleiro (canvas) e nos textos (<i class="ic ic-chave">). Sem imagem, volta ao símbolo
// antigo (★ / ◆).
import { CONFIG } from '../motor/config.js';
import iconeRenome from '../../assets/icones/renome.png';
import iconePrecursora from '../../assets/icones/precursora.png';
import iconeGraciosa from '../../assets/icones/graciosa.png';

export const ICONES = {
    renome: iconeRenome,
    precursora: iconePrecursora,
    graciosa: iconeGraciosa,
};
export const IMG_ICONES = Object.fromEntries(
    Object.entries(ICONES).map(([k, src]) => {
        const img = new Image();
        img.src = src;
        return [k, img];
    }),
);
export const iconePronto = (id) => !!(id && IMG_ICONES[id] && IMG_ICONES[id].complete && IMG_ICONES[id].naturalWidth);
// HTML do ícone (reserva: símbolo de texto).
export const iconeHTML = (id, reserva = '◆') =>
    ICONES[id] ? `<i class="ic ic-${id}" aria-hidden="true"></i>` : reserva;
export const icRenome = () => iconeHTML(CONFIG.renome.icone, '★');

export const COR = Object.fromEntries(CONFIG.statFields.map((f) => [f.key, f.cor]));
export const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// Executado uma vez na inicialização do jogo (main.js), na ordem certa em relação aos outros módulos.
export function iniciarIcones() {
    document.head.insertAdjacentHTML(
        'beforeend',
        `<style>.ic{display:inline-block;width:1.2em;height:1.2em;vertical-align:-.25em;background:center/contain no-repeat}${Object.entries(
            ICONES,
        )
            .map(([k, src]) => `.ic-${k}{background-image:url(${src})}`)
            .join('')}</style>`,
    );
}
