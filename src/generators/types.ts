import type { Cell } from '../grid';

export interface GeneratorStep {
    current: Cell;
    visited: ReadonlySet<Cell>;
}
