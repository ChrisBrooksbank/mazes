import './style.css';
import { state, events } from './state';
import { Player } from './player';
import { createGrid } from './grid';
import type { Grid } from './grid';
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

/** The grid the player may walk in — none while a maze is still being carved. */
function getPlayableGrid(): Grid | null {
    return buildGen ? null : state.grid;
}

const keyboardControls = new KeyboardControls(
    player,
    events,
    getPlayableGrid,
    () => state.viewMode
);
keyboardControls.mount();

const touchControls = new TouchControls(player, events, getPlayableGrid, () => state.viewMode);
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
    document.getElementById('completion-banner')?.remove();

    stopBuild();

    const grid = createGrid(rows, cols);
    const gen = getGenerator(generatorName)(grid);
    // Only the 2D views can show a maze mid-build (3D scenes are built once per grid)
    const animate =
        toolbar.getAnimate() && (state.viewMode === 'top-down' || state.viewMode === 'isometric');

    if (!animate) {
        while (!gen.next().done) {
            /* step */
        }
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

    hud.notifyGenerated();

    if (animate) {
        state.buildCurrent = null;
        toolbar.setSolveEnabled(false);
        events.emit('grid:changed', grid);
        startBuild(gen, grid);
    } else {
        state.buildCurrent = null;
        events.emit('grid:changed', grid);
        toolbar.setSolveEnabled(true);
    }
}

let buildFrame: number | null = null;
let buildGen: ReturnType<ReturnType<typeof getGenerator>> | null = null;

/** Complete an in-progress animated build immediately. */
function finishBuild(): void {
    if (buildGen && state.grid) {
        while (!buildGen.next().done) {
            /* step */
        }
        const grid = state.grid;
        stopBuild();
        toolbar.setSolveEnabled(true);
        events.emit('grid:changed', grid);
    }
}

function stopBuild(): void {
    buildGen = null;
    if (buildFrame !== null) {
        cancelAnimationFrame(buildFrame);
        buildFrame = null;
    }
    state.buildCurrent = null;
}

/** Advance the generator a few steps per frame so any size finishes in ~2.5s. */
function startBuild(gen: ReturnType<ReturnType<typeof getGenerator>>, grid: Grid): void {
    const stepsPerFrame = Math.max(1, Math.ceil((grid.rows * grid.cols) / 150));
    const frame = () => {
        let done = false;
        for (let i = 0; i < stepsPerFrame && !done; i++) {
            const result = gen.next();
            if (result.done) done = true;
            else state.buildCurrent = result.value.current;
        }
        if (done) {
            buildFrame = null;
            buildGen = null;
            state.buildCurrent = null;
            toolbar.setSolveEnabled(true);
        } else {
            buildFrame = requestAnimationFrame(frame);
        }
        events.emit('grid:changed', grid);
    };
    buildGen = gen;
    buildFrame = requestAnimationFrame(frame);
}

function handleSolve(solverName: SolverName): void {
    if (!state.grid || buildFrame !== null) return;
    const solver = getSolver(solverName);
    solverLoop.start(state.grid, solver);
    hud.notifySolveStarted();
}

function handleViewChange(mode: ViewMode): void {
    if (mode === 'first-person' || mode === 'third-person') finishBuild();
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
    hud.notifyCompleted();
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
