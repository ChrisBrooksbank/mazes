# Maze Solving

## Overview

Solve generated mazes using multiple pathfinding algorithms, with animated step-by-step visualization.

## User Stories

- As a user, I want to solve a maze automatically using different algorithms so that I can compare their efficiency
- As a user, I want to watch the solver animate through the maze so that I can understand how each algorithm explores
- As a user, I want to control animation speed so that I can watch slowly or skip to the result

## Requirements

- [ ] Solver interface using `function*` generators yielding `SolverStep`
- [ ] A\* pathfinding solver (heuristic: Manhattan distance)
- [ ] BFS (Breadth-First Search) solver
- [ ] DFS (Depth-First Search) solver
- [ ] Wall Follower solver (right-hand rule)
- [ ] Solver registry (`solvers/index.ts`) for algorithm lookup by name
- [ ] SolverStep includes: current cell, visited set, frontier, and final path
- [ ] Animation loop: step through solver on timer, push to state
- [ ] Speed slider controlling animation rate
- [ ] Color-coded visualization: visited (blue), backtracked (gray), solution path (gold)

## Acceptance Criteria

- [ ] Each solver finds the correct path from start to end
- [ ] Solvers work on any valid generated maze
- [ ] Animation can be paused, resumed, or run to instant completion
- [ ] Speed slider ranges from slow (visible steps) to instant

## Out of Scope

- Bidirectional search
- Solver performance benchmarking/comparison UI
