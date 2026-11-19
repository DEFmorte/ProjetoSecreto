// Permite rodar os módulos do jogo direto no Node (simulador): `import retrato from '...webp'` vira só o caminho
// do arquivo, como no Vite. Uso: node --import ./ferramentas/node-assets.js ferramentas/simular.js
import { registerHooks } from 'node:module';

const ASSET = /\.(webp|png|jpe?g|svg|woff2?|mp3|ogg|wav)$/i;

registerHooks({
    load(url, context, nextLoad) {
        if (ASSET.test(new URL(url).pathname)) {
            return { format: 'module', source: `export default ${JSON.stringify(url)};`, shortCircuit: true };
        }
        return nextLoad(url, context);
    },
});
