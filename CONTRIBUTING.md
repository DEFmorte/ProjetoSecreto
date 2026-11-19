# Como contribuir

Guia para quem trabalha no Teste Z. Cada área tem sua pasta: dá para mexer na sua parte sem precisar entender o
resto. As regras de arquitetura (para quando for mexer fundo) estão no [CLAUDE.md](CLAUDE.md).

## Preparar o computador

1. Instale o [Node.js](https://nodejs.org) 22.15 ou mais novo e o [Git](https://git-scm.com).
2. Clone o repositório e instale as dependências:

   ```powershell
   git clone <endereço do repositório>
   cd <pasta>
   npm install
   ```

3. No VS Code, aceite as extensões recomendadas (Prettier, ESLint e Tailwind): o código se formata ao salvar.
4. `npm run dev` abre o jogo em http://localhost:8080 e atualiza sozinho a cada mudança.

## Fluxo de trabalho

1. Crie uma branch a partir da `main` com um nome que diga o que é: `estrela/nova-fulana`, `ia/melhora-reacoes`,
   `interface/menu-pausa`, `correcao/dano-escudo`.
2. Faça a mudança em commits pequenos, com mensagem em português dizendo o que mudou ("Diamante: Campo de Cristal
   custa 2"). Antes de cada envio:

   ```powershell
   npm run formatar
   npm run checar
   ```

   `checar` roda o ESLint (erros comuns), confere a formatação e roda os testes.

3. Envie a branch e abra um Pull Request. O GitHub roda as mesmas checagens sozinho (aba **Checks**) e gera o arquivo
   do jogo para quem for revisar poder jogar a versão do PR (na execução, em **Artifacts**). Os responsáveis pela
   área (arquivo `.github/CODEOWNERS`) são chamados para revisar.
4. Com a aprovação e as checagens verdes, o PR entra na `main`.

## Por área

### Personagens e balanceamento — `src/js/estrelas/`

Cada Estrela é um arquivo só, com tudo dela: atributos, as 4 habilidades (regras, texto completo, resumo de 1 linha
e efeito visual) e o retrato. O formato está explicado no topo de `estrelas.js`.

- **Mudar números** (vida, custo, alcance, dano): edite o arquivo da Estrela.
- **Estrela nova:** copie um arquivo parecido, troque `cor` (é o identificador, não pode repetir), ficha e habilidades
  (ids começando pelo nome da Estrela, ex.: `fulana_golpe`), coloque o retrato em `src/assets/retratos/` e adicione o
  `import` em `estrelas/index.js`. Os testes passam a testar a Estrela nova sozinhos.
- **Efeito que ainda não existe** (ex.: um tipo novo de dano): isso é regra do jogo, ver a próxima seção.
- **Conferir o balanceamento:** `npm run simular -- --partidas 100` mostra a porcentagem de vitórias de cada Estrela;
  `--estrelas Fulana` coloca a Estrela sempre na equipe 1.

### Regras do jogo — `src/js/motor/`

Lógica pura, sem nada de tela: dá para testar tudo sem abrir o jogo.

- `motor/regras/` (objeto `Rules`): tabuleiro, distâncias, movimento, turnos e rodadas, vida, Renome.
- `motor/engine/` (objeto `Engine`): como as habilidades funcionam — alvos, custos, ataques e dados, reações,
  efeitos (`efeitos.js`, `Engine.EFFECTS`: cada tipo de efeito que uma habilidade pode usar), dano e movimento.
- `motor/config.js`: mapas, modos de jogo, atributos, recursos e regras gerais.
- `motor/partida.js`: criar partida e aplicar ações (usado pela tela, pela IA, pelos testes e pelo simulador).

Use sempre `Engine.nome(...)` / `Rules.nome(...)`; método novo vai no arquivo do assunto. Toda aleatoriedade passa
por `Engine.rng()` (nunca `Math.random`), para as partidas simuladas poderem ser repetidas.

### IA do Bot — `src/js/bot/`

- `ia.js`: a IA (decisão pura). Níveis de dificuldade em `IA.niveis`; a pontuação de uma situação em `IA.avaliar`.
- `bot.js`: o Bot na partida (espera, "pensando…", aplica a jogada). `worker.js` / `bot-worker.js`: a IA rodando em
  paralelo para a tela não travar.
- Para verificar: `npm test` (inclui partidas inteiras) e `npm run simular -- --partidas 50 --nivel dificil`. O
  simulador mostra ações inválidas, partidas travadas, tempo de decisão e habilidades que a IA nunca usa. Partida
  com problema: repita com `--partidas 1 --semente <n>` (a semente aparece no resultado).

### Interface — `src/index.html`, `src/css/`, `src/js/{interface,hud,menus,render,entrada}/`

- `index.html`: estrutura das telas. `css/estilo.css`: estilos próprios. Classes do Tailwind podem ser usadas direto
  no HTML/JS (precisam aparecer escritas por inteiro, nada de montar `'p-' + n`).
- `hud/`: barras e painéis da partida. `menus/`: menu principal, seleção, pausa, ajuda, tutorial.
- `render/`: desenho do tabuleiro (canvas) e efeitos visuais (`vfx/`). O visual de cada habilidade fica no campo
  `visual` dela, no arquivo da Estrela.
- Módulos de tela não rodam nada ao carregar: o que precisa acontecer na abertura (ligar botões etc.) vai numa função
  `iniciarX()`, chamada pelo `main.js`.

### Online — `src/js/online/`

`rede.js` + `rede/` (conexão PeerJS, envio, recebimento, segurança), `menu-online.js` e `sala.js`. O anfitrião é a
autoridade da partida; tudo que chega pela rede é validado em `rede/seguranca.js` — campo novo numa ação precisa
ser aceito lá. Para testar: duas abas com `npm run dev`, uma cria a sala e a outra entra pelo link.

## Testes — `testes/`

- `jogo/estrelas.test.js`: cada Estrela tem ficha, habilidades, resumo e retrato.
- `jogo/habilidades.test.js`: cada habilidade de cada Estrela é usada em todos os alvos possíveis, e o estado da
  partida tem que continuar válido (regras em `testes/ajuda.js`).
- `jogo/partida.test.js` e `bot/ia.test.js`: criação de partida, ações e partidas inteiras de IA contra IA.

Achou um erro? Escreva um teste que mostra o erro, corrija, e o teste garante que ele não volta.

## Versões e publicação

- A versão do jogo fica em `package.json` (`version`) e dá nome ao arquivo do build (`npm run build` →
  `dist/PlayZinordia_<versão>.html`).
- Para publicar no site (GitHub Pages): aumente a versão, faça o commit na `main` e crie a tag:

  ```powershell
  git tag v3.4.6
  git push --tags
  ```

  (Na primeira vez, ative em Settings → Pages → Source: GitHub Actions.)
