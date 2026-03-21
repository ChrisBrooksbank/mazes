import type { AppState, ViewMode } from '../state';
import type { Grid, Cell } from '../grid';
import type { Player } from '../player';

const MINIMAP_SIZE = 160; // px, fixed square
const MINIMAP_PADDING = 2;
const THREE_D_VIEWS: ViewMode[] = ['first-person', 'third-person'];

/**
 * HUD overlay: timer, step counter, and minimap in 3D views.
 */
export class HUD {
    private root: HTMLElement;
    private timerEl: HTMLElement;
    private stepEl: HTMLElement;
    private minimapWrapper: HTMLElement;
    private minimapCanvas: HTMLCanvasElement;
    private minimapCtx: CanvasRenderingContext2D;

    /** Timestamp (ms) when the current timing session started. */
    private startTime: number | null = null;
    /** Elapsed ms accumulated before a pause / reset. */
    private elapsedBase = 0;
    /** rAF handle for the timer tick. */
    private rafHandle = 0;

    constructor() {
        this.root = document.createElement('div');
        this.root.className = 'hud';

        // Timer
        this.timerEl = document.createElement('div');
        this.timerEl.className = 'hud__timer';
        this.timerEl.textContent = '0:00';
        this.timerEl.setAttribute('aria-label', 'Elapsed time');

        // Step counter
        this.stepEl = document.createElement('div');
        this.stepEl.className = 'hud__steps';
        this.stepEl.textContent = 'Steps: 0';
        this.stepEl.setAttribute('aria-label', 'Solver step counter');

        // Minimap
        this.minimapWrapper = document.createElement('div');
        this.minimapWrapper.className = 'hud__minimap';

        this.minimapCanvas = document.createElement('canvas');
        this.minimapCanvas.width = MINIMAP_SIZE;
        this.minimapCanvas.height = MINIMAP_SIZE;
        this.minimapCanvas.style.width = `${MINIMAP_SIZE}px`;
        this.minimapCanvas.style.height = `${MINIMAP_SIZE}px`;

        const ctx = this.minimapCanvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context for minimap');
        this.minimapCtx = ctx;

        this.minimapWrapper.appendChild(this.minimapCanvas);

        this.root.appendChild(this.timerEl);
        this.root.appendChild(this.stepEl);
        this.root.appendChild(this.minimapWrapper);
    }

    mount(container: HTMLElement): void {
        container.appendChild(this.root);
        this.startTick();
    }

    unmount(): void {
        this.stopTick();
        this.root.remove();
    }

    /**
     * Call when a new maze is generated (resets timer to zero).
     */
    notifyGenerated(): void {
        this.elapsedBase = 0;
        this.startTime = performance.now();
    }

    /**
     * Call when solving starts (continues the timer from current elapsed).
     */
    notifySolveStarted(): void {
        if (this.startTime === null) {
            this.startTime = performance.now();
        }
        // If already running, just keep going.
    }

    /** Update all HUD elements from current app state. */
    update(state: AppState): void {
        this.stepEl.textContent = `Steps: ${state.solver.stepCount}`;
        this.setMinimapVisible(THREE_D_VIEWS.includes(state.viewMode));

        if (state.grid && THREE_D_VIEWS.includes(state.viewMode)) {
            this.drawMinimap(state);
        }
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private setMinimapVisible(visible: boolean): void {
        this.minimapWrapper.style.display = visible ? 'block' : 'none';
    }

    private startTick(): void {
        const tick = () => {
            this.tickTimer();
            this.rafHandle = requestAnimationFrame(tick);
        };
        this.rafHandle = requestAnimationFrame(tick);
    }

    private stopTick(): void {
        cancelAnimationFrame(this.rafHandle);
    }

    private tickTimer(): void {
        let elapsed = this.elapsedBase;
        if (this.startTime !== null) {
            elapsed += performance.now() - this.startTime;
        }
        this.timerEl.textContent = formatTime(elapsed);
    }

    // ── Minimap drawing (simplified top-down) ────────────────────────────────

    private drawMinimap(state: AppState): void {
        const { grid, solver } = state;
        if (!grid) return;

        const ctx = this.minimapCtx;
        const w = MINIMAP_SIZE;
        const h = MINIMAP_SIZE;
        ctx.clearRect(0, 0, w, h);

        const avail = w - MINIMAP_PADDING * 2;
        const cellSize = Math.max(1, Math.min(avail / grid.cols, avail / grid.rows));
        const mazeW = cellSize * grid.cols;
        const mazeH = cellSize * grid.rows;
        const ox = MINIMAP_PADDING + (avail - mazeW) / 2;
        const oy = MINIMAP_PADDING + (avail - mazeH) / 2;

        // Background fill
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Cell fills
        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                const cell: Cell = grid.cells[r][c];
                const x = ox + c * cellSize;
                const y = oy + r * cellSize;

                if (cell.isStart) {
                    ctx.fillStyle = 'rgba(34,197,94,0.6)';
                } else if (cell.isEnd) {
                    ctx.fillStyle = 'rgba(239,68,68,0.6)';
                } else {
                    ctx.fillStyle = '#1e293b';
                }
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }

        // Solver path overlay
        if (solver.status !== 'idle') {
            for (const cell of solver.visited) {
                ctx.fillStyle = 'rgba(96,165,250,0.4)';
                ctx.fillRect(
                    ox + cell.col * cellSize,
                    oy + cell.row * cellSize,
                    cellSize,
                    cellSize
                );
            }
            for (const cell of solver.path) {
                ctx.fillStyle = 'rgba(251,191,36,0.8)';
                ctx.fillRect(
                    ox + cell.col * cellSize,
                    oy + cell.row * cellSize,
                    cellSize,
                    cellSize
                );
            }
        }

        // Walls
        this.drawMinimapWalls(grid, ctx, cellSize, ox, oy);

        // Player dot
        if (state.player) {
            const player = state.player as Player;
            const px = ox + player.col * cellSize + cellSize / 2;
            const py = oy + player.row * cellSize + cellSize / 2;
            const r = Math.max(1.5, cellSize * 0.35);
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fillStyle = '#a855f7';
            ctx.fill();
        }
    }

    private drawMinimapWalls(
        grid: Grid,
        ctx: CanvasRenderingContext2D,
        cellSize: number,
        ox: number,
        oy: number
    ): void {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = Math.max(0.5, cellSize / 12);
        ctx.lineCap = 'square';

        // Outer border
        ctx.strokeRect(ox, oy, cellSize * grid.cols, cellSize * grid.rows);

        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                const cell: Cell = grid.cells[r][c];
                const x = ox + c * cellSize;
                const y = oy + r * cellSize;

                ctx.beginPath();
                if (cell.walls.S && r < grid.rows - 1) {
                    ctx.moveTo(x, y + cellSize);
                    ctx.lineTo(x + cellSize, y + cellSize);
                }
                if (cell.walls.E && c < grid.cols - 1) {
                    ctx.moveTo(x + cellSize, y);
                    ctx.lineTo(x + cellSize, y + cellSize);
                }
                ctx.stroke();
            }
        }
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
