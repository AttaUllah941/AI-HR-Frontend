import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

const SERVER_ERROR_HOLD_MS = 500;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  private lastServerErrorAt = 0;

  /**
   * Shows an error message that came from the API. Component-level error handlers that fire
   * right afterwards with a generic fallback must not replace it, so those are suppressed briefly.
   */
  serverError(message: string): void {
    this.lastServerErrorAt = Date.now();
    this.open(message, 'toast-error');
  }

  success(message: string): void {
    this.open(message, 'toast-success');
  }

  error(message: string): void {
    if (Date.now() - this.lastServerErrorAt < SERVER_ERROR_HOLD_MS) {
      return;
    }
    this.open(message, 'toast-error');
  }

  info(message: string): void {
    this.open(message, 'toast-info');
  }

  private open(message: string, panelClass: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [panelClass],
    });
  }
}
