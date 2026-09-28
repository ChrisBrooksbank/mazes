import type { Grid, Cell } from './grid';

// ── View modes ──────────────────────────────────────────────────────────────

export type ViewMode = 'top-down' | 'isometric' | 'first-person' | 'third-person';

// ── Solver state ─────────────────────────────────────────────────────────────

export type SolverStatus = 'idle' | 'running' | 'paused' | 'complete';

export interface SolverState {
    status: SolverStatus;
    visited: ReadonlySet<Cell>;
    frontier: ReadonlySet<Cell>;
    /** Cells on the solution path (populated when status is 'complete'). */
    path: readonly Cell[];
    /** Current cell being examined by the solver. */
    current: Cell | null;
    stepCount: number;
}

// ── App state ────────────────────────────────────────────────────────────────

export interface AppState {
    grid: Grid | null;
    /** Player is typed as unknown here; Player class imports state, not the reverse. */
    player: unknown;
    viewMode: ViewMode;
    solver: SolverState;
    /** Whether the player has reached the end cell. */
    completed: boolean;
    /** Cell currently being carved while a maze is animating its build. */
    buildCurrent?: Cell | null;
}

// ── Event emitter ─────────────────────────────────────────────────────────────

type EventMap = {
    'grid:changed': Grid;
    'player:moved': unknown;
    'viewMode:changed': ViewMode;
    'solver:updated': SolverState;
    'player:turned': unknown;
    'maze:completed': void;
};

type Listener<T> = T extends void ? () => void : (payload: T) => void;

export class EventEmitter {
    private listeners: { [K in keyof EventMap]?: Array<Listener<EventMap[K]>> } = {};

    on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        (this.listeners[event] as Array<Listener<EventMap[K]>>).push(listener);
    }

    off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
        const arr = this.listeners[event] as Array<Listener<EventMap[K]>> | undefined;
        if (!arr) return;
        const idx = arr.indexOf(listener);
        if (idx !== -1) arr.splice(idx, 1);
    }

    emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
        const arr = this.listeners[event] as Array<Listener<EventMap[K]>> | undefined;
        if (!arr) return;
        for (const listener of arr) {
            if (payload === undefined) {
                (listener as () => void)();
            } else {
                (listener as (p: EventMap[K]) => void)(payload);
            }
        }
    }
}

// ── State singleton ───────────────────────────────────────────────────────────

function createInitialSolverState(): SolverState {
    return {
        status: 'idle',
        visited: new Set(),
        frontier: new Set(),
        path: [],
        current: null,
        stepCount: 0,
    };
}

export function createAppState(): { state: AppState; events: EventEmitter } {
    const events = new EventEmitter();
    const state: AppState = {
        grid: null,
        player: null,
        viewMode: 'top-down',
        solver: createInitialSolverState(),
        completed: false,
    };
    return { state, events };
}

/** Module-level singleton for convenience. */
const { state, events } = createAppState();
export { state, events };
