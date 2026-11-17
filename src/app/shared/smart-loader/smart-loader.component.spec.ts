import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOADER_MESSAGES } from './loader-messages';
import {
  SMART_LOADER_FADE_MS,
  SmartLoaderComponent,
  shuffle,
} from './smart-loader.component';

const MESSAGES = ['one', 'two', 'three'];
const INTERVAL = 1000;

function create(messages: readonly string[] = MESSAGES, intervalMs = INTERVAL) {
  const fixture = TestBed.createComponent(SmartLoaderComponent);
  fixture.componentRef.setInput('messages', messages);
  fixture.componentRef.setInput('intervalMs', intervalMs);
  fixture.detectChanges();
  return fixture;
}

function tick(ms = INTERVAL + SMART_LOADER_FADE_MS) {
  vi.advanceTimersByTime(ms);
}

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it('is driven by the supplied random source (Fisher-Yates)', () => {
    expect(shuffle([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
  });
});

describe('SmartLoaderComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exposes a polite live region', () => {
    const el = create().nativeElement as HTMLElement;
    const region = el.querySelector('[role="status"]');
    expect(region?.getAttribute('aria-live')).toBe('polite');
  });

  it('starts with one of the supplied messages', () => {
    const fixture = create();
    expect(MESSAGES).toContain(fixture.componentInstance.current());
  });

  it('rotates to a different message after the interval', () => {
    const fixture = create();
    const first = fixture.componentInstance.current();
    tick();
    expect(fixture.componentInstance.current()).not.toBe(first);
    expect(MESSAGES).toContain(fixture.componentInstance.current());
  });

  it('fades out before swapping the message', () => {
    const fixture = create();
    const first = fixture.componentInstance.current();
    vi.advanceTimersByTime(INTERVAL);
    expect(fixture.componentInstance.fading()).toBe(true);
    expect(fixture.componentInstance.current()).toBe(first);
    vi.advanceTimersByTime(SMART_LOADER_FADE_MS);
    expect(fixture.componentInstance.fading()).toBe(false);
  });

  it('never repeats a message back to back, including across reshuffles', () => {
    const fixture = create(['a', 'b', 'c']);
    const loader = fixture.componentInstance;
    let previous = loader.current();
    let wasFading = false;
    let swaps = 0;
    // Small steps so every individual swap (fading true -> false) is observed.
    for (let elapsed = 0; elapsed < 60_000; elapsed += 50) {
      vi.advanceTimersByTime(50);
      const fading = loader.fading();
      if (wasFading && !fading) {
        swaps += 1;
        expect(loader.current()).not.toBe(previous);
        previous = loader.current();
      }
      wasFading = fading;
    }
    expect(swaps).toBeGreaterThan(40);
  });

  it('shows every message once per cycle', () => {
    const fixture = create(['a', 'b', 'c']);
    const seen = [fixture.componentInstance.current()];
    tick();
    seen.push(fixture.componentInstance.current());
    tick();
    seen.push(fixture.componentInstance.current());
    expect([...seen].sort()).toEqual(['a', 'b', 'c']);
  });

  it('does not start an interval for a single message', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const fixture = create(['only']);
    tick(10_000);
    expect(fixture.componentInstance.current()).toBe('only');
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('clears the interval and pending fade when destroyed', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const fixture = create();
    vi.advanceTimersByTime(INTERVAL); // fade timer now pending
    const before = fixture.componentInstance.current();

    fixture.destroy();
    expect(clearSpy).toHaveBeenCalledTimes(1);

    tick(10_000);
    expect(fixture.componentInstance.current()).toBe(before);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('falls back to the default message set', () => {
    const fixture = TestBed.createComponent(SmartLoaderComponent);
    fixture.detectChanges();
    expect(LOADER_MESSAGES.default as readonly string[]).toContain(
      fixture.componentInstance.current(),
    );
  });
});
