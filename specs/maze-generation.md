# Maze Generation

## Overview

Generate perfect mazes using multiple algorithms, with step-by-step animation support.

## User Stories

- As a user, I want to generate a maze using different algorithms so that I can see how each one creates different maze patterns
- As a user, I want to watch the generation process animate step-by-step so that I can understand how the algorithm works
- As a user, I want to control maze size (rows/cols) so that I can adjust difficulty

## Requirements

- [ ] Core `Grid` data model with `Cell` interface (row, col, walls {N/S/E/W}, visited)
- [ ] Grid creation with all walls intact and configurable rows/cols
- [ ] Wall removal updates both adjacent cells
- [ ] Start cell (top-left) and end cell (bottom-right) markers
- [ ] Recursive Backtracker generator (`function*` yielding `GeneratorStep`)
- [ ] Prim's algorithm generator
- [ ] Kruskal's algorithm generator
- [ ] Generator registry (`generators/index.ts`) for algorithm lookup by name
- [ ] All generators produce perfect mazes (every cell reachable, no loops)

## Acceptance Criteria

- [ ] Each generator yields steps that can be consumed for animation or run to completion
- [ ] Generated mazes have no isolated regions
- [ ] Grid size is configurable (minimum 5x5, reasonable max ~50x50)
- [ ] Generator steps include enough info for visualization (current cell, visited cells)

## Out of Scope

- Maze serialization/persistence
- Non-rectangular grids (hex, circular)
- Imperfect mazes (mazes with loops)
