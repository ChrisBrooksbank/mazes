/**
 * Rex — a T-Rex that stalks the player through the maze.
 * Homage to 3D Monster Maze (ZX81, 1982).
 *
 * Rex uses BFS to pathfind toward the player, moving one cell at a time
 * on a timer. Proximity triggers ZX81-style warning messages.
 */
import * as THREE from 'three';
import type { Grid } from './grid';
import { getCell } from './grid';
import type { Direction } from './player';
import { CELL_SIZE } from './three/geometries';

// ── Rex pathfinding ──────────────────────────────────────────────────────────

const DELTA: Record<Direction, { dr: number; dc: number }> = {
    N: { dr: -1, dc: 0 },
    S: { dr: 1, dc: 0 },
    E: { dr: 0, dc: 1 },
    W: { dr: 0, dc: -1 },
};

const DIRECTIONS: Direction[] = ['N', 'S', 'E', 'W'];

function bfsNextStep(
    grid: Grid,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
): { row: number; col: number } | null {
    if (fromRow === toRow && fromCol === toCol) return null;

    const visited = new Set<string>();
    const parent = new Map<string, string>();
    const queue: Array<{ row: number; col: number }> = [{ row: fromRow, col: fromCol }];
    const startKey = `${fromRow},${fromCol}`;
    visited.add(startKey);

    while (queue.length > 0) {
        const cur = queue.shift()!;
        const cell = getCell(grid, cur.row, cur.col);
        if (!cell) continue;

        for (const dir of DIRECTIONS) {
            if (cell.walls[dir]) continue;
            const { dr, dc } = DELTA[dir];
            const nr = cur.row + dr;
            const nc = cur.col + dc;
            const key = `${nr},${nc}`;
            if (visited.has(key)) continue;
            const next = getCell(grid, nr, nc);
            if (!next) continue;

            visited.add(key);
            parent.set(key, `${cur.row},${cur.col}`);

            if (nr === toRow && nc === toCol) {
                // Trace back to find the first step from start
                let traceKey = key;
                while (parent.get(traceKey) !== startKey) {
                    traceKey = parent.get(traceKey)!;
                }
                const [r, c] = traceKey.split(',').map(Number);
                return { row: r, col: c };
            }

            queue.push({ row: nr, col: nc });
        }
    }

    return null; // No path found
}

// ── Rex mesh (blocky ZX81-style T-Rex) ──────────────────────────────────────

function buildRexMesh(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    const s = CELL_SIZE * 0.15; // block size

    // Body (main torso) — tall box
    const body = new THREE.Mesh(new THREE.BoxGeometry(s * 2, s * 5, s * 2), mat);
    body.position.y = s * 3.5;
    group.add(body);

    // Head — sits on top of body
    const head = new THREE.Mesh(new THREE.BoxGeometry(s * 2.5, s * 2, s * 2.5), mat);
    head.position.y = s * 7;
    group.add(head);

    // Eyes — two small dark cubes
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.5, s * 0.5), eyeMat);
    eyeL.position.set(-s * 0.6, s * 7.3, s * 1.1);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.5, s * 0.5), eyeMat);
    eyeR.position.set(s * 0.6, s * 7.3, s * 1.1);
    group.add(eyeR);

    // Jaw — slightly wider box below head
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(s * 2.2, s * 0.8, s * 2.8), mat);
    jaw.position.y = s * 5.6;
    jaw.position.z = s * 0.3;
    group.add(jaw);

    // Left arm (tiny stubby)
    const armL = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 1.5, s * 0.5), mat);
    armL.position.set(-s * 1.2, s * 4, s * 0.5);
    group.add(armL);

    // Right arm (tiny stubby)
    const armR = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 1.5, s * 0.5), mat);
    armR.position.set(s * 1.2, s * 4, s * 0.5);
    group.add(armR);

    // Left leg
    const legL = new THREE.Mesh(new THREE.BoxGeometry(s * 0.8, s * 2.5, s * 0.8), mat);
    legL.position.set(-s * 0.6, s * 1.2, 0);
    group.add(legL);

    // Right leg
    const legR = new THREE.Mesh(new THREE.BoxGeometry(s * 0.8, s * 2.5, s * 0.8), mat);
    legR.position.set(s * 0.6, s * 1.2, 0);
    group.add(legR);

    // Tail — extends behind
    const tail = new THREE.Mesh(new THREE.BoxGeometry(s * 1, s * 1, s * 3), mat);
    tail.position.set(0, s * 2.5, -s * 2.5);
    group.add(tail);

    // Scale down to fit within a cell
    group.scale.setScalar(0.6);

    return group;
}

