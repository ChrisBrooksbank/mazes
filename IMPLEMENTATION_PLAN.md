# Implementation Plan

## Status

- Planning iterations: 1
- Build iterations: 1
- Last updated: 2026-03-21

## Tasks

### Phase 1: Core Data Model

- [x] Create `Grid` data model: `Cell` interface (`row`, `col`, `walls {N,S,E,W}`, `visited`), `Grid` type, factory function with all walls intact, wall-removal helper that updates both adjacent cells, start/end cell markers (spec: maze-generation.md)

### Phase 2: Maze Generation

- [ ] Implement Recursive Backtracker generator as `function*` yielding `GeneratorStep` with current cell and visited set (spec: maze-generation.md)
- [ ] Implement Prim's algorithm generator as `function*` yielding `GeneratorStep` (spec: maze-generation.md)
- [ ] Implement Kruskal's algorithm generator as `function*` yielding `GeneratorStep` (spec: maze-generation.md)
- [ ] Create generator registry `src/generators/index.ts` exporting lookup by name; validate all produce perfect mazes (spec: maze-generation.md)

### Phase 3: App State & Player

- [ ] Create `src/state.ts`: app state (current grid, player, view mode, solver state) with a simple event emitter (spec: player-controls.md)
- [ ] Create `Player` class with grid position `{row, col}`, facing direction, world position for 3D lerp, and movement validation against `cell.walls` (spec: player-controls.md)
- [ ] Add keyboard input handler (Arrow + WASD) and `TouchControls` D-pad overlay (visible only on touch devices, semi-transparent, bottom corner) (spec: player-controls.md)

### Phase 4: Maze Solving

- [ ] Implement BFS solver as `function*` yielding `SolverStep` (current cell, visited set, frontier, path) (spec: maze-solving.md)
- [ ] Implement DFS solver as `function*` yielding `SolverStep` (spec: maze-solving.md)
- [ ] Implement A\* solver using Manhattan distance heuristic, yielding `SolverStep` (spec: maze-solving.md)
- [ ] Implement Wall Follower solver (right-hand rule), yielding `SolverStep` (spec: maze-solving.md)
- [ ] Create solver registry `src/solvers/index.ts`; add animation loop with speed slider (pause/resume/instant-complete); color-coded visualization state (visited=blue, backtracked=gray, path=gold) (spec: maze-solving.md)

### Phase 5: 2D Views

- [ ] Define `IView` interface (mount, unmount, render, resize) and `ViewManager` (handles switching, lifecycle) in `src/views/` (spec: 2d-views.md)
- [ ] Implement `TopDownView` using Canvas 2D API: walls as lines, start=green/end=red highlights, player marker, solver color overlay, resize handler (spec: 2d-views.md)
- [ ] Implement `IsometricView` using Canvas 2D API: isometric projection formula (`x=(col-row)*tileW/2, y=(col+row)*tileH/2`), pseudo-3D walls with height, same markers and solver overlay, resize handler (spec: 2d-views.md)

### Phase 6: 3D Views

- [ ] Install Three.js; create `src/three/materials.ts` (shared materials) and `src/three/geometries.ts` (wall and floor mesh helpers) (spec: 3d-views.md)
- [ ] Implement `SceneBuilder`: convert `Grid` to Three.js scene (wall box meshes, floor plane, ambient + directional lighting); cache mesh group per generation; solver changes material colors not geometry; dispose resources on regeneration (spec: 3d-views.md)
- [ ] Implement `FirstPersonView`: PerspectiveCamera at eye level, PointerLock controls, smooth position lerp (~200ms per cell), repeating UV wall textures, register with ViewManager (spec: 3d-views.md)
- [ ] Implement `ThirdPersonView`: reuse SceneBuilder scene, capsule avatar mesh, spring-arm chase camera (behind/above), directional movement relative to facing, register with ViewManager (spec: 3d-views.md)

### Phase 7: UI & PWA

- [ ] Build `Toolbar` component: algorithm pickers (generator + solver dropdowns), Generate/Solve buttons, view mode toggle buttons, size controls (rows/cols); collapses to hamburger on screens < 640px (spec: pwa-mobile.md)
- [ ] Build `HUD` component: timer (since generation or solve start), step counter, minimap canvas overlay in 3D views (small top-down render in corner) (spec: pwa-mobile.md)
- [ ] Wire up full app in `src/main.ts`: replace scaffold, compose Toolbar + HUD + ViewManager, connect state events to view re-renders, trigger completion state when player reaches end cell (spec: player-controls.md, pwa-mobile.md)
- [ ] Configure `vite-plugin-pwa`: `registerType: 'autoUpdate'`, web app manifest (name, icons, theme_color, standalone), Workbox pre-cache all assets; add icons `public/icons/icon-192.png`, `icon-512.png`, `favicon.svg` (spec: pwa-mobile.md)
- [ ] Add responsive CSS with custom properties and `@media` queries; add keyboard shortcut hints (spec: pwa-mobile.md)

### Phase 8: Tests

- [ ] Write Vitest unit tests for Grid helpers, generators (perfect maze validation), and solvers (correct path found) (spec: maze-generation.md, maze-solving.md)
- [ ] Update Playwright e2e tests: page load, generate button works, view switching, player movement, PWA install prompt (spec: pwa-mobile.md)

## Completed

<!-- Completed tasks move here -->

## Notes

- Tech stack: TypeScript, Vite, Three.js (3D), Canvas 2D API (2D), vanilla DOM, vite-plugin-pwa, plain CSS
- No framework (React/Vue) — vanilla DOM manipulation
- Generators and solvers use `function*` generators for step-by-step animation
- `ViewManager` owns view lifecycle; views implement `IView` interface
- `SceneBuilder` caches geometry per maze generation; only material colors change during solver animation (performance)
- Player world position is separate from grid position — used for smooth 3D lerp
- State flows: `state.ts` event emitter → views re-render
- All tasks sized for one build iteration each
