# Teste Z (PlayZinordia)

Batalha estratégica em grid hexagonal, no navegador. Contra Bots ou online (P2P).

## Primeira vez

Precisa do [Node.js](https://nodejs.org) (22.15 ou mais novo).

```powershell
npm install
```

## Dia a dia

```powershell
npm run dev
```

Abre em http://localhost:8080 (servidor do [Vite](https://vite.dev)). Edite qualquer arquivo em `src/` e a página
atualiza sozinha (mudanças de CSS entram sem recarregar, então a partida aberta continua).

Para testar no celular (mesmo Wi-Fi): `npm run dev:rede` e abra no celular o endereço "rede local" que aparecer.
Na primeira vez o Windows pode perguntar se libera o Node no firewall.

## Antes de enviar uma mudança

```powershell
npm run formatar
npm run checar
```

`checar` roda o ESLint, confere a formatação e roda os testes automáticos (`npm test`). No VS Code, instale as
extensões recomendadas (Prettier e ESLint): o código se formata sozinho ao salvar.

## Testar o Bot e o balanceamento

```powershell
npm run simular -- --partidas 50
```

Joga partidas de Bot contra Bot sem abrir o jogo e mostra: quem venceu, a porcentagem de vitórias de cada Estrela,
quanto tempo a IA leva para decidir, se ela tentou alguma jogada inválida, se alguma partida travou ou deu erro, e
quais habilidades ela nunca usou. Opções: `--nivel dificil`, `--modo trio`, `--estrelas Diamante,Lorena` (sempre
na equipe 1), `--detalhes` (uma linha por partida), `--semente 123` (repete exatamente as mesmas partidas).

## Gerar o jogo para distribuir

```powershell
npm run build
```

Cria `dist/PlayZinordia_<versão>.html`: um arquivo só, com tudo embutido, que funciona offline (é só mandar o arquivo
ou hospedar em qualquer lugar). A versão vem do campo `version` do `package.json`. Para conferir: `npm run preview`
e abra `http://localhost:8090/PlayZinordia_<versão>.html`.

## Versão para computador (.exe)

```powershell
npm run exe
```

Cria em `release/`:

- `TesteZ-Instalador-<versão>.exe`: instalador (atalho no menu Iniciar e na área de trabalho, desinstala pelo Windows);
- `TesteZ-Portatil-<versão>.exe`: abre direto, sem instalar (bom para mandar para alguém testar).

É o mesmo jogo, numa janela própria (F11 = tela cheia). Para conferir o executável sem abrir na mão:
`npm run exe:testar` (joga uma partida sozinho e diz se deu tudo certo). Para só abrir a janela durante o
desenvolvimento: `npm run app`.

Como o executável não tem assinatura digital (um certificado pago), na primeira vez o Windows mostra "O Windows
protegeu o computador": é só clicar em "Mais informações" → "Executar assim mesmo". O ícone ainda é o padrão do
Electron: para trocar, coloque um `build/icon.png` (512×512) e gere de novo.

## Onde fica cada coisa

```
src/
  index.html        estrutura da tela (carrega js/main.js)
  css/              fontes.css, estilo.css (seus estilos), tailwind.css (diretivas do Tailwind)
  assets/           fontes, ícones e retratos das Estrelas
  js/               código do jogo em módulos, separado por assunto (ver CLAUDE.md)
    estrelas/       um arquivo por personagem
    motor/          regras do jogo (sem tela)
    bot/            IA do Bot
testes/             testes automáticos (npm test)
electron/           janela da versão para computador (.exe)
ferramentas/        plugin do Vite, simulador de partidas, teste do .exe
dist/               saída do build (não vai para o git)
release/            saída do npm run exe (não vai para o git)
```

Como trabalhar no projeto em equipe (por área, fluxo de Pull Requests, testes, publicação):
[CONTRIBUTING.md](CONTRIBUTING.md). Regras de arquitetura: [CLAUDE.md](CLAUDE.md).

`PlayZinordia_3.4.5.html` na raiz é o arquivo original, antes da organização (guardado só como referência).
