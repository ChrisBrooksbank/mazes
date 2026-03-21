import { describe, it, expect } from 'vitest';
import { createGrid } from '../grid';
import { recursiveBacktracker } from '../generators/recursiveBacktracker';
import { dfs } from './dfs';

function generateMaze(rows: number, cols: number) {
    const grid = createGrid(rows, cols);
    const gen = recursiveBacktracker(grid);
    for (const _ of gen) {
        // drain generator
        void _;
    }
    return grid;
}

describe('dfs', () => {
    it('yields SolverStep with required fields', () => {
        const grid = generateMaze(5, 5);
        const gen = dfs(grid);
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
        const gen = dfs(grid);
        const step = gen.next();
        expect(step.value!.current.row).toBe(0);
        expect(step.value!.current.col).toBe(0);
    });

    it('finds path from start to end', () => {
        const grid = generateMaze(5, 5);
        const gen = dfs(grid);
        let finalStep = gen.next();
        while (true) {
            const next = gen.next();
            if (next.done) break;
            finalStep = next;
        }
        expect(finalStep.value!.path.length).toBeGreaterThan(0);
    });

    it('path starts at top-left and ends at bottom-right', () => {
        const grid = generateMaze(5, 5);
        const gen = dfs(grid);
        let finalStep = gen.next();
        while (true) {
            const next = gen.next();
            if (next.done) break;
            finalStep = next;
        }
        const path = finalStep.value!.path;
        expect(path.length).toBeGreaterThan(0);
        expect(path[0].row).toBe(0);
        expect(path[0].col).toBe(0);
        expect(path[path.length - 1].row).toBe(4);
        expect(path[path.length - 1].col).toBe(4);
    });

    it('path is contiguous (each step is a neighbour)', () => {
        const grid = generateMaze(10, 10);
        const gen = dfs(grid);
        let finalStep = gen.next();
        while (true) {
            const next = gen.next();
            if (next.done) break;
            finalStep = next;
        }
        const path = finalStep.value!.path;
        for (let i = 1; i < path.length; i++) {
            const prev = path[i - 1];
            const curr = path[i];
            const dr = Math.abs(curr.row - prev.row);
            const dc = Math.abs(curr.col - prev.col);
            expect(dr + dc).toBe(1);
        }
    });

    it('path cells are passable (no walls between consecutive cells)', () => {
        const grid = generateMaze(10, 10);
        const gen = dfs(grid);
        let finalStep = gen.next();
        while (true) {
            const next = gen.next();
            if (next.done) break;
            finalStep = next;
        }
        const path = finalStep.value!.path;
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

    it('visited set grows monotonically', () => {
        const grid = generateMaze(5, 5);
        const gen = dfs(grid);
        let prev = gen.next();
        while (true) {
            const next = gen.next();
            if (next.done) break;
            expect(next.value!.visited.size).toBeGreaterThanOrEqual(prev.value!.visited.size);
            prev = next;
        }
    });
});
