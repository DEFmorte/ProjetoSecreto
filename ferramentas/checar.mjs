// Checagem rápida (npm run checar): todo arquivo listado em src/index.html existe, todo .js em src/js está listado
// (ou é o Worker / importado por ele) e não tem erro de sintaxe.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SRC, arquivos, importsDoWorker, WORKER } from './projeto.mjs';

const { scripts, estilos } = arquivos();
const { lista } = importsDoWorker();
let erros = 0;
const erro = (m) => { erros++; console.error('  ✗ ' + m); };

for (const f of [...estilos, ...scripts, WORKER, ...lista]) if (!fs.existsSync(path.join(SRC, f))) erro(`não existe: src/${f}`);

const todos = [];
(function varrer(d) {
    for (const e of fs.readdirSync(path.join(SRC, d), { withFileTypes: true })) {
        const rel = path.posix.join(d, e.name);
        if (e.isDirectory()) varrer(rel); else if (rel.endsWith('.js')) todos.push(rel);
    }
})('js');
for (const f of todos) if (!scripts.includes(f) && f !== WORKER) erro(`src/${f} não está em src/index.html (o jogo não carrega esse arquivo)`);

for (const f of todos) {
    const r = spawnSync(process.execPath, ['--check', path.join(SRC, f)], { encoding: 'utf8' });
    if (r.status !== 0) erro(`sintaxe em src/${f}:\n${r.stderr.split('\n').slice(0, 5).join('\n')}`);
}

if (erros) { console.error(`\n  ${erros} problema(s).\n`); process.exit(1); }
console.log(`  ✓ ${todos.length} scripts e ${estilos.length} estilos ok.`);
