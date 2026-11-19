// Simulador: partidas inteiras de Bot contra Bot, sem tela, para conferir se a IA e as regras funcionam.
//   npm run simular                                  (20 partidas, nível normal, modo duelo)
//   npm run simular -- --partidas 100 --nivel dificil --semente 7
//   npm run simular -- --estrelas Diamante,Lorena    (essas Estrelas sempre na equipe 1)
// Opções: --partidas N · --nivel normal|dificil · --modo <CONFIG.modos> · --semente N (repete exatamente as mesmas
// partidas) · --estrelas nomes · --max-acoes N · --detalhes (uma linha por partida)
// Mostra: vitórias por equipe e por Estrela, duração, tempo de decisão da IA, ações inválidas, partidas travadas e
// erros (com a semente para repetir a partida que falhou).
import { simularPartida, partidaAleatoria } from './simulacao.js';
import { CONFIG } from '../src/js/motor/index.js';

const args = process.argv.slice(2);
const opc = (nome, padrao) => {
    const i = args.indexOf('--' + nome);
    return i < 0 ? padrao : args[i + 1];
};
const partidas = Number(opc('partidas', 20));
const nivel = opc('nivel', 'normal');
const modo = opc('modo', 'duelo');
const semente0 = Number(opc('semente', Date.now() % 100000));
const maxAcoes = Number(opc('max-acoes', 2000));
const fixas = opc('estrelas', '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
const detalhes = args.includes('--detalhes');

if (!CONFIG.modos[modo]) {
    console.error(`Modo desconhecido: ${modo}. Modos: ${Object.keys(CONFIG.modos).join(', ')}`);
    process.exit(1);
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-');
const porEstrela = {}; // nome -> { jogos, vitorias }
const vitoriasJogador = {};
const resultados = [];
console.log(
    `\nSimulando ${partidas} partida(s) · modo ${modo} · nível ${nivel} · sementes ${semente0}..${semente0 + partidas - 1}\n`,
);

for (let i = 0; i < partidas; i++) {
    const semente = semente0 + i;
    const config = partidaAleatoria({ modo, semente, fixas });
    const r = simularPartida({ ...config, nivel, semente, maxAcoes });
    resultados.push(r);
    if (r.vencedor) vitoriasJogador[r.vencedor] = (vitoriasJogador[r.vencedor] || 0) + 1;
    for (const [j, nomes] of Object.entries(r.equipes)) {
        for (const n of nomes) {
            const e = (porEstrela[n] ||= { jogos: 0, vitorias: 0 });
            e.jogos++;
            if (String(r.vencedor) === j) e.vitorias++;
        }
    }
    if (detalhes || r.erro || r.travou) {
        const eq = Object.entries(r.equipes)
            .map(([j, ns]) => `J${j}: ${ns.join(', ')}`)
            .join(' x ');
        const fim = r.erro ? `ERRO: ${r.erro}` : r.travou ? `TRAVOU: ${r.travou}` : `venceu J${r.vencedor}`;
        console.log(`  #${semente}  ${eq}  →  ${fim}  (${r.rodadas} rodadas, ${r.acoes} ações)`);
    }
}

const ok = resultados.filter((r) => !r.erro && !r.travou);
const media = (f) => (ok.length ? (ok.reduce((t, r) => t + f(r), 0) / ok.length).toFixed(1) : '-');
const invalidas = resultados.reduce((t, r) => t + r.invalidas, 0);
const decisoes = resultados.reduce((t, r) => t + r.decisoes, 0);
const msTotal = resultados.reduce((t, r) => t + r.msDecidindo, 0);
const maisLenta = Math.max(0, ...resultados.map((r) => r.msMaisLenta));

console.log('\nResumo');
console.log(
    `  Partidas terminadas: ${ok.length}/${partidas}   travadas: ${resultados.filter((r) => r.travou).length}   com erro: ${resultados.filter((r) => r.erro).length}`,
);
console.log(
    `  Vitórias por jogador: ${
        Object.entries(vitoriasJogador)
            .map(([j, n]) => `J${j} ${n} (${pct(n, ok.length)})`)
            .join(' · ') || '-'
    }`,
);
console.log(`  Duração média: ${media((r) => r.rodadas)} rodadas, ${media((r) => r.acoes)} ações`);
console.log(
    `  IA: ${decisoes} decisões, ${(msTotal / Math.max(1, decisoes)).toFixed(1)} ms em média, a mais lenta ${maisLenta.toFixed(0)} ms`,
);
console.log(`  Ações inválidas sugeridas pela IA: ${invalidas}`);

console.log('\nVitórias por Estrela (quanto mais partidas, mais confiável)');
const linhas = Object.entries(porEstrela).sort((a, b) => b[1].vitorias / b[1].jogos - a[1].vitorias / a[1].jogos);
for (const [n, e] of linhas)
    console.log(`  ${n.padEnd(18)} ${pct(e.vitorias, e.jogos).padStart(4)}  (${e.vitorias}/${e.jogos})`);

// Habilidades ativas das Estrelas que jogaram e que a IA nunca usou (pode ser normal, ou um sinal de que a IA
// não entende a habilidade).
const usadas = new Set(resultados.flatMap((r) => Object.keys(r.usadas)));
const nuncaUsadas = Object.values(CONFIG.estrelas)
    .filter((e) => porEstrela[e.nome])
    .flatMap((e) => e.habilidades.map((id) => [e.nome, CONFIG.abilities[id]]))
    .filter(([, a]) => (a.tipo === 'ataque' || a.tipo === 'instantanea') && !usadas.has(a.id));
if (nuncaUsadas.length) {
    console.log('\nHabilidades que a IA nunca usou nestas partidas');
    for (const [n, a] of nuncaUsadas) console.log(`  ${n}: ${a.nome}`);
}

const falhas = resultados.filter((r) => r.erro || r.travou || r.invalidas);
if (falhas.length) {
    console.log(
        `\nPara repetir uma partida com problema: npm run simular -- --partidas 1 --semente <n> --nivel ${nivel} --modo ${modo}${fixas.length ? ` --estrelas ${fixas.join(',')}` : ''}`,
    );
    console.log(`Sementes com problema: ${falhas.map((r) => r.semente).join(', ')}`);
}
console.log('');
process.exit(resultados.some((r) => r.erro || r.travou) ? 1 : 0);
