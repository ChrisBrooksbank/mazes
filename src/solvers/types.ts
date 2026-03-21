import type { Cell } from '../grid';

export interface SolverStep {
    current: Cell;
    visited: ReadonlySet<Cell>;
    frontier: ReadonlySet<Cell>;
    path: readonly Cell[];
}
