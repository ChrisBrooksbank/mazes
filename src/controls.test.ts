import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { KeyboardControls, TouchControls } from './controls';
import { Player } from './player';
import { createGrid, removeWall } from './grid';
import { createAppState } from './state';
import type { Grid } from './grid';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSetup() {
    const grid: Grid = createGrid(3, 3);
    const player = new Player(1, 1, 'S');
    const { events } = createAppState();
    return { grid, player, events };
}

function fireKey(code: string) {
    const event = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    return event;
}

// ── KeyboardControls ──────────────────────────────────────────────────────────

describe('KeyboardControls', () => {
    let grid: Grid;
    let player: Player;
    let events: ReturnType<typeof createAppState>['events'];
    let controls: KeyboardControls;

    beforeEach(() => {
        ({ grid, player, events } = makeSetup());
        controls = new KeyboardControls(
            player,
            events,
            () => grid,
            () => 'top-down' as const
        );
        controls.mount();
    });

    afterEach(() => {
        controls.unmount();
    });

    it('moves north on ArrowUp when wall is open', () => {
        removeWall(grid, grid.cells[1][1], grid.cells[0][1]);
        fireKey('ArrowUp');
        expect(player.row).toBe(0);
        expect(player.col).toBe(1);
    });

    it('moves north on KeyW when wall is open', () => {
        removeWall(grid, grid.cells[1][1], grid.cells[0][1]);
        fireKey('KeyW');
        expect(player.row).toBe(0);
    });

    it('moves south on ArrowDown when wall is open', () => {
        removeWall(grid, grid.cells[1][1], grid.cells[2][1]);
        fireKey('ArrowDown');
        expect(player.row).toBe(2);
    });

    it('moves south on KeyS when wall is open', () => {
        removeWall(grid, grid.cells[1][1], grid.cells[2][1]);
        fireKey('KeyS');
        expect(player.row).toBe(2);
    });

    it('moves east on ArrowRight when wall is open', () => {
        removeWall(grid, grid.cells[1][1], grid.cells[1][2]);
        fireKey('ArrowRight');
        expect(player.col).toBe(2);
    });

    it('moves east on KeyD when wall is open', () => {
        removeWall(grid, grid.cells[1][1], grid.cells[1][2]);
        fireKey('KeyD');
        expect(player.col).toBe(2);
    });

    it('moves west on ArrowLeft when wall is open', () => {
        removeWall(grid, grid.cells[1][1], grid.cells[1][0]);
        fireKey('ArrowLeft');
        expect(player.col).toBe(0);
    });

    it('moves west on KeyA when wall is open', () => {
        removeWall(grid, grid.cells[1][1], grid.cells[1][0]);
        fireKey('KeyA');
        expect(player.col).toBe(0);
    });

    it('does not move when wall is intact', () => {
        fireKey('ArrowUp');
        expect(player.row).toBe(1);
        expect(player.col).toBe(1);
    });

    it('emits player:moved event on successful move', () => {
        removeWall(grid, grid.cells[1][1], grid.cells[0][1]);
        const listener = vi.fn();
        events.on('player:moved', listener);
        fireKey('ArrowUp');
        expect(listener).toHaveBeenCalledOnce();
    });

    it('does not emit player:moved when move is blocked', () => {
        const listener = vi.fn();
        events.on('player:moved', listener);
        fireKey('ArrowUp');
        expect(listener).not.toHaveBeenCalled();
    });

    it('does not respond to unrelated keys', () => {
        const listener = vi.fn();
        events.on('player:moved', listener);
        fireKey('Space');
        expect(listener).not.toHaveBeenCalled();
    });

    it('does not move when grid is null', () => {
        const nullControls = new KeyboardControls(
            player,
            events,
            () => null,
            () => 'top-down' as const
        );
        nullControls.mount();
        fireKey('ArrowUp');
        expect(player.row).toBe(1);
        nullControls.unmount();
    });

    it('stops responding after unmount', () => {
        removeWall(grid, grid.cells[1][1], grid.cells[0][1]);
        controls.unmount();
        fireKey('ArrowUp');
        expect(player.row).toBe(1); // should not have moved
        // re-mount so afterEach unmount doesn't throw
        controls.mount();
    });
});

