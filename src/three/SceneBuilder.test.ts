import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createGrid, removeWall } from '../grid';
import { SceneBuilder } from './SceneBuilder';
import {
    floorMaterial,
    startMaterial,
    endMaterial,
    visitedMaterial,
    backtrackedMaterial,
    pathMaterial,
} from './materials';

describe('SceneBuilder', () => {
    let builder: SceneBuilder;

    beforeEach(() => {
        builder = new SceneBuilder();
    });

    it('creates a THREE.Scene on construction', () => {
        expect(builder.scene).toBeInstanceOf(THREE.Scene);
    });

    it('adds ambient and directional lights', () => {
        const lights = builder.scene.children.filter(c => c instanceof THREE.Light);
        const types = lights.map(l => l.type);
        expect(types).toContain('AmbientLight');
        expect(types).toContain('DirectionalLight');
    });

    describe('build()', () => {
        it('populates the scene with mesh children', () => {
            const grid = createGrid(3, 3);
            builder.build(grid);
            const meshes = [] as THREE.Mesh[];
            builder.scene.traverse(obj => {
                if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
            });
            expect(meshes.length).toBeGreaterThan(0);
        });

        it('disposes old group and rebuilds on second call', () => {
            const grid1 = createGrid(2, 2);
            builder.build(grid1);
            const countAfterFirst = builder.scene.children.length;

            const grid2 = createGrid(3, 3);
            builder.build(grid2);
            // Scene should still contain a group (old one removed, new one added)
            expect(builder.scene.children.length).toBeGreaterThanOrEqual(1);
            // The group for grid2 has more floor tiles
            let floors = 0;
            builder.scene.traverse(obj => {
                const m = obj as THREE.Mesh;
                if (m.isMesh) {
                    const geo = m.geometry as THREE.BoxGeometry;
                    if (Math.abs(geo.parameters.height - 0.1) < 0.001) floors++;
                }
            });
            expect(floors).toBe(9); // 3×3
            void countAfterFirst; // suppress unused warning
        });

        it('indexes floor tiles correctly', () => {
            const grid = createGrid(2, 2);
            builder.build(grid);
            // After building we should be able to call updateSolver without errors
            expect(() =>
                builder.updateSolver({
                    status: 'idle',
                    visited: new Set(),
                    frontier: new Set(),
                    path: [],
                    current: null,
                    stepCount: 0,
                })
            ).not.toThrow();
        });
    });

    describe('updateSolver()', () => {
        it('sets visited floor tiles to backtrackedMaterial', () => {
            const grid = createGrid(2, 2);
            removeWall(grid, grid.cells[0][0], grid.cells[0][1]);
            builder.build(grid);

            const visitedCell = grid.cells[0][1];
            builder.updateSolver({
                status: 'running',
                visited: new Set([visitedCell]),
                frontier: new Set(),
                path: [],
                current: null,
                stepCount: 1,
            });

            // Find floor tile for (0,1)
            let tile: THREE.Mesh | undefined;
            builder.scene.traverse(obj => {
                const m = obj as THREE.Mesh;
                if (!m.isMesh) return;
                const geo = m.geometry as THREE.BoxGeometry;
                if (Math.abs(geo.parameters.height - 0.1) < 0.001) {
                    if (m.position.x === 2 && m.position.z === 0) tile = m;
                }
            });

            expect(tile).toBeDefined();
            expect(tile!.material).toBe(backtrackedMaterial);
        });

        it('sets path floor tiles to pathMaterial', () => {
            const grid = createGrid(2, 2);
            builder.build(grid);

            const pathCell = grid.cells[1][1];
            builder.updateSolver({
                status: 'complete',
                visited: new Set(),
                frontier: new Set(),
                path: [pathCell],
                current: null,
                stepCount: 5,
            });

            let tile: THREE.Mesh | undefined;
            builder.scene.traverse(obj => {
                const m = obj as THREE.Mesh;
                if (!m.isMesh) return;
                const geo = m.geometry as THREE.BoxGeometry;
                if (Math.abs(geo.parameters.height - 0.1) < 0.001) {
                    if (m.position.x === 2 && m.position.z === 2) tile = m;
                }
            });

            expect(tile).toBeDefined();
            expect(tile!.material).toBe(pathMaterial);
        });

        it('current cell receives visitedMaterial', () => {
            const grid = createGrid(2, 2);
            builder.build(grid);

            const currentCell = grid.cells[0][1];
            builder.updateSolver({
                status: 'running',
                visited: new Set(),
                frontier: new Set(),
                path: [],
                current: currentCell,
                stepCount: 1,
            });

            let tile: THREE.Mesh | undefined;
            builder.scene.traverse(obj => {
                const m = obj as THREE.Mesh;
                if (!m.isMesh) return;
                const geo = m.geometry as THREE.BoxGeometry;
                if (Math.abs(geo.parameters.height - 0.1) < 0.001) {
                    if (m.position.x === 2 && m.position.z === 0) tile = m;
                }
            });

            expect(tile).toBeDefined();
            expect(tile!.material).toBe(visitedMaterial);
        });
        it('keeps start and end highlights on tiles the solver has not touched', () => {
            const grid = createGrid(2, 2);
            builder.build(grid);
            builder.updateSolver({
                status: 'running',
                visited: new Set(),
                frontier: new Set(),
                path: [],
                current: null,
                stepCount: 1,
            });

            const tileAt = (x: number, z: number) => {
                let tile: THREE.Mesh | undefined;
                builder.scene.traverse(obj => {
                    const m = obj as THREE.Mesh;
                    if (!m.isMesh) return;
                    const geo = m.geometry as THREE.BoxGeometry;
                    if (Math.abs(geo.parameters.height - 0.1) < 0.001) {
                        if (m.position.x === x && m.position.z === z) tile = m;
                    }
                });
                return tile;
            };
            expect(tileAt(0, 0)!.material).toBe(startMaterial);
            expect(tileAt(2, 2)!.material).toBe(endMaterial);
        });
    });

    describe('resetSolverOverlay()', () => {
        it('restores non-start/end floor tiles to floorMaterial', () => {
            const grid = createGrid(2, 2);
            builder.build(grid);

            const visitedCell = grid.cells[0][1];
            builder.updateSolver({
                status: 'running',
                visited: new Set([visitedCell]),
                frontier: new Set(),
                path: [],
                current: null,
                stepCount: 1,
            });
            builder.resetSolverOverlay();

            let tile: THREE.Mesh | undefined;
            builder.scene.traverse(obj => {
                const m = obj as THREE.Mesh;
                if (!m.isMesh) return;
                const geo = m.geometry as THREE.BoxGeometry;
                if (Math.abs(geo.parameters.height - 0.1) < 0.001) {
                    if (m.position.x === 2 && m.position.z === 0) tile = m;
                }
            });

            expect(tile).toBeDefined();
            expect(tile!.material).toBe(floorMaterial);
        });
    });

    describe('dispose()', () => {
        it('removes the maze group from the scene', () => {
            const grid = createGrid(2, 2);
            builder.build(grid);
            builder.dispose();

            let meshCount = 0;
            builder.scene.traverse(obj => {
                if ((obj as THREE.Mesh).isMesh) meshCount++;
            });
            expect(meshCount).toBe(0);
        });

        it('does not throw when called without a prior build', () => {
            expect(() => builder.dispose()).not.toThrow();
        });
    });
});
