import { type Grid, type Cell, removeWall } from '../grid';
import type { GeneratorStep } from './types';

/** Eller's algorithm: builds the maze one row at a time using set membership. */
export function* ellers(grid: Grid): Generator<GeneratorStep> {
    const visited = new Set<Cell>();
    let nextId = 1;
    let setOf: number[] = new Array<number>(grid.cols).fill(0);

    const mark = (a: Cell, b: Cell) => {
        a.visited = true;
        b.visited = true;
        visited.add(a);
        visited.add(b);
    };

    for (let r = 0; r < grid.rows; r++) {
        const isLast = r === grid.rows - 1;
        for (let c = 0; c < grid.cols; c++) {
            if (setOf[c] === 0) setOf[c] = nextId++;
        }

        // Randomly join horizontally adjacent cells in different sets (always on last row)
        for (let c = 0; c < grid.cols - 1; c++) {
            if (setOf[c] !== setOf[c + 1] && (isLast || Math.random() < 0.5)) {
                const a = grid.cells[r][c];
                const b = grid.cells[r][c + 1];
                removeWall(grid, a, b);
                const from = setOf[c + 1];
                const to = setOf[c];
                setOf = setOf.map(id => (id === from ? to : id));
                mark(a, b);
                yield { current: b, visited };
            }
        }

        if (isLast) break;

        // Carve at least one vertical connection down from every set
        const bySet = new Map<number, number[]>();
        setOf.forEach((id, c) => {
            const cols = bySet.get(id);
            if (cols) cols.push(c);
            else bySet.set(id, [c]);
        });

        const nextRow: number[] = new Array<number>(grid.cols).fill(0);
        for (const [id, cols] of bySet) {
            const shuffled = [...cols].sort(() => Math.random() - 0.5);
            const count = 1 + Math.floor(Math.random() * shuffled.length);
            for (const c of shuffled.slice(0, count)) {
                const a = grid.cells[r][c];
                const b = grid.cells[r + 1][c];
                removeWall(grid, a, b);
                nextRow[c] = id;
                mark(a, b);
                yield { current: b, visited };
            }
        }
        setOf = nextRow;
    }

    // Degenerate grids (e.g. 1x1) yield nothing above; make sure every cell is marked
    for (const row of grid.cells) {
        for (const cell of row) {
            cell.visited = true;
            visited.add(cell);
        }
    }
}
