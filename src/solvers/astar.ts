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

function heuristic(a: Cell, b: Cell): number {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
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

export function* astar(grid: Grid): Generator<SolverStep> {
    const start = grid.cells[0][0];
    const end = grid.cells[grid.rows - 1][grid.cols - 1];

    const visited = new Set<Cell>();
    const frontier = new Set<Cell>();
    const parents = new Map<Cell, Cell | null>();
    const gScore = new Map<Cell, number>();
    const fScore = new Map<Cell, number>();

    // Open set implemented as a sorted array (small mazes — sufficient performance)
    const openSet: Cell[] = [start];

    parents.set(start, null);
    gScore.set(start, 0);
    fScore.set(start, heuristic(start, end));
    frontier.add(start);

    while (openSet.length > 0) {
        // Pick node with lowest fScore
        openSet.sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity));
        const current = openSet.shift()!;
        frontier.delete(current);
        visited.add(current);

        yield { current, visited: new Set(visited), frontier: new Set(frontier), path: [] };

        if (current === end) {
            const path = reconstructPath(parents, end);
            yield { current, visited: new Set(visited), frontier: new Set(frontier), path };
            return;
        }

        for (const neighbour of getPassableNeighbours(grid, current)) {
            if (visited.has(neighbour)) continue;

            const tentativeG = (gScore.get(current) ?? Infinity) + 1;

            if (tentativeG < (gScore.get(neighbour) ?? Infinity)) {
                parents.set(neighbour, current);
                gScore.set(neighbour, tentativeG);
                fScore.set(neighbour, tentativeG + heuristic(neighbour, end));

                if (!frontier.has(neighbour)) {
                    frontier.add(neighbour);
                    openSet.push(neighbour);
                }
            }
        }
    }
}
