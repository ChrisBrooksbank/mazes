import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGrid } from '../grid';
import { recursiveBacktracker } from '../generators/recursiveBacktracker';
import { getSolver, solverNames, SOLVER_COLORS, type SolverName } from './index';
import { SolverAnimationLoop } from './animationLoop';

function generateMaze(rows: number, cols: number) {
    const grid = createGrid(rows, cols);
    const gen = recursiveBacktracker(grid);
    for (const _ of gen) void _;
    return grid;
}

// ── Registry tests ─────────────────────────────────────────────────────────────

describe('solver registry', () => {
    it('exports all four solver names', () => {
        expect(solverNames).toContain('bfs');
        expect(solverNames).toContain('dfs');
        expect(solverNames).toContain('astar');
        expect(solverNames).toContain('wall-follower');
        expect(solverNames).toHaveLength(4);
    });

    it('getSolver returns a function for each name', () => {
        for (const name of solverNames) {
            expect(typeof getSolver(name)).toBe('function');
        }
    });

    for (const name of ['bfs', 'dfs', 'astar', 'wall-follower'] as SolverName[]) {
        describe(name, () => {
            it('finds a path from start to end', () => {
                const grid = generateMaze(5, 5);
                const gen = getSolver(name)(grid);
                let finalStep = gen.next();
                while (true) {
                    const next = gen.next();
                    if (next.done) break;
                    finalStep = next;
                }
                expect(finalStep.value!.path.length).toBeGreaterThan(0);
                expect(finalStep.value!.path[0].row).toBe(0);
                expect(finalStep.value!.path[0].col).toBe(0);
                expect(finalStep.value!.path[finalStep.value!.path.length - 1].row).toBe(4);
                expect(finalStep.value!.path[finalStep.value!.path.length - 1].col).toBe(4);
            });
        });
    }
});

// ── SOLVER_COLORS tests ────────────────────────────────────────────────────────

describe('SOLVER_COLORS', () => {
    it('has visited (blue), backtracked (gray), path (gold)', () => {
        expect(SOLVER_COLORS.visited).toBe('#3B82F6');
        expect(SOLVER_COLORS.backtracked).toBe('#9CA3AF');
        expect(SOLVER_COLORS.path).toBe('#F59E0B');
    });
});

// ── SolverAnimationLoop tests ──────────────────────────────────────────────────

describe('SolverAnimationLoop', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calls onStep during animation and onComplete at the end', () => {
        const grid = generateMaze(4, 4);
        const onStep = vi.fn();
        const onComplete = vi.fn();
        const loop = new SolverAnimationLoop({ onStep, onComplete });

        loop.speed = 100; // 100 steps/s → 10ms per step
        loop.start(grid, getSolver('bfs'));

        vi.runAllTimers();

        expect(onStep).toHaveBeenCalled();
        expect(onComplete).toHaveBeenCalledOnce();
        const finalState = onComplete.mock.calls[0][0];
        expect(finalState.status).toBe('complete');
        expect(finalState.path.length).toBeGreaterThan(0);
    });

    it('pause stops scheduling new steps', () => {
        const grid = generateMaze(4, 4);
        const onStep = vi.fn();
        const loop = new SolverAnimationLoop({ onStep, onComplete: vi.fn() });

        loop.speed = 100;
        loop.start(grid, getSolver('bfs'));

        vi.advanceTimersByTime(30); // ~3 steps
        const countAfterPause = onStep.mock.calls.length;
        loop.pause();
        vi.advanceTimersByTime(500);
        expect(onStep.mock.calls.length).toBe(countAfterPause);
    });

    it('resume continues after pause', () => {
        const grid = generateMaze(4, 4);
        const onComplete = vi.fn();
        const loop = new SolverAnimationLoop({ onStep: vi.fn(), onComplete });

        loop.speed = 100;
        loop.start(grid, getSolver('bfs'));

        vi.advanceTimersByTime(20);
        loop.pause();
        expect(onComplete).not.toHaveBeenCalled();

        loop.resume();
        vi.runAllTimers();
        expect(onComplete).toHaveBeenCalledOnce();
    });

    it('complete() drains all steps synchronously', () => {
        const grid = generateMaze(5, 5);
        const onComplete = vi.fn();
        const loop = new SolverAnimationLoop({ onStep: vi.fn(), onComplete });

        loop.speed = 1; // very slow
        loop.start(grid, getSolver('bfs'));

        // Only a tiny tick — not enough to finish
        vi.advanceTimersByTime(5);
        expect(onComplete).not.toHaveBeenCalled();

        loop.complete();
        expect(onComplete).toHaveBeenCalledOnce();
        expect(onComplete.mock.calls[0][0].status).toBe('complete');
    });

    it('complete() finishes when the solver has no steps left (unsolvable maze)', () => {
        // All walls up: the solver yields one step then gives up without a path
        const grid = createGrid(3, 3);
        const onComplete = vi.fn();
        const loop = new SolverAnimationLoop({ onStep: vi.fn(), onComplete });

        loop.speed = 1;
        loop.start(grid, getSolver('bfs'));
        vi.advanceTimersByTime(1000); // consume the only step

        loop.complete();
        expect(loop.getStatus()).toBe('complete');
        expect(onComplete).toHaveBeenCalledOnce();
    });

    it('stepCount increments with each step', () => {
        const grid = generateMaze(4, 4);
        const steps: number[] = [];
        const loop = new SolverAnimationLoop({
            onStep: s => steps.push(s.stepCount),
            onComplete: vi.fn(),
        });

        loop.speed = 100;
        loop.start(grid, getSolver('bfs'));
        vi.runAllTimers();

        for (let i = 1; i < steps.length; i++) {
            expect(steps[i]).toBeGreaterThan(steps[i - 1]);
        }
    });

    it('stop() resets state', () => {
        const grid = generateMaze(4, 4);
        const onComplete = vi.fn();
        const loop = new SolverAnimationLoop({ onStep: vi.fn(), onComplete });

        loop.speed = 100;
        loop.start(grid, getSolver('bfs'));
        vi.advanceTimersByTime(20);
        loop.stop();
        vi.runAllTimers();

        expect(onComplete).not.toHaveBeenCalled();
        expect(loop.getStatus()).toBe('idle');
    });
});
