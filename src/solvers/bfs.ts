import { type Grid, type Cell, getCell } from '../grid';
import type { SolverStep } from './types';

function getPassableNeighbours(grid: Grid, cell: Cell): Cell[] {
    const neighbours: Cell[] = [];

    if (!cell.walls.N) {
        const n = getCell(grid, cell.row - 1, cell.col);
        if (n) neighbours.push(n);
    }
    if (!cell.walls.S) {
        const n = getCell(grid, cell.row + 1, cell.col);
        if (n) neighbours.push(n);
    }
    if (!cell.walls.W) {
        const n = getCell(grid, cell.row, cell.col - 1);
        if (n) neighbours.push(n);
    }
    if (!cell.walls.E) {
        const n = getCell(grid, cell.row, cell.col + 1);
        if (n) neighbours.push(n);
    }

    return neighbours;
}

function reconstructPath(parents: Map<Cell, Cell | null>, end: Cell): Cell[] {
    const path: Cell[] = [];
    let current: Cell | null = end;
    while (current !== null) {
        path.unshift(current);
        current = parents.get(current) ?? null;
    }
    return path;
}

export function* bfs(grid: Grid): Generator<SolverStep> {
    const start = grid.cells[0][0];
    const end = grid.cells[grid.rows - 1][grid.cols - 1];

    const visited = new Set<Cell>();
    const frontier = new Set<Cell>();
    const parents = new Map<Cell, Cell | null>();
    const queue: Cell[] = [];

    visited.add(start);
    frontier.add(start);
    parents.set(start, null);
    queue.push(start);

    while (queue.length > 0) {
        const current = queue.shift()!;
        frontier.delete(current);

        yield { current, visited: new Set(visited), frontier: new Set(frontier), path: [] };

        if (current === end) {
            const path = reconstructPath(parents, end);
            yield { current, visited: new Set(visited), frontier: new Set(frontier), path };
            return;
        }

        for (const neighbour of getPassableNeighbours(grid, current)) {
            if (!visited.has(neighbour)) {
                visited.add(neighbour);
                frontier.add(neighbour);
                parents.set(neighbour, current);
                queue.push(neighbour);
            }
        }
    }
}