// ── Warning messages ─────────────────────────────────────────────────────────

export type RexWarning =
    | null
    | 'REX LIES IN WAIT'
    | 'FOOTSTEPS APPROACHING'
    | 'HE IS BESIDE YOU'
    | 'RUN! HE IS BEHIND YOU'
    | 'HE HAS SEEN YOU';

function getWarning(distance: number, _rexBehind: boolean): RexWarning {
    if (distance <= 1) return 'HE HAS SEEN YOU';
    if (distance <= 2) return 'RUN! HE IS BEHIND YOU';
    if (distance <= 4) return 'HE IS BESIDE YOU';
    if (distance <= 7) return 'FOOTSTEPS APPROACHING';
    if (distance <= 12) return 'REX LIES IN WAIT';
    return null;
}

// ── Rex class ────────────────────────────────────────────────────────────────

export class Rex {
    row: number;
    col: number;
    mesh: THREE.Group;
    warning: RexWarning = null;

    /** Distance in cells from Rex to player (BFS path length). */
    distance = Infinity;

    private moveInterval: ReturnType<typeof setInterval> | null = null;
    private grid: Grid | null = null;

    constructor() {
        this.row = 0;
        this.col = 0;
        this.mesh = buildRexMesh();
    }

    /** Place Rex at a starting position and begin stalking. */
    start(grid: Grid, startRow: number, startCol: number): void {
        this.grid = grid;
        this.row = startRow;
        this.col = startCol;
        this._updateMeshPosition();
        this.stop();
        // Rex moves every 800ms
        this.moveInterval = setInterval(() => this._step(), 800);
    }

    stop(): void {
        if (this.moveInterval !== null) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
    }

    /** Update Rex's warning state based on distance to player. */
    updateWarning(playerRow: number, playerCol: number): void {
        if (!this.grid) {
            this.warning = null;
            return;
        }
        // BFS distance
        this.distance = this._bfsDistance(playerRow, playerCol);
        const rexBehind = false; // simplified
        this.warning = getWarning(this.distance, rexBehind);
    }

    private _step(): void {
        // Rex needs a target — find the player via global state
        // We'll get the target from the last updateWarning call
        // For now, pathfind toward the stored target
    }

    /** Move one step toward the given target. */
    stepToward(playerRow: number, playerCol: number): void {
        if (!this.grid) return;
        const next = bfsNextStep(this.grid, this.row, this.col, playerRow, playerCol);
        if (next) {
            this.row = next.row;
            this.col = next.col;
            this._updateMeshPosition();
        }
    }

    private _updateMeshPosition(): void {
        this.mesh.position.x = this.col * CELL_SIZE;
        this.mesh.position.z = this.row * CELL_SIZE;
    }

    private _bfsDistance(toRow: number, toCol: number): number {
        if (!this.grid) return Infinity;
        if (this.row === toRow && this.col === toCol) return 0;

        const visited = new Set<string>();
        const queue: Array<{ row: number; col: number; dist: number }> = [
            { row: this.row, col: this.col, dist: 0 },
        ];
        visited.add(`${this.row},${this.col}`);

        while (queue.length > 0) {
            const cur = queue.shift()!;
            const cell = getCell(this.grid, cur.row, cur.col);
            if (!cell) continue;

            for (const dir of DIRECTIONS) {
                if (cell.walls[dir]) continue;
                const { dr, dc } = DELTA[dir];
                const nr = cur.row + dr;
                const nc = cur.col + dc;
                const key = `${nr},${nc}`;
                if (visited.has(key)) continue;
                visited.add(key);

                if (nr === toRow && nc === toCol) return cur.dist + 1;
                queue.push({ row: nr, col: nc, dist: cur.dist + 1 });
            }
        }

        return Infinity;
    }

    dispose(): void {
        this.stop();
        this.mesh.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) {
                (obj as THREE.Mesh).geometry.dispose();
            }
        });
    }
}
