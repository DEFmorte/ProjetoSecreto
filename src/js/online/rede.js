// ── Online (P2P via WebRTC com PeerJS) ──
// O anfitrião (Jogador 1) é a autoridade: guarda o estado, aplica as ações dos dois jogadores e envia o estado ao
// convidado (Jogador 2), que só desenha. Mensagens: convidado → {ola, equipe, acao, revanche, tchau}; anfitrião →
// {selecao, inicio, estado, aviso, tchau}.
// Cada assunto fica num arquivo de online/rede/; aqui as partes são juntadas num objeto só (Rede.x funciona igual).
import { Bot } from '../bot/bot.js';
import { IA } from '../bot/ia.js';
import { Rules } from '../motor/regras.js';
import estado from './rede/estado.js';
import status from './rede/status.js';
import conexao from './rede/conexao.js';
import envio from './rede/envio.js';
import seguranca from './rede/seguranca.js';
import recebimento from './rede/recebimento.js';
import fimDePartida from './rede/fim-de-partida.js';

export const Rede = {
    ...estado, // estado da sala e dos jogadores
    ...status, // textos de situação e lista da sala na tela
    ...conexao, // conexão PeerJS (criar sala, entrar, reconectar)
    ...envio, // envio de mensagens, vagas e saída da sala
    ...seguranca, // segurança: quem pode agir e validação do que chega pela rede
    ...recebimento, // mensagens recebidas
    ...fimDePartida, // fim de partida: votação de revanche e nova partida
};

// Executado uma vez na inicialização do jogo (main.js), na ordem certa em relação aos outros módulos.
export function iniciarRede() {
    // Online, cada jogador só seleciona/age com as próprias Estrelas (o anfitrião libera as duas ao aplicar ações).
    // Contra o Bot, o mesmo vale para as Estrelas do Bot.
    const base = Rules.canSelect;
    Rules.canSelect = function (state, piece) {
        return (
            base.call(this, state, piece) &&
            (!Rede.ativo() || Rede.aplicando || piece.player === Rede.eu) &&
            (Bot.aplicando || IA.aplicando || !Bot.ehBot(piece.player, state))
        ); // contra Bots: as Estrelas deles só agem pelo Bot
    };
}
