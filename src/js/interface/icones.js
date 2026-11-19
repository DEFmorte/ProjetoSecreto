// ── Ícones (PNG em assets/icones/) ──
// Chave → imagem. Usados no tabuleiro (canvas) e nos textos (<i class="ic ic-chave">). Sem imagem, volta ao símbolo antigo (★ / ◆).
const ICONES = {
    renome: 'assets/icones/renome.png',
    precursora: 'assets/icones/precursora.png',
    graciosa: 'assets/icones/graciosa.png'
};
document.head.insertAdjacentHTML('beforeend', `<style>.ic{display:inline-block;width:1.2em;height:1.2em;vertical-align:-.25em;background:center/contain no-repeat}${
    Object.entries(ICONES).map(([k, src]) => `.ic-${k}{background-image:url(${src})}`).join('')}</style>`);
const IMG_ICONES = Object.fromEntries(Object.entries(ICONES).map(([k, src]) => { const img = new Image(); img.src = src; return [k, img]; }));
const iconePronto = id => !!(id && IMG_ICONES[id] && IMG_ICONES[id].complete && IMG_ICONES[id].naturalWidth);
// HTML do ícone (reserva: símbolo de texto).
const iconeHTML = (id, reserva = '◆') => ICONES[id] ? `<i class="ic ic-${id}" aria-hidden="true"></i>` : reserva;
const icRenome = () => iconeHTML(CONFIG.renome.icone, '★');

const COR = Object.fromEntries(CONFIG.statFields.map(f => [f.key, f.cor]));
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
