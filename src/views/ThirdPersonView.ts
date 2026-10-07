import * as THREE from 'three';
import type { IView } from './IView';
import type { AppState } from '../state';
import type { Player } from '../player';
import { SceneBuilder } from '../three/SceneBuilder';
import { CELL_SIZE, WALL_HEIGHT } from '../three/geometries';

/** Height offset for the capsule avatar's centre above the floor. */
const AVATAR_HALF_HEIGHT = WALL_HEIGHT * 0.3;

/** How fast the camera spring-arm catches up (higher = snappier, 0–1 per frame). */
const CAM_LERP = 0.08;

/** Direction → camera azimuth (radians) that places the camera behind the player. */
const BEHIND_YAW: Record<string, number> = {
    N: 0,
    S: Math.PI,
    E: -Math.PI / 2,
    W: Math.PI / 2,
};

type CameraMode = 'overview' | 'follow';

const MIN_PITCH = 0.15;
const MAX_PITCH = Math.PI / 2 - 0.05;
const FOLLOW_PITCH = 1.05;
const FOLLOW_DISTANCE = CELL_SIZE * 4;
const OVERVIEW_PITCH = 0.95;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

/**
 * Third-person 3D view using Three.js.
 *
 * - Reuses SceneBuilder for the maze geometry.
 * - Capsule avatar mesh sits at the player's grid position.
 * - Spring-arm chase camera follows from behind and above.
 * - No pointer lock — camera orientation is driven by player facing direction.
 */
export class ThirdPersonView implements IView {
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private sceneBuilder: SceneBuilder;

    /** Capsule avatar: cylinder body + two sphere caps. */
    private avatarGroup: THREE.Group;

    private container: HTMLElement | null = null;
    private animFrameId: number | null = null;
    private lastTime: number = 0;

    // Avatar lerp state (grid → world position)
    private currentX: number = 0;
    private currentZ: number = 0;
    private targetX: number = 0;
    private targetZ: number = 0;
    private lerpStartX: number = 0;
    private lerpStartZ: number = 0;
    private lerpElapsed: number = 0;
    private isLerping: boolean = false;

    // Current player facing (used for camera placement)
    private facing: string = 'S';

    // Camera: 'overview' orbits the whole maze, 'follow' chases the player.
    // Drag orbits, wheel/pinch zooms in both modes.
    private mode: CameraMode = 'overview';
    private userYaw: number = 0.6;
    private userPitch: number = OVERVIEW_PITCH;
    private zoom: number = 1;
    private baseYaw: number = 0;
    private mazeCenterX: number = 0;
    private mazeCenterZ: number = 0;
    private mazeExtent: number = CELL_SIZE * 10;
    private modeBtn: HTMLButtonElement | null = null;

