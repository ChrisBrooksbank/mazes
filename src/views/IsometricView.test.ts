import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IsometricView } from './IsometricView';
import { createAppState } from '../state';
import { createGrid } from '../grid';
import { Player } from '../player';
import type { AppState } from '../state';

// ── Canvas mock ──────────────────────────────────────────────────────────────

function makeCtxMock() {
    return {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        scale: vi.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: '',
    };
}

function patchCanvasContext(ctx: ReturnType<typeof makeCtxMock>) {
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = origCreate(tag);
        if (tag === 'canvas') {
            vi.spyOn(el as HTMLCanvasElement, 'getContext').mockReturnValue(
                ctx as unknown as never
            );
        }
        return el;
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeContainer(w = 400, h = 400): HTMLElement {
    const div = document.createElement('div');
    Object.defineProperty(div, 'clientWidth', { value: w, configurable: true });
    Object.defineProperty(div, 'clientHeight', { value: h, configurable: true });
    return div;
}

function stateWithGrid(rows = 5, cols = 5): AppState {
    const { state } = createAppState();
    state.grid = createGrid(rows, cols);
    return state;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('IsometricView', () => {
    let ctx: ReturnType<typeof makeCtxMock>;

    beforeEach(() => {
        ctx = makeCtxMock();
        patchCanvasContext(ctx);
        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe = vi.fn();
                disconnect = vi.fn();
            }
        );
    });

    it('appends a canvas element on mount', () => {
        const view = new IsometricView();
        const container = makeContainer();
        view.mount(container);
        expect(container.querySelector('canvas')).not.toBeNull();
    });

    it('removes the canvas on unmount', () => {
        const view = new IsometricView();
        const container = makeContainer();
        view.mount(container);
        view.unmount();
        expect(container.querySelector('canvas')).toBeNull();
    });

    it('does not throw when render is called with null grid', () => {
        const view = new IsometricView();
        const container = makeContainer();
        view.mount(container);
        const { state } = createAppState();
        expect(() => view.render(state)).not.toThrow();
    });

    it('clears the canvas on every render', () => {
        const view = new IsometricView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        view.render(state);
        expect(ctx.clearRect).toHaveBeenCalled();
    });

    it('draws floor diamonds (fill calls) when grid is present', () => {
        const view = new IsometricView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        view.render(state);
        expect(ctx.fill).toHaveBeenCalled();
    });

    it('draws walls (stroke calls) when grid is present', () => {
        const view = new IsometricView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        view.render(state);
        expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders player diamond when player is set', () => {
        const view = new IsometricView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        state.player = new Player(0, 0);
        view.render(state);
        // Player uses moveTo/lineTo/closePath/fill/stroke — beginPath is called multiple times
        expect(ctx.beginPath).toHaveBeenCalled();
        expect(ctx.fill).toHaveBeenCalled();
    });

    it('does not throw when player is null', () => {
        const view = new IsometricView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        state.player = null;
        expect(() => view.render(state)).not.toThrow();
    });

    it('renders solver visited overlay without throwing', () => {
        const view = new IsometricView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid(3, 3);
        const cell = state.grid!.cells[1][1];
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

    it('renders solver path overlay without throwing', () => {
        const view = new IsometricView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid(3, 3);
        const cell = state.grid!.cells[1][1];
        state.solver = {
            status: 'complete',
            visited: new Set([cell]),
            frontier: new Set(),
            path: [cell],
            current: cell,
            stepCount: 5,
        };
        expect(() => view.render(state)).not.toThrow();
    });

    it('resize does not throw', () => {
        const view = new IsometricView();
        const container = makeContainer();
        view.mount(container);
        expect(() => view.resize()).not.toThrow();
    });
});
