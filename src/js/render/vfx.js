// ── Efeitos visuais (VFX) ──
// O motor registra o que aconteceu em state.fx (usos de habilidade, rolagens, dano, movimentos, coleta de Renome).
// Cada lote novo vira uma sequência com tempo — lançamento → trajeto → impacto — e os números e barras esperam o
// impacto. Coordenadas "de mundo" em raios de zona (x = 1,5q; y = √3(q/2 + r)): acompanham o arrasto e o tamanho da
// tela. Estilo de cada habilidade: campo `visual` dela (js/estrelas/).
// Cada assunto fica num arquivo de render/vfx/; aqui as partes são juntadas num objeto só (VFX.x funciona igual).

import estado from './vfx/estado.js';
import utilidades from './vfx/utilidades.js';
import agenda from './vfx/agenda.js';
import planejamento from './vfx/planejamento.js';
import golpes from './vfx/golpes.js';
import animacoes from './vfx/animacoes.js';
import desenho from './vfx/desenho.js';
import formas from './vfx/formas.js';

export const VFX = {
    ...estado, // estado e controle (níveis, liga/desliga, reiniciar)
    ...utilidades, // utilidades (cores, curvas, posições)
    ...agenda, // agendamento de partículas, tremores e textos
    ...planejamento, // eventos da partida viram sequências de efeitos
    ...golpes, // disparos, apoios e impactos
    ...animacoes, // movimento, mudanças, derrota e festa
    ...desenho, // desenho dos efeitos na tela
    ...formas, // formas de desenho por tipo de efeito (VFX.D)
};

// Executado uma vez na inicialização do jogo (main.js), na ordem certa em relação aos outros módulos.
export function iniciarVfx() {
    VFX.iniciar();
}
