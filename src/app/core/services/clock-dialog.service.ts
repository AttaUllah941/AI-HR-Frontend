import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, filter } from 'rxjs';
import {
  ClockDialogComponent,
  ClockDialogResult,
} from '../../shared/components/clock-dialog/clock-dialog.component';

/** Opens the check-in / check-out confirmation modal. Emits once if confirmed, never if cancelled. */
@Injectable({ providedIn: 'root' })
export class ClockDialogService {
  private readonly dialog = inject(MatDialog);

  confirm(action: 'in' | 'out', checkInAt?: string | null): Observable<ClockDialogResult> {
    return this.dialog
      .open<ClockDialogComponent, { action: 'in' | 'out'; checkInAt?: string | null }, ClockDialogResult>(
        ClockDialogComponent,
        { data: { action, checkInAt }, autoFocus: 'first-tabbable', width: '26rem', maxWidth: '92vw' },
      )
      .afterClosed()
      .pipe(filter((result): result is ClockDialogResult => !!result));
  }
}
