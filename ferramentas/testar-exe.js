// Testa o executável gerado por `npm run exe`: abre o "Teste Z.exe" escondido, que joga uma partida inteira sozinho
// (IA contra o Bot) e informa se terminou sem erros. Uso: npm run exe:testar
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const exe = path.resolve('release', 'win-unpacked', 'Teste Z.exe');
if (!fs.existsSync(exe)) {
    console.error(`Não encontrei ${exe}. Rode "npm run exe" primeiro.`);
    process.exit(1);
}

console.log('Abrindo o executável e jogando uma partida sozinho (leva uns 30 segundos)...');
const p = spawn(exe, [], { env: { ...process.env, TESTEZ_AUTOTESTE: '1' } });
let saida = '';
p.stdout.on('data', (d) => (saida += d));
p.stderr.on('data', (d) => (saida += d));
const limite = setTimeout(() => {
    p.kill();
    console.error('O executável não respondeu em 3 minutos.');
    process.exit(1);
}, 180000);

p.on('exit', (codigo) => {
    clearTimeout(limite);
    const linha = saida.split('\n').find((l) => l.startsWith('AUTOTESTE '));
    const r = linha ? JSON.parse(linha.slice('AUTOTESTE '.length)) : null;
    if (r && r.ok && codigo === 0) {
        console.log(
            `✓ Partida completa no executável: venceu o jogador ${r.vencedor} em ${r.rodadas} rodadas, sem erros.`,
        );
        process.exit(0);
    }
    console.error('✗ O teste do executável falhou.', r || saida.slice(-2000));
    process.exit(1);
});
