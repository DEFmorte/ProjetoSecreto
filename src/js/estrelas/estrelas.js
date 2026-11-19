// ── Estrelas (personagens) ──
// Cada Estrela tem um arquivo nesta pasta, que chama definirEstrela({...}) com:
//   cor          identificador da Estrela (também a cor dela no tabuleiro); não pode repetir
//   retrato      imagem importada de assets/retratos/ (opcional; sem retrato, a Estrela aparece só com a cor)
//   ficha        nome, atributos (vida, amago, armadura, agilidade, fisico, magico), `habilidades` (os ids das 4
//                habilidades, na ordem em que aparecem) e, se tiver, `recursos` e `objetos`
//   habilidades  definição de cada habilidade (as 4 da ficha e sub-habilidades usadas por elas), pelo id.
//                Os campos (tipo, custo, alvo, efeitos, gatilho...) são interpretados pelo motor (js/motor/engine/;
//                os tipos de efeito estão em engine/efeitos.js). Dois campos são só da tela:
//                  resumo  texto de 1 linha para cartões e botões ({F}/{M} = Poder Físico/Mágico atual; {F+2}...)
//                  visual  efeito visual: e = entrega (projetil, feixe, corpo, giro, onda, pilares, leque,
//                          investida, salto, volta, apoio, proprio, direto, nada), f = forma, c = cor, i = impacto
//                          (corte, pesado, cristal, energia, explosao, brilho), x = extra. Sem ele, há um padrão.
// Estrela nova: crie o arquivo nesta pasta e adicione o import em index.js. Os testes (npm test) passam a testar a
// Estrela sozinhos; Engine.validarConfig() avisa no console se algo da ficha não existir.
import { CONFIG } from '../motor/config.js';

// Retrato de cada Estrela, pelo nome (usado pela interface).
export const RETRATOS = {};

export function definirEstrela({ cor, retrato = null, ficha, habilidades = {} }) {
    if (CONFIG.estrelas[cor])
        throw new Error(`Estrela repetida: ${cor} (${ficha.nome} e ${CONFIG.estrelas[cor].nome})`);
    CONFIG.estrelas[cor] = ficha;
    for (const [id, def] of Object.entries(habilidades)) {
        if (CONFIG.abilities[id]) throw new Error(`Habilidade repetida: ${id} (${ficha.nome})`);
        def.id = id;
        CONFIG.abilities[id] = def;
    }
    if (retrato) RETRATOS[ficha.nome] = retrato;
}
