# 3D Views

## Overview

Render mazes in two Three.js-based 3D views: first-person and third-person.

## User Stories

- As a user, I want a first-person view so that I can walk through the maze immersively
- As a user, I want a third-person view so that I can see my avatar navigating the maze
- As a user, I want smooth movement in 3D views so that the experience feels polished

## Requirements

- [ ] `SceneBuilder`: convert Grid into Three.js scene (wall meshes, floor, lighting)
- [ ] SceneBuilder caches mesh group per generation; solver changes material colors, not geometry
- [ ] Shared materials module (`three/materials.ts`)
- [ ] Geometry helpers (`three/geometries.ts`) for wall and floor meshes
- [ ] `FirstPersonView`:
    - PerspectiveCamera at eye level
    - PointerLock controls for mouse look
    - Smooth position lerping (~200ms per cell transition)
    - Simple repeating UV wall textures
- [ ] `ThirdPersonView`:
    - Reuses SceneBuilder scene
    - Capsule avatar mesh representing the player
    - Spring-arm chase camera (behind and above player)
    - Directional movement relative to player facing
- [ ] Three.js resource disposal on maze regeneration (prevent GPU memory leaks)
- [ ] Both views register with ViewManager

## Acceptance Criteria

- [ ] First-person view renders walkable maze corridors with walls and floor
- [ ] Third-person view shows avatar and follows with chase camera
- [ ] Switching between 3D views and 2D views preserves state
- [ ] No WebGL resource leaks on maze regeneration or view switching
- [ ] Smooth movement transitions (no teleporting between cells)

## Out of Scope

- Shadows or advanced lighting
- Animated avatar (capsule is sufficient)
- VR/AR support
