import { describe, it, expect, vi } from 'vitest';
import { createAppState, EventEmitter } from './state';

describe('EventEmitter', () => {
    it('calls registered listener with payload', () => {
        const emitter = new EventEmitter();
        const listener = vi.fn();
        emitter.on('viewMode:changed', listener);
        emitter.emit('viewMode:changed', 'isometric');
        expect(listener).toHaveBeenCalledWith('isometric');
    });

    it('calls void-payload listener without argument', () => {
        const emitter = new EventEmitter();
        const listener = vi.fn();
        emitter.on('maze:completed', listener);
        emitter.emit('maze:completed', undefined as void);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('removes listener with off()', () => {
        const emitter = new EventEmitter();
        const listener = vi.fn();
        emitter.on('viewMode:changed', listener);
        emitter.off('viewMode:changed', listener);
        emitter.emit('viewMode:changed', 'top-down');
        expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple listeners for the same event', () => {
        const emitter = new EventEmitter();
        const a = vi.fn();
        const b = vi.fn();
        emitter.on('viewMode:changed', a);
        emitter.on('viewMode:changed', b);
        emitter.emit('viewMode:changed', 'first-person');
        expect(a).toHaveBeenCalledWith('first-person');
        expect(b).toHaveBeenCalledWith('first-person');
    });

    it('does not throw when emitting with no listeners', () => {
        const emitter = new EventEmitter();
        expect(() => emitter.emit('viewMode:changed', 'top-down')).not.toThrow();
    });
});

describe('createAppState', () => {
    it('returns state with expected initial values', () => {
        const { state } = createAppState();
        expect(state.grid).toBeNull();
        expect(state.player).toBeNull();
        expect(state.viewMode).toBe('top-down');
        expect(state.completed).toBe(false);
        expect(state.solver.status).toBe('idle');
        expect(state.solver.stepCount).toBe(0);
        expect(state.solver.current).toBeNull();
        expect([...state.solver.visited]).toHaveLength(0);
        expect([...state.solver.frontier]).toHaveLength(0);
        expect(state.solver.path).toHaveLength(0);
    });

    it('returns a fresh emitter instance each call', () => {
        const { events: e1 } = createAppState();
        const { events: e2 } = createAppState();
        expect(e1).not.toBe(e2);
    });
});
