import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HUD } from './HUD';
import type { AppState } from '../state';
import { createGrid } from '../grid';

// ── Canvas mock ───────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<AppState> = {}): AppState {
    return {
        grid: null,
        player: null,
        viewMode: 'top-down',
        solver: {
            status: 'idle',
            visited: new Set(),
            frontier: new Set(),
            path: [],
            current: null,
            stepCount: 0,
        },
        completed: false,
        ...overrides,
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HUD', () => {
    let container: HTMLElement;
    let hud: HUD;
    let ctxMock: ReturnType<typeof makeCtxMock>;

    beforeEach(() => {
        ctxMock = makeCtxMock();
        patchCanvasContext(ctxMock);
        container = document.createElement('div');
        document.body.appendChild(container);
        hud = new HUD();
    });

    afterEach(() => {
        hud.unmount();
        container.remove();
        vi.restoreAllMocks();
    });

    it('mounts into the container', () => {
        hud.mount(container);
        expect(container.querySelector('.hud')).not.toBeNull();
    });

    it('unmounts cleanly', () => {
        hud.mount(container);
        hud.unmount();
        expect(container.querySelector('.hud')).toBeNull();
    });

    it('renders timer element with initial value', () => {
        hud.mount(container);
        const timer = container.querySelector('.hud__timer');
        expect(timer).not.toBeNull();
        expect(timer!.textContent).toBe('0:00');
    });

    it('renders step counter element with initial value', () => {
        hud.mount(container);
        const steps = container.querySelector('.hud__steps');
        expect(steps).not.toBeNull();
        expect(steps!.textContent).toBe('Steps: 0');
    });

    it('renders minimap wrapper element', () => {
        hud.mount(container);
        const minimap = container.querySelector('.hud__minimap');
        expect(minimap).not.toBeNull();
    });

    it('updates step counter from solver state', () => {
        hud.mount(container);
        hud.update(
            makeState({
                solver: {
                    status: 'running',
                    visited: new Set(),
                    frontier: new Set(),
                    path: [],
                    current: null,
                    stepCount: 42,
                },
            })
        );
        const steps = container.querySelector('.hud__steps');
        expect(steps!.textContent).toBe('Steps: 42');
    });

    it('hides minimap in top-down view', () => {
        hud.mount(container);
        hud.update(makeState({ viewMode: 'top-down' }));
        const minimap = container.querySelector<HTMLElement>('.hud__minimap')!;
        expect(minimap.style.display).toBe('none');
    });

    it('hides minimap in isometric view', () => {
        hud.mount(container);
        hud.update(makeState({ viewMode: 'isometric' }));
        const minimap = container.querySelector<HTMLElement>('.hud__minimap')!;
        expect(minimap.style.display).toBe('none');
    });

    it('shows minimap in first-person view', () => {
        hud.mount(container);
        hud.update(makeState({ viewMode: 'first-person' }));
        const minimap = container.querySelector<HTMLElement>('.hud__minimap')!;
        expect(minimap.style.display).toBe('block');
    });

    it('shows minimap in third-person view', () => {
        hud.mount(container);
        hud.update(makeState({ viewMode: 'third-person' }));
        const minimap = container.querySelector<HTMLElement>('.hud__minimap')!;
        expect(minimap.style.display).toBe('block');
    });

    it('draws to minimap canvas when grid is present in 3D view', () => {
        hud.mount(container);
        const grid = createGrid(5, 5);
        hud.update(makeState({ viewMode: 'first-person', grid }));
        expect(ctxMock.fillRect).toHaveBeenCalled();
    });

    it('notifyGenerated resets elapsed time tracking', () => {
        hud.mount(container);
        // Should not throw and timer should still display
        expect(() => hud.notifyGenerated()).not.toThrow();
        const timer = container.querySelector('.hud__timer');
        expect(timer).not.toBeNull();
    });

    it('notifySolveStarted does not throw', () => {
        hud.mount(container);
        expect(() => hud.notifySolveStarted()).not.toThrow();
    });
});
