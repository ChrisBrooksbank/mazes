/**
 * Utility that tracks pinch-to-zoom and drag-to-pan gestures on a target element.
 * Provides `zoom`, `panX`, `panY` state for use by canvas renderers.
 */
export class PinchZoom {
    zoom = 1;
    panX = 0;
    panY = 0;

    private target: HTMLElement | null = null;
    private onChange: () => void;

    // Pinch tracking
    private lastPinchDist = 0;
    private pinching = false;

    // Pan tracking
    private lastTouchX = 0;
    private lastTouchY = 0;
    private dragging = false;

    private _onTouchStart: (e: TouchEvent) => void;
    private _onTouchMove: (e: TouchEvent) => void;
    private _onTouchEnd: (e: TouchEvent) => void;

    private static readonly MIN_ZOOM = 0.5;
    private static readonly MAX_ZOOM = 4;

    constructor(onChange: () => void) {
        this.onChange = onChange;

        this._onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                this.pinching = true;
                this.dragging = false;
                this.lastPinchDist = this._touchDist(e);
            } else if (e.touches.length === 1 && this.zoom > 1.05) {
                // Only allow pan when zoomed in
                this.dragging = true;
                this.pinching = false;
                this.lastTouchX = e.touches[0].clientX;
                this.lastTouchY = e.touches[0].clientY;
            }
        };

        this._onTouchMove = (e: TouchEvent) => {
            if (this.pinching && e.touches.length === 2) {
                e.preventDefault();
                const dist = this._touchDist(e);
                const scale = dist / this.lastPinchDist;
                this.zoom = Math.max(
                    PinchZoom.MIN_ZOOM,
                    Math.min(PinchZoom.MAX_ZOOM, this.zoom * scale)
                );
                this.lastPinchDist = dist;

                // Reset pan if zoom returns to ~1
                if (this.zoom < 1.05) {
                    this.panX = 0;
                    this.panY = 0;
                }

                this.onChange();
            } else if (this.dragging && e.touches.length === 1) {
                e.preventDefault();
                const dx = e.touches[0].clientX - this.lastTouchX;
                const dy = e.touches[0].clientY - this.lastTouchY;
                this.panX += dx;
                this.panY += dy;
                this.lastTouchX = e.touches[0].clientX;
                this.lastTouchY = e.touches[0].clientY;
                this.onChange();
            }
        };

        this._onTouchEnd = (_e: TouchEvent) => {
            this.pinching = false;
            this.dragging = false;
        };
    }

    attach(el: HTMLElement): void {
        this.target = el;
        el.addEventListener('touchstart', this._onTouchStart, { passive: false });
        el.addEventListener('touchmove', this._onTouchMove, { passive: false });
        el.addEventListener('touchend', this._onTouchEnd);
    }

    detach(): void {
        if (!this.target) return;
        this.target.removeEventListener('touchstart', this._onTouchStart);
        this.target.removeEventListener('touchmove', this._onTouchMove);
        this.target.removeEventListener('touchend', this._onTouchEnd);
        this.target = null;
    }

    reset(): void {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
    }

    private _touchDist(e: TouchEvent): number {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
