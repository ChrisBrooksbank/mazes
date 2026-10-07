interface Walls {
    N: boolean;
    S: boolean;
    E: boolean;
    W: boolean;
}

export interface Cell {
    row: number;
    col: number;
    walls: Walls;
    visited: boolean;
    isStart: boolean;
    isEnd: boolean;
}

export interface Grid {
    rows: number;
    cols: number;
    cells: Cell[][];
}

export function createGrid(rows: number, cols: number): Grid {
    const cells: Cell[][] = [];
    for (let r = 0; r < rows; r++) {
        cells[r] = [];
        for (let c = 0; c < cols; c++) {
            cells[r][c] = {
                row: r,
                col: c,
                walls: { N: true, S: true, E: true, W: true },
                visited: false,
                isStart: r === 0 && c === 0,
                isEnd: r === rows - 1 && c === cols - 1,
            };
        }
    }
    return { rows, cols, cells };
}

export function getCell(grid: Grid, row: number, col: number): Cell | undefined {
    if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) return undefined;
    return grid.cells[row][col];
}

/** Remove the wall between two adjacent cells. Both cells must be neighbours. */
export function removeWall(grid: Grid, a: Cell, b: Cell): void {
    const dr = b.row - a.row;
    const dc = b.col - a.col;

    if (dr === -1) {
        // b is north of a
        grid.cells[a.row][a.col].walls.N = false;
        grid.cells[b.row][b.col].walls.S = false;
    } else if (dr === 1) {
        // b is south of a
        grid.cells[a.row][a.col].walls.S = false;
        grid.cells[b.row][b.col].walls.N = false;
    } else if (dc === -1) {
        // b is west of a
        grid.cells[a.row][a.col].walls.W = false;
        grid.cells[b.row][b.col].walls.E = false;
    } else if (dc === 1) {
        // b is east of a
        grid.cells[a.row][a.col].walls.E = false;
        grid.cells[b.row][b.col].walls.W = false;
    }
}
