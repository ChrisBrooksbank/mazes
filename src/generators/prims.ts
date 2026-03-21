import { type Grid, type Cell, getCell, removeWall } from '../grid';
import type { GeneratorStep } from './types';

function getNeighbours(grid: Grid, cell: Cell): Cell[] {
    const neighbours: Cell[] = [];
    const dirs: [number, number][] = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ];
    for (const [dr, dc] of dirs) {
        const neighbour = getCell(grid, cell.row + dr, cell.col + dc);
        if (neighbour) neighbours.push(neighbour);
    }
    return neighbours;
}

export function* prims(grid: Grid): Generator<GeneratorStep> {
    const visited = new Set<Cell>();
    // Frontier: unvisited cells adjacent to visited cells, paired with a visited neighbour
    const frontier: { cell: Cell; from: Cell }[] = [];

    const addFrontier = (cell: Cell, from: Cell) => {
        if (!cell.visited) {
            frontier.push({ cell, from });
        }
    };

    const start = grid.cells[0][0];
    start.visited = true;
    visited.add(start);

    for (const neighbour of getNeighbours(grid, start)) {
        addFrontier(neighbour, start);
    }

    while (frontier.length > 0) {
        // Pick a random frontier entry
        const idx = Math.floor(Math.random() * frontier.length);
        const { cell, from } = frontier[idx];
        frontier.splice(idx, 1);

        // Skip if already visited (may have been added multiple times)
        if (cell.visited) continue;

        cell.visited = true;
        visited.add(cell);
        removeWall(grid, from, cell);

        yield { current: cell, visited };

        for (const neighbour of getNeighbours(grid, cell)) {
            addFrontier(neighbour, cell);
        }
    }
}
