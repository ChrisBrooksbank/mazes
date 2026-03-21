import type { AppState } from '../state';

/**
 * Interface that all view implementations must satisfy.
 * Views are responsible for rendering the maze, player, and solver state.
 */
export interface IView {
    /** Attach the view's DOM elements to the given container and start listening for events. */
    mount(container: HTMLElement): void;

    /** Detach DOM elements and remove event listeners. */
    unmount(): void;

    /** Re-render the view with the current app state. */
    render(state: AppState): void;

    /** Called when the container dimensions change. */
    resize(): void;
}
