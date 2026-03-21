import { type Grid, type Cell, getCell, removeWall } from '../grid';
import type { GeneratorStep } from './types';

/** Disjoint-set (union-find) with path compression and union by rank. */
class UnionFind {
    private parent: Map<Cell, Cell> = new Map();
    private rank: Map<Cell, number> = new Map();

    add(cell: Cell): void {
        this.parent.set(cell, cell);
        this.rank.set(cell, 0);
    }

    find(cell: Cell): Cell {
        let root = cell;
        while (this.parent.get(root) !== root) {
            root = this.parent.get(root)!;
        }
        // Path compression
        let curr = cell;
        while (curr !== root) {
            const next = this.parent.get(curr)!;
            this.parent.set(curr, root);
            curr = next;
        }
        return root;
    }

    union(a: Cell, b: Cell): void {
        const ra = this.find(a);
        const rb = this.find(b);
        if (ra === rb) return;
        const rankA = this.rank.get(ra)!;
        const rankB = this.rank.get(rb)!;
        if (rankA < rankB) {
            this.parent.set(ra, rb);
        } else if (rankA > rankB) {
            this.parent.set(rb, ra);
        } else {
            this.parent.set(rb, ra);
            this.rank.set(ra, rankA + 1);
        }
    }

    connected(a: Cell, b: Cell): boolean {
        return this.find(a) === this.find(b);
    }
}

/** An edge between two horizontally or vertically adjacent cells. */
interface Edge {
    a: Cell;
    b: Cell;
}

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function* kruskals(grid: Grid): Generator<GeneratorStep> {
    const uf = new UnionFind();
    const edges: Edge[] = [];

    // Initialise union-find and collect all interior edges (S and E neighbours only
    // to avoid duplicates)
    for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
            const cell = grid.cells[r][c];
            uf.add(cell);

            const south = getCell(grid, r + 1, c);
            if (south) edges.push({ a: cell, b: south });

            const east = getCell(grid, r, c + 1);
            if (east) edges.push({ a: cell, b: east });
        }
    }

    shuffle(edges);

    const visited = new Set<Cell>();

    for (const { a, b } of edges) {
        if (!uf.connected(a, b)) {
            uf.union(a, b);
            removeWall(grid, a, b);

            a.visited = true;
            b.visited = true;
            visited.add(a);
            visited.add(b);

            yield { current: b, visited };
        }
    }
}
