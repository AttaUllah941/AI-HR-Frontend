import { Observable, defer, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TtlCache, clearAllTtlCaches } from './ttl-cache';

function counting<T>(factory: (n: number) => Observable<T>) {
  const state = { calls: 0 };
  const loader = () =>
    defer(() => {
      state.calls += 1;
      return factory(state.calls);
    });
  return { state, loader };
}

describe('TtlCache', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('serves repeated reads from one request', () => {
    const { state, loader } = counting((n) => of(n));
    const cache = new TtlCache(loader, 1000);
    const seen: number[] = [];
    cache.get().subscribe((v) => seen.push(v));
    cache.get().subscribe((v) => seen.push(v));
    expect(seen).toEqual([1, 1]);
    expect(state.calls).toBe(1);
  });

  it('refetches after the TTL expires', () => {
    const { state, loader } = counting((n) => of(n));
    const cache = new TtlCache(loader, 1000);
    cache.get().subscribe();
    vi.advanceTimersByTime(999);
    cache.get().subscribe();
    expect(state.calls).toBe(1);
    vi.advanceTimersByTime(2);
    cache.get().subscribe();
    expect(state.calls).toBe(2);
  });

  it('refetches after invalidate()', () => {
    const { state, loader } = counting((n) => of(n));
    const cache = new TtlCache(loader, 1000);
    cache.get().subscribe();
    cache.invalidate();
    cache.get().subscribe();
    expect(state.calls).toBe(2);
  });

  it('does not cache failures', () => {
    const { state, loader } = counting((n) => (n === 1 ? throwError(() => new Error('x')) : of(n)));
    const cache = new TtlCache(loader, 1000);
    let error: unknown;
    cache.get().subscribe({ error: (e) => (error = e) });
    expect(error).toBeInstanceOf(Error);

    let value = 0;
    cache.get().subscribe((v) => (value = v));
    expect(state.calls).toBe(2);
    expect(value).toBe(2);
  });

  it('clearAllTtlCaches() invalidates every cache', () => {
    const a = counting((n) => of(n));
    const b = counting((n) => of(n));
    const cacheA = new TtlCache(a.loader, 1000);
    const cacheB = new TtlCache(b.loader, 1000);
    cacheA.get().subscribe();
    cacheB.get().subscribe();
    clearAllTtlCaches();
    cacheA.get().subscribe();
    cacheB.get().subscribe();
    expect(a.state.calls).toBe(2);
    expect(b.state.calls).toBe(2);
  });
});
