import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { Observable, filter } from 'rxjs';
import { ConfirmDialogService } from '../services/confirm-dialog.service';

/** Implemented by routed pages that edit a form and want a "discard changes?" prompt. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

const DISCARD_PROMPT = {
  title: 'Discard unsaved changes?',
  message: 'You have changes that have not been saved. If you leave now, they will be lost.',
  confirmLabel: 'Discard changes',
  cancelLabel: 'Keep editing',
  destructive: true,
  icon: 'warning',
} as const;

/** Route guard: asks before leaving a page whose form has unsaved changes. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (
  component,
): Observable<boolean> | boolean => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }
  return inject(ConfirmDialogService).open({ ...DISCARD_PROMPT });
};

/**
 * Dialog guard: while `isDirty()` is true, closing by Escape or backdrop click asks first.
 * Explicit Cancel/Save buttons and programmatic `close()` calls are not intercepted.
 * Call from a field initializer or constructor (needs an injection context).
 */
export function guardDirtyDialog(
  ref: MatDialogRef<unknown, unknown>,
  isDirty: () => boolean,
): void {
  const confirm = inject(ConfirmDialogService);
  ref.disableClose = true;

  const attemptClose = () => {
    if (!isDirty()) {
      ref.close();
      return;
    }
    confirm
      .open({ ...DISCARD_PROMPT })
      .pipe(filter((discard) => discard === true))
      .subscribe(() => ref.close());
  };

  ref.backdropClick().subscribe(attemptClose);
  ref.keydownEvents().subscribe((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      attemptClose();
    }
  });
}
