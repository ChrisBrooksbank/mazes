import * as THREE from 'three';
import type { Grid, Cell } from '../grid';
import type { SolverState } from '../state';
import {
    floorMaterial,
    startMaterial,
    endMaterial,
    visitedMaterial,
    backtrackedMaterial,
    pathMaterial,
} from './materials';
import { CELL_SIZE, buildMazeGroup, disposeGroup } from './geometries';

/**
 * SceneBuilder manages a Three.js Scene for a maze grid.
 *
 * - `build(grid)` creates (or rebuilds) the scene with wall meshes, floor tiles,
 *   ambient and directional lighting.  The maze mesh group is cached; calling
 *   `build` again with a different grid disposes the old group first.
 * - `updateSolver(solverState)` swaps floor-tile materials to reflect solver
 *   progress without touching geometry.
 * - `dispose()` cleans up all GPU resources.
 */
export class SceneBuilder {
    readonly scene: THREE.Scene;

    private mazeGroup: THREE.Group | null = null;
    private currentGrid: Grid | null = null;

    /** Map from "row,col" key → floor tile mesh for fast solver lookups. */
    private floorTileMap: Map<string, THREE.Mesh> = new Map();

    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        this._addLighting();
    }

    private _addLighting(): void {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(10, 20, 10);
        this.scene.add(dir);
    }

    /**
     * Build (or rebuild) the scene for the given grid.
     * Disposes any previously cached geometry before creating new meshes.
     */
    build(grid: Grid): void {
        // Dispose previous group if rebuilding for a new grid
        if (this.mazeGroup) {
            disposeGroup(this.mazeGroup);
            this.scene.remove(this.mazeGroup);
        }

        this.currentGrid = grid;
        this.floorTileMap = new Map();

        this.mazeGroup = buildMazeGroup(grid);
        this.scene.add(this.mazeGroup);

        // Index floor tiles for solver overlay
        this.mazeGroup.traverse(obj => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            const geo = mesh.geometry as THREE.BoxGeometry;
            // Floor tiles have height 0.1 (see createFloorTile)
            if (Math.abs(geo.parameters.height - 0.1) < 0.001) {
                // Recover cell position from world position
                const col = Math.round(mesh.position.x / CELL_SIZE);
                const row = Math.round(mesh.position.z / CELL_SIZE);
                this.floorTileMap.set(`${row},${col}`, mesh);
            }
        });
    }

    /**
     * Update floor-tile materials to reflect solver state.
     * Priority: path > current > visited > backtracked > default.
     * Only materials are swapped — geometry is untouched.
     */
    updateSolver(solverState: SolverState): void {
        if (!this.currentGrid) return;

        const { visited, frontier: _frontier, path, current } = solverState;

        // Build a path set for O(1) lookup
        const pathSet = new Set<Cell>(path);

        for (const [key, mesh] of this.floorTileMap) {
            const [rowStr, colStr] = key.split(',');
            const row = Number(rowStr);
            const col = Number(colStr);
            const cell = this.currentGrid.cells[row]?.[col];
            if (!cell) continue;

            // Determine base material for this cell
            let baseMaterial: THREE.Material;
            if (pathSet.has(cell)) {
                baseMaterial = pathMaterial;
            } else if (cell === current) {
                baseMaterial = visitedMaterial;
            } else if (visited.has(cell)) {
                baseMaterial = backtrackedMaterial;
            } else {
                baseMaterial = floorMaterial;
            }

            mesh.material = baseMaterial;
        }
    }

    /**
     * Reset all floor tiles to their default (non-solver) materials.
     */
    resetSolverOverlay(): void {
        if (!this.currentGrid) return;

        for (const [key, mesh] of this.floorTileMap) {
            const [rowStr, colStr] = key.split(',');
            const row = Number(rowStr);
            const col = Number(colStr);
            const cell = this.currentGrid.cells[row]?.[col];
            if (!cell) continue;
            if (cell.isStart) {
                mesh.material = startMaterial;
            } else if (cell.isEnd) {
                mesh.material = endMaterial;
            } else {
                mesh.material = floorMaterial;
            }
        }
    }

    /**
     * Dispose all GPU resources owned by this SceneBuilder.
     */
    dispose(): void {
        if (this.mazeGroup) {
            disposeGroup(this.mazeGroup);
            this.scene.remove(this.mazeGroup);
            this.mazeGroup = null;
        }
        this.floorTileMap.clear();
        this.currentGrid = null;
    }
}
