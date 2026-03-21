import type { Grid } from './grid';
import { getCell } from './grid';

export type Direction = 'N' | 'S' | 'E' | 'W';

export interface WorldPosition {
    x: number;
    y: number;
    z: number;
}

/** Delta row/col for each direction. */
const DELTA: Record<Direction, { dr: number; dc: number }> = {
    N: { dr: -1, dc: 0 },
    S: { dr: 1, dc: 0 },
    E: { dr: 0, dc: 1 },
    W: { dr: 0, dc: -1 },
};

export class Player {
    row: number;
    col: number;
    facing: Direction;
    /** World position used for smooth 3D interpolation (one unit per cell). */
    worldPosition: WorldPosition;

    constructor(row = 0, col = 0, facing: Direction = 'S') {
        this.row = row;
        this.col = col;
        this.facing = facing;
        this.worldPosition = { x: col, y: 0, z: row };
    }

    /**
     * Attempt to move one cell in the given direction.
     * Returns `true` if movement succeeded (no wall blocked), `false` otherwise.
     * On success, updates grid position, facing direction, and world position.
     */
    move(direction: Direction, grid: Grid): boolean {
        const cell = getCell(grid, this.row, this.col);
        if (!cell) return false;

        // Block if the wall in that direction is still up.
        if (cell.walls[direction]) return false;

        const { dr, dc } = DELTA[direction];
        const nextRow = this.row + dr;
        const nextCol = this.col + dc;

        const nextCell = getCell(grid, nextRow, nextCol);
        if (!nextCell) return false;

        this.row = nextRow;
        this.col = nextCol;
        this.facing = direction;
        this.worldPosition = { x: nextCol, y: 0, z: nextRow };
        return true;
    }

    /** Reset player to a given grid position (e.g. after maze regeneration). */
    reset(row: number, col: number, facing: Direction = 'S'): void {
        this.row = row;
        this.col = col;
        this.facing = facing;
        this.worldPosition = { x: col, y: 0, z: row };
    }
}
