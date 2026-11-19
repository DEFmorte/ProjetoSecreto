// ── Resumos de 1 linha das habilidades (cartão da Estrela, seleção e caixa da habilidade) ──
// {F} / {M} = Poder Físico / Mágico atual da Estrela; {F+2}, {M-1}… aplicam o ajuste. O texto completo continua em
// `descricao`.
import { Rules } from '../motor/regras.js';
import { COR, esc } from './icones.js';

export const RESUMOS = {
    diamante_reflexo: 'Ao sofrer dano, causa 1 de dano a um adjacente à escolha.',
    diamante_punho: 'Ataca um inimigo adjacente: dano {F}.',
    diamante_soco_chao: 'Dano {M} em todos ao redor e −1 de Agilidade neles.',
    diamante_pisao: 'Dano {M} em 2 zonas em linha e −1 de Agilidade nos atingidos.',
    lorena_flecha: 'Ataca um inimigo no alcance: dano {F}.',
    lorena_preciso: 'Ataca no alcance: dano {F} ({F+2} se o alvo tiver menos de 6 de Vida).',
    lorena_cadeia: 'Depois de acertar um ataque, ataca de novo o mesmo alvo.',
    lorena_ignora_esquiva: 'O próximo ataque ignora a Esquiva do alvo.',
    alex_marca: 'Seus ataques marcam os inimigos feridos (as Marcas acumulam).',
    alex_adaga: 'Ataca um inimigo no alcance: dano {F}.',
    alex_mergulhar: 'Avança até 2 zonas em linha: dano {M} e Marca em quem estiver no caminho.',
    alex_avante: 'Avança até 3 zonas: 1 de dano, +1 por Marca de cada inimigo no caminho.',
    toppich_impulso: 'Andar 2 ou mais zonas em linha reta recupera +1 de Âmago.',
    toppich_martelada: 'Ataca uma Estrela adjacente: dano {F}.',
    toppich_projecao: 'Arremessa um inimigo adjacente para o lado oposto: 1 de dano.',
    toppich_trinvestida: 'Empurra um inimigo adjacente e ocupa o lugar dele; colisão causa 1 de dano.',
    rato_bananation: 'Ferir de novo quem ele feriu no turno anterior recupera +1 de Âmago.',
    rato_bananada: 'Ataca um inimigo no alcance: dano {M+1}.',
    rato_cacho: 'Ataca todos em 3 zonas em linha: dano {M}.',
    rato_bananeira: 'Na próxima vez que sofrer dano, causa {M-1} de dano a um adjacente.',
    garyn_defesa: 'Se não se mover na jogada, ganha +1 de Armadura.',
    garyn_machadada: 'Ataca ({F} de dano) o inimigo adjacente que tentar se afastar.',
    garyn_investida: 'Avança até 2 zonas: dano {F-1} em cada inimigo no caminho.',
    garyn_circular: 'Ataca todos os inimigos adjacentes: dano {F}.',
    amina_selo: 'Dá +1 de dano ao ataque de um aliado no alcance.',
    amina_luz: 'Ataca no alcance: dano {M-1} e −1 de Âmago no alvo.',
    amina_pulso: 'Aliados adjacentes recuperam +1 de Vida ao atacar.',
    amina_benevolencia: 'O próximo ataque do aliado escolhido que causar dano o cura em {M}.',
    vitoria_veu: 'Seus atributos secundários não podem ser alterados.',
    vitoria_cortina: 'Reduz em 1 o dano que um aliado adjacente sofrer.',
    vitoria_recompensa: 'Ataca no alcance: 1 de dano e −1 no dano do próximo ataque do alvo.',
    vitoria_presente: 'Cura {M} de Vida dela e de um aliado adjacente.',
    nairrun_reator: 'Dano mágico recebido −1; ao ser atingido assim, ganha +1 de Mágico.',
    nairrun_pancada: 'Ataca uma Estrela adjacente: dano {M}.',
    nairrun_projecao: 'Aliados adjacentes dividem com ele metade do dano que sofrerem.',
    nairrun_sobrecarga: 'Converte o Mágico em Armadura, ou a Armadura em Mágico.',
    siff_aura: 'Aliados adjacentes que usam habilidade com custo ganham +1 de Mágico.',
    siff_vento: 'Ataca no alcance: dano {M} e pode curar 1 de um aliado adjacente.',
    siff_correcao: 'No fim do turno, cura um aliado adjacente (diferença de Mágico).',
    siff_poder: 'Dá +1 de Mágico a um aliado no alcance neste turno.',
    shou_graciosa: 'Marca o inimigo mais próximo; o 1º dano de Shou nele é Ultra Rápido.',
    shou_confianca: 'Ataca um inimigo adjacente: dano {F}.',
    shou_comando: 'Passa a Marca de Graciosa para uma Estrela no alcance.',
    shou_garca: 'Ataca uma área de 2 zonas adjacentes: dano {F}.',
    icnoyotl_penas: 'Ganha 1 Pena ao curar (máx. 5); as Penas pagam suas habilidades.',
    icnoyotl_revigorar: 'Cura 1 de um aliado no alcance (com Pena: +1 no próximo ataque dele).',
    icnoyotl_vivacidade: 'Cura {M-1} de um aliado no alcance ({M+1} pagando com Pena).',
    icnoyotl_doacao: 'Ataca no alcance: dano {M-1} e −1 de Agilidade (−2 pagando com Pena).',
    cassandra_egide: 'Não pode ser empurrada nem puxada.',
    cassandra_punir: 'Ataca um inimigo adjacente: dano {F}; +1 de Âmago se acertar.',
    cassandra_compelir: 'Inimigo que chegar ao seu lado perde o movimento restante.',
    cassandra_tenente: '+1 de Armadura por inimigo adjacente (máx. +3).',
    ricardinho_shuriken: 'Arremessa a shuriken em linha: ataca quem estiver no caminho, dano {F}.',
    ricardinho_mortal: 'Salta sobre um inimigo adjacente e o ataca: dano {F-1}.',
    ricardinho_pegar: 'Na zona da shuriken: recupera e ganha mais um uso de Shuriken Grandona.',
    ricardinho_sasuke: 'Puxa a shuriken em linha reta: dano {F} no caminho e em quem estiver sobre ela.',
    billy_pe: 'Ao sofrer dano de uma Jogada de Ataque, pode se mover 1 zona.',
    billy_coceira: 'Ataca 2 inimigos diferentes no alcance: dano {F-1}.',
    billy_fumace: 'Fumaça numa zona e arredores: o alcance das habilidades de quem estiver lá vira 1.',
    billy_sentenca: 'Ataca uma Estrela no alcance: dano {F}; ignora Armadura menor que o dano.',
    tico_chegada: 'Fim da jogada: escolhe 1 aliado; ao lado de Tico, ele sofre no máx. 2 de dano por vez.',
    tico_folga: 'Aliado no alcance: a próxima habilidade dele custa 1 Âmago a menos.',
    tico_desse: 'Reação: um aliado no alcance rola de novo o ataque errado ou a esquiva falha.',
    tico_pulguento: 'Pula para o lado de um inimigo no alcance e ataca: dano {F}.',
    aurora_nucleo: 'Fim do turno: ganha Cargas do Núcleo igual ao Poder Mágico (máx. 6).',
    aurora_disparo: 'Ataca um inimigo no alcance: dano 1. Repete pagando +1 Carga, sem gastar a ação.',
    aurora_absorver: 'Ultra Rápida: troca Cargas do Núcleo por Âmago (1 por 1).',
    aurora_descarga: 'Linha de 2 zonas: dano 1 em todos. Zerou uma Armadura: vira Ultra Rápida.',
    angela_penitente: 'Ganha Penitência ao sofrer dano (máx. 3). Ao acertar: +1 de dano por marcador gasto.',
    angela_retribuicao: 'Reação: inimigo adjacente errou o ataque nela → contra-ataca: dano {F}.',
    angela_expiacao: 'Ataca um inimigo adjacente: dano {F}.',
    angela_consagracao: 'Sofre 1 de dano: +1 nas rolagens de ataque por 2 turnos.',
};
export function resumoHab(piece, a) {
    const t = a && RESUMOS[a.id];
    if (!t) return '';
    return esc(t).replace(/\{([FM])([+-]\d+)?\}/g, (_, k, d) => {
        const key = k === 'F' ? 'fisico' : 'magico';
        const v = Math.max(0, (piece ? Rules.stat(piece, key) : 0) + (d ? Number(d) : 0));
        return `<b style="color:${COR[key]}">${v}</b>`;
    });
}
