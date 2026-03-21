import * as THREE from 'three';

/** Wall material — used for all maze wall box meshes. */
export const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });

/** Floor material — used for the ground plane. */
export const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });

/** Start cell floor highlight. */
export const startMaterial = new THREE.MeshLambertMaterial({ color: 0x00cc44 });

/** End cell floor highlight. */
export const endMaterial = new THREE.MeshLambertMaterial({ color: 0xcc2222 });

/** Solver: visited cell overlay. */
export const visitedMaterial = new THREE.MeshLambertMaterial({
    color: 0x3366ff,
    transparent: true,
    opacity: 0.4,
});

/** Solver: backtracked cell overlay. */
export const backtrackedMaterial = new THREE.MeshLambertMaterial({
    color: 0x888888,
    transparent: true,
    opacity: 0.3,
});

/** Solver: final path cell overlay. */
export const pathMaterial = new THREE.MeshLambertMaterial({
    color: 0xffcc00,
    transparent: true,
    opacity: 0.6,
});

/** Avatar / player capsule material. */
export const avatarMaterial = new THREE.MeshLambertMaterial({ color: 0xff6600 });

/** Dispose all shared materials (call on app teardown if needed). */
export function disposeSharedMaterials(): void {
    wallMaterial.dispose();
    floorMaterial.dispose();
    startMaterial.dispose();
    endMaterial.dispose();
    visitedMaterial.dispose();
    backtrackedMaterial.dispose();
    pathMaterial.dispose();
    avatarMaterial.dispose();
}
