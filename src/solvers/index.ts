import type { Grid } from '../grid';
import type { SolverStep } from './types';
import { bfs } from './bfs';
import { dfs } from './dfs';
import { astar } from './astar';
import { wallFollower } from './wallFollower';

export type SolverName = 'bfs' | 'dfs' | 'astar' | 'wall-follower';

export type MazeSolver = (grid: Grid) => Generator<SolverStep>;

const registry: Record<SolverName, MazeSolver> = {
    bfs,
    dfs,
    astar,
    'wall-follower': wallFollower,
};

export function getSolver(name: SolverName): MazeSolver {
    return registry[name];
}

export const solverNames: SolverName[] = Object.keys(registry) as SolverName[];

/** Color constants for solver visualization. */
export const SOLVER_COLORS = {
    visited: '#3B82F6', // blue
    backtracked: '#9CA3AF', // gray
    path: '#F59E0B', // gold
} as const;
