import { Observable, Subscription } from 'rxjs';

export interface OptimisticUpdate<T> {
  /** Applies the expected result to local state immediately. */
  apply: () => void;
  /** Restores local state if the request fails. */
  rollback: () => void;
  /** The real request. */
  request$: Observable<T>;
  /** Runs with the server response (e.g. to merge authoritative data). */
  onSuccess?: (result: T) => void;
  /** Runs after rollback (e.g. to show an error toast). */
  onError?: (error: unknown) => void;
}

/**
 * Optimistic UI: apply the change now, confirm with the server, roll back on failure.
 * Returns the subscription so callers can cancel it.
 */
export function optimistic<T>(update: OptimisticUpdate<T>): Subscription {
  update.apply();
  return update.request$.subscribe({
    next: (result) => update.onSuccess?.(result),
    error: (error: unknown) => {
      update.rollback();
      update.onError?.(error);
    },
  });
}
