import * as THREE from 'three';
import type { IView } from './IView';
import type { AppState } from '../state';
import type { Player } from '../player';
import type { Direction } from '../player';
import { SceneBuilder } from '../three/SceneBuilder';
import { CELL_SIZE, WALL_HEIGHT } from '../three/geometries';
import { Rex } from '../rex';

const EYE_LEVEL = WALL_HEIGHT * 0.45;
const LERP_DURATION_MS = 200;
const TURN_DURATION_MS = 150;

/** Y-rotation (radians) for each cardinal facing direction. */
const FACING_ANGLE: Record<Direction, number> = {
    N: 0,
    W: Math.PI / 2,
    S: Math.PI,
    E: -Math.PI / 2,
};

function createBrickTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        // Fallback for environments without canvas 2D support (e.g. tests)
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    // Base colour
    ctx.fillStyle = '#8a7a6a';
    ctx.fillRect(0, 0, size, size);

    // Mortar lines (horizontal)
    ctx.fillStyle = '#555555';
    ctx.fillRect(0, 0, size, 2);
    ctx.fillRect(0, size / 2, size, 2);

    // Brick 1 (top row)
    ctx.fillStyle = '#9a8070';
    ctx.fillRect(2, 2, size / 2 - 3, size / 2 - 4);
    ctx.fillRect(size / 2 + 1, 2, size / 2 - 3, size / 2 - 4);

    // Mortar vertical – top row
    ctx.fillStyle = '#555555';
    ctx.fillRect(size / 2 - 1, 2, 2, size / 2 - 4);

    // Brick 2 (bottom row – offset half a brick)
    ctx.fillStyle = '#9a8070';
    ctx.fillRect(2, size / 2 + 2, size / 4 - 3, size / 2 - 4);
    ctx.fillRect(size / 4 + 1, size / 2 + 2, size / 2 - 2, size / 2 - 4);
    ctx.fillRect((size * 3) / 4 + 1, size / 2 + 2, size / 4 - 3, size / 2 - 4);

    // Mortar vertical – bottom row
    ctx.fillStyle = '#555555';
    ctx.fillRect(size / 4 - 1, size / 2 + 2, 2, size / 2 - 4);
    ctx.fillRect((size * 3) / 4 - 1, size / 2 + 2, 2, size / 2 - 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
}

/**
 * First-person 3D view using Three.js.
 *
 * - PerspectiveCamera at eye level (EYE_LEVEL above floor)
 * - Keyboard-driven 90° turning (left/right)
 * - Smooth camera position and rotation lerping
 * - Repeating brick canvas texture on wall meshes
 * - Rex (T-Rex) stalks the player — homage to 3D Monster Maze (ZX81, 1982)
 */
export class FirstPersonView implements IView {
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private sceneBuilder: SceneBuilder;
    private wallMat: THREE.MeshLambertMaterial;

    private container: HTMLElement | null = null;
    private animFrameId: number | null = null;
    private lastTime: number = 0;

    // Position lerp state
    private currentX: number = 0;
    private currentZ: number = 0;
    private targetX: number = 0;
    private targetZ: number = 0;
    private lerpStartX: number = 0;
    private lerpStartZ: number = 0;
    private lerpElapsed: number = 0;
    private isLerping: boolean = false;

    // Rotation lerp state
    private currentYaw: number = Math.PI; // default facing S
    private targetYaw: number = Math.PI;
    private yawStart: number = Math.PI;
    private yawElapsed: number = 0;
    private isTurning: boolean = false;

    private lastGrid: unknown = null;

