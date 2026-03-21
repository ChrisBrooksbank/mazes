import type { Direction } from './player';
import type { Player } from './player';
import type { Grid } from './grid';
import type { EventEmitter } from './state';

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

// ── Keyboard input handler ────────────────────────────────────────────────────

export class KeyboardControls {
    private player: Player;
    private events: EventEmitter;
    private getGrid: () => Grid | null;
    private handler: (e: KeyboardEvent) => void;

    constructor(player: Player, events: EventEmitter, getGrid: () => Grid | null) {
        this.player = player;
        this.events = events;
        this.getGrid = getGrid;

        this.handler = (e: KeyboardEvent) => {
            const direction = KEY_MAP[e.code];
            if (!direction) return;

            const grid = this.getGrid();
            if (!grid) return;

            e.preventDefault();
            const moved = this.player.move(direction, grid);
            if (moved) {
                this.events.emit('player:moved', this.player);
            }
        };
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

export class TouchControls {
    private player: Player;
    private events: EventEmitter;
    private getGrid: () => Grid | null;
    private container: HTMLElement | null = null;

    constructor(player: Player, events: EventEmitter, getGrid: () => Grid | null) {
        this.player = player;
        this.events = events;
        this.getGrid = getGrid;
    }

    /** Returns true if the current device supports touch input. */
    static isTouchDevice(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    mount(parent: HTMLElement = document.body): void {
        // Only show on touch devices
        if (!TouchControls.isTouchDevice()) return;

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

        for (const { direction, label, gridArea } of DPAD_BUTTONS) {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.setAttribute('aria-label', `Move ${direction}`);
            btn.style.cssText = [
                `grid-area: ${gridArea}`,
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

        parent.appendChild(container);
        this.container = container;
    }

    unmount(): void {
        this.container?.remove();
        this.container = null;
    }
}
