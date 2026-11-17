import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialogService } from '../services/confirm-dialog.service';
import { guardDirtyDialog, unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  const open = vi.fn();

  beforeEach(() => {
    open.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: ConfirmDialogService, useValue: { open } }] });
  });

  const run = (dirty: boolean) =>
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard({ hasUnsavedChanges: () => dirty } as never, null as never, null as never, null as never),
    );

  it('allows leaving a clean form without prompting', () => {
    expect(run(false)).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });

  it('asks before leaving a dirty form and returns the answer', () => {
    open.mockReturnValue(of(false));
    let result: unknown;
    (run(true) as ReturnType<ConfirmDialogService['open']>).subscribe((v) => (result = v));
    expect(open).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });
});

describe('guardDirtyDialog', () => {
  const open = vi.fn();
  let backdrop$: Subject<MouseEvent>;
  let keys$: Subject<KeyboardEvent>;
  let ref: { disableClose: boolean; close: ReturnType<typeof vi.fn>; backdropClick: () => unknown; keydownEvents: () => unknown };

  function setup(dirty: () => boolean) {
    open.mockReset();
    backdrop$ = new Subject();
    keys$ = new Subject();
    ref = {
      disableClose: false,
      close: vi.fn(),
      backdropClick: () => backdrop$,
      keydownEvents: () => keys$,
    };
    TestBed.configureTestingModule({ providers: [{ provide: ConfirmDialogService, useValue: { open } }] });
    TestBed.runInInjectionContext(() => guardDirtyDialog(ref as never, dirty));
  }

  it('takes over closing so the dialog cannot be dismissed accidentally', () => {
    setup(() => true);
    expect(ref.disableClose).toBe(true);
  });

  it('closes immediately on backdrop click when clean', () => {
    setup(() => false);
    backdrop$.next(new MouseEvent('click'));
    expect(ref.close).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });

  it('asks on Escape when dirty and closes only if discarded', () => {
    setup(() => true);
    open.mockReturnValueOnce(of(false));
    keys$.next(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(ref.close).not.toHaveBeenCalled();

    open.mockReturnValueOnce(of(true));
    keys$.next(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(ref.close).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', () => {
    setup(() => true);
    keys$.next(new KeyboardEvent('keydown', { key: 'a' }));
    expect(open).not.toHaveBeenCalled();
    expect(ref.close).not.toHaveBeenCalled();
  });
});
