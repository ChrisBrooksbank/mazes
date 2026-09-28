import type { Direction } from './player';
import type { Player } from './player';
import type { Grid } from './grid';
import type { EventEmitter, ViewMode } from './state';

// ── Key → Direction mapping ───────────────────────────────────────────────────

const KEY_MAP: Record<string, Direction> = {
    ArrowUp: 'N',
    KeyW: 'N',
    ArrowDown: 'S',
    KeyS: 'S',
    ArrowRight: 'E',
    KeyD: 'E',
    ArrowLeft: 'W',
    KeyA: 'W',
};

/** Keys that map to relative actions in first-person mode. */
type RelativeAction = 'forward' | 'backward' | 'turnLeft' | 'turnRight';

const FP_KEY_MAP: Record<string, RelativeAction> = {
    ArrowUp: 'forward',
    KeyW: 'forward',
    ArrowDown: 'backward',
    KeyS: 'backward',
    ArrowLeft: 'turnLeft',
    KeyA: 'turnLeft',
    ArrowRight: 'turnRight',
    KeyD: 'turnRight',
};

// ── Keyboard input handler ────────────────────────────────────────────────────

export class KeyboardControls {
    private player: Player;
    private events: EventEmitter;
    private getGrid: () => Grid | null;
    private getViewMode: () => ViewMode;
    private handler: (e: KeyboardEvent) => void;

    constructor(
        player: Player,
        events: EventEmitter,
        getGrid: () => Grid | null,
        getViewMode: () => ViewMode
    ) {
        this.player = player;
        this.events = events;
        this.getGrid = getGrid;
        this.getViewMode = getViewMode;

        this.handler = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

            const viewMode = this.getViewMode();

            if (viewMode === 'first-person') {
                this._handleFirstPerson(e);
            } else {
                this._handleAbsolute(e);
            }
        };
    }

    private _handleAbsolute(e: KeyboardEvent): void {
        const direction = KEY_MAP[e.code];
        if (!direction) return;

        const grid = this.getGrid();
        if (!grid) return;

        e.preventDefault();
        const moved = this.player.move(direction, grid);
        if (moved) {
            this.events.emit('player:moved', this.player);
        }
    }

    private _handleFirstPerson(e: KeyboardEvent): void {
        const action = FP_KEY_MAP[e.code];
        if (!action) return;

        const grid = this.getGrid();
        if (!grid) return;

        e.preventDefault();

        if (action === 'turnLeft') {
            this.player.turnLeft();
            this.events.emit('player:turned', this.player);
        } else if (action === 'turnRight') {
            this.player.turnRight();
            this.events.emit('player:turned', this.player);
        } else if (action === 'forward') {
            const moved = this.player.moveForward(grid);
            if (moved) this.events.emit('player:moved', this.player);
        } else if (action === 'backward') {
            const moved = this.player.moveBackward(grid);
            if (moved) this.events.emit('player:moved', this.player);
        }
    }

    mount(): void {
        window.addEventListener('keydown', this.handler);
    }

    unmount(): void {
        window.removeEventListener('keydown', this.handler);
    }
}

// ── TouchControls D-pad overlay ───────────────────────────────────────────────

const DPAD_BUTTONS: Array<{ direction: Direction; label: string; gridArea: string }> = [
    { direction: 'N', label: '▲', gridArea: '1 / 2' },
    { direction: 'W', label: '◀', gridArea: '2 / 1' },
    { direction: 'E', label: '▶', gridArea: '2 / 3' },
    { direction: 'S', label: '▼', gridArea: '3 / 2' },
];

type FPDpadAction = 'forward' | 'backward' | 'turnLeft' | 'turnRight';

const FP_DPAD_BUTTONS: Array<{ action: FPDpadAction; label: string; gridArea: string }> = [
    { action: 'forward', label: '▲', gridArea: '1 / 2' },
    { action: 'turnLeft', label: '↺', gridArea: '2 / 1' },
    { action: 'turnRight', label: '↻', gridArea: '2 / 3' },
    { action: 'backward', label: '▼', gridArea: '3 / 2' },
];

