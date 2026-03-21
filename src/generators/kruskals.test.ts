import { describe, it, expect } from 'vitest';
import { createGrid } from '../grid';
import { kruskals } from './kruskals';

function runToCompletion(grid: ReturnType<typeof createGrid>) {
    const gen = kruskals(grid);
    let last: ReturnType<typeof gen.next> | undefined;
    while (true) {
        const result = gen.next();
        last = result;
        if (result.done) break;
    }
    return last;
}

describe('kruskals', () => {
    it('yields GeneratorStep with current cell and visited set', () => {
        const grid = createGrid(5, 5);
        const gen = kruskals(grid);
        const step = gen.next();
        expect(step.done).toBe(false);
        expect(step.value).toBeDefined();
        expect(step.value!.current).toBeDefined();
        expect(step.value!.visited).toBeInstanceOf(Set);
    });

    it('visited set grows over time', () => {
        const grid = createGrid(5, 5);
        const gen = kruskals(grid);
        const first = gen.next();
        const second = gen.next();
        expect(second.value!.visited.size).toBeGreaterThanOrEqual(first.value!.visited.size);
    });

    it('visits all cells (perfect maze — no isolated regions)', () => {
        const grid = createGrid(10, 10);
        const gen = kruskals(grid);
        let lastSize = 0;
        while (true) {
            const result = gen.next();
            if (result.done) break;
            lastSize = result.value.visited.size;
        }
        expect(lastSize).toBe(10 * 10);
    });

    it('produces a perfect maze: all cells visited on 5x5 grid', () => {
        const grid = createGrid(5, 5);
        runToCompletion(grid);
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                expect(grid.cells[r][c].visited).toBe(true);
            }
        }
    });

    it('removes walls between visited cells (perfect maze has rows*cols-1 passages)', () => {
        const grid = createGrid(5, 5);
        runToCompletion(grid);
        let removedWalls = 0;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const cell = grid.cells[r][c];
                if (!cell.walls.S) removedWalls++;
                if (!cell.walls.E) removedWalls++;
            }
        }
        expect(removedWalls).toBe(5 * 5 - 1);
    });
});
