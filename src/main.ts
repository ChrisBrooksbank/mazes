import './style.css';
import { state, events } from './state';
import { Player } from './player';
import { createGrid } from './grid';
import { getGenerator } from './generators/index';
import type { GeneratorName } from './generators/index';
import { getSolver } from './solvers/index';
import type { SolverName } from './solvers/index';
import { SolverAnimationLoop } from './solvers/animationLoop';
import {
    ViewManager,
    TopDownView,
    IsometricView,
    FirstPersonView,
    ThirdPersonView,
} from './views/index';
import { Toolbar } from './ui/Toolbar';
import { HUD } from './ui/HUD';
import { KeyboardHints } from './ui/KeyboardHints';
import { KeyboardControls, TouchControls } from './controls';
import type { ViewMode } from './state';

// ── DOM structure ─────────────────────────────────────────────────────────────

const appEl = document.querySelector<HTMLDivElement>('#app')!;
appEl.innerHTML = '';

// Override the Vite scaffold styles to make #app a full-screen flex column
appEl.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'height:100svh',
    'width:100%',
    'max-width:100%',
    'margin:0',
    'border:none',
    'box-sizing:border-box',
    'text-align:left',
].join(';');

const toolbarContainer = document.createElement('div');
toolbarContainer.id = 'toolbar-container';

const viewContainer = document.createElement('div');
viewContainer.id = 'view-container';
viewContainer.style.cssText = 'flex:1;overflow:hidden;position:relative;background:#0f172a;';

appEl.appendChild(toolbarContainer);
appEl.appendChild(viewContainer);

// ── Player ────────────────────────────────────────────────────────────────────

const player = new Player(0, 0, 'S');
state.player = player;

// ── Views ─────────────────────────────────────────────────────────────────────

const viewManager = new ViewManager();
viewManager.register('top-down', new TopDownView());
viewManager.register('isometric', new IsometricView());
viewManager.register('first-person', new FirstPersonView());
viewManager.register('third-person', new ThirdPersonView());
viewManager.mount(viewContainer);
viewManager.switchTo('top-down');

// ── HUD ───────────────────────────────────────────────────────────────────────

const hud = new HUD();
hud.mount(viewContainer);

// ── Toolbar ───────────────────────────────────────────────────────────────────

const toolbar = new Toolbar({
    onGenerate: (generatorName: GeneratorName, rows: number, cols: number) => {
        handleGenerate(generatorName, rows, cols);
    },
    onSolve: (solverName: SolverName) => {
        handleSolve(solverName);
    },
    onViewChange: (mode: ViewMode) => {
        handleViewChange(mode);
    },
});
toolbar.mount(toolbarContainer);
toolbar.setActiveView('top-down');

// ── Keyboard hints ────────────────────────────────────────────────────────────

const keyboardHints = new KeyboardHints();
keyboardHints.mount(document.body);

// ── Controls ──────────────────────────────────────────────────────────────────

const keyboardControls = new KeyboardControls(
    player,
    events,
    () => state.grid,
    () => state.viewMode
);
keyboardControls.mount();

const touchControls = new TouchControls(
    player,
    events,
    () => state.grid,
    () => state.viewMode
);
touchControls.mount(document.body);

// ── Solver animation loop ─────────────────────────────────────────────────────

const solverLoop = new SolverAnimationLoop({
    onStep: solverState => {
        state.solver = solverState;
        events.emit('solver:updated', solverState);
    },
    onComplete: solverState => {
        state.solver = solverState;
        events.emit('solver:updated', solverState);
    },
});

// ── App actions ───────────────────────────────────────────────────────────────

function handleGenerate(generatorName: GeneratorName, rows: number, cols: number): void {
    solverLoop.stop();

    const grid = createGrid(rows, cols);
    const gen = getGenerator(generatorName)(grid);
    // Drain the generator to completion (instant maze generation)
    while (!gen.next().done) {
        /* step */
    }

    state.grid = grid;
    state.completed = false;
    state.solver = {
        status: 'idle',
        visited: new Set(),
        frontier: new Set(),
        path: [],
        current: null,
        stepCount: 0,
    };

    player.reset(0, 0, 'S');
    state.player = player;

    events.emit('grid:changed', grid);
    toolbar.setSolveEnabled(true);
    hud.notifyGenerated();
}

function handleSolve(solverName: SolverName): void {
    if (!state.grid) return;
    const solver = getSolver(solverName);
    solverLoop.start(state.grid, solver);
    hud.notifySolveStarted();
}

function handleViewChange(mode: ViewMode): void {
    state.viewMode = mode;
    viewManager.switchTo(mode);
    toolbar.setActiveView(mode);
    events.emit('viewMode:changed', mode);
    touchControls.rebuild();
    viewManager.render(state);
    hud.update(state);
}

// ── State event connections ───────────────────────────────────────────────────

events.on('grid:changed', () => {
    viewManager.render(state);
    hud.update(state);
});

events.on('player:turned', () => {
    state.player = player;
    viewManager.render(state);
});

events.on('player:moved', () => {
    state.player = player;

    // Check for maze completion
    if (state.grid && !state.completed) {
        const endRow = state.grid.rows - 1;
        const endCol = state.grid.cols - 1;
        if (player.row === endRow && player.col === endCol) {
            state.completed = true;
            events.emit('maze:completed', undefined as void);
        }
    }

    viewManager.render(state);
    hud.update(state);
});

events.on('solver:updated', () => {
    viewManager.render(state);
    hud.update(state);
});

events.on('maze:completed', () => {
    showCompletionBanner();
});

// ── Resize handler ────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
    viewManager.resize();
});

// ── Completion banner ─────────────────────────────────────────────────────────

function showCompletionBanner(): void {
    const existing = document.getElementById('completion-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'completion-banner';
    banner.className = 'completion-banner';
    banner.innerHTML = `
        <div class="completion-banner__icon">&#x1F389;</div>
        <h2 class="completion-banner__title">Maze Solved!</h2>
        <p class="completion-banner__msg">You reached the exit!</p>
        <button class="completion-banner__close" id="banner-close">Close</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('banner-close')?.addEventListener('click', () => {
        banner.remove();
    });
}

// ── Auto-generate on load ─────────────────────────────────────────────────────

handleGenerate('recursive-backtracker', 15, 15);
