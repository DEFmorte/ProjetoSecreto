// ── Estado da interface ──
// O que está selecionado, caminho traçado, habilidade em uso, painéis abertos... (não vai para o salvamento).
export const ui = {
    selectedId: null,
    hoverId: null, // Estrela sob o cursor (inspeção temporária)
    pinId: null, // Estrela fixada para inspeção (clique em Estrela que não pode ser selecionada)
    logAberto: true,
    path: [],
    reachable: [],
    mode: null,
    dragging: false,
    justSelected: false,
    lastClickTime: 0,
    lastClickHex: null,
    previewId: null, // habilidade sob o mouse (mostra alcance e alvos no tabuleiro)
    atalhos: [], // ids das habilidades nas teclas 1–9
    vis: null, // última foto de vida/âmago/armadura/posição (para números flutuantes e animação)
    logVisto: 0,
    floats: [], // números flutuantes { q, r, txt, cor, grande, t0 }
    anims: {}, // id → { q, r, t0, dur } (posição anterior da Estrela)
    abaAjuda: 'objetivo',
    vitoriaVista: null,
};