    // Rex (3D Monster Maze homage)
    private rex: Rex;
    private rexTimer: ReturnType<typeof setInterval> | null = null;
    private warningEl: HTMLElement | null = null;
    private lastPlayerRow = 0;
    private lastPlayerCol = 0;

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 500);
        this.camera.position.y = EYE_LEVEL;
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.currentYaw;

        this.sceneBuilder = new SceneBuilder();
        this.rex = new Rex();

        const texture = createBrickTexture();
        this.wallMat = new THREE.MeshLambertMaterial({ map: texture });
    }

    mount(container: HTMLElement): void {
        this.container = container;
        const canvas = this.renderer.domElement;
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);

        // Warning overlay (ZX81-style)
        this.warningEl = document.createElement('div');
        this.warningEl.className = 'rex-warning';
        this.warningEl.style.cssText = [
            'position: absolute',
            'top: 15%',
            'left: 50%',
            'transform: translateX(-50%)',
            'font-family: monospace',
            'font-size: clamp(18px, 4vw, 36px)',
            'font-weight: bold',
            'color: #00ff00',
            'text-shadow: 0 0 10px #00ff00, 0 0 20px #00aa00',
            'text-align: center',
            'pointer-events: none',
            'white-space: nowrap',
            'z-index: 10',
            'opacity: 0',
            'transition: opacity 0.3s',
        ].join(';');
        container.appendChild(this.warningEl);

        this.resize();
        this._startLoop();
    }

    unmount(): void {
        this._stopLoop();
        this._stopRex();
        this.warningEl?.remove();
        this.warningEl = null;
        this.renderer.domElement.remove();
        this.container = null;
    }

    render(state: AppState): void {
        if (state.grid && state.grid !== this.lastGrid) {
            this.sceneBuilder.build(state.grid);
            this.lastGrid = state.grid;
            this._applyWallTextures();

            // Start Rex at the far end of the maze (3D Monster Maze homage)
            this._stopRex();
            const grid = state.grid;
            const startRow = grid.rows - 1;
            const startCol = grid.cols - 1;
            this.rex.start(state.grid, startRow, startCol);
            this.sceneBuilder.scene.add(this.rex.mesh);

            // Rex moves on a timer
            this.rexTimer = setInterval(() => {
                this.rex.stepToward(this.lastPlayerRow, this.lastPlayerCol);
                this.rex.updateWarning(this.lastPlayerRow, this.lastPlayerCol);
                this._updateWarningOverlay();
            }, 800);
        }

        if (state.solver.status !== 'idle') {
            this.sceneBuilder.updateSolver(state.solver);
        } else if (state.grid) {
            this.sceneBuilder.resetSolverOverlay();
        }

        if (state.player) {
            const player = state.player as Player;
            this.lastPlayerRow = player.row;
            this.lastPlayerCol = player.col;

            const tx = player.col * CELL_SIZE;
            const tz = player.row * CELL_SIZE;
            if (tx !== this.targetX || tz !== this.targetZ) {
                this.lerpStartX = this.currentX;
                this.lerpStartZ = this.currentZ;
                this.targetX = tx;
                this.targetZ = tz;
                this.lerpElapsed = 0;
                this.isLerping = true;
            }

            // Handle facing direction rotation
            const newYaw = FACING_ANGLE[player.facing];
            if (newYaw !== this.targetYaw) {
                this.yawStart = this.currentYaw;
                this.targetYaw = newYaw;
                // Pick shortest rotation path
                let diff = this.targetYaw - this.yawStart;
                if (diff > Math.PI) diff -= 2 * Math.PI;
                if (diff < -Math.PI) diff += 2 * Math.PI;
                this.targetYaw = this.yawStart + diff;
                this.yawElapsed = 0;
                this.isTurning = true;
            }

            // Update Rex warning based on new player position
            this.rex.updateWarning(player.row, player.col);
            this._updateWarningOverlay();
        }
    }

    resize(): void {
        if (!this.container) return;
        const { clientWidth, clientHeight } = this.container;
        this.renderer.setSize(clientWidth, clientHeight, false);
        this.camera.aspect = clientWidth / Math.max(1, clientHeight);
        this.camera.updateProjectionMatrix();
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /** Swap wall meshes to use the textured material. */
    private _applyWallTextures(): void {
        this.sceneBuilder.scene.traverse(obj => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            const geo = mesh.geometry as THREE.BoxGeometry;
            if (Math.abs(geo.parameters.height - WALL_HEIGHT) < 0.001) {
                mesh.material = this.wallMat;
            }
        });
    }

    private _startLoop(): void {
        const loop = (time: number) => {
            const dt = Math.min(time - this.lastTime, 100); // ms, capped at 100ms
            this.lastTime = time;

            if (this.isLerping) {
                this.lerpElapsed = Math.min(this.lerpElapsed + dt, LERP_DURATION_MS);
                const t = this.lerpElapsed / LERP_DURATION_MS;
                this.currentX = this.lerpStartX + (this.targetX - this.lerpStartX) * t;
                this.currentZ = this.lerpStartZ + (this.targetZ - this.lerpStartZ) * t;
                if (this.lerpElapsed >= LERP_DURATION_MS) {
                    this.isLerping = false;
                    this.currentX = this.targetX;
                    this.currentZ = this.targetZ;
                }
            }

            if (this.isTurning) {
                this.yawElapsed = Math.min(this.yawElapsed + dt, TURN_DURATION_MS);
                const t = this.yawElapsed / TURN_DURATION_MS;
                this.currentYaw = this.yawStart + (this.targetYaw - this.yawStart) * t;
                if (this.yawElapsed >= TURN_DURATION_MS) {
                    this.isTurning = false;
                    this.currentYaw = this.targetYaw;
                }
            }

            this.camera.position.x = this.currentX;
            this.camera.position.y = EYE_LEVEL;
            this.camera.position.z = this.currentZ;
            this.camera.rotation.y = this.currentYaw;

            this.renderer.render(this.sceneBuilder.scene, this.camera);
            this.animFrameId = requestAnimationFrame(loop);
        };

        this.lastTime = performance.now();
        this.animFrameId = requestAnimationFrame(loop);
    }

    private _stopLoop(): void {
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    private _stopRex(): void {
        this.rex.stop();
        if (this.rexTimer !== null) {
            clearInterval(this.rexTimer);
            this.rexTimer = null;
        }
        // Remove Rex mesh from scene if present
        this.sceneBuilder.scene.remove(this.rex.mesh);
    }

    private _updateWarningOverlay(): void {
        if (!this.warningEl) return;
        const warning = this.rex.warning;
        if (warning) {
            this.warningEl.textContent = warning;
            this.warningEl.style.opacity = '1';
        } else {
            this.warningEl.style.opacity = '0';
        }
    }
}
