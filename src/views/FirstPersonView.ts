import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { IView } from './IView';
import type { AppState } from '../state';
import type { Player } from '../player';
import { SceneBuilder } from '../three/SceneBuilder';
import { CELL_SIZE, WALL_HEIGHT } from '../three/geometries';

const EYE_LEVEL = WALL_HEIGHT * 0.45;
const LERP_DURATION_MS = 200;

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
 * - PointerLockControls for mouse look (click canvas to lock)
 * - Smooth camera position lerping over LERP_DURATION_MS
 * - Repeating brick canvas texture on wall meshes
 */
export class FirstPersonView implements IView {
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private controls: PointerLockControls;
    private sceneBuilder: SceneBuilder;
    private wallMat: THREE.MeshLambertMaterial;

    private container: HTMLElement | null = null;
    private animFrameId: number | null = null;
    private lastTime: number = 0;

    // Lerp state
    private currentX: number = 0;
    private currentZ: number = 0;
    private targetX: number = 0;
    private targetZ: number = 0;
    private lerpStartX: number = 0;
    private lerpStartZ: number = 0;
    private lerpElapsed: number = 0;
    private isLerping: boolean = false;

    private lastGrid: unknown = null;

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 500);
        this.camera.position.y = EYE_LEVEL;

        this.sceneBuilder = new SceneBuilder();
        this.controls = new PointerLockControls(this.camera, this.renderer.domElement);

        this.renderer.domElement.addEventListener('click', () => {
            this.controls.lock();
        });

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
        this.resize();
        this._startLoop();
    }

    unmount(): void {
        this._stopLoop();
        this.controls.unlock();
        this.renderer.domElement.remove();
        this.container = null;
    }

    render(state: AppState): void {
        if (state.grid && state.grid !== this.lastGrid) {
            this.sceneBuilder.build(state.grid);
            this.lastGrid = state.grid;
            this._applyWallTextures();
        }

        if (state.solver.status !== 'idle') {
            this.sceneBuilder.updateSolver(state.solver);
        } else if (state.grid) {
            this.sceneBuilder.resetSolverOverlay();
        }

        if (state.player) {
            const player = state.player as Player;
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

            this.camera.position.x = this.currentX;
            this.camera.position.y = EYE_LEVEL;
            this.camera.position.z = this.currentZ;

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
}
