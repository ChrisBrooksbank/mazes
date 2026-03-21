import { describe, it, expect } from 'vitest';
import { createGrid, getCell, removeWall } from './grid';

describe('createGrid', () => {
    it('creates a grid with correct dimensions', () => {
        const grid = createGrid(5, 7);
        expect(grid.rows).toBe(5);
        expect(grid.cols).toBe(7);
        expect(grid.cells.length).toBe(5);
        expect(grid.cells[0].length).toBe(7);
    });

    it('initialises all walls to true', () => {
        const grid = createGrid(3, 3);
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const cell = grid.cells[r][c];
                expect(cell.walls.N).toBe(true);
                expect(cell.walls.S).toBe(true);
                expect(cell.walls.E).toBe(true);
                expect(cell.walls.W).toBe(true);
            }
        }
    });

    it('sets visited to false for all cells', () => {
        const grid = createGrid(3, 3);
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                expect(grid.cells[r][c].visited).toBe(false);
            }
        }
    });

    it('marks top-left cell as start', () => {
        const grid = createGrid(5, 5);
        expect(grid.cells[0][0].isStart).toBe(true);
        expect(grid.cells[0][1].isStart).toBe(false);
    });

    it('marks bottom-right cell as end', () => {
        const grid = createGrid(5, 5);
        expect(grid.cells[4][4].isEnd).toBe(true);
        expect(grid.cells[4][3].isEnd).toBe(false);
    });

    it('sets correct row/col on each cell', () => {
        const grid = createGrid(3, 4);
        expect(grid.cells[2][3].row).toBe(2);
        expect(grid.cells[2][3].col).toBe(3);
    });
});

describe('getCell', () => {
    it('returns the cell at valid coordinates', () => {
        const grid = createGrid(3, 3);
        const cell = getCell(grid, 1, 2);
        expect(cell).toBeDefined();
        expect(cell!.row).toBe(1);
        expect(cell!.col).toBe(2);
    });

    it('returns undefined for out-of-bounds coordinates', () => {
        const grid = createGrid(3, 3);
        expect(getCell(grid, -1, 0)).toBeUndefined();
        expect(getCell(grid, 0, -1)).toBeUndefined();
        expect(getCell(grid, 3, 0)).toBeUndefined();
        expect(getCell(grid, 0, 3)).toBeUndefined();
    });
});

describe('removeWall', () => {
    it('removes wall between horizontally adjacent cells (east/west)', () => {
        const grid = createGrid(3, 3);
        const a = grid.cells[1][1];
        const b = grid.cells[1][2]; // east of a
        removeWall(grid, a, b);
        expect(grid.cells[1][1].walls.E).toBe(false);
        expect(grid.cells[1][2].walls.W).toBe(false);
        // other walls untouched
        expect(grid.cells[1][1].walls.N).toBe(true);
        expect(grid.cells[1][1].walls.S).toBe(true);
        expect(grid.cells[1][1].walls.W).toBe(true);
    });

    it('removes wall between vertically adjacent cells (north/south)', () => {
        const grid = createGrid(3, 3);
        const a = grid.cells[1][1];
        const b = grid.cells[0][1]; // north of a
        removeWall(grid, a, b);
        expect(grid.cells[1][1].walls.N).toBe(false);
        expect(grid.cells[0][1].walls.S).toBe(false);
    });

    it('handles west neighbour', () => {
        const grid = createGrid(3, 3);
        const a = grid.cells[1][1];
        const b = grid.cells[1][0]; // west of a
        removeWall(grid, a, b);
        expect(grid.cells[1][1].walls.W).toBe(false);
        expect(grid.cells[1][0].walls.E).toBe(false);
    });

    it('handles south neighbour', () => {
        const grid = createGrid(3, 3);
        const a = grid.cells[1][1];
        const b = grid.cells[2][1]; // south of a
        removeWall(grid, a, b);
        expect(grid.cells[1][1].walls.S).toBe(false);
        expect(grid.cells[2][1].walls.N).toBe(false);
    });
});
