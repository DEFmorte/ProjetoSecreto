// ── HUD da partida ──
// refreshHUD() redesenha todas as barras e painéis; iniciarHud() liga os eventos deles.
import { $ } from '../nucleo/dom.js';
import { Rules } from '../motor/regras.js';
import { state } from '../partida/estado.js';
import { ui } from '../interface/ui.js';
import { selectPiece } from '../interface/selecao.js';
import { setHover, updateInspectPanel } from './cartoes.js';
import { refreshRenderCache } from '../render/desenho.js';
import { updatePromptBar } from './avisos.js';
import { setPreview } from './habilidades.js';
import { desenharLog, updateLogPanel } from './registro.js';
import { updateActionBar, updateInitiativeBar, updateTurnBannerUI } from './turno.js';

export function refreshHUD() {
    refreshRenderCache();
    updateTurnBannerUI();
    updateInitiativeBar();
    updateActionBar();
    updatePromptBar();
    updateLogPanel();
    updateInspectPanel();
}

// Executado uma vez na inicialização do jogo (main.js), na ordem certa em relação aos outros módulos.
export function iniciarHud() {
    // Passar o mouse / clicar num nome da ordem dos turnos inspeciona a Estrela.
    const list = $('initiative-list');
    const idDe = (e) => {
        const row = e.target.closest('[data-id]');
        return row ? Number(row.dataset.id) : null;
    };
    list.addEventListener('mouseover', (e) => setHover(idDe(e), true));
    list.addEventListener('mouseleave', () => setHover(null));
    list.addEventListener('click', (e) => {
        const id = idDe(e);
        if (id == null) return;
        const p = Rules.pieceById(state, id);
        if (p && Rules.canSelect(state, p)) {
            selectPiece(p);
            return;
        }
        ui.pinId = ui.pinId === id ? null : id;
        updateInspectPanel();
    });
    $('log-toggle').addEventListener('click', () => {
        ui.logAberto = !ui.logAberto;
        desenharLog();
    });
    $('ability-bar').addEventListener(
        'pointerdown',
        (e) => {
            ui.toqueHab = e.pointerType !== 'mouse';
        },
        true,
    );
    $('ability-tip').addEventListener('click', () => setPreview(null));
}
