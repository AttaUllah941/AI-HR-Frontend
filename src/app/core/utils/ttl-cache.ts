import { Observable, catchError, shareReplay, throwError } from 'rxjs';

/** Default lifetime for rarely-changing lookups (departments, branches, shift lists...). */
export const LOOKUP_TTL_MS = 5 * 60 * 1000;

const registry = new Set<TtlCache<unknown>>();

/** Drops every TtlCache. Call when the session changes so one tenant never sees another's lookups. */
export function clearAllTtlCaches(): void {
  registry.forEach((cache) => cache.invalidate());
}

/**
 * Caches the result of `loader` for `ttlMs`. Concurrent callers share one request; a failed
 * request is not cached. Call `invalidate()` after any mutation of the underlying data.
 */
export class TtlCache<T> {
  private cached$: Observable<T> | null = null;
  private expiresAt = 0;

  constructor(
    private readonly loader: () => Observable<T>,
    private readonly ttlMs: number = LOOKUP_TTL_MS,
  ) {
    registry.add(this as TtlCache<unknown>);
  }

  get(): Observable<T> {
    if (this.cached$ && Date.now() < this.expiresAt) {
      return this.cached$;
    }

    const request$ = this.loader().pipe(
      catchError((error: unknown) => {
        // Only drop the entry if it is still ours (a newer request may have replaced it).
        if (this.cached$ === request$) {
          this.invalidate();
        }
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.cached$ = request$;
    this.expiresAt = Date.now() + this.ttlMs;
    return request$;
  }

  invalidate(): void {
    this.cached$ = null;
    this.expiresAt = 0;
  }
}
