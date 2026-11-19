// ── Estrelas (personagens) ──
// Cada Estrela tem um arquivo nesta pasta, que chama definirEstrela({...}) com:
//   cor          identificador da Estrela (também a cor dela no tabuleiro); não pode repetir
//   retrato      imagem em assets/retratos/ (opcional; sem retrato, a Estrela aparece só com a cor)
//   ficha        nome, atributos (vida, amago, armadura, agilidade, fisico, magico), `habilidades` (os ids das 4
//                habilidades, na ordem em que aparecem) e, se tiver, `recursos` e `objetos`
//   habilidades  definição de cada habilidade (as 4 da ficha e sub-habilidades usadas por elas), pelo id.
//                Os campos de uma habilidade (tipo, custo, alvo, efeitos, gatilho...) são interpretados por
//                js/motor/engine.js (Engine.EFFECTS lista os tipos de efeito).
// Estrela nova: crie o arquivo e adicione-o em src/index.html e em js/bot/worker.js (depois de estrelas.js).
// Engine.validarConfig() avisa no console se uma habilidade da ficha não existir.
import { CONFIG } from '../motor/config.js';


// Retrato de cada Estrela, pelo nome (usado pela interface).
export const RETRATOS = {};

export function definirEstrela({ cor, retrato = null, ficha, habilidades = {} }) {
    if (CONFIG.estrelas[cor]) throw new Error(`Estrela repetida: ${cor} (${ficha.nome} e ${CONFIG.estrelas[cor].nome})`);
    CONFIG.estrelas[cor] = ficha;
    for (const [id, def] of Object.entries(habilidades)) {
        if (CONFIG.abilities[id]) throw new Error(`Habilidade repetida: ${id} (${ficha.nome})`);
        def.id = id;
        CONFIG.abilities[id] = def;
    }
    if (retrato) RETRATOS[ficha.nome] = retrato;
}
