import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_VISIBLE_TOASTS, ToastService } from './toast.service';

describe('ToastService', () => {
  let toast: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  it('shows server errors', () => {
    toast.serverError('Department has active employees');
    expect(toast.toasts().map((t) => t.message)).toEqual(['Department has active employees']);
    expect(toast.toasts()[0].kind).toBe('error');
  });

  it('does not replace a server error with a generic fallback fired right after it', () => {
    toast.serverError('Department has active employees');
    toast.error('Unable to delete department');
    expect(toast.toasts().map((t) => t.message)).toEqual(['Department has active employees']);
  });

  it('shows client errors when no server error was just shown', () => {
    toast.error('Choose a file to upload.');
    expect(toast.toasts()).toHaveLength(1);
  });

  it('stacks toasts and caps how many are visible', () => {
    for (let i = 0; i < MAX_VISIBLE_TOASTS + 2; i += 1) {
      toast.success(`m${i}`);
    }
    const messages = toast.toasts().map((t) => t.message);
    expect(messages).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(messages[messages.length - 1]).toBe(`m${MAX_VISIBLE_TOASTS + 1}`);
  });

  it('does not stack identical messages', () => {
    toast.success('Saved');
    toast.success('Saved');
    expect(toast.toasts()).toHaveLength(1);
  });

  it('auto-dismisses after its duration', () => {
    toast.info('hello');
    vi.advanceTimersByTime(4001);
    expect(toast.toasts()).toHaveLength(0);
  });

  it('pauses auto-dismiss while hovered and resumes after', () => {
    toast.info('hello');
    const id = toast.toasts()[0].id;
    toast.pause(id);
    vi.advanceTimersByTime(10_000);
    expect(toast.toasts()).toHaveLength(1);
    toast.resume(id);
    vi.advanceTimersByTime(4001);
    expect(toast.toasts()).toHaveLength(0);
  });

  it('undoable() runs the undo callback once and dismisses', () => {
    const undo = vi.fn();
    toast.undoable('Deleted', undo);
    const { id, actionLabel } = toast.toasts()[0];
    expect(actionLabel).toBe('Undo');
    toast.runAction(id);
    toast.runAction(id);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(toast.toasts()).toHaveLength(0);
  });

  it('keeps undoable toasts longer than regular ones', () => {
    toast.undoable('Deleted', () => undefined);
    vi.advanceTimersByTime(5000);
    expect(toast.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(2100);
    expect(toast.toasts()).toHaveLength(0);
  });
});
