// ── Engine (motor de regras) ──
// Cada assunto fica num arquivo de motor/engine/; aqui as partes são juntadas num objeto só (Engine.x funciona igual).
import nucleo from './engine/nucleo.js';
import caracteristicas from './engine/caracteristicas.js';
import validacao from './engine/validacao.js';
import custos from './engine/custos.js';
import alvos from './engine/alvos.js';
import uso from './engine/uso.js';
import ataques from './engine/ataques.js';
import reacoes from './engine/reacoes.js';
import efeitos from './engine/efeitos.js';
import dano from './engine/dano.js';
import movimento from './engine/movimento.js';
import eventos from './engine/eventos.js';

export const Engine = {
    ...nucleo, // básico (sorteio, definições, registro da partida)
    ...caracteristicas, // características das habilidades (alcance, área, custo, duração)
    ...validacao, // validação da configuração
    ...custos, // custos, recursos e pagamento
    ...alvos, // alvos, áreas e escolhas
    ...uso, // uso de habilidades
    ...ataques, // Jogadas de Ataque e dados
    ...reacoes, // gatilhos e reações
    ...efeitos, // efeitos das habilidades (EFFECTS)
    ...dano, // dano, marcas e abates
    ...movimento, // movimento e bloqueio
    ...eventos, // eventos, passivas e fila de turno
};
