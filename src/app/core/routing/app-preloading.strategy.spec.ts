import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppPreloadingStrategy, PRELOAD_FALLBACK_DELAY_MS } from './app-preloading.strategy';

describe('AppPreloadingStrategy', () => {
  let strategy: AppPreloadingStrategy;
  let load: ReturnType<typeof vi.fn>;
  const route: Route = { path: 'employees' };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    load = vi.fn(() => of('loaded'));
    TestBed.configureTestingModule({});
    strategy = TestBed.inject(AppPreloadingStrategy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('preloads once the browser is idle', () => {
    strategy.preload(route, load as never).subscribe();
    expect(load).not.toHaveBeenCalled();
    vi.advanceTimersByTime(PRELOAD_FALLBACK_DELAY_MS);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('preloads immediately when the route is requested (hover)', () => {
    strategy.preload(route, load as never).subscribe();
    strategy.requestPreload('employees');
    expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(PRELOAD_FALLBACK_DELAY_MS * 2);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('ignores requests for other routes', () => {
    strategy.preload(route, load as never).subscribe();
    strategy.requestPreload('leave');
    expect(load).not.toHaveBeenCalled();
  });

  it('respects data.preload === false', () => {
    strategy.preload({ path: 'x', data: { preload: false } }, load as never).subscribe();
    strategy.requestPreload('x');
    vi.advanceTimersByTime(PRELOAD_FALLBACK_DELAY_MS * 2);
    expect(load).not.toHaveBeenCalled();
  });

  it('never preloads on a Save-Data connection unless requested', () => {
    vi.stubGlobal('navigator', { ...navigator, connection: { saveData: true } });
    strategy.preload(route, load as never).subscribe();
    vi.advanceTimersByTime(PRELOAD_FALLBACK_DELAY_MS * 2);
    expect(load).not.toHaveBeenCalled();
    strategy.requestPreload('employees');
    expect(load).toHaveBeenCalledTimes(1);
  });
});
