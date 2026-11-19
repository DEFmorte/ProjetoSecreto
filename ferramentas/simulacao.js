// Partidas inteiras de Bot contra Bot sem tela (a IA decide por todos os jogadores). Usado pelo simulador
// (ferramentas/simular.js) e pelos testes (testes/bot/).
import { CONFIG, Rules, Partida } from '../src/js/motor/index.js';
import { IA } from '../src/js/bot/ia.js';

const nomeDe = (cor) => CONFIG.estrelas[cor].nome;
const corDe = (nome) => Object.keys(CONFIG.estrelas).find((c) => CONFIG.estrelas[c].nome === nome);

// Equipes sorteadas (sem repetir Estrela). `fixas`: nomes que vão sempre na equipe do jogador 1.
export function partidaAleatoria({ modo = 'duelo', semente = 1, fixas = [] } = {}) {
    Partida.semente(semente);
    const def = CONFIG.modos[modo];
    const cores = fixas.map((n) => {
        const c = corDe(n);
        if (!c) throw new Error(`Estrela desconhecida: ${n}`);
        return c;
    });
    const resto = Partida.sortearOrdem(Object.keys(CONFIG.estrelas).filter((c) => !cores.includes(c)));
    const equipes = {};
    for (const j of def.jogadores) {
        equipes[j] = j === def.jogadores[0] ? [...cores] : [];
        while (equipes[j].length < CONFIG.teamSize) equipes[j].push(resto.shift());
    }
    Partida.semente(null);
    return { modo, equipes };
}

// Ação de emergência quando a IA não tem o que fazer (o mesmo que o Bot faz na partida para não travar).
function acaoMinima(s) {
    const pd = s.pending;
    if (pd) {
        if (pd.tipo === 'reacao') return { tipo: 'reacao', usar: false };
        if (pd.tipo === 'escolha') return { tipo: 'escolha', targetId: pd.opcoes[0] };
        return { tipo: 'rolagem', hit: false };
    }
    const p = Rules.activePiece(s) || Rules.pieceById(s, Rules.pendingIds(s)[0]);
    return p ? { tipo: 'encerrar', pieceId: p.id } : null;
}

// Joga uma partida inteira. Retorna estatísticas; `erro` (exceção) ou `travou` (motivo) quando algo deu errado.
// aoAgir(s, acao): opcional, chamado depois de cada ação aplicada (testes conferem invariantes ali).
export function simularPartida({
    modo = 'duelo',
    equipes,
    nivel = 'normal',
    semente = 1,
    maxAcoes = 2000,
    aoAgir = null,
}) {
    const r = {
        semente,
        equipes: Object.fromEntries(Object.entries(equipes).map(([j, cs]) => [j, cs.map(nomeDe)])),
        vencedor: null,
        rodadas: 0,
        acoes: 0,
        invalidas: 0,
        decisoes: 0,
        msDecidindo: 0,
        msMaisLenta: 0,
        usadas: {}, // id da habilidade -> vezes
        erro: null,
        travou: null,
    };
    const rolagem = CONFIG.rules.attackRoll.mode;
    CONFIG.rules.attackRoll.mode = 'auto'; // como nas partidas contra o Bot: dados rolam sozinhos
    Partida.semente(semente);
    let s = null;
    try {
        s = Partida.criar({ modo, equipes, botNivel: nivel });
        let ativacao = null,
            passos = 0,
            falhas = 0;
        while (!s.winner) {
            if (r.acoes >= maxAcoes) {
                r.travou = `passou de ${maxAcoes} ações (rodada ${s.round})`;
                break;
            }
            if (IA.decisor(s) == null) {
                r.travou = `ninguém pode decidir (rodada ${s.round})`;
                break;
            }
            if (s.activeId !== ativacao) {
                ativacao = s.activeId;
                passos = 0;
            }
            const t = performance.now();
            let acao = IA.decidir(s, { nivel, passos });
            const ms = performance.now() - t;
            r.decisoes++;
            r.msDecidindo += ms;
            r.msMaisLenta = Math.max(r.msMaisLenta, ms);
            if (!acao || !Partida.aplicar(s, acao)) {
                r.invalidas++;
                acao = acaoMinima(s);
                if (!acao || !Partida.aplicar(s, acao)) {
                    if (++falhas > 3) {
                        r.travou = `nenhuma ação válida (rodada ${s.round})`;
                        break;
                    }
                    continue;
                }
            }
            falhas = 0;
            passos++;
            r.acoes++;
            if (acao.tipo === 'habilidade') r.usadas[acao.abilityId] = (r.usadas[acao.abilityId] || 0) + 1;
            if (aoAgir) aoAgir(s, acao);
        }
        r.vencedor = s.winner;
        r.rodadas = s.round;
    } catch (e) {
        r.erro = (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e)).replace(/\s+/g, ' ');
        if (s) r.rodadas = s.round;
    } finally {
        CONFIG.rules.attackRoll.mode = rolagem;
        Partida.semente(null);
    }
    return r;
}
