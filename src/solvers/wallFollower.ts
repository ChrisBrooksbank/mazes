import { type Grid, type Cell, getCell } from '../grid';
import type { SolverStep } from './types';

type Direction = 'N' | 'E' | 'S' | 'W';

const CLOCKWISE: Direction[] = ['N', 'E', 'S', 'W'];

function turnRight(dir: Direction): Direction {
    return CLOCKWISE[(CLOCKWISE.indexOf(dir) + 1) % 4];
}

function turnLeft(dir: Direction): Direction {
    return CLOCKWISE[(CLOCKWISE.indexOf(dir) + 3) % 4];
}

function turnBack(dir: Direction): Direction {
    return CLOCKWISE[(CLOCKWISE.indexOf(dir) + 2) % 4];
}

function moveInDir(grid: Grid, cell: Cell, dir: Direction): Cell | undefined {
    const dRow = dir === 'N' ? -1 : dir === 'S' ? 1 : 0;
    const dCol = dir === 'E' ? 1 : dir === 'W' ? -1 : 0;
    return getCell(grid, cell.row + dRow, cell.col + dCol);
}

export function* wallFollower(grid: Grid): Generator<SolverStep> {
    const start = grid.cells[0][0];
    const end = grid.cells[grid.rows - 1][grid.cols - 1];

    const visited = new Set<Cell>();
    const route: Cell[] = [start];
    visited.add(start);

    let current = start;
    let facing: Direction = 'E';

    yield { current, visited: new Set(visited), frontier: new Set(), path: [] };

    // Guard against infinite loops (max steps = rows * cols * 4 directions)
    const maxSteps = grid.rows * grid.cols * 4;
    let steps = 0;

    while (current !== end && steps < maxSteps) {
        steps++;

        // Right-hand rule: try right, forward, left, back
        const candidates: Direction[] = [
            turnRight(facing),
            facing,
            turnLeft(facing),
            turnBack(facing),
        ];

        let moved = false;
        for (const dir of candidates) {
            if (!current.walls[dir]) {
                const next = moveInDir(grid, current, dir);
                if (next) {
                    facing = dir;
                    current = next;
                    visited.add(current);
                    route.push(current);
                    moved = true;
                    break;
                }
            }
        }

        if (!moved) break;

        yield { current, visited: new Set(visited), frontier: new Set(), path: [] };
    }

    if (current === end) {
        yield { current, visited: new Set(visited), frontier: new Set(), path: route };
    }
}
