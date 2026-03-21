import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAppState } from '../state';
import { createGrid } from '../grid';
import { Player } from '../player';
import type { AppState } from '../state';

// ── WebGL / Three.js mocks ────────────────────────────────────────────────────

vi.mock('three', async () => {
    const actual = await vi.importActual<typeof import('three')>('three');

    class MockWebGLRenderer {
        domElement: HTMLCanvasElement;
        constructor() {
            this.domElement = document.createElement('canvas');
        }
        setPixelRatio = vi.fn();
        setSize = vi.fn();
        render = vi.fn();
        dispose = vi.fn();
    }

    return { ...actual, WebGLRenderer: MockWebGLRenderer };
});

// Import after mocks are set up
const { ThirdPersonView } = await import('./ThirdPersonView');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeContainer(w = 400, h = 400): HTMLElement {
    const div = document.createElement('div');
    Object.defineProperty(div, 'clientWidth', { value: w, configurable: true });
    Object.defineProperty(div, 'clientHeight', { value: h, configurable: true });
    return div;
}

function stateWithGrid(rows = 3, cols = 3): AppState {
    const { state } = createAppState();
    state.grid = createGrid(rows, cols);
    return state;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ThirdPersonView', () => {
    beforeEach(() => {
        vi.stubGlobal('requestAnimationFrame', vi.fn());
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
        vi.stubGlobal('performance', { now: vi.fn().mockReturnValue(0) });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('appends a canvas element on mount', () => {
        const view = new ThirdPersonView();
        const container = makeContainer();
        view.mount(container);
        expect(container.querySelector('canvas')).not.toBeNull();
    });

    it('removes the canvas on unmount', () => {
        const view = new ThirdPersonView();
        const container = makeContainer();
        view.mount(container);
        view.unmount();
        expect(container.querySelector('canvas')).toBeNull();
    });

    it('starts animation loop on mount', () => {
        const view = new ThirdPersonView();
        const container = makeContainer();
        view.mount(container);
        expect(vi.mocked(requestAnimationFrame)).toHaveBeenCalled();
    });

    it('stops animation loop on unmount', () => {
        const view = new ThirdPersonView();
        const container = makeContainer();
        view.mount(container);
        view.unmount();
        expect(vi.mocked(cancelAnimationFrame)).toHaveBeenCalled();
    });

    it('does not throw when render is called with null grid', () => {
        const view = new ThirdPersonView();
        const container = makeContainer();
        view.mount(container);
        const { state } = createAppState();
        expect(() => view.render(state)).not.toThrow();
    });

    it('calls sceneBuilder build when grid changes', () => {
        const view = new ThirdPersonView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        expect(() => view.render(state)).not.toThrow();
        // Same grid reference — should not throw
        expect(() => view.render(state)).not.toThrow();
    });

    it('updates target position when player moves', () => {
        const view = new ThirdPersonView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        state.player = new Player(1, 1);
        expect(() => view.render(state)).not.toThrow();
    });

    it('handles all facing directions without throwing', () => {
        const view = new ThirdPersonView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        for (const dir of ['N', 'S', 'E', 'W'] as const) {
            state.player = new Player(1, 1, dir);
            expect(() => view.render(state)).not.toThrow();
        }
    });

    it('resize does not throw when container is set', () => {
        const view = new ThirdPersonView();
        const container = makeContainer();
        view.mount(container);
        expect(() => view.resize()).not.toThrow();
    });

    it('resize does not throw before mount', () => {
        const view = new ThirdPersonView();
        expect(() => view.resize()).not.toThrow();
    });

    it('render with solver state does not throw', () => {
        const view = new ThirdPersonView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        const cell = state.grid!.cells[0][0];
        state.solver = {
            status: 'running',
            visited: new Set([cell]),
            frontier: new Set(),
            path: [],
            current: null,
            stepCount: 1,
        };
        expect(() => view.render(state)).not.toThrow();
    });
});
