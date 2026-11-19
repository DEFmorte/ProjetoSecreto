// ── Erros inesperados ──
// Em vez de o jogo travar em silêncio, mostra um aviso com opções: desfazer a última jogada, continuar,
// voltar ao menu ou copiar os detalhes (para relatar o problema). Usa funções do script principal só se existirem.
const Falha = {
    silenciados: new Set(), // erros que o jogador mandou ignorar ("Continuar")
    atual: null,
    aberto() { return !!document.getElementById('erro-screen'); },
    mostrar(erro, origem = 'erro') {
        const msg = (erro && (erro.message || (typeof erro === 'string' ? erro : ''))) || String(erro || 'Erro desconhecido');
        if (/^Script error\.?$/.test(msg)) return; // erro de outro domínio, sem detalhes
        const stack = (erro && erro.stack) || '';
        const chave = msg + '|' + (stack.split('\n')[1] || '');
        console.error('[TESTE Z]', erro);
        if (this.silenciados.has(chave)) return;
        if (this.aberto()) { this.atual.vezes++; return; }
        this.atual = { msg, stack, origem, chave, vezes: 1, quando: new Date().toISOString() };
        this.abrir();
    },
    detalhes() {
        const a = this.atual || {};
        let estado = '';
        try { estado = typeof snapshot === 'function' && state ? snapshot() : ''; } catch (e) { estado = '(indisponível)'; }
        return ['TESTE Z — relatório de erro', `Quando: ${a.quando}`, `Origem: ${a.origem}`, `Mensagem: ${a.msg}`,
            `Navegador: ${navigator.userAgent}`, '', a.stack, '', 'Estado da partida:', estado].join('\n');
    },
    fechar() { const el = document.getElementById('erro-screen'); if (el) el.remove(); },
    abrir() {
        const a = this.atual;
        const emJogo = typeof gameRunning !== 'undefined' && gameRunning && state;
        const online = typeof Rede !== 'undefined' && Rede.ativo();
        const tela = document.createElement('div');
        tela.id = 'erro-screen';
        tela.className = 'fixed inset-0 flex items-center justify-center bg-gray-950/70 backdrop-blur-sm p-4';
        tela.style.zIndex = 90;
        const caixa = document.createElement('div');
        caixa.className = 'bg-gray-900 border border-red-500/60 rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col text-center text-white';
        caixa.innerHTML = `<h2 class="text-2xl font-black text-red-300 tracking-wide">ALGO DEU ERRADO</h2>
            <p class="text-gray-400 text-sm mt-1">O jogo encontrou um erro inesperado.${emJogo && !online ? " A partida está salva." : ""}</p>
            <p class="mono text-[11px] text-red-200 bg-gray-800/70 rounded-lg px-3 py-2 mt-3 mb-5 break-words text-left"></p>
            <div class="flex flex-col gap-3"></div>`;
        caixa.querySelector('p.mono').textContent = a.msg;
        const box = caixa.lastElementChild;
        const botao = (txt, cls, fn) => {
            const b = document.createElement('button');
            b.className = `menu-btn ${cls}`;
            b.innerHTML = `<span class="text-left">${txt}</span>`;
            b.addEventListener('click', () => { try { fn(b); } catch (e) { console.error(e); location.reload(); } });
            box.appendChild(b);
            return b;
        };
        const podeDesfazer = emJogo && undoStack.length && !online;
        if (podeDesfazer) botao('Desfazer última jogada', 'primario', () => { this.fechar(); undo(); });
        botao('Continuar', podeDesfazer ? '' : 'primario', () => { this.silenciados.add(a.chave); this.fechar(); });
        botao(emJogo ? 'Voltar ao menu' : 'Recarregar a página', '', () => {
            this.fechar();
            if (emJogo && typeof showMenu === 'function') showMenu(); else location.reload();
        });
        botao('Copiar detalhes', '', (b) => {
            const txt = this.detalhes();
            const ok = () => { b.firstChild.textContent = 'Detalhes copiados ✓'; };
            const manual = () => { // sem acesso à área de transferência: mostra o texto para copiar à mão
                const t = document.createElement('textarea');
                t.readOnly = true; t.value = txt;
                t.className = 'mono text-[10px] bg-gray-800 text-gray-200 rounded-lg p-2 h-20';
                b.replaceWith(t); t.focus(); t.select();
            };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, manual);
            else manual();
        });
        tela.appendChild(caixa);
        document.body.appendChild(tela);
        const primeiro = box.querySelector('button');
        if (primeiro) primeiro.focus();
    }
};
window.addEventListener('error', (e) => Falha.mostrar(e.error || e.message, 'erro'));
window.addEventListener('unhandledrejection', (e) => Falha.mostrar(e.reason, 'promessa'));
