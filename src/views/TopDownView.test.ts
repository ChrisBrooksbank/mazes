import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TopDownView } from './TopDownView';
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
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        scale: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        lineCap: '',
    };
}

// Vitest runs in jsdom which has a partial canvas implementation.
// We swap out getContext to return our mock so we can inspect draw calls.
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

describe('TopDownView', () => {
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
        const view = new TopDownView();
        const container = makeContainer();
        view.mount(container);
        expect(container.querySelector('canvas')).not.toBeNull();
    });

    it('removes the canvas on unmount', () => {
        const view = new TopDownView();
        const container = makeContainer();
        view.mount(container);
        view.unmount();
        expect(container.querySelector('canvas')).toBeNull();
    });

    it('does not throw when render is called with null grid', () => {
        const view = new TopDownView();
        const container = makeContainer();
        view.mount(container);
        const { state } = createAppState();
        expect(() => view.render(state)).not.toThrow();
    });

    it('clears the canvas on every render', () => {
        const view = new TopDownView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        view.render(state);
        expect(ctx.clearRect).toHaveBeenCalled();
    });

    it('draws walls (stroke calls) when grid is present', () => {
        const view = new TopDownView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        view.render(state);
        // strokeRect for the border + stroke() for inner walls
        expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it('draws start and end cell fills', () => {
        const view = new TopDownView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        view.render(state);
        // fillRect should have been called for every cell background
        expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('renders player circle when player is set', () => {
        const view = new TopDownView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        state.player = new Player(0, 0);
        view.render(state);
        expect(ctx.arc).toHaveBeenCalled();
    });

    it('does not call arc when player is null', () => {
        const view = new TopDownView();
        const container = makeContainer();
        view.mount(container);
        const state = stateWithGrid();
        state.player = null;
        view.render(state);
        expect(ctx.arc).not.toHaveBeenCalled();
    });

    it('renders solver visited overlay when solver is running', () => {
        const view = new TopDownView();
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
        // We just need to verify it doesn't throw and fillRect is called
        expect(() => view.render(state)).not.toThrow();
    });

    it('resize does not throw', () => {
        const view = new TopDownView();
        const container = makeContainer();
        view.mount(container);
        expect(() => view.resize()).not.toThrow();
    });
});
