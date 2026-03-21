import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Toolbar } from './Toolbar';
import type { ToolbarOptions } from './Toolbar';

function makeOptions(): ToolbarOptions & {
    onGenerate: ReturnType<typeof vi.fn>;
    onSolve: ReturnType<typeof vi.fn>;
    onViewChange: ReturnType<typeof vi.fn>;
} {
    return {
        onGenerate: vi.fn(),
        onSolve: vi.fn(),
        onViewChange: vi.fn(),
    };
}

describe('Toolbar', () => {
    let container: HTMLElement;
    let options: ReturnType<typeof makeOptions>;
    let toolbar: Toolbar;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        options = makeOptions();
        toolbar = new Toolbar(options);
    });

    it('mounts into the container', () => {
        toolbar.mount(container);
        expect(container.querySelector('.toolbar')).not.toBeNull();
        toolbar.unmount();
    });

    it('unmounts cleanly from the container', () => {
        toolbar.mount(container);
        toolbar.unmount();
        expect(container.querySelector('.toolbar')).toBeNull();
    });

    it('calls onGenerate with correct arguments when Generate is clicked', () => {
        toolbar.mount(container);

        const generateBtn = container.querySelector<HTMLButtonElement>('.toolbar__btn--primary')!;
        generateBtn.click();

        expect(options.onGenerate).toHaveBeenCalledTimes(1);
        const [, rows, cols] = options.onGenerate.mock.calls[0] as [unknown, number, number];
        expect(rows).toBe(15);
        expect(cols).toBe(15);
        toolbar.unmount();
    });

    it('calls onSolve when Solve is clicked (after enabling)', () => {
        toolbar.mount(container);
        toolbar.setSolveEnabled(true);

        const solveBtn = container.querySelector<HTMLButtonElement>('.toolbar__btn--secondary')!;
        solveBtn.click();

        expect(options.onSolve).toHaveBeenCalledTimes(1);
        toolbar.unmount();
    });

    it('Solve button is disabled by default', () => {
        toolbar.mount(container);
        const solveBtn = container.querySelector<HTMLButtonElement>('.toolbar__btn--secondary')!;
        expect(solveBtn.disabled).toBe(true);
        toolbar.unmount();
    });

    it('setSolveEnabled enables and disables the Solve button', () => {
        toolbar.mount(container);
        const solveBtn = container.querySelector<HTMLButtonElement>('.toolbar__btn--secondary')!;

        toolbar.setSolveEnabled(true);
        expect(solveBtn.disabled).toBe(false);

        toolbar.setSolveEnabled(false);
        expect(solveBtn.disabled).toBe(true);
        toolbar.unmount();
    });

    it('calls onViewChange when a view button is clicked', () => {
        toolbar.mount(container);
        const viewBtns = container.querySelectorAll<HTMLButtonElement>('.toolbar__view-btn');
        expect(viewBtns.length).toBe(4);

        viewBtns[0].click();
        expect(options.onViewChange).toHaveBeenCalledWith('top-down');

        viewBtns[1].click();
        expect(options.onViewChange).toHaveBeenCalledWith('isometric');
        toolbar.unmount();
    });

    it('setActiveView highlights the correct view button', () => {
        toolbar.mount(container);
        toolbar.setActiveView('isometric');

        const topBtn = container.querySelector<HTMLButtonElement>('[data-view="top-down"]')!;
        const isoBtn = container.querySelector<HTMLButtonElement>('[data-view="isometric"]')!;

        expect(topBtn.classList.contains('toolbar__view-btn--active')).toBe(false);
        expect(isoBtn.classList.contains('toolbar__view-btn--active')).toBe(true);
        expect(isoBtn.getAttribute('aria-pressed')).toBe('true');
        expect(topBtn.getAttribute('aria-pressed')).toBe('false');
        toolbar.unmount();
    });

    it('getSelectedGenerator returns a valid generator name', () => {
        toolbar.mount(container);
        const gen = toolbar.getSelectedGenerator();
        expect(['recursive-backtracker', 'prims', 'kruskals']).toContain(gen);
        toolbar.unmount();
    });

    it('getSelectedSolver returns a valid solver name', () => {
        toolbar.mount(container);
        const solver = toolbar.getSelectedSolver();
        expect(['bfs', 'dfs', 'astar', 'wall-follower']).toContain(solver);
        toolbar.unmount();
    });

    it('getRows and getCols return default 15', () => {
        toolbar.mount(container);
        expect(toolbar.getRows()).toBe(15);
        expect(toolbar.getCols()).toBe(15);
        toolbar.unmount();
    });

    it('hamburger button is rendered in DOM', () => {
        toolbar.mount(container);
        const hamburger = container.querySelector<HTMLButtonElement>('.toolbar__hamburger')!;
        expect(hamburger).not.toBeNull();
        expect(hamburger.getAttribute('aria-expanded')).toBe('false');
        toolbar.unmount();
    });

    it('clicking hamburger toggles menu open/closed', () => {
        toolbar.mount(container);
        const hamburger = container.querySelector<HTMLButtonElement>('.toolbar__hamburger')!;
        const menu = container.querySelector<HTMLElement>('.toolbar__menu')!;

        expect(menu.classList.contains('toolbar__menu--open')).toBe(false);
        hamburger.click();
        expect(menu.classList.contains('toolbar__menu--open')).toBe(true);
        expect(hamburger.getAttribute('aria-expanded')).toBe('true');

        hamburger.click();
        expect(menu.classList.contains('toolbar__menu--open')).toBe(false);
        expect(hamburger.getAttribute('aria-expanded')).toBe('false');
        toolbar.unmount();
    });

    it('generator dropdown contains all generator names', () => {
        toolbar.mount(container);
        const select = container.querySelector<HTMLSelectElement>('#toolbar-generator')!;
        const values = Array.from(select.options).map(o => o.value);
        expect(values).toContain('recursive-backtracker');
        expect(values).toContain('prims');
        expect(values).toContain('kruskals');
        toolbar.unmount();
    });

    it('solver dropdown contains all solver names', () => {
        toolbar.mount(container);
        const select = container.querySelector<HTMLSelectElement>('#toolbar-solver')!;
        const values = Array.from(select.options).map(o => o.value);
        expect(values).toContain('bfs');
        expect(values).toContain('dfs');
        expect(values).toContain('astar');
        expect(values).toContain('wall-follower');
        toolbar.unmount();
    });
});
