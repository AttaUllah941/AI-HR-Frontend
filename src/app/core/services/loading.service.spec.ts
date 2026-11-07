import { HttpContext, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadingInterceptor } from '../interceptors/loading.interceptor';
import { SKIP_LOADING } from '../interceptors/skip-loading';
import {
  LOADING_MIN_VISIBLE_MS,
  LOADING_SHOW_DELAY_MS,
  LoadingService,
} from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show before the 200 ms delay', () => {
    service.show();
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS - 1);
    expect(service.isLoading()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(service.isLoading()).toBe(true);
  });

  it('never shows for requests that finish within the delay', () => {
    service.show();
    vi.advanceTimersByTime(100);
    service.hide();
    vi.advanceTimersByTime(1000);
    expect(service.isLoading()).toBe(false);
  });

  it('stays visible for at least 400 ms once shown', () => {
    service.show();
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS);
    expect(service.isLoading()).toBe(true);

    vi.advanceTimersByTime(50);
    service.hide();
    vi.advanceTimersByTime(LOADING_MIN_VISIBLE_MS - 50 - 1);
    expect(service.isLoading()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(service.isLoading()).toBe(false);
  });

  it('hides immediately when the minimum visible time already elapsed', () => {
    service.show();
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS + LOADING_MIN_VISIBLE_MS + 100);
    service.hide();
    vi.advanceTimersByTime(0);
    expect(service.isLoading()).toBe(false);
  });

  it('ref-counts overlapping requests', () => {
    service.show();
    service.show();
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS);
    expect(service.isLoading()).toBe(true);

    service.hide();
    vi.advanceTimersByTime(LOADING_MIN_VISIBLE_MS + 100);
    expect(service.isLoading()).toBe(true);

    service.hide();
    vi.advanceTimersByTime(0);
    expect(service.isLoading()).toBe(false);
  });

  it('keeps showing when a new request starts during the minimum-visible window', () => {
    service.show();
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS);
    service.hide();
    vi.advanceTimersByTime(100);
    service.show();
    vi.advanceTimersByTime(LOADING_MIN_VISIBLE_MS);
    expect(service.isLoading()).toBe(true);
    service.hide();
    vi.advanceTimersByTime(LOADING_MIN_VISIBLE_MS);
    expect(service.isLoading()).toBe(false);
  });

  it('ignores unbalanced hide() calls', () => {
    service.hide();
    service.show();
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS);
    expect(service.isLoading()).toBe(true);
  });

  it('reset() clears everything', () => {
    service.show();
    vi.advanceTimersByTime(LOADING_SHOW_DELAY_MS);
    service.reset();
    expect(service.isLoading()).toBe(false);
  });

  describe('loadingInterceptor', () => {
    function run(req: HttpRequest<unknown>) {
      return TestBed.runInInjectionContext(() =>
        loadingInterceptor(req, () => of(new HttpResponse({ status: 200 }))),
      );
    }

    it('tracks regular requests', () => {
      const show = vi.spyOn(service, 'show');
      const hide = vi.spyOn(service, 'hide');
      run(new HttpRequest('GET', '/x')).subscribe();
      expect(show).toHaveBeenCalledTimes(1);
      expect(hide).toHaveBeenCalledTimes(1);
    });

    it('skips requests flagged with SKIP_LOADING', () => {
      const show = vi.spyOn(service, 'show');
      const req = new HttpRequest('GET', '/x', {
        context: new HttpContext().set(SKIP_LOADING, true),
      });
      run(req).subscribe();
      expect(show).not.toHaveBeenCalled();
    });
  });
});
