import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from './player';
import { createGrid, removeWall } from './grid';
import type { Grid } from './grid';

describe('Player', () => {
    let grid: Grid;

    beforeEach(() => {
        // 3×3 grid, all walls intact by default
        grid = createGrid(3, 3);
    });

    it('initialises at (0, 0) facing south by default', () => {
        const p = new Player();
        expect(p.row).toBe(0);
        expect(p.col).toBe(0);
        expect(p.facing).toBe('S');
        expect(p.worldPosition).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('can be constructed at a specific position and facing', () => {
        const p = new Player(2, 1, 'E');
        expect(p.row).toBe(2);
        expect(p.col).toBe(1);
        expect(p.facing).toBe('E');
        expect(p.worldPosition).toEqual({ x: 1, y: 0, z: 2 });
    });

    it('blocks movement when wall is intact', () => {
        const p = new Player(0, 0, 'S');
        // All walls intact – cannot move in any direction
        expect(p.move('S', grid)).toBe(false);
        expect(p.move('E', grid)).toBe(false);
        expect(p.row).toBe(0);
        expect(p.col).toBe(0);
    });

    it('allows movement when wall is removed', () => {
        // Remove wall between (0,0) and (0,1) — east
        removeWall(grid, grid.cells[0][0], grid.cells[0][1]);
        const p = new Player(0, 0, 'S');
        expect(p.move('E', grid)).toBe(true);
        expect(p.row).toBe(0);
        expect(p.col).toBe(1);
        expect(p.facing).toBe('E');
        expect(p.worldPosition).toEqual({ x: 1, y: 0, z: 0 });
    });

    it('blocks movement at grid boundary', () => {
        const p = new Player(0, 0, 'S');
        // North wall of top-left cell is always a boundary wall (and intact)
        expect(p.move('N', grid)).toBe(false);
        expect(p.move('W', grid)).toBe(false);
    });

    it('updates facing direction on successful move', () => {
        removeWall(grid, grid.cells[1][1], grid.cells[0][1]); // remove N wall of (1,1)
        const p = new Player(1, 1, 'S');
        p.move('N', grid);
        expect(p.facing).toBe('N');
    });

    it('does not update facing direction on blocked move', () => {
        const p = new Player(1, 1, 'S');
        p.move('N', grid); // blocked
        expect(p.facing).toBe('S');
    });

    it('world position tracks grid position (x=col, z=row)', () => {
        removeWall(grid, grid.cells[0][0], grid.cells[1][0]); // south of (0,0)
        const p = new Player(0, 0);
        p.move('S', grid);
        expect(p.worldPosition).toEqual({ x: 0, y: 0, z: 1 });
    });

    it('reset repositions the player', () => {
        const p = new Player(0, 0, 'S');
        p.reset(2, 2, 'N');
        expect(p.row).toBe(2);
        expect(p.col).toBe(2);
        expect(p.facing).toBe('N');
        expect(p.worldPosition).toEqual({ x: 2, y: 0, z: 2 });
    });
});
