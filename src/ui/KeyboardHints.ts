import type { ViewMode } from '../state';

type HintRow = { keys: string; action: string };

const MOVE_ROWS: HintRow[] = [
    { keys: '↑ W', action: 'Move North' },
    { keys: '↓ S', action: 'Move South' },
    { keys: '← A', action: 'Move West' },
    { keys: '→ D', action: 'Move East' },
];

/** First-person controls are relative to the way the player is facing. */
const FIRST_PERSON_ROWS: HintRow[] = [
    { keys: '↑ W', action: 'Step forward' },
    { keys: '↓ S', action: 'Step back' },
    { keys: '← A', action: 'Turn left' },
    { keys: '→ D', action: 'Turn right' },
];

const THIRD_PERSON_ROWS: HintRow[] = [
    ...MOVE_ROWS,
    { keys: 'O', action: 'Overview / follow camera' },
];

/**
 * KeyboardHints: a small, toggleable panel showing keyboard shortcuts.
 * Discoverable but not intrusive — hidden on touch devices (D-pad is available).
 */
export class KeyboardHints {
    private root: HTMLElement;
    private panel: HTMLElement;
    private toggleBtn: HTMLButtonElement;
    private visible = true;

    constructor() {
        this.root = document.createElement('div');
        this.root.className = 'kbd-hints';
        this.root.setAttribute('aria-label', 'Keyboard shortcuts');

        this.toggleBtn = document.createElement('button');
        this.toggleBtn.className = 'kbd-hints__toggle';
        this.toggleBtn.setAttribute('aria-label', 'Toggle keyboard shortcut hints');
        this.toggleBtn.textContent = '?';

        this.panel = document.createElement('div');
        this.panel.className = 'kbd-hints__panel';
        this.panel.setAttribute('role', 'tooltip');

        this.renderRows(MOVE_ROWS);

        this.root.appendChild(this.toggleBtn);
        this.root.appendChild(this.panel);

        this.toggleBtn.addEventListener('click', () => this.toggle());
    }

    /** Show the controls that apply to the given view (first-person turns instead of strafing). */
    setViewMode(mode: ViewMode): void {
        if (mode === 'first-person') this.renderRows(FIRST_PERSON_ROWS);
        else if (mode === 'third-person') this.renderRows(THIRD_PERSON_ROWS);
        else this.renderRows(MOVE_ROWS);
    }

    private renderRows(rows: HintRow[]): void {
        this.panel.replaceChildren();

        const heading = document.createElement('div');
        heading.className = 'kbd-hints__heading';
        heading.textContent = 'Keyboard Controls';
        this.panel.appendChild(heading);

        for (const { keys, action } of rows) {
            const row = document.createElement('div');
            row.className = 'kbd-hints__row';

            const kbd = document.createElement('span');
            kbd.className = 'kbd-hints__keys';
            kbd.textContent = keys;

            const desc = document.createElement('span');
            desc.className = 'kbd-hints__action';
            desc.textContent = action;

            row.appendChild(kbd);
            row.appendChild(desc);
            this.panel.appendChild(row);
        }
    }

    /** Returns true if the current device supports touch input. */
    static isTouchDevice(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    mount(parent: HTMLElement): void {
        // Don't show on touch devices — they have the D-pad overlay
        if (KeyboardHints.isTouchDevice()) return;
        parent.appendChild(this.root);
    }

    unmount(): void {
        this.root.remove();
    }

    private toggle(): void {
        this.visible = !this.visible;
        this.panel.classList.toggle('kbd-hints__panel--hidden', !this.visible);
        this.toggleBtn.setAttribute('aria-expanded', String(this.visible));
    }

    /** Returns true if the hints panel is currently visible. */
    isVisible(): boolean {
        return this.visible;
    }
}
