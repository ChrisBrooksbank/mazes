import { describe, it, expect } from 'vitest';
import { createGrid } from '../grid';
import { recursiveBacktracker } from '../generators/recursiveBacktracker';
import { wallFollower } from './wallFollower';

function generateMaze(rows: number, cols: number) {
    const grid = createGrid(rows, cols);
    const gen = recursiveBacktracker(grid);
    for (const _ of gen) {
        void _;
    }
    return grid;
}

function runToEnd(rows: number, cols: number) {
    const grid = generateMaze(rows, cols);
    const gen = wallFollower(grid);
    let finalStep = gen.next();
    while (true) {
        const next = gen.next();
        if (next.done) break;
        finalStep = next;
    }
    return finalStep.value!;
}

describe('wallFollower', () => {
    it('yields SolverStep with required fields', () => {
        const grid = generateMaze(5, 5);
        const gen = wallFollower(grid);
        const step = gen.next();
        expect(step.done).toBe(false);
        expect(step.value).toBeDefined();
        expect(step.value!.current).toBeDefined();
        expect(step.value!.visited).toBeInstanceOf(Set);
        expect(step.value!.frontier).toBeInstanceOf(Set);
        expect(Array.isArray(step.value!.path)).toBe(true);
    });

    it('first step starts at top-left cell', () => {
        const grid = generateMaze(5, 5);
        const gen = wallFollower(grid);
        const step = gen.next();
        expect(step.value!.current.row).toBe(0);
        expect(step.value!.current.col).toBe(0);
    });

    it('finds path from start to end', () => {
        const step = runToEnd(5, 5);
        expect(step.path.length).toBeGreaterThan(0);
    });

    it('path starts at top-left and ends at bottom-right', () => {
        const step = runToEnd(5, 5);
        const { path } = step;
        expect(path.length).toBeGreaterThan(0);
        expect(path[0].row).toBe(0);
        expect(path[0].col).toBe(0);
        expect(path[path.length - 1].row).toBe(4);
        expect(path[path.length - 1].col).toBe(4);
    });

    it('path is contiguous (each step is a neighbour)', () => {
        const step = runToEnd(10, 10);
        const { path } = step;
        for (let i = 1; i < path.length; i++) {
            const prev = path[i - 1];
            const curr = path[i];
            const dr = Math.abs(curr.row - prev.row);
            const dc = Math.abs(curr.col - prev.col);
            expect(dr + dc).toBe(1);
        }
    });

    it('path cells are passable (no walls between consecutive cells)', () => {
        const step = runToEnd(10, 10);
        const { path } = step;
        for (let i = 1; i < path.length; i++) {
            const prev = path[i - 1];
            const curr = path[i];
            const dr = curr.row - prev.row;
            const dc = curr.col - prev.col;
            if (dr === -1) expect(prev.walls.N).toBe(false);
            else if (dr === 1) expect(prev.walls.S).toBe(false);
            else if (dc === -1) expect(prev.walls.W).toBe(false);
            else if (dc === 1) expect(prev.walls.E).toBe(false);
        }
    });

    it('final step current cell is bottom-right', () => {
        const step = runToEnd(5, 5);
        expect(step.current.row).toBe(4);
        expect(step.current.col).toBe(4);
    });
});
