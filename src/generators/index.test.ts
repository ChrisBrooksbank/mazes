import { describe, it, expect } from 'vitest';
import { createGrid } from '../grid';
import { getGenerator, generatorNames, type GeneratorName } from './index';

function runToCompletion(name: GeneratorName) {
    const grid = createGrid(10, 10);
    const gen = getGenerator(name)(grid);
    let lastVisitedSize = 0;
    while (true) {
        const result = gen.next();
        if (result.done) break;
        lastVisitedSize = result.value.visited.size;
    }
    return { grid, lastVisitedSize };
}

describe('generator registry', () => {
    it('exports all three generator names', () => {
        expect(generatorNames).toContain('recursive-backtracker');
        expect(generatorNames).toContain('prims');
        expect(generatorNames).toContain('kruskals');
        expect(generatorNames).toHaveLength(3);
    });

    it('getGenerator returns a function for each name', () => {
        for (const name of generatorNames) {
            expect(typeof getGenerator(name)).toBe('function');
        }
    });

    for (const name of ['recursive-backtracker', 'prims', 'kruskals'] as GeneratorName[]) {
        describe(name, () => {
            it('produces a perfect maze: all cells visited on 10x10 grid', () => {
                const { lastVisitedSize } = runToCompletion(name);
                expect(lastVisitedSize).toBe(10 * 10);
            });

            it('all cells have visited=true after completion', () => {
                const { grid } = runToCompletion(name);
                for (let r = 0; r < grid.rows; r++) {
                    for (let c = 0; c < grid.cols; c++) {
                        expect(grid.cells[r][c].visited).toBe(true);
                    }
                }
            });

            it('produces exactly rows*cols-1 passages (spanning tree)', () => {
                const { grid } = runToCompletion(name);
                let removedWalls = 0;
                for (let r = 0; r < grid.rows; r++) {
                    for (let c = 0; c < grid.cols; c++) {
                        const cell = grid.cells[r][c];
                        if (!cell.walls.S) removedWalls++;
                        if (!cell.walls.E) removedWalls++;
                    }
                }
                expect(removedWalls).toBe(grid.rows * grid.cols - 1);
            });
        });
    }
});
