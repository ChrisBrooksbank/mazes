import type { IView } from './IView';
import type { AppState } from '../state';
import type { Grid, Cell } from '../grid';
import type { Player } from '../player';
import { SOLVER_COLORS } from '../solvers/index';
import { PinchZoom } from './PinchZoom';

const PADDING = 12;
const TILE_ASPECT = 0.5; // tileH = tileW * TILE_ASPECT
const WALL_HEIGHT_RATIO = 0.6; // wallH = tileH * WALL_HEIGHT_RATIO

interface IsoLayout {
    tileW: number;
    tileH: number;
    wallH: number;
    originX: number;
    originY: number;
}

export class IsometricView implements IView {
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

        const layout = this.calcLayout(state.grid, width, height);

        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.pinchZoom.panX, this.pinchZoom.panY);

        // Collect cells sorted back-to-front (painter's algorithm: lower row+col first)
        const cells: Cell[] = [];
        for (let r = 0; r < state.grid.rows; r++) {
            for (let c = 0; c < state.grid.cols; c++) {
                cells.push(state.grid.cells[r][c]);
            }
        }
        cells.sort((a, b) => a.row + a.col - (b.row + b.col));

        for (const cell of cells) {
            this.drawFloor(cell, state, layout);
        }
        for (const cell of cells) {
            this.drawWalls(cell, layout);
        }
        this.drawPlayer(state, layout);

        ctx.restore();
    }

    resize(): void {
        this.syncCanvasSize();
        if (this.lastState) this.render(this.lastState);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private syncCanvasSize(): void {
        if (!this.container) return;
        const { clientWidth, clientHeight } = this.container;
        const dpr = window.devicePixelRatio ?? 1;
        this.canvas.width = clientWidth * dpr;
        this.canvas.height = clientHeight * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = `${clientWidth}px`;
        this.canvas.style.height = `${clientHeight}px`;
    }

    private calcLayout(grid: Grid, canvasW: number, canvasH: number): IsoLayout {
        const dpr = window.devicePixelRatio ?? 1;
        const w = canvasW / dpr;
        const h = canvasH / dpr;
        const availW = w - PADDING * 2;
        const availH = h - PADDING * 2;

        // Bounding box of the entire grid in isometric space:
        //   width  = (rows + cols) * tileW / 2
        //   height = (rows + cols) * tileH / 2 + wallH
        //          = (rows+cols) * tileW*TILE_ASPECT/2 + tileW*TILE_ASPECT*WALL_HEIGHT_RATIO
        const span = grid.rows + grid.cols;
        const tileWFromWidth = (2 * availW) / span;
        const tileWFromHeight = availH / (TILE_ASPECT * (span / 2 + WALL_HEIGHT_RATIO));
        const baseTileW = Math.max(4, Math.min(tileWFromWidth, tileWFromHeight));
        const tileW = baseTileW * this.pinchZoom.zoom;
        const tileH = tileW * TILE_ASPECT;
        const wallH = tileH * WALL_HEIGHT_RATIO;

        // Center horizontally: bounding box center is at originX + (cols-rows)*tileW/4
        const originX = PADDING + availW / 2 - ((grid.cols - grid.rows) * tileW) / 4;

        // Top of bounding box = originY - wallH, align to PADDING
        const originY = PADDING + wallH;

        return { tileW, tileH, wallH, originX, originY };
    }

    /** Returns the isometric screen position of the north (top) corner of a cell. */
    private isoPos(row: number, col: number, layout: IsoLayout): { x: number; y: number } {
        return {
            x: layout.originX + (col - row) * (layout.tileW / 2),
            y: layout.originY + (col + row) * (layout.tileH / 2),
        };
    }

    private getCellFill(cell: Cell, state: AppState): string {
        const { solver } = state;
        if (solver.status !== 'idle') {
            if (solver.current === cell) return 'rgba(251, 191, 36, 0.95)';
            if (solver.path.includes(cell)) return `${SOLVER_COLORS.path}cc`;
            if (solver.frontier.has(cell)) return 'rgba(167, 243, 208, 0.8)';
            if (solver.visited.has(cell)) return `${SOLVER_COLORS.visited}88`;
        }
        if (cell.isStart) return 'rgba(34, 197, 94, 0.6)';
        if (cell.isEnd) return 'rgba(239, 68, 68, 0.6)';
        return '#f8fafc';
    }

    private drawFloor(cell: Cell, state: AppState, layout: IsoLayout): void {
        const { tileW, tileH } = layout;
        const { x, y } = this.isoPos(cell.row, cell.col, layout);
        const ctx = this.ctx;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + tileW / 2, y + tileH / 2);
        ctx.lineTo(x, y + tileH);
        ctx.lineTo(x - tileW / 2, y + tileH / 2);
        ctx.closePath();
        ctx.fillStyle = this.getCellFill(cell, state);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    private drawWalls(cell: Cell, layout: IsoLayout): void {
        const { tileW, tileH, wallH } = layout;
        const { x, y } = this.isoPos(cell.row, cell.col, layout);
        const ctx = this.ctx;

        // Diamond corners:
        //   N (top):    (x,          y)
        //   E (right):  (x + tileW/2, y + tileH/2)
        //   S (bottom): (x,          y + tileH)
        //   W (left):   (x - tileW/2, y + tileH/2)
        const Nx = x,
            Ny = y;
        const Ex = x + tileW / 2,
            Ey = y + tileH / 2;
        const Sx = x,
            Sy = y + tileH;
        const Wx = x - tileW / 2,
            Wy = y + tileH / 2;

        // North wall — NE face (lighter, right-facing light)
        if (cell.walls.N) {
            ctx.beginPath();
            ctx.moveTo(Nx, Ny);
            ctx.lineTo(Ex, Ey);
            ctx.lineTo(Ex, Ey - wallH);
            ctx.lineTo(Nx, Ny - wallH);
            ctx.closePath();
            ctx.fillStyle = '#cbd5e1';
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // West wall — NW face (slightly darker, left-facing light)
        if (cell.walls.W) {
            ctx.beginPath();
            ctx.moveTo(Wx, Wy);
            ctx.lineTo(Nx, Ny);
            ctx.lineTo(Nx, Ny - wallH);
            ctx.lineTo(Wx, Wy - wallH);
            ctx.closePath();
            ctx.fillStyle = '#94a3b8';
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // East wall — SE face
        if (cell.walls.E) {
            ctx.beginPath();
            ctx.moveTo(Ex, Ey);
            ctx.lineTo(Sx, Sy);
            ctx.lineTo(Sx, Sy - wallH);
            ctx.lineTo(Ex, Ey - wallH);
            ctx.closePath();
            ctx.fillStyle = '#cbd5e1';
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // South wall — SW face
        if (cell.walls.S) {
            ctx.beginPath();
            ctx.moveTo(Sx, Sy);
            ctx.lineTo(Wx, Wy);
            ctx.lineTo(Wx, Wy - wallH);
            ctx.lineTo(Sx, Sy - wallH);
            ctx.closePath();
            ctx.fillStyle = '#94a3b8';
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    private drawPlayer(state: AppState, layout: IsoLayout): void {
        if (!state.player) return;
        const player = state.player as Player;
        const { tileW, tileH } = layout;
        const { x, y } = this.isoPos(player.row, player.col, layout);
        const ctx = this.ctx;

        // Draw player as a small diamond centered on the cell
        const cx = x;
        const cy = y + tileH / 2;
        const pw = tileW * 0.3;
        const ph = tileH * 0.3;

        ctx.beginPath();
        ctx.moveTo(cx, cy - ph);
        ctx.lineTo(cx + pw / 2, cy);
        ctx.lineTo(cx, cy + ph);
        ctx.lineTo(cx - pw / 2, cy);
        ctx.closePath();
        ctx.fillStyle = '#7c3aed';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, pw / 6);
        ctx.stroke();
    }
}
