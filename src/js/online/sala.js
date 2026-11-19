// ── Códigos de sala ──
// Código da sala (o que o anfitrião passa ao convidado) e o token que identifica a vaga de cada convidado.
export const SALA_PREFIXO = 'testez-';
export const SALA_LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const SALA_TAMANHO = 6; // 32^6 ≈ 1 bilhão de códigos: inviável adivinhar uma sala
// Sorteio criptográfico (não previsível como Math.random). n caracteres de `letras`.
export function sortearTexto(n, letras = SALA_LETRAS) {
    const v = new Uint32Array(n);
    crypto.getRandomValues(v);
    return Array.from(v, (x) => letras[x % letras.length]).join('');
}

// Convidado: token guardado na aba para recuperar a mesma vaga ao reconectar/recarregar.
export function tokenDaSala(codigo) {
    const chave = 'testez_token_' + codigo;
    let t = null;
    try {
        t = sessionStorage.getItem(chave);
    } catch (e) {}
    if (!t) {
        t = sortearTexto(24, 'abcdefghijklmnopqrstuvwxyz0123456789');
        try {
            sessionStorage.setItem(chave, t);
        } catch (e) {}
    }
    return t;
}
