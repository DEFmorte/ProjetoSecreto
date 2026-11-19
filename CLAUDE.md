# Teste Z / PlayZinordia

Jogo de tabuleiro hexagonal no navegador (canvas + HTML/Tailwind), com modo contra Bots e online P2P (PeerJS).
Textos, nomes e comentários do código em português.

## Comandos

- `npm run dev` — Vite em http://localhost:8080 (recarrega sozinho). `npm run dev:rede` expõe na rede local (celular).
- `npm run build` — gera `dist/PlayZinordia_<versão>.html`, arquivo único e offline (tudo embutido). `npm run preview` serve `dist/`
  (abra `/PlayZinordia_<versão>.html`).
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
- **Depuração:** `window.Game` (em `main.js`) expõe estado e ações no console: `Game.state`, `Game.executar(acao)`,
  `Game.IA.decidir(Game.state)`, `Game.undo()`...

## Mapa de `src/js`

| Pasta | O que tem |
|---|---|
| `main.js` | entrada: chama os `iniciarX()`, liga botões e atalhos de teclado, `window.Game` |
| `nucleo/` | `$` (getElementById) e `Falha` (tela de erro inesperado; carrega primeiro, não importa nada) |
| `motor/` | `CONFIG` (mapas, modos, regras gerais), `Rules`, `Engine` — regras puras, sem tela |
| `estrelas/` | um arquivo por Estrela: ficha, habilidades e retrato (`definirEstrela`, `RETRATOS`) |
| `bot/` | `IA` (decisão pura, `ia.js`), `Bot` (joga na partida, `bot.js`), `BotWorker` e o Worker |
| `partida/` | estado (`state`, `undoStack`, `teams`), ações/desfazer, salvamento, loop, sorteio da ordem |
| `online/` | `Rede` (PeerJS) e menus online |
| `interface/` | estado da UI (`ui`), ícones, resumos, glossário, seleção de peça/alvo |
| `hud/` | barras, registro, cartões e painéis da partida |
| `render/` | canvas, tela/redimensionamento, hexágonos, desenho, VFX, cena (game loop) |
| `entrada/` | mouse/toque e arrastar o mapa |
| `menus/` | menu principal, escolha de equipe, pausa, ajuda, tutorial |

## Como verificar uma mudança

1. `npm run dev`, jogar uma partida contra o Bot e olhar o console (o `Falha` mostra erros na tela).
2. Antes de distribuir: `npm run build` e testar com `npm run preview` (ou abrir o arquivo de `dist/` direto).
