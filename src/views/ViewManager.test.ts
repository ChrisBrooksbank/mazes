import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViewManager } from './ViewManager';
import type { IView } from './IView';
import type { AppState } from '../state';
import { createAppState } from '../state';

function makeView(): IView & {
    mountFn: ReturnType<typeof vi.fn>;
    unmountFn: ReturnType<typeof vi.fn>;
    renderFn: ReturnType<typeof vi.fn>;
    resizeFn: ReturnType<typeof vi.fn>;
} {
    const mountFn = vi.fn();
    const unmountFn = vi.fn();
    const renderFn = vi.fn();
    const resizeFn = vi.fn();
    return {
        mount: mountFn,
        unmount: unmountFn,
        render: renderFn,
        resize: resizeFn,
        mountFn,
        unmountFn,
        renderFn,
        resizeFn,
    };
}

function makeContainer(): HTMLElement {
    return document.createElement('div');
}

describe('ViewManager', () => {
    let manager: ViewManager;
    let container: HTMLElement;
    let state: AppState;

    beforeEach(() => {
        manager = new ViewManager();
        container = makeContainer();
        const { state: s } = createAppState();
        state = s;
    });

    it('mounts a registered view when switching to it', () => {
        const view = makeView();
        manager.register('top-down', view);
        manager.mount(container);
        manager.switchTo('top-down');

        expect(view.mountFn).toHaveBeenCalledWith(container);
        expect(manager.getActiveMode()).toBe('top-down');
    });

    it('unmounts the current view when switching to another', () => {
        const topDown = makeView();
        const isometric = makeView();
        manager.register('top-down', topDown);
        manager.register('isometric', isometric);
        manager.mount(container);

        manager.switchTo('top-down');
        manager.switchTo('isometric');

        expect(topDown.unmountFn).toHaveBeenCalledTimes(1);
        expect(isometric.mountFn).toHaveBeenCalledWith(container);
        expect(manager.getActiveMode()).toBe('isometric');
    });

    it('does nothing when switching to the already-active mode', () => {
        const view = makeView();
        manager.register('top-down', view);
        manager.mount(container);
        manager.switchTo('top-down');
        manager.switchTo('top-down');

        expect(view.mountFn).toHaveBeenCalledTimes(1);
        expect(view.unmountFn).not.toHaveBeenCalled();
    });

    it('throws when switchTo is called before mount', () => {
        const view = makeView();
        manager.register('top-down', view);
        expect(() => manager.switchTo('top-down')).toThrow();
    });

    it('throws when switching to an unregistered mode', () => {
        manager.mount(container);
        expect(() => manager.switchTo('isometric')).toThrow();
    });

    it('getActive returns null when no view is active', () => {
        expect(manager.getActive()).toBeNull();
    });

    it('getActive returns the active view', () => {
        const view = makeView();
        manager.register('top-down', view);
        manager.mount(container);
        manager.switchTo('top-down');
        expect(manager.getActive()).toBe(view);
    });

    it('render delegates to the active view', () => {
        const view = makeView();
        manager.register('top-down', view);
        manager.mount(container);
        manager.switchTo('top-down');
        manager.render(state);

        expect(view.renderFn).toHaveBeenCalledWith(state);
    });

    it('render does nothing when no view is active', () => {
        expect(() => manager.render(state)).not.toThrow();
    });

    it('resize delegates to the active view', () => {
        const view = makeView();
        manager.register('top-down', view);
        manager.mount(container);
        manager.switchTo('top-down');
        manager.resize();

        expect(view.resizeFn).toHaveBeenCalledTimes(1);
    });

    it('resize does nothing when no view is active', () => {
        expect(() => manager.resize()).not.toThrow();
    });

    it('destroy unmounts active view and clears state', () => {
        const view = makeView();
        manager.register('top-down', view);
        manager.mount(container);
        manager.switchTo('top-down');
        manager.destroy();

        expect(view.unmountFn).toHaveBeenCalledTimes(1);
        expect(manager.getActiveMode()).toBeNull();
        expect(manager.getActive()).toBeNull();
    });
});
