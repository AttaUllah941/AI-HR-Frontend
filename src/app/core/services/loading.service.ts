import { Injectable, OnDestroy, signal } from '@angular/core';

/** A request must be in flight this long before the indicator appears (avoids flashes on fast calls). */
export const LOADING_SHOW_DELAY_MS = 200;
/** Once visible, the indicator stays at least this long (avoids flicker). */
export const LOADING_MIN_VISIBLE_MS = 400;

/**
 * Ref-counted global loading state for non-blocking indicators (top progress bar).
 * `isLoading` only turns true after LOADING_SHOW_DELAY_MS and stays true for at least
 * LOADING_MIN_VISIBLE_MS once shown.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService implements OnDestroy {
  private pending = 0;
  private visibleSince = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly visible = signal(false);
  readonly isLoading = this.visible.asReadonly();

  show(): void {
    this.pending += 1;
    if (this.pending > 1) {
      return;
    }

    // A pending min-visible hide is superseded: the indicator simply stays on.
    this.clearTimer('hide');
    if (this.visible() || this.showTimer !== null) {
      return;
    }

    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      this.visibleSince = Date.now();
      this.visible.set(true);
    }, LOADING_SHOW_DELAY_MS);
  }

  hide(): void {
    if (this.pending === 0) {
      return;
    }
    this.pending -= 1;
    if (this.pending > 0) {
      return;
    }

    // Finished before the delay elapsed: never shown.
    if (this.showTimer !== null) {
      this.clearTimer('show');
      return;
    }

    if (!this.visible()) {
      return;
    }

    const remaining = Math.max(0, LOADING_MIN_VISIBLE_MS - (Date.now() - this.visibleSince));
    this.clearTimer('hide');
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      this.visible.set(false);
    }, remaining);
  }

  /** Drops all pending work and hides immediately (e.g. on logout). */
  reset(): void {
    this.pending = 0;
    this.clearTimer('show');
    this.clearTimer('hide');
    this.visible.set(false);
  }

  ngOnDestroy(): void {
    this.reset();
  }

  private clearTimer(which: 'show' | 'hide'): void {
    const timer = which === 'show' ? this.showTimer : this.hideTimer;
    if (timer !== null) {
      clearTimeout(timer);
    }
    if (which === 'show') {
      this.showTimer = null;
    } else {
      this.hideTimer = null;
    }
  }
}
