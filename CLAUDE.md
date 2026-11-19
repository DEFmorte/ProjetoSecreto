# Teste Z / PlayZinordia

Jogo de tabuleiro hexagonal no navegador (canvas + HTML/Tailwind), com modo contra Bots e online P2P (PeerJS).
Textos, nomes e comentários do código em português.

## Comandos

- `npm run dev` — Vite em http://localhost:8080 (recarrega sozinho). `npm run dev:rede` expõe na rede local (celular).
- `npm run build` — gera `dist/PlayZinordia_<versão>.html`, arquivo único e offline (tudo embutido). `npm run preview` serve `dist/`
  (abra `/PlayZinordia_<versão>.html`).
- `npm test` — testes automáticos (Vitest, pasta `testes/`); `npm run test:observar` roda de novo a cada mudança.
- `npm run simular -- --partidas 50 --nivel dificil` — partidas Bot contra Bot sem tela: vitórias por Estrela,
  tempo da IA, ações inválidas, partidas travadas e habilidades que a IA nunca usa. `--semente N` repete as mesmas
  partidas (a semente de uma partida com problema aparece no resultado).
- `npm run lint` (ESLint) e `npm run formatar` (Prettier). `npm run checar` = lint + formatação + testes.
- A versão fica em `package.json` (`version`) e dá nome ao arquivo do build.

## Arquitetura

- **Módulos ES.** Cada arquivo importa o que usa (`import { CONFIG } from '../motor/config.js'`). A entrada é
  `src/js/main.js` (o `index.html` carrega só ele).
- **Módulos só declaram; quem executa é o `main.js`.** Código que precisa rodar na abertura (listeners, primeiro
  desenho) fica numa função `export function iniciarX()` do módulo, chamada pelo `main.js` na ordem certa. Evite
  código solto no topo de um módulo que use outro módulo: com importações circulares ele pode rodar antes do outro
  estar pronto (erro "Cannot access 'X' before initialization").
- **Imports são só leitura.** Variável compartilhada que outros módulos precisam trocar tem um `definirX(valor)` ao
  lado (ex.: `definirState(novo)` em `partida/estado.js`).
- **Lógica pura x tela.** `js/motor/`, `js/estrelas/` e `js/bot/ia.js` não usam nada da tela (DOM, `state` global,
  `Rede`, `Bot`...): recebem o estado por parâmetro. Eles rodam também no Worker do Bot (`js/bot/worker.js`) e
  servem para testes. Ponto de entrada da lógica pura: `js/motor/index.js` (já registra as Estrelas).
- **Estrelas:** um arquivo por Estrela em `js/estrelas/`, chamando `definirEstrela({...})` (formato em
  `js/estrelas/estrelas.js`). Estrela nova: crie o arquivo e adicione o import em `js/estrelas/index.js`.
- **Assets** (`src/assets/`): importe no JS (`import retrato from '../../assets/retratos/x.webp'`) ou use
  `url(../assets/...)` no CSS. No build viram data: URIs.
- **Tailwind 3** via PostCSS (`tailwind.config.cjs`): as classes precisam aparecer literalmente no HTML/JS (nada de
  `'p-' + n`). Estilos próprios vão em `src/css/estilo.css`.
- **Segurança (CSP) e versão do online:** preenchidas por `ferramentas/vite-jogo.js` (dev aberto, build estrito; o online
  só fala com `0.peerjs.com` e só junta jogadores com a mesma impressão digital do código).
- **Objetos grandes divididos por assunto:** `Engine`, `Rules`, `VFX` e `Rede` são montados a partir de uma pasta com o
  mesmo nome (ex.: `motor/engine/*.js`, cada arquivo `export default { métodos }`), juntados com `...` no arquivo de
  mesmo nome. Use sempre `Engine.x(...)` (nunca importe a parte direto). Método novo: coloque no arquivo do assunto.
  Não use getters (`get x()`) nessas partes: o `...` copiaria o valor, não o getter.
- **Estilo:** Prettier (120 colunas, 4 espaços, aspas simples) e ESLint — rode `npm run formatar` antes de commitar
  (ou ative "formatar ao salvar" no VS Code; `.vscode/` já tem a configuração). Textos longos do jogo (descrições)
  ficam numa linha só: use a quebra automática de linha do editor.
- **Partida pura (`motor/partida.js`):** `Partida.criar({ modo, equipes })`, `Partida.aplicar(s, acao)` e
  `Partida.finalizarJogada(s)` — a página, a IA, os testes e o simulador usam o mesmo código. `Partida.semente(n)`
  deixa os sorteios repetíveis (todo sorteio do motor passa por `Engine.rng`; não use `Math.random` no motor).
- **Testes** (`testes/`): `jogo/estrelas` (configuração das Estrelas), `jogo/habilidades` (cada habilidade de cada
  Estrela usada em todos os alvos, conferindo o estado depois), `jogo/partida`, `bot/ia` (partidas inteiras). As
  regras que valem depois de qualquer ação estão em `testes/ajuda.js` (`conferirEstado`). Estrela ou habilidade
  nova entra nos testes sozinha.
- **Depuração:** `window.Game` (em `main.js`) expõe estado e ações no console: `Game.state`, `Game.executar(acao)`,
  `Game.IA.decidir(Game.state)`, `Game.undo()`...

## Mapa de `src/js`

| Pasta           | O que tem                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `main.js`       | entrada: chama os `iniciarX()`, liga botões e atalhos de teclado, `window.Game`                       |
| `nucleo/`       | `$` (getElementById) e `Falha` (tela de erro inesperado; carrega primeiro, não importa nada)          |
| `motor/`        | `CONFIG` (mapas, modos, regras gerais); `index.js` = entrada da lógica pura                           |
| `motor/regras/` | `Rules`: tabuleiro, atributos, movimento, criação das Estrelas, rodadas, vida, Renome                 |
| `motor/engine/` | `Engine`: habilidades (características, custos, alvos, uso), ataques, reações, efeitos, dano, eventos |
| `estrelas/`     | um arquivo por Estrela: ficha, habilidades e retrato (`definirEstrela`, `RETRATOS`)                   |
| `bot/`          | `IA` (decisão pura, `ia.js`), `Bot` (joga na partida, `bot.js`), `BotWorker` e o Worker               |
| `partida/`      | estado (`state`, `undoStack`, `teams`), ações/desfazer, salvamento, loop, sorteio da ordem            |
| `online/`       | `Rede` (`rede.js` + `rede/`: conexão, envio, recebimento, segurança...), menus e códigos de sala      |
| `interface/`    | estado da UI (`ui`), ícones, resumos, glossário, seleção de peça/alvo                                 |
| `hud/`          | `hud.js` (refreshHUD) + turno, habilidades, avisos, registro, cartões                                 |
| `render/`       | canvas, tela, hexágonos, desenho, cena (game loop); `VFX` (`vfx.js` + `vfx/`, estilos por habilidade) |
| `entrada/`      | mouse/toque e arrastar o mapa                                                                         |
| `menus/`        | menu principal, escolha de equipe, pausa, ajuda, tutorial                                             |

## Como verificar uma mudança

1. `npm run checar` (lint + formatação + testes). Mudou a IA ou o balanceamento? Rode também `npm run simular`.
2. `npm run dev`, jogar uma partida contra o Bot e olhar o console (o `Falha` mostra erros na tela).
3. Antes de distribuir: `npm run build` e testar com `npm run preview` (ou abrir o arquivo de `dist/` direto).
