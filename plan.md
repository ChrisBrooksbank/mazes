# Maze PWA — Generate, Solve, and Walk Through Mazes

## Context

Build a greenfield PWA in `C:\code\mazes` that generates mazes, solves them with animated algorithms, and renders them in four view modes: 2D top-down, isometric, 3D first-person, and 3D third-person. The app should be installable, work offline, and be mobile-friendly.

---

## Tech Stack

| Concern  | Choice                        | Rationale                                                             |
| -------- | ----------------------------- | --------------------------------------------------------------------- |
| Language | TypeScript                    | Type safety for maze data structures, 3D coordinates, algorithm state |
| Bundler  | Vite                          | Fast HMR, native TS, built-in PWA plugin                              |
| 3D       | Three.js                      | Standard for WebGL; native first/third-person camera support          |
| 2D       | Canvas 2D API                 | Lightweight for top-down and isometric; no extra dep                  |
| UI       | Vanilla DOM                   | Simple controls — a framework adds weight without value               |
| PWA      | vite-plugin-pwa               | Auto-generates service worker + manifest via Workbox                  |
| CSS      | Plain CSS + custom properties | Small app, no preprocessor needed                                     |

**Dependencies**: `three` (runtime), `typescript`, `vite`, `@types/three`, `vite-plugin-pwa` (dev)

---

## Project Structure

```
C:\code\mazes\
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── public/
│   ├── icons/          (icon-192.png, icon-512.png, favicon.svg)
│   └── robots.txt
└── src/
    ├── main.ts                  # Entry: mount UI, wire events
    ├── style.css                # Global styles
    ├── types.ts                 # Shared interfaces
    ├── state.ts                 # App state + event emitter
    ├── maze/
    │   ├── Grid.ts              # Core data model (Cell, Grid)
    │   ├── generators/
    │   │   ├── index.ts         # Registry
    │   │   ├── recursiveBacktracker.ts
    │   │   ├── prims.ts
    │   │   └── kruskals.ts
    │   └── solvers/
    │       ├── index.ts         # Registry
    │       ├── aStar.ts
    │       ├── bfs.ts
    │       ├── dfs.ts
    │       └── wallFollower.ts
    ├── views/
    │   ├── ViewManager.ts       # Switches views, manages lifecycle
    │   ├── IView.ts             # View interface
    │   ├── TopDownView.ts       # Canvas 2D
    │   ├── IsometricView.ts     # Canvas 2D + isometric projection
    │   ├── FirstPersonView.ts   # Three.js PerspectiveCamera at eye level
    │   └── ThirdPersonView.ts   # Three.js chase camera
    ├── player/
    │   ├── Player.ts            # Position, orientation, movement validation
    │   └── controls.ts          # Keyboard/touch input
    ├── three/
    │   ├── SceneBuilder.ts      # Grid → Three.js scene
    │   ├── materials.ts         # Shared materials/textures
    │   └── geometries.ts        # Wall/floor geometry helpers
    └── ui/
        ├── Toolbar.ts           # Algorithm pickers, generate/solve buttons
        ├── HUD.ts               # Timer, step count, minimap overlay
        └── TouchControls.ts     # On-screen D-pad for mobile
```

---

## Core Data Model (`maze/Grid.ts`)

```typescript
interface Cell {
    row: number;
    col: number;
    walls: { north: boolean; south: boolean; east: boolean; west: boolean };
    visited: boolean;
}

interface Grid {
    readonly rows: number;
    readonly cols: number;
    cells: Cell[][];
    start: { row: number; col: number };
    end: { row: number; col: number };
}
```

Wall-per-cell model: removing a wall updates both adjacent cells. This maps cleanly to all four views:

- **Top-down**: draw lines for `true` walls
- **Isometric**: project through `(x=(col-row)*tileW/2, y=(col+row)*tileH/2)`
- **3D**: place wall mesh at `(col*CELL_SIZE, 0, row*CELL_SIZE)` offset by direction

---

## Algorithm Design

Both generators and solvers use **JS generators** (`function*`) for step-by-step animation:

```typescript
interface MazeGenerator {
    name: string;
    generate(grid: Grid): Generator<GeneratorStep, Grid>;
}
interface MazeSolver {
    name: string;
    solve(grid: Grid, start: Cell, end: Cell): Generator<SolverStep, SolverStep[]>;
}
```

This enables: instant completion, per-frame stepping, or speed-slider-controlled animation — all from the same code.