// ── TouchControls ─────────────────────────────────────────────────────────────

describe('TouchControls', () => {
    let grid: Grid;
    let player: Player;
    let events: ReturnType<typeof createAppState>['events'];

    beforeEach(() => {
        ({ grid, player, events } = makeSetup());
    });

    it('does not render buttons on non-touch devices', () => {
        vi.spyOn(TouchControls, 'isTouchDevice').mockReturnValue(false);
        const controls = new TouchControls(
            player,
            events,
            () => grid,
            () => 'top-down' as const
        );
        const parent = document.createElement('div');
        document.body.appendChild(parent);
        controls.mount(parent);
        expect(parent.querySelector('.touch-controls')).toBeNull();
        parent.remove();
        vi.restoreAllMocks();
    });

    it('renders 4 directional buttons on touch devices', () => {
        vi.spyOn(TouchControls, 'isTouchDevice').mockReturnValue(true);
        const controls = new TouchControls(
            player,
            events,
            () => grid,
            () => 'top-down' as const
        );
        const parent = document.createElement('div');
        document.body.appendChild(parent);
        controls.mount(parent);
        const container = parent.querySelector('.touch-controls');
        expect(container).not.toBeNull();
        expect(container!.querySelectorAll('button')).toHaveLength(4);
        controls.unmount();
        parent.remove();
        vi.restoreAllMocks();
    });

    it('removes the container on unmount', () => {
        vi.spyOn(TouchControls, 'isTouchDevice').mockReturnValue(true);
        const controls = new TouchControls(
            player,
            events,
            () => grid,
            () => 'top-down' as const
        );
        const parent = document.createElement('div');
        document.body.appendChild(parent);
        controls.mount(parent);
        controls.unmount();
        expect(parent.querySelector('.touch-controls')).toBeNull();
        parent.remove();
        vi.restoreAllMocks();
    });

    it('triggers player movement on touchstart', () => {
        vi.spyOn(TouchControls, 'isTouchDevice').mockReturnValue(true);
        removeWall(grid, grid.cells[1][1], grid.cells[0][1]); // open N

        const controls = new TouchControls(
            player,
            events,
            () => grid,
            () => 'top-down' as const
        );
        const parent = document.createElement('div');
        document.body.appendChild(parent);
        controls.mount(parent);

        const northBtn = Array.from(parent.querySelectorAll('button')).find(
            b => b.getAttribute('aria-label') === 'Move N'
        );
        expect(northBtn).not.toBeNull();

        northBtn!.dispatchEvent(new TouchEvent('touchstart', { cancelable: true }));
        expect(player.row).toBe(0);

        controls.unmount();
        parent.remove();
        vi.restoreAllMocks();
    });

    it('emits player:moved on successful touch move', () => {
        vi.spyOn(TouchControls, 'isTouchDevice').mockReturnValue(true);
        removeWall(grid, grid.cells[1][1], grid.cells[0][1]);

        const controls = new TouchControls(
            player,
            events,
            () => grid,
            () => 'top-down' as const
        );
        const parent = document.createElement('div');
        document.body.appendChild(parent);
        controls.mount(parent);

        const listener = vi.fn();
        events.on('player:moved', listener);

        const northBtn = Array.from(parent.querySelectorAll('button')).find(
            b => b.getAttribute('aria-label') === 'Move N'
        );
        northBtn!.dispatchEvent(new TouchEvent('touchstart', { cancelable: true }));
        expect(listener).toHaveBeenCalledOnce();

        controls.unmount();
        parent.remove();
        vi.restoreAllMocks();
    });
});
