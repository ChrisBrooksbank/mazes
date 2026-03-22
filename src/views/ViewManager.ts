import type { IView } from './IView';
import type { ViewMode } from '../state';
import type { AppState } from '../state';

/**
 * Manages view lifecycle: mounting, unmounting, and switching between views.
 * Only one view is active at a time.
 */
export class ViewManager {
    private views = new Map<ViewMode, IView>();
    private activeMode: ViewMode | null = null;
    private container: HTMLElement | null = null;
    private lastState: AppState | null = null;

    /** Register a view implementation for a given mode. */
    register(mode: ViewMode, view: IView): void {
        this.views.set(mode, view);
    }

    /** Attach ViewManager to a DOM container. Must be called before switchTo. */
    mount(container: HTMLElement): void {
        this.container = container;
    }

    /**
     * Switch to the specified view mode.
     * Unmounts the current view (if any) and mounts the new one.
     */
    switchTo(mode: ViewMode): void {
        if (!this.container) {
            throw new Error('ViewManager.mount() must be called before switchTo()');
        }

        if (this.activeMode === mode) return;

        // Unmount current view
        if (this.activeMode !== null) {
            const current = this.views.get(this.activeMode);
            current?.unmount();
        }

        // Mount new view
        const next = this.views.get(mode);
        if (!next) {
            throw new Error(`No view registered for mode: ${mode}`);
        }
        next.mount(this.container);
        this.activeMode = mode;
    }

    /** Get the currently active view, or null if none is active. */
    getActive(): IView | null {
        if (this.activeMode === null) return null;
        return this.views.get(this.activeMode) ?? null;
    }

    /** Get the currently active mode, or null if none is active. */
    getActiveMode(): ViewMode | null {
        return this.activeMode;
    }

    /** Re-render the active view with the latest state. */
    render(state: AppState): void {
        this.lastState = state;
        this.getActive()?.render(state);
    }

    /** Notify the active view that the container was resized, then re-render. */
    resize(): void {
        this.getActive()?.resize();
        if (this.lastState) {
            this.getActive()?.render(this.lastState);
        }
    }

    /** Unmount the active view and clear all registrations. */
    destroy(): void {
        if (this.activeMode !== null) {
            this.views.get(this.activeMode)?.unmount();
            this.activeMode = null;
        }
        this.views.clear();
        this.container = null;
    }
}
