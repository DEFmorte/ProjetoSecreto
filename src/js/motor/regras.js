// ── Rules (regras básicas) ──
// Tabuleiro, Estrelas da partida, turnos, vida e Renome. Cada assunto fica num arquivo de motor/regras/; aqui as
// partes são juntadas num objeto só (Rules.x funciona igual).
import tabuleiro from './regras/tabuleiro.js';
import atributos from './regras/atributos.js';
import movimento from './regras/movimento.js';
import estrelas from './regras/estrelas.js';
import rodadas from './regras/rodadas.js';
import vida from './regras/vida.js';
import renome from './regras/renome.js';

export const Rules = {
    ...tabuleiro, // tabuleiro, mapas, zonas e distâncias
    ...atributos, // atributos, marcas e registro de dano no turno
    ...movimento, // movimento (zonas alcançáveis, caminho)
    ...estrelas, // criação das Estrelas da partida
    ...rodadas, // rodadas, turnos e ativação
    ...vida, // vida, Âmago, Armadura e derrota
    ...renome, // Renome (marcadores, coleta e vitória)
};
