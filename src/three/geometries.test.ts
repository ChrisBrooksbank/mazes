import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createGrid, removeWall } from '../grid';
import {
    CELL_SIZE,
    WALL_HEIGHT,
    WALL_THICKNESS,
    createWallMesh,
    createFloorTile,
    buildMazeGroup,
    disposeGroup,
} from './geometries';
import { floorMaterial } from './materials';

describe('createWallMesh', () => {
    it('returns a Mesh with the given dimensions', () => {
        const mesh = createWallMesh(2, 2, 0.15);
        expect(mesh).toBeInstanceOf(THREE.Mesh);
        const geo = mesh.geometry as THREE.BoxGeometry;
        expect(geo.parameters.width).toBe(2);
        expect(geo.parameters.height).toBe(2);
        expect(geo.parameters.depth).toBe(0.15);
    });
});

describe('createFloorTile', () => {
    it('returns a Mesh with the default floor material', () => {
        const mesh = createFloorTile();
        expect(mesh).toBeInstanceOf(THREE.Mesh);
        expect(mesh.material).toBe(floorMaterial);
    });

    it('accepts a custom material', () => {
        const mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const mesh = createFloorTile(mat);
        expect(mesh.material).toBe(mat);
        mat.dispose();
    });
});

describe('buildMazeGroup', () => {
    it('returns a Group with children', () => {
        const grid = createGrid(2, 2);
        const group = buildMazeGroup(grid);
        expect(group).toBeInstanceOf(THREE.Group);
        expect(group.children.length).toBeGreaterThan(0);
    });

    it('positions floor tiles at correct world-space centres', () => {
        const grid = createGrid(3, 3);
        const group = buildMazeGroup(grid);

        // All floor tiles should have y ≈ -0.05
        const floors = group.children.filter(c => {
            const m = c as THREE.Mesh;
            return m.isMesh && (m.geometry as THREE.BoxGeometry).parameters.height === 0.1;
        }) as THREE.Mesh[];

        expect(floors).toHaveLength(9); // 3×3 grid

        // Cell (0,0) → world (0, -0.05, 0)
        const tile00 = floors.find(f => f.position.x === 0 && f.position.z === 0);
        expect(tile00).toBeDefined();
        expect(tile00!.position.y).toBeCloseTo(-0.05);

        // Cell (1,2) → world (2*CELL_SIZE, -0.05, 1*CELL_SIZE)
        const tile12 = floors.find(
            f => f.position.x === 2 * CELL_SIZE && f.position.z === 1 * CELL_SIZE
        );
        expect(tile12).toBeDefined();
    });

    it('produces fewer wall meshes after walls are removed', () => {
        const grid1 = createGrid(2, 2);
        const group1 = buildMazeGroup(grid1);
        const wallsBefore = group1.children.filter(c => {
            const m = c as THREE.Mesh;
            return m.isMesh && (m.geometry as THREE.BoxGeometry).parameters.height === WALL_HEIGHT;
        }).length;

        // Remove the wall between (0,0) and (0,1)
        const grid2 = createGrid(2, 2);
        removeWall(grid2, grid2.cells[0][0], grid2.cells[0][1]);
        const group2 = buildMazeGroup(grid2);
        const wallsAfter = group2.children.filter(c => {
            const m = c as THREE.Mesh;
            return m.isMesh && (m.geometry as THREE.BoxGeometry).parameters.height === WALL_HEIGHT;
        }).length;

        // Removing one shared wall eliminates 2 mesh entries (E of (0,0) + W of (0,1))
        expect(wallsAfter).toBe(wallsBefore - 2);
    });

    it('exposes constants with expected values', () => {
        expect(CELL_SIZE).toBe(2);
        expect(WALL_HEIGHT).toBe(2);
        expect(WALL_THICKNESS).toBeCloseTo(0.15);
    });
});

describe('disposeGroup', () => {
    it('disposes geometry of all meshes without throwing', () => {
        const grid = createGrid(2, 2);
        const group = buildMazeGroup(grid);
        expect(() => disposeGroup(group)).not.toThrow();
    });
});
