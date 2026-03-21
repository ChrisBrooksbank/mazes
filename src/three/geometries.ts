import * as THREE from 'three';
import type { Grid } from '../grid';
import { wallMaterial, floorMaterial, startMaterial, endMaterial } from './materials';

/** World-space size of one maze cell. */
export const CELL_SIZE = 2;

/** Height of wall meshes. */
export const WALL_HEIGHT = 2;

/** Thickness of wall meshes. */
export const WALL_THICKNESS = 0.15;

/**
 * Create a box mesh for a wall segment.
 * @param width  Length of the wall along its axis.
 * @param height Wall height.
 * @param depth  Wall thickness.
 */
export function createWallMesh(width: number, height: number, depth: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    return new THREE.Mesh(geometry, wallMaterial);
}

/**
 * Create a thin flat plane mesh for a single floor cell.
 * @param material  Optional override material (e.g. start/end highlight).
 */
export function createFloorTile(material: THREE.Material = floorMaterial): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(CELL_SIZE, 0.1, CELL_SIZE);
    return new THREE.Mesh(geometry, material);
}

/**
 * Build a THREE.Group containing all wall meshes and floor tiles for the given
 * Grid.  The group can be added directly to a scene.
 *
 * Coordinate system:
 *   - X axis → column direction (east)
 *   - Z axis → row direction (south)
 *   - Y axis → up
 *
 * Cell (row, col) has its centre at world position:
 *   x = col * CELL_SIZE
 *   z = row * CELL_SIZE
 */
export function buildMazeGroup(grid: Grid): THREE.Group {
    const group = new THREE.Group();

    for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
            const cell = grid.cells[r][c];
            const cx = c * CELL_SIZE;
            const cz = r * CELL_SIZE;

            // Floor tile
            const tileMat = cell.isStart ? startMaterial : cell.isEnd ? endMaterial : floorMaterial;
            const floor = createFloorTile(tileMat);
            floor.position.set(cx, -0.05, cz);
            group.add(floor);

            // North wall  (z - CELL_SIZE/2)
            if (cell.walls.N) {
                const mesh = createWallMesh(CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS);
                mesh.position.set(cx, WALL_HEIGHT / 2, cz - CELL_SIZE / 2);
                group.add(mesh);
            }

            // South wall  (z + CELL_SIZE/2)
            if (cell.walls.S) {
                const mesh = createWallMesh(CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS);
                mesh.position.set(cx, WALL_HEIGHT / 2, cz + CELL_SIZE / 2);
                group.add(mesh);
            }

            // West wall   (x - CELL_SIZE/2)
            if (cell.walls.W) {
                const mesh = createWallMesh(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE);
                mesh.position.set(cx - CELL_SIZE / 2, WALL_HEIGHT / 2, cz);
                group.add(mesh);
            }

            // East wall   (x + CELL_SIZE/2)
            if (cell.walls.E) {
                const mesh = createWallMesh(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE);
                mesh.position.set(cx + CELL_SIZE / 2, WALL_HEIGHT / 2, cz);
                group.add(mesh);
            }
        }
    }

    return group;
}

/**
 * Recursively dispose all geometries in a group.  Materials are shared and
 * must be disposed separately via `disposeSharedMaterials`.
 */
export function disposeGroup(group: THREE.Group): void {
    group.traverse(obj => {
        if ((obj as THREE.Mesh).isMesh) {
            (obj as THREE.Mesh).geometry.dispose();
        }
    });
}
