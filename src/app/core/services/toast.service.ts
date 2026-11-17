import { Injectable, OnDestroy, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface OpenOptions {
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

const SERVER_ERROR_HOLD_MS = 500;
const DEFAULT_DURATION_MS = 4000;
const UNDO_DURATION_MS = 7000;
/** Newest toasts win; older ones are dropped beyond this many. */
export const MAX_VISIBLE_TOASTS = 4;

/**
 * Stacked toast notifications (rendered by ToastContainerComponent).
 * Errors are announced assertively (role=alert), everything else politely.
 */
@Injectable({ providedIn: 'root' })
export class ToastService implements OnDestroy {
  readonly toasts = signal<Toast[]>([]);

  private nextId = 1;
  private lastServerErrorAt = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly durations = new Map<number, number>();

  /**
   * Shows an error message that came from the API. Component-level error handlers that fire
   * right afterwards with a generic fallback must not replace it, so those are suppressed briefly.
   */
  serverError(message: string): void {
    this.lastServerErrorAt = Date.now();
    this.open('error', message);
  }

  success(message: string): void {
    this.open('success', message);
  }

  error(message: string): void {
    if (Date.now() - this.lastServerErrorAt < SERVER_ERROR_HOLD_MS) {
      return;
    }
    this.open('error', message);
  }

  info(message: string): void {
    this.open('info', message);
  }

  /** Success toast with an Undo button for reversible actions. `undo` runs at most once. */
  undoable(message: string, undo: () => void, actionLabel = 'Undo'): void {
    this.open('success', message, {
      duration: UNDO_DURATION_MS,
      actionLabel,
      onAction: undo,
    });
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this.durations.delete(id);
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  /** Pause auto-dismiss while the pointer or keyboard focus is on a toast. */
  pause(id: number): void {
    this.clearTimer(id);
  }

  resume(id: number): void {
    const duration = this.durations.get(id);
    if (duration !== undefined && this.toasts().some((t) => t.id === id)) {
      this.schedule(id, duration);
    }
  }

  runAction(id: number): void {
    const toast = this.toasts().find((t) => t.id === id);
    this.dismiss(id);
    toast?.onAction?.();
  }

  ngOnDestroy(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  private open(kind: ToastKind, message: string, options: OpenOptions = {}): void {
    const duration = options.duration ?? DEFAULT_DURATION_MS;

    // The same message again just restarts the existing toast instead of stacking duplicates.
    const existing = this.toasts().find(
      (t) => t.kind === kind && t.message === message && !t.onAction && !options.onAction,
    );
    if (existing) {
      this.durations.set(existing.id, duration);
      this.schedule(existing.id, duration);
      return;
    }

    const toast: Toast = {
      id: this.nextId++,
      kind,
      message,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    };
    this.durations.set(toast.id, duration);

    const next = [...this.toasts(), toast];
    const dropped = next.splice(0, Math.max(0, next.length - MAX_VISIBLE_TOASTS));
    dropped.forEach((t) => {
      this.clearTimer(t.id);
      this.durations.delete(t.id);
    });
    this.toasts.set(next);
    this.schedule(toast.id, duration);
  }

  private schedule(id: number, duration: number): void {
    this.clearTimer(id);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), duration),
    );
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}
