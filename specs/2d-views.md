# 2D Views

## Overview

Render mazes in two 2D canvas-based views: top-down and isometric.

## User Stories

- As a user, I want a top-down view of the maze so that I can see the entire layout clearly
- As a user, I want an isometric view so that I can see a pseudo-3D representation
- As a user, I want to see the player position, start, and end markers in both views

## Requirements

- [ ] `IView` interface: mount, unmount, render, resize methods
- [ ] `ViewManager` to handle switching views and lifecycle (mount/unmount)
- [ ] `TopDownView` using Canvas 2D API:
    - Walls drawn as lines
    - Start cell highlighted green, end cell highlighted red
    - Player position shown as a colored circle/marker
    - Solver visualization overlay (visited, frontier, path colors)
- [ ] `IsometricView` using Canvas 2D API:
    - Isometric projection: `x = (col - row) * tileW / 2`, `y = (col + row) * tileH / 2`
    - Pseudo-3D wall drawing (walls have height)
    - Same markers and solver overlay as top-down
- [ ] Both views respond to window resize
- [ ] View toggle buttons in the toolbar

## Acceptance Criteria

- [ ] Top-down view renders maze walls correctly with no gaps or overlaps
- [ ] Isometric view renders correct isometric projection
- [ ] Switching views preserves maze state and player position
- [ ] Canvas resizes responsively without distortion
- [ ] Solver animation renders correctly in both views

## Out of Scope

- Zoom/pan controls (stretch goal)
- Minimap (handled by pwa-mobile spec)
