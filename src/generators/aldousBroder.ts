import { type Grid, type Cell, getCell, removeWall } from '../grid';
import type { GeneratorStep } from './types';

const DIRS: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
];

/** Aldous-Broder: a random walk that carves whenever it enters an unvisited cell. */
export function* aldousBroder(grid: Grid): Generator<GeneratorStep> {
    const total = grid.rows * grid.cols;
    const visited = new Set<Cell>();

    let current =
        grid.cells[Math.floor(Math.random() * grid.rows)][Math.floor(Math.random() * grid.cols)];
    current.visited = true;
    visited.add(current);
    yield { current, visited };

    while (visited.size < total) {
        const options: Cell[] = [];
        for (const [dr, dc] of DIRS) {
            const n = getCell(grid, current.row + dr, current.col + dc);
            if (n) options.push(n);
        }
        const next = options[Math.floor(Math.random() * options.length)];

        if (!visited.has(next)) {
            removeWall(grid, current, next);
            next.visited = true;
            visited.add(next);
            yield { current: next, visited };
        }
        current = next;
    }
}
