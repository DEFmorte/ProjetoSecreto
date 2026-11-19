# Teste Z (PlayZinordia)

Batalha estratégica em grid hexagonal, no navegador. Contra Bots ou online (P2P).

## Primeira vez

Precisa do [Node.js](https://nodejs.org) (18 ou mais novo).

```powershell
npm install
```

## Dia a dia

```powershell
npm run dev
```

Abre em http://localhost:8080. Edite qualquer arquivo em `src/` e a página atualiza sozinha
(mudanças de CSS entram sem recarregar, então a partida aberta continua).

Para testar no celular (mesmo Wi-Fi): `npm run dev:rede` e abra no celular o endereço "rede local" que aparecer.
Na primeira vez o Windows pode perguntar se libera o Node no firewall.

## Gerar o jogo para distribuir

```powershell
npm run build
```

Cria `dist/PlayZinordia_<versão>.html`: um arquivo só, com tudo embutido, que funciona offline (é só mandar o arquivo
ou hospedar em qualquer lugar). A versão vem do campo `version` do `package.json`. Para conferir: `npm run preview`.

## Onde fica cada coisa

```
src/
  index.html        estrutura da tela + lista de scripts (a ORDEM importa)
  css/              fontes.css, estilo.css (seus estilos), tailwind.css (gerado)
  assets/           fontes, ícones e retratos das Estrelas
  js/               código do jogo, separado por assunto (ver CLAUDE.md)
ferramentas/        servidor de desenvolvimento, build e checagem
dist/               saída do build (não vai para o git)
```

Detalhes da arquitetura e regras para mexer no código: [CLAUDE.md](CLAUDE.md).

`PlayZinordia_3.4.5.html` na raiz é o arquivo original, antes da organização (guardado só como referência).
