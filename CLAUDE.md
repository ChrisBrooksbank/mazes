# CLAUDE.md

## Project Overview

Mazes — a PWA for generating, solving, and walking through mazes in 2D, isometric, and 3D views. Multiple generation and solving algorithms with visual step-by-step playback.

## Tech Stack

- Vite + TypeScript
- Three.js (3D/isometric rendering)
- Vitest + Playwright

## Development Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run check        # Lint + typecheck + test + format
npm run test:e2e     # Playwright e2e tests
```

## Architecture

- `src/generators/` — Maze generation algorithms
- `src/solvers/` — Solving algorithms (BFS, DFS, A\*)
- `src/renderers/` — 2D canvas, isometric, and Three.js 3D renderers
- `src/components/` — UI controls
