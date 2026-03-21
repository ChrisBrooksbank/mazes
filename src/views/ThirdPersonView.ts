import * as THREE from 'three';
import type { IView } from './IView';
import type { AppState } from '../state';
import type { Player } from '../player';
import { SceneBuilder } from '../three/SceneBuilder';
import { CELL_SIZE, WALL_HEIGHT } from '../three/geometries';

/** Height offset for the capsule avatar's centre above the floor. */
const AVATAR_HALF_HEIGHT = WALL_HEIGHT * 0.3;

/** Spring-arm camera constants. */
const CAM_HEIGHT = WALL_HEIGHT * 2.5;
const CAM_DISTANCE = CELL_SIZE * 3;

/** How fast the camera spring-arm catches up (higher = snappier, 0–1 per frame). */
const CAM_LERP = 0.08;

/** Direction → unit vector pointing *away* from the player (where the camera sits). */
const BEHIND: Record<string, THREE.Vector3> = {
    N: new THREE.Vector3(0, 0, 1),
    S: new THREE.Vector3(0, 0, -1),
    E: new THREE.Vector3(-1, 0, 0),
    W: new THREE.Vector3(1, 0, 0),
};

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

    // Spring-arm camera position (smoothly chases ideal position)
    private camX: number = 0;
    private camY: number = CAM_HEIGHT;
    private camZ: number = CAM_DISTANCE;

    private lastGrid: unknown = null;

    private static readonly LERP_DURATION_MS = 200;

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);

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
        container.appendChild(canvas);
        this.resize();
        this._startLoop();
    }

    unmount(): void {
        this._stopLoop();
        this.renderer.domElement.remove();
        this.container = null;
    }

    render(state: AppState): void {
        if (state.grid && state.grid !== this.lastGrid) {
            this.sceneBuilder.build(state.grid);
            this.lastGrid = state.grid;
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
            if (tx !== this.targetX || tz !== this.targetZ) {
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

            // Ideal camera position: behind player based on facing direction
            const behind = BEHIND[this.facing] ?? BEHIND['S'];
            const idealX = this.currentX + behind.x * CAM_DISTANCE;
            const idealY = CAM_HEIGHT;
            const idealZ = this.currentZ + behind.z * CAM_DISTANCE;

            // Spring-arm: lerp camera toward ideal position
            this.camX += (idealX - this.camX) * CAM_LERP;
            this.camY += (idealY - this.camY) * CAM_LERP;
            this.camZ += (idealZ - this.camZ) * CAM_LERP;

            this.camera.position.set(this.camX, this.camY, this.camZ);
            this.camera.lookAt(this.currentX, AVATAR_HALF_HEIGHT, this.currentZ);

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
