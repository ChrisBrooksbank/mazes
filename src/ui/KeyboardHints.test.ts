import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyboardHints } from './KeyboardHints';

describe('KeyboardHints', () => {
    let container: HTMLElement;
    let hints: KeyboardHints;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        hints = new KeyboardHints();
        // Default: non-touch device so mount() actually appends the element
        vi.spyOn(KeyboardHints, 'isTouchDevice').mockReturnValue(false);
    });

    afterEach(() => {
        hints.unmount();
        container.remove();
        vi.restoreAllMocks();
    });

    it('does not mount on touch devices', () => {
        vi.spyOn(KeyboardHints, 'isTouchDevice').mockReturnValue(true);
        hints.mount(container);
        expect(container.querySelector('.kbd-hints')).toBeNull();
    });

    it('mounts into the container on non-touch devices', () => {
        hints.mount(container);
        expect(container.querySelector('.kbd-hints')).not.toBeNull();
    });

    it('unmounts cleanly', () => {
        hints.mount(container);
        hints.unmount();
        expect(container.querySelector('.kbd-hints')).toBeNull();
    });

    it('renders a toggle button', () => {
        hints.mount(container);
        const btn = container.querySelector<HTMLButtonElement>('.kbd-hints__toggle');
        expect(btn).not.toBeNull();
        expect(btn!.textContent).toBe('?');
    });

    it('renders the shortcut panel', () => {
        hints.mount(container);
        expect(container.querySelector('.kbd-hints__panel')).not.toBeNull();
    });

    it('panel is visible by default', () => {
        hints.mount(container);
        expect(hints.isVisible()).toBe(true);
        const panel = container.querySelector('.kbd-hints__panel')!;
        expect(panel.classList.contains('kbd-hints__panel--hidden')).toBe(false);
    });

    it('clicking toggle hides the panel', () => {
        hints.mount(container);
        const btn = container.querySelector<HTMLButtonElement>('.kbd-hints__toggle')!;
        btn.click();
        expect(hints.isVisible()).toBe(false);
        const panel = container.querySelector('.kbd-hints__panel')!;
        expect(panel.classList.contains('kbd-hints__panel--hidden')).toBe(true);
    });

    it('clicking toggle twice shows the panel again', () => {
        hints.mount(container);
        const btn = container.querySelector<HTMLButtonElement>('.kbd-hints__toggle')!;
        btn.click();
        btn.click();
        expect(hints.isVisible()).toBe(true);
        const panel = container.querySelector('.kbd-hints__panel')!;
        expect(panel.classList.contains('kbd-hints__panel--hidden')).toBe(false);
    });

    it('renders movement shortcut rows', () => {
        hints.mount(container);
        const rows = container.querySelectorAll('.kbd-hints__row');
        expect(rows.length).toBe(4);
    });

    it('renders heading text', () => {
        hints.mount(container);
        const heading = container.querySelector('.kbd-hints__heading');
        expect(heading).not.toBeNull();
        expect(heading!.textContent).toBe('Keyboard Controls');
    });

    it('toggle button has aria-label', () => {
        hints.mount(container);
        const btn = container.querySelector<HTMLButtonElement>('.kbd-hints__toggle')!;
        expect(btn.getAttribute('aria-label')).toBeTruthy();
    });

    it('toggle button has aria-expanded attribute after toggle', () => {
        hints.mount(container);
        const btn = container.querySelector<HTMLButtonElement>('.kbd-hints__toggle')!;
        btn.click();
        expect(btn.getAttribute('aria-expanded')).toBe('false');
        btn.click();
        expect(btn.getAttribute('aria-expanded')).toBe('true');
    });

    it('shows turn controls in first-person view and back to compass moves after', () => {
        hints.mount(container);
        const actions = () =>
            [...container.querySelectorAll('.kbd-hints__action')].map(el => el.textContent);

        hints.setViewMode('first-person');
        expect(actions()).toContain('Turn left');
        expect(actions()).not.toContain('Move West');

        hints.setViewMode('top-down');
        expect(actions()).toContain('Move West');
        expect(container.querySelector('.kbd-hints__heading')).not.toBeNull();
    });

    it('lists the camera toggle in third-person view', () => {
        hints.mount(container);
        hints.setViewMode('third-person');
        const keys = [...container.querySelectorAll('.kbd-hints__keys')].map(el => el.textContent);
        expect(keys).toContain('O');
    });
});
