import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  const open = vi.fn();
  let toast: ToastService;

  beforeEach(() => {
    open.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: { open } }],
    });
    toast = TestBed.inject(ToastService);
  });

  it('shows server errors', () => {
    toast.serverError('Department has active employees');
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toBe('Department has active employees');
  });

  it('does not replace a server error with a generic fallback fired right after it', () => {
    toast.serverError('Department has active employees');
    toast.error('Unable to delete department');
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toBe('Department has active employees');
  });

  it('shows client errors when no server error was just shown', () => {
    toast.error('Choose a file to upload.');
    expect(open).toHaveBeenCalledTimes(1);
  });
});