**Generators**: Recursive Backtracker, Prim's, Kruskal's
**Solvers**: A\*, BFS, DFS, Wall Follower

---

## View Architecture

```typescript
interface IView {
    mount(container: HTMLElement): void;
    unmount(): void;
    render(grid: Grid, player: Player, solverState: SolverStep[]): void;
    resize(width: number, height: number): void;
}
```

- **TopDownView / IsometricView** — Canvas 2D, lightweight
- **FirstPersonView / ThirdPersonView** — Three.js, share `SceneBuilder`
    - First-person: camera at eye level, PointerLock controls
    - Third-person: chase camera behind/above player, avatar mesh (capsule)
- `SceneBuilder` caches mesh group per maze generation; solver animation changes material colors on floor tiles, not geometry

`ViewManager` handles mount/unmount lifecycle to prevent GPU resource leaks.

---

## Player & Controls

- Grid position `{row, col}` + world position (interpolated for 3D smoothness)
- Movement validated against `cell.walls` before allowing
- Keyboard: arrows/WASD; Mobile: translucent D-pad overlay
- 2D: instant cell-to-cell; 3D: lerp over ~200ms

---

## PWA Configuration

`vite-plugin-pwa` in `vite.config.ts`:

- `registerType: 'autoUpdate'`
- Manifest: name, icons, theme_color, standalone display
- Workbox pre-caches all assets (`**/*.{js,css,html,png,svg}`)
- No API calls → fully offline after first load

---

## Implementation Phases

### Phase 1 — Scaffold + Core Model

1. `npm create vite@latest . -- --template vanilla-ts`
2. `npm install three && npm install -D @types/three vite-plugin-pwa`
3. Create `types.ts`, `state.ts`, `maze/Grid.ts`
4. Basic `index.html` with `<div id="app">` and toolbar placeholder

### Phase 2 — Generation Algorithms

1. Implement `recursiveBacktracker.ts` (establishes the generator pattern)
2. Implement `prims.ts` and `kruskals.ts`
3. Wire Toolbar to trigger generation

### Phase 3 — Top-Down 2D View + Player

1. `TopDownView.ts`: walls as lines, start (green), end (red)
2. `ViewManager.ts` (single view initially)
3. Wire `main.ts`: generate → render
4. `Player.ts` + `controls.ts` — playable 2D maze

### Phase 4 — Solver Algorithms + Animation

1. Implement BFS, DFS, A\*, Wall Follower
2. Animation loop: step through generator on timer, push to `state.solverSteps`
3. Color-code: visited (blue), backtracked (gray), solution (gold)
4. Speed slider in toolbar

### Phase 5 — Isometric View

1. `IsometricView.ts`: isometric projection, pseudo-3D wall drawing
2. Register in ViewManager, add view toggle buttons

### Phase 6 — 3D First-Person View

1. `three/SceneBuilder.ts`: Grid → wall meshes + floor + lighting
2. `FirstPersonView.ts`: PerspectiveCamera, PointerLockControls
3. Smooth movement via position lerping
4. Simple wall textures via repeating UV

### Phase 7 — 3D Third-Person View

1. `ThirdPersonView.ts`: reuse SceneBuilder, add capsule avatar
2. Spring-arm camera offset behind/above player
3. Directional movement relative to facing

### Phase 8 — PWA + Mobile Polish

1. Configure `vite-plugin-pwa` in `vite.config.ts`
2. Generate icons (SVG→PNG)
3. `TouchControls.ts` for mobile D-pad
4. Responsive toolbar (`@media max-width: 640px` → hamburger)
5. Test offline: `vite build` → `vite preview` → verify SW caching

### Phase 9 — Final Polish

1. Minimap HUD in 3D views (small top-down canvas in corner)
2. Timer + step counter
3. Three.js resource disposal on maze regeneration
4. Keyboard shortcut hints

---

## Verification

1. **Generate**: Select each algorithm, click Generate, verify maze renders with no isolated regions
2. **Solve**: Run each solver, confirm animated visualization and correct solution path
3. **Views**: Switch between all 4 views mid-maze, verify state persists
4. **Player**: Navigate manually in each view, confirm walls block movement
5. **PWA**: `vite build && vite preview`, open Chrome DevTools → Application → verify manifest, SW registered, installable, works offline
6. **Mobile**: Test on phone or Chrome DevTools device mode — D-pad visible, toolbar collapses, touch navigation works
