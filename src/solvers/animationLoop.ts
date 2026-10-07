import type { Grid } from '../grid';
import type { SolverState } from '../state';
import type { SolverStep } from './types';
import type { MazeSolver } from './index';

export type AnimationSpeed = number; // steps per second (1–200, 0 = instant)

export interface AnimationLoopCallbacks {
    onStep: (state: SolverState) => void;
    onComplete: (state: SolverState) => void;
}

function stepToSolverState(step: SolverStep, stepCount: number): SolverState {
    const isDone = step.path.length > 0;
    return {
        status: isDone ? 'complete' : 'running',
        visited: step.visited,
        frontier: step.frontier,
        path: step.path,
        current: step.current,
        stepCount,
    };
}

export class SolverAnimationLoop {
    private gen: Generator<SolverStep> | null = null;
    private timerId: ReturnType<typeof setTimeout> | null = null;
    private status: SolverState['status'] = 'idle';
    private stepCount = 0;
    private lastStep: SolverStep | null = null;
    private callbacks: AnimationLoopCallbacks;
    /** Steps per second (1–200). */
    speed: AnimationSpeed = 10;

    constructor(callbacks: AnimationLoopCallbacks) {
        this.callbacks = callbacks;
    }

    /** Start a new solve run. Resets any existing run. */
    start(grid: Grid, solver: MazeSolver): void {
        this.stop();
        this.gen = solver(grid);
        this.stepCount = 0;
        this.lastStep = null;
        this.status = 'running';
        this.scheduleNext();
    }

    pause(): void {
        if (this.status !== 'running') return;
        this.status = 'paused';
        this.clearTimer();
    }

    resume(): void {
        if (this.status !== 'paused') return;
        this.status = 'running';
        this.scheduleNext();
    }

    /** Run all remaining steps instantly. */
    complete(): void {
        if (this.status === 'idle' || this.status === 'complete') return;
        this.clearTimer();
        this.status = 'running';
        this.drainSync();
    }

    stop(): void {
        this.clearTimer();
        this.gen = null;
        this.status = 'idle';
        this.stepCount = 0;
        this.lastStep = null;
    }

    getStatus(): SolverState['status'] {
        return this.status;
    }

    private scheduleNext(): void {
        if (this.status !== 'running') return;
        const delay = this.speed > 0 ? Math.round(1000 / this.speed) : 0;
        this.timerId = setTimeout(() => this.tick(), delay);
    }

    private tick(): void {
        if (!this.gen || this.status !== 'running') return;

        const result = this.gen.next();
        if (result.done) {
            this.finishWithLastStep();
            return;
        }

        this.stepCount++;
        this.lastStep = result.value;
        const solverState = stepToSolverState(result.value, this.stepCount);

        if (solverState.status === 'complete') {
            this.status = 'complete';
            this.callbacks.onComplete(solverState);
            return;
        }

        this.callbacks.onStep(solverState);
        this.scheduleNext();
    }

    private drainSync(): void {
        if (!this.gen) return;

        let lastStep: SolverStep | null = this.lastStep;
        let lastResult: IteratorResult<SolverStep> | null = null;

        while (true) {
            const result = this.gen.next();
            if (result.done) break;
            lastStep = result.value;
            lastResult = result;
            this.stepCount++;
        }

        if (lastResult && lastStep) {
            const solverState = stepToSolverState(lastStep, this.stepCount);
            this.status = 'complete';
            this.callbacks.onComplete(solverState);
        } else {
            this.finishWithLastStep();
        }
    }

    private finishWithLastStep(): void {
        this.status = 'complete';
        if (this.lastStep) {
            const state = stepToSolverState(this.lastStep, this.stepCount);
            this.callbacks.onComplete({ ...state, status: 'complete' });
        }
    }

    private clearTimer(): void {
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }
}
