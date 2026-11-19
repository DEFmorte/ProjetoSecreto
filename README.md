# Teste Z (PlayZinordia)

Batalha estratégica em grid hexagonal, no navegador. Contra Bots ou online (P2P).

## Primeira vez

Precisa do [Node.js](https://nodejs.org) (20 ou mais novo).

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

## Gerar o jogo para distribuir

```powershell
npm run build
```

Cria `dist/PlayZinordia_<versão>.html`: um arquivo só, com tudo embutido, que funciona offline (é só mandar o arquivo
ou hospedar em qualquer lugar). A versão vem do campo `version` do `package.json`. Para conferir: `npm run preview`
e abra `http://localhost:8090/PlayZinordia_<versão>.html`.

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
ferramentas/        plugin do Vite (segurança, versão e nome do build)
dist/               saída do build (não vai para o git)
```

Detalhes da arquitetura e regras para mexer no código: [CLAUDE.md](CLAUDE.md).

`PlayZinordia_3.4.5.html` na raiz é o arquivo original, antes da organização (guardado só como referência).
