# Teste Z / PlayZinordia

Jogo de tabuleiro hexagonal no navegador (canvas + HTML/Tailwind), com modo contra Bots e online P2P (PeerJS).
Textos, nomes e comentários do código em português.

## Comandos

- `npm run dev` — servidor em http://localhost:8080 servindo `src/`, recarrega sozinho (CSS troca sem recarregar).
  `npm run dev:rede` também expõe na rede local (testar no celular).
- `npm run checar` — todo arquivo listado existe, todo `.js` está listado e sem erro de sintaxe. Rode após mexer em arquivos.
- `npm run build` — gera `dist/PlayZinordia_<versão>.html`, arquivo único e offline (tudo embutido). `npm run preview` serve ele.
- `npm run css` — regenera `src/css/tailwind.css` (o `dev` e o `build` já fazem isso).
- A versão fica em `package.json` (`version`) e dá nome ao arquivo do build.

## Arquitetura (importante)

- **Scripts clássicos, não módulos ES.** Todos os `src/js/**/*.js` são `<script src>` comuns e dividem o mesmo
  escopo global (um `const` de um arquivo é visível nos outros). Não use `import`/`export`.
- **A ordem dos `<script>` em `src/index.html` é a ordem de carga** e é a fonte da verdade para o build.
  Arquivo novo → adicione a tag no lugar certo. Código que *roda na carga* (fora de funções) só pode usar o que foi
  declarado em arquivos anteriores; dentro de funções chamadas depois, tanto faz.
- `js/motor/` (config, regras, engine) e `js/bot/bot.js` também rodam dentro do Worker do Bot (`js/bot/worker.js`):
  **não podem mexer em DOM/janela na carga**. O Worker tem stubs de `state`, `Rede`, `Tutorial`, `$` e `botsDoModo`.
  Se o Bot precisar de outro arquivo, adicione-o no `importScripts` do `worker.js` (uma linha só, mesma ordem do index.html).
- Assets ficam em `src/assets/`. No JS o caminho é relativo à página (`'assets/retratos/x.webp'`); no CSS, ao
  arquivo `.css` (`url(../assets/fontes/x.woff2)`). O build troca esses caminhos por data: URIs.
- Classes do Tailwind (v3) precisam aparecer literalmente no HTML/JS (nada de `'p-' + n`), senão não são geradas.
- `src/css/tailwind.css` é gerado — não edite à mão. Estilos próprios vão em `src/css/estilo.css`.
- Política de segurança (CSP): em `src/index.html` permite `'self'`; o build volta para a versão estrita do
  arquivo único. O online só fala com `0.peerjs.com`.
- O modo online só junta jogadores com a mesma impressão digital do código (`<meta name="versao-jogo">`, calculada
  por `ferramentas/projeto.mjs`).
- `window.Game` (em `js/main.js`) expõe estado e ações para depuração no console.

## Mapa de `src/js`

| Pasta | O que tem |
|---|---|
| `nucleo/` | `$` (getElementById) e `Falha` (tela de erro inesperado) |
| `dados/` | `RETRATOS` das Estrelas |
| `motor/` | `CONFIG` (Estrelas, habilidades, mapas, modos), `Rules`, `Engine` — regras puras, sem tela |
| `partida/` | estado global (`state`, `undoStack`, `teams`), ações/desfazer, salvamento, loop, sorteio da ordem |
| `bot/` | IA (`Bot`), gerenciador do Worker (`BotWorker`) e o próprio Worker |
| `online/` | `Rede` (PeerJS) e menus online |
| `interface/` | estado da UI (`ui`), ícones, resumos, glossário, seleção de peça/alvo |
| `hud/` | barras, registro, cartões e painéis da partida |
| `render/` | canvas, tela/redimensionamento, hexágonos, desenho, VFX, cena (game loop) |
| `entrada/` | mouse/toque e arrastar o mapa |
| `menus/` | menu principal, escolha de equipe, pausa, ajuda, tutorial |
| `main.js` | liga os botões, atalhos de teclado e inicializa — sempre o último |
| `vendor/` | PeerJS 1.5.4 (minificado, não editar) |

## Como verificar uma mudança

1. `npm run checar`
2. Abrir `npm run dev`, jogar uma partida contra o Bot e olhar o console (o `Falha` mostra erros na tela).
3. Antes de distribuir: `npm run build` e testar `npm run preview` (ou abrir o arquivo de `dist/` direto).
