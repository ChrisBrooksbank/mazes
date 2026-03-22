import type { IView } from './IView';
import type { AppState } from '../state';
import type { Grid, Cell } from '../grid';
import type { Player } from '../player';
import { SOLVER_COLORS } from '../solvers/index';
import { PinchZoom } from './PinchZoom';

const PADDING = 8; // px around the maze

export class TopDownView implements IView {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private container: HTMLElement | null = null;
    private resizeObserver: ResizeObserver;
    private pinchZoom: PinchZoom;
    private lastState: AppState | null = null;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D canvas context');
        this.ctx = ctx;

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.pinchZoom = new PinchZoom(() => {
            if (this.lastState) this.render(this.lastState);
        });
    }

    mount(container: HTMLElement): void {
        this.container = container;
        container.appendChild(this.canvas);
        this.resizeObserver.observe(container);
        this.pinchZoom.attach(this.canvas);
        this.syncCanvasSize();
    }

    unmount(): void {
        this.resizeObserver.disconnect();
        this.pinchZoom.detach();
        this.canvas.remove();
        this.container = null;
    }

    render(state: AppState): void {
        this.lastState = state;
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        if (!state.grid) return;

        const { cellSize, offsetX, offsetY } = this.calcLayout(state.grid, width, height);

        const ctx = this.ctx;
        const dpr = window.devicePixelRatio ?? 1;
        ctx.save();
        ctx.translate(this.pinchZoom.panX * dpr, this.pinchZoom.panY * dpr);

        this.drawBackground(state.grid, cellSize, offsetX, offsetY);
        this.drawSolverOverlay(state, cellSize, offsetX, offsetY);
        this.drawWalls(state.grid, cellSize, offsetX, offsetY);
        this.drawPlayer(state, cellSize, offsetX, offsetY);

        ctx.restore();
    }

    resize(): void {
        this.syncCanvasSize();
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private syncCanvasSize(): void {
        if (!this.container) return;
        const { clientWidth, clientHeight } = this.container;
        const dpr = window.devicePixelRatio ?? 1;
        this.canvas.width = clientWidth * dpr;
        this.canvas.height = clientHeight * dpr;
        this.ctx.scale(dpr, dpr);
        // Re-set canvas CSS size to fill container
        this.canvas.style.width = `${clientWidth}px`;
        this.canvas.style.height = `${clientHeight}px`;
    }

    private calcLayout(
        grid: Grid,
        canvasW: number,
        canvasH: number
    ): { cellSize: number; offsetX: number; offsetY: number } {
        const dpr = window.devicePixelRatio ?? 1;
        const w = canvasW / dpr;
        const h = canvasH / dpr;
        const availW = w - PADDING * 2;
        const availH = h - PADDING * 2;
        const baseSize = Math.max(4, Math.min(availW / grid.cols, availH / grid.rows));
        const cellSize = baseSize * this.pinchZoom.zoom;
        const mazeW = cellSize * grid.cols;
        const mazeH = cellSize * grid.rows;
        const offsetX = PADDING + (availW - mazeW) / 2;
        const offsetY = PADDING + (availH - mazeH) / 2;
        return { cellSize, offsetX, offsetY };
    }

    private cellX(col: number, cellSize: number, offsetX: number): number {
        return offsetX + col * cellSize;
    }

    private cellY(row: number, cellSize: number, offsetY: number): number {
        return offsetY + row * cellSize;
    }

    private drawBackground(grid: Grid, cellSize: number, offsetX: number, offsetY: number): void {
        const ctx = this.ctx;
        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                const cell = grid.cells[r][c];
                const x = this.cellX(c, cellSize, offsetX);
                const y = this.cellY(r, cellSize, offsetY);

                if (cell.isStart) {
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.45)'; // green
                } else if (cell.isEnd) {
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.45)'; // red
                } else {
                    ctx.fillStyle = '#ffffff';
                }
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
    }

    private drawSolverOverlay(
        state: AppState,
        cellSize: number,
        offsetX: number,
        offsetY: number
    ): void {
        const { solver } = state;
        if (solver.status === 'idle') return;

        const ctx = this.ctx;

        // Visited cells
        for (const cell of solver.visited) {
            const x = this.cellX(cell.col, cellSize, offsetX);
            const y = this.cellY(cell.row, cellSize, offsetY);
            ctx.fillStyle = `${SOLVER_COLORS.visited}55`; // semi-transparent
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        }

        // Frontier cells
        for (const cell of solver.frontier) {
            const x = this.cellX(cell.col, cellSize, offsetX);
            const y = this.cellY(cell.row, cellSize, offsetY);
            ctx.fillStyle = 'rgba(167, 243, 208, 0.6)'; // light green
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        }

        // Solution path
        if (solver.path.length > 0) {
            for (const cell of solver.path) {
                const x = this.cellX(cell.col, cellSize, offsetX);
                const y = this.cellY(cell.row, cellSize, offsetY);
                ctx.fillStyle = `${SOLVER_COLORS.path}cc`;
                ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            }
        }

        // Current cell highlight
        if (solver.current) {
            const cell = solver.current;
            const x = this.cellX(cell.col, cellSize, offsetX);
            const y = this.cellY(cell.row, cellSize, offsetY);
            ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        }
    }

    private drawWalls(grid: Grid, cellSize: number, offsetX: number, offsetY: number): void {
        const ctx = this.ctx;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = Math.max(1, cellSize / 16);
        ctx.lineCap = 'square';

        // Draw outer border
        ctx.strokeRect(offsetX, offsetY, cellSize * grid.cols, cellSize * grid.rows);

        // Draw inner walls (only south and east to avoid double-drawing)
        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                const cell: Cell = grid.cells[r][c];
                const x = this.cellX(c, cellSize, offsetX);
                const y = this.cellY(r, cellSize, offsetY);

                ctx.beginPath();
                // South wall (skip bottom border)
                if (cell.walls.S && r < grid.rows - 1) {
                    ctx.moveTo(x, y + cellSize);
                    ctx.lineTo(x + cellSize, y + cellSize);
                }
                // East wall (skip right border)
                if (cell.walls.E && c < grid.cols - 1) {
                    ctx.moveTo(x + cellSize, y);
                    ctx.lineTo(x + cellSize, y + cellSize);
                }
                ctx.stroke();
            }
        }
    }

    private drawPlayer(state: AppState, cellSize: number, offsetX: number, offsetY: number): void {
        if (!state.player) return;
        const player = state.player as Player;

        const cx = this.cellX(player.col, cellSize, offsetX) + cellSize / 2;
        const cy = this.cellY(player.row, cellSize, offsetY) + cellSize / 2;
        const radius = Math.max(2, cellSize * 0.3);

        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#7c3aed'; // purple
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, radius / 4);
        ctx.stroke();
    }
}
