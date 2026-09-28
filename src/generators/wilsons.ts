import { type Grid, type Cell, getCell, removeWall } from '../grid';
import type { GeneratorStep } from './types';

const DIRS: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
];

function randomNeighbour(grid: Grid, cell: Cell): Cell {
    const options: Cell[] = [];
    for (const [dr, dc] of DIRS) {
        const n = getCell(grid, cell.row + dr, cell.col + dc);
        if (n) options.push(n);
    }
    return options[Math.floor(Math.random() * options.length)];
}

/** Wilson's algorithm: loop-erased random walks — an unbiased uniform spanning tree. */
export function* wilsons(grid: Grid): Generator<GeneratorStep> {
    const total = grid.rows * grid.cols;
    const inMaze = new Set<Cell>();
    const remaining: Cell[] = grid.cells.flat();

    const first = remaining[Math.floor(Math.random() * remaining.length)];
    first.visited = true;
    inMaze.add(first);
    yield { current: first, visited: inMaze };

    while (inMaze.size < total) {
        // Pick a random cell not yet in the maze (lazily discard ones that are)
        let start: Cell;
        do {
            const idx = Math.floor(Math.random() * remaining.length);
            start = remaining[idx];
            if (inMaze.has(start)) {
                remaining[idx] = remaining[remaining.length - 1];
                remaining.pop();
            }
        } while (inMaze.has(start));

        // Random walk until we hit the maze; overwriting `next` erases loops
        const next = new Map<Cell, Cell>();
        let cur = start;
        while (!inMaze.has(cur)) {
            const step = randomNeighbour(grid, cur);
            next.set(cur, step);
            cur = step;
        }

        // Carve the loop-erased path
        cur = start;
        while (!inMaze.has(cur)) {
            const step = next.get(cur)!;
            removeWall(grid, cur, step);
            cur.visited = true;
            inMaze.add(cur);
            yield { current: cur, visited: inMaze };
            cur = step;
        }
    }
}