export class TouchControls {
    private player: Player;
    private events: EventEmitter;
    private getGrid: () => Grid | null;
    private getViewMode: () => ViewMode;
    private container: HTMLElement | null = null;
    private parent: HTMLElement | null = null;

    constructor(
        player: Player,
        events: EventEmitter,
        getGrid: () => Grid | null,
        getViewMode: () => ViewMode
    ) {
        this.player = player;
        this.events = events;
        this.getGrid = getGrid;
        this.getViewMode = getViewMode;
    }

    /** Returns true if the current device supports touch input. */
    static isTouchDevice(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    mount(parent: HTMLElement = document.body): void {
        // Only show on touch devices
        if (!TouchControls.isTouchDevice()) return;
        this.parent = parent;
        this._build();
    }

    /** Rebuild the d-pad (call after view mode changes). */
    rebuild(): void {
        if (!this.parent || !TouchControls.isTouchDevice()) return;
        this.container?.remove();
        this.container = null;
        this._build();
    }

    private _build(): void {
        if (!this.parent) return;

        const container = document.createElement('div');
        container.className = 'touch-controls';
        container.style.cssText = [
            'position: fixed',
            'bottom: 24px',
            'right: 24px',
            'display: grid',
            'grid-template-columns: repeat(3, 52px)',
            'grid-template-rows: repeat(3, 52px)',
            'gap: 4px',
            'opacity: 0.65',
            'z-index: 1000',
            'pointer-events: auto',
            'user-select: none',
            '-webkit-user-select: none',
        ].join(';');

        const btnStyle = [
            'width: 52px',
            'height: 52px',
            'font-size: 22px',
            'border: 2px solid rgba(255,255,255,0.6)',
            'border-radius: 10px',
            'background: rgba(0,0,0,0.45)',
            'color: white',
            'cursor: pointer',
            'touch-action: manipulation',
            'display: flex',
            'align-items: center',
            'justify-content: center',
            'padding: 0',
        ].join(';');

        if (this.getViewMode() === 'first-person') {
            for (const { action, label, gridArea } of FP_DPAD_BUTTONS) {
                const btn = document.createElement('button');
                btn.textContent = label;
                btn.setAttribute('aria-label', action);
                btn.style.cssText = `grid-area: ${gridArea};${btnStyle}`;

                const handler = (e: Event) => {
                    e.preventDefault();
                    const grid = this.getGrid();
                    if (!grid) return;

                    if (action === 'turnLeft') {
                        this.player.turnLeft();
                        this.events.emit('player:turned', this.player);
                    } else if (action === 'turnRight') {
                        this.player.turnRight();
                        this.events.emit('player:turned', this.player);
                    } else if (action === 'forward') {
                        const moved = this.player.moveForward(grid);
                        if (moved) this.events.emit('player:moved', this.player);
                    } else {
                        const moved = this.player.moveBackward(grid);
                        if (moved) this.events.emit('player:moved', this.player);
                    }
                };

                btn.addEventListener('touchstart', handler, { passive: false });
                container.appendChild(btn);
            }
        } else {
            for (const { direction, label, gridArea } of DPAD_BUTTONS) {
                const btn = document.createElement('button');
                btn.textContent = label;
                btn.setAttribute('aria-label', `Move ${direction}`);
                btn.style.cssText = `grid-area: ${gridArea};${btnStyle}`;

                const move = (e: Event) => {
                    e.preventDefault();
                    const grid = this.getGrid();
                    if (!grid) return;
                    const moved = this.player.move(direction, grid);
                    if (moved) {
                        this.events.emit('player:moved', this.player);
                    }
                };

                btn.addEventListener('touchstart', move, { passive: false });
                container.appendChild(btn);
            }
        }

        this.parent.appendChild(container);
        this.container = container;
    }

    unmount(): void {
        this.container?.remove();
        this.container = null;
    }
}
