import { describe, it, expect } from 'vitest';
import { createGrid, type Grid } from '../grid';
import { wilsons } from './wilsons';
import { aldousBroder } from './aldousBroder';
import { ellers } from './ellers';

function openPassages(grid: Grid): number {
    let n = 0;
    for (const row of grid.cells) {
        for (const c of row) {
            if (!c.walls.E) n++;
            if (!c.walls.S) n++;
        }
    }
    return n;
}

function reachable(grid: Grid): number {
    const seen = new Set<string>(['0,0']);
    const stack: [number, number][] = [[0, 0]];
    while (stack.length) {
        const [r, c] = stack.pop()!;
        const cell = grid.cells[r][c];
        const moves: [boolean, number, number][] = [
            [!cell.walls.N, r - 1, c],
            [!cell.walls.S, r + 1, c],
            [!cell.walls.W, r, c - 1],
            [!cell.walls.E, r, c + 1],
        ];
        for (const [open, nr, nc] of moves) {
            const key = `${nr},${nc}`;
            if (open && !seen.has(key)) {
                seen.add(key);
                stack.push([nr, nc]);
            }
        }
    }
    return seen.size;
}

const cases = { wilsons, aldousBroder, ellers };

for (const [name, generate] of Object.entries(cases)) {
    describe(name, () => {
        for (const [rows, cols] of [
            [1, 1],
            [1, 6],
            [6, 1],
            [12, 9],
        ]) {
            it(`makes a perfect maze for ${rows}x${cols}`, () => {
                for (let i = 0; i < 20; i++) {
                    const grid = createGrid(rows, cols);
                    const gen = generate(grid);
                    while (!gen.next().done);
                    // Spanning tree: connected with exactly n-1 passages
                    expect(reachable(grid)).toBe(rows * cols);
                    expect(openPassages(grid)).toBe(rows * cols - 1);
                }
            });
        }

        it('marks every cell visited', () => {
            const grid = createGrid(8, 8);
            const gen = generate(grid);
            while (!gen.next().done);
            expect(grid.cells.flat().every(c => c.visited)).toBe(true);
        });
    });
}
