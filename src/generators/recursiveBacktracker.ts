import { type Grid, type Cell, getCell, removeWall } from '../grid';
import type { GeneratorStep } from './types';

function getUnvisitedNeighbours(grid: Grid, cell: Cell): Cell[] {
    const neighbours: Cell[] = [];
    const dirs: [number, number][] = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ];
    for (const [dr, dc] of dirs) {
        const neighbour = getCell(grid, cell.row + dr, cell.col + dc);
        if (neighbour && !neighbour.visited) {
            neighbours.push(neighbour);
        }
    }
    return neighbours;
}

export function* recursiveBacktracker(grid: Grid): Generator<GeneratorStep> {
    const visited = new Set<Cell>();
    const stack: Cell[] = [];

    const start = grid.cells[0][0];
    start.visited = true;
    visited.add(start);
    stack.push(start);

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        yield { current, visited };

        const neighbours = getUnvisitedNeighbours(grid, current);
        if (neighbours.length === 0) {
            stack.pop();
        } else {
            const next = neighbours[Math.floor(Math.random() * neighbours.length)];
            removeWall(grid, current, next);
            next.visited = true;
            visited.add(next);
            stack.push(next);
        }
    }
}