    // Pointer tracking for drag / pinch
    private pointers = new Map<number, { x: number; y: number }>();
    private lastPinchDist = 0;
    private onPointerDown = (e: PointerEvent) => {
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this.renderer.domElement.setPointerCapture?.(e.pointerId);
        if (this.pointers.size === 2) this.lastPinchDist = this._pinchDist();
    };
    private onPointerMove = (e: PointerEvent) => {
        const prev = this.pointers.get(e.pointerId);
        if (!prev) return;
        const cur = { x: e.clientX, y: e.clientY };
        this.pointers.set(e.pointerId, cur);
        if (this.pointers.size === 1) {
            this.userYaw -= (cur.x - prev.x) * 0.008;
            this.userPitch = Math.min(
                MAX_PITCH,
                Math.max(MIN_PITCH, this.userPitch + (cur.y - prev.y) * 0.006)
            );
        } else if (this.pointers.size === 2) {
            const dist = this._pinchDist();
            if (this.lastPinchDist > 0 && dist > 0) this._applyZoom(this.lastPinchDist / dist);
            this.lastPinchDist = dist;
        }
    };
    private onPointerUp = (e: PointerEvent) => {
        this.pointers.delete(e.pointerId);
        this.lastPinchDist = 0;
    };
    private onWheel = (e: WheelEvent) => {
        e.preventDefault();
        this._applyZoom(Math.exp(e.deltaY * 0.001));
    };
    private onKeyDown = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (e.code === 'KeyO' && tag !== 'INPUT' && tag !== 'SELECT' && !e.ctrlKey && !e.metaKey) {
            this._toggleMode();
        }
    };

    private lastGrid: unknown = null;

    private static readonly LERP_DURATION_MS = 200;

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);

        this.sceneBuilder = new SceneBuilder();
        this.avatarGroup = ThirdPersonView._buildAvatar();
        this.sceneBuilder.scene.add(this.avatarGroup);
    }

    mount(container: HTMLElement): void {
        this.container = container;
        const canvas = this.renderer.domElement;
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.touchAction = 'none';
        canvas.style.cursor = 'grab';
        container.appendChild(canvas);
        canvas.addEventListener('pointerdown', this.onPointerDown);
        canvas.addEventListener('pointermove', this.onPointerMove);
        canvas.addEventListener('pointerup', this.onPointerUp);
        canvas.addEventListener('pointercancel', this.onPointerUp);
        canvas.addEventListener('wheel', this.onWheel, { passive: false });
        window.addEventListener('keydown', this.onKeyDown);

        this.modeBtn = document.createElement('button');
        this.modeBtn.type = 'button';
        this.modeBtn.className = 'camera-mode-btn';
        this.modeBtn.style.cssText = [
            'position:absolute',
            'top:12px',
            'left:12px',
            'z-index:10',
            'padding:6px 12px',
            'border-radius:8px',
            'border:1px solid rgba(255,255,255,0.5)',
            'background:rgba(0,0,0,0.5)',
            'color:#fff',
            'font:600 13px system-ui,sans-serif',
            'cursor:pointer',
        ].join(';');
        this.modeBtn.addEventListener('click', () => this._toggleMode());
        this._updateModeBtn();
        container.appendChild(this.modeBtn);
        this.resize();
        this._startLoop();
    }

    unmount(): void {
        this._stopLoop();
        const canvas = this.renderer.domElement;
        canvas.removeEventListener('pointerdown', this.onPointerDown);
        canvas.removeEventListener('pointermove', this.onPointerMove);
        canvas.removeEventListener('pointerup', this.onPointerUp);
        canvas.removeEventListener('pointercancel', this.onPointerUp);
        canvas.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('keydown', this.onKeyDown);
        this.pointers.clear();
        this.modeBtn?.remove();
        this.modeBtn = null;
        canvas.remove();
        this.container = null;
    }

    render(state: AppState): void {
        const gridChanged = !!state.grid && state.grid !== this.lastGrid;
        if (state.grid && gridChanged) {
            this.sceneBuilder.build(state.grid);
            this.lastGrid = state.grid;
            this.mazeCenterX = ((state.grid.cols - 1) * CELL_SIZE) / 2;
            this.mazeCenterZ = ((state.grid.rows - 1) * CELL_SIZE) / 2;
            this.mazeExtent = Math.max(state.grid.rows, state.grid.cols) * CELL_SIZE;
            // Re-add avatar after scene rebuild
            this.sceneBuilder.scene.add(this.avatarGroup);
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
            if (gridChanged) {
                // New maze: place the avatar at the start instead of sliding it there
                this.currentX = this.targetX = tx;
                this.currentZ = this.targetZ = tz;
                this.isLerping = false;
            } else if (tx !== this.targetX || tz !== this.targetZ) {
                this.lerpStartX = this.currentX;
                this.lerpStartZ = this.currentZ;
                this.targetX = tx;
                this.targetZ = tz;
                this.lerpElapsed = 0;
                this.isLerping = true;
            }
            this.facing = player.facing;
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

    private _pinchDist(): number {
        const [a, b] = [...this.pointers.values()];
        return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    }

    private _applyZoom(factor: number): void {
        this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * factor));
    }

    private _toggleMode(): void {
        this.mode = this.mode === 'overview' ? 'follow' : 'overview';
        this.zoom = 1;
        this.userYaw = this.mode === 'overview' ? 0.6 : 0;
        this.userPitch = this.mode === 'overview' ? OVERVIEW_PITCH : FOLLOW_PITCH;
        this._updateModeBtn();
    }

    private _updateModeBtn(): void {
        if (!this.modeBtn) return;
        this.modeBtn.textContent = this.mode === 'overview' ? 'Follow player (O)' : 'Overview (O)';
    }

    /**
     * Build a simple capsule avatar from a cylinder + two spheres.
     * Using primitives avoids the CapsuleGeometry API which isn't available
     * in older Three.js versions, while producing a visually similar shape.
     */
    private static _buildAvatar(): THREE.Group {
        const group = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({ color: 0x4488ff });
        const radius = AVATAR_HALF_HEIGHT * 0.5;
        const bodyHeight = AVATAR_HALF_HEIGHT;

        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, bodyHeight, 12),
            mat
        );
        body.position.y = AVATAR_HALF_HEIGHT;
        group.add(body);

        const capGeo = new THREE.SphereGeometry(radius, 12, 8);
        const topCap = new THREE.Mesh(capGeo, mat);
        topCap.position.y = AVATAR_HALF_HEIGHT + bodyHeight / 2;
        group.add(topCap);

        const botCap = new THREE.Mesh(capGeo, mat);
        botCap.position.y = AVATAR_HALF_HEIGHT - bodyHeight / 2;
        group.add(botCap);

        return group;
    }

    private _startLoop(): void {
        const loop = (time: number) => {
            const dt = Math.min(time - this.lastTime, 100);
            this.lastTime = time;

            // Advance avatar lerp
            if (this.isLerping) {
                this.lerpElapsed = Math.min(
                    this.lerpElapsed + dt,
                    ThirdPersonView.LERP_DURATION_MS
                );
                const t = this.lerpElapsed / ThirdPersonView.LERP_DURATION_MS;
                this.currentX = this.lerpStartX + (this.targetX - this.lerpStartX) * t;
                this.currentZ = this.lerpStartZ + (this.targetZ - this.lerpStartZ) * t;
                if (this.lerpElapsed >= ThirdPersonView.LERP_DURATION_MS) {
                    this.isLerping = false;
                    this.currentX = this.targetX;
                    this.currentZ = this.targetZ;
                }
            }

            // Place avatar
            this.avatarGroup.position.set(this.currentX, 0, this.currentZ);

            // Orbit camera around either the maze centre or the player
            const follow = this.mode === 'follow';
            const targetYaw = BEHIND_YAW[this.facing] ?? Math.PI;
            if (follow) {
                // Ease base azimuth toward "behind the player" along the shortest arc
                const diff = Math.atan2(
                    Math.sin(targetYaw - this.baseYaw),
                    Math.cos(targetYaw - this.baseYaw)
                );
                this.baseYaw += diff * CAM_LERP;
            } else {
                this.baseYaw = 0;
            }
            const yaw = this.baseYaw + this.userYaw;
            const pitch = this.userPitch;
            const baseDist = follow ? FOLLOW_DISTANCE : this.mazeExtent * 1.1;
            const dist = baseDist * this.zoom;
            const tx = follow ? this.currentX : this.mazeCenterX;
            const tz = follow ? this.currentZ : this.mazeCenterZ;
            const ty = follow ? AVATAR_HALF_HEIGHT : 0;

            this.camera.position.set(
                tx + dist * Math.sin(yaw) * Math.cos(pitch),
                ty + dist * Math.sin(pitch),
                tz + dist * Math.cos(yaw) * Math.cos(pitch)
            );
            this.camera.lookAt(tx, ty, tz);

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
