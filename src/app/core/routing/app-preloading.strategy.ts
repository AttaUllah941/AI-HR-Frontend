import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, Subject, filter, mergeMap, of, race, take } from 'rxjs';

/** Delay used when `requestIdleCallback` is unavailable (Safari). */
export const PRELOAD_FALLBACK_DELAY_MS = 2000;

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

function isConstrainedNetwork(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return !!connection && (connection.saveData === true || /(^|-)2g$/.test(connection.effectiveType ?? ''));
}

function whenIdle(): Observable<void> {
  return new Observable<void>((subscriber) => {
    const emit = () => {
      subscriber.next();
      subscriber.complete();
    };
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(emit, { timeout: 5000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(emit, PRELOAD_FALLBACK_DELAY_MS);
    return () => clearTimeout(id);
  });
}

/**
 * Preloads each lazy route when the browser is idle, or sooner if the user hovers/focuses a
 * link to it (see PreloadOnHoverDirective). A route opts out with `data: { preload: false }`.
 * Nothing is preloaded on Save-Data or 2g connections.
 */
@Injectable({ providedIn: 'root' })
export class AppPreloadingStrategy implements PreloadingStrategy {
  private readonly requested = new Subject<string>();

  /** Preload the lazy route whose first path segment is `path` (no-op if already loaded). */
  requestPreload(path: string): void {
    this.requested.next(path);
  }

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preload'] === false) {
      return of(null);
    }

    const onRequest$ = this.requested.pipe(filter((path) => !!route.path && path === route.path));
    const trigger$ = isConstrainedNetwork() ? onRequest$ : race(onRequest$, whenIdle());

    return trigger$.pipe(
      take(1),
      mergeMap(() => load()),
    );
  }
}
