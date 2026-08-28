import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { ComponentType } from '@angular/cdk/portal';

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(MatDialog);

  open<T, D = unknown, R = unknown>(
    component: ComponentType<T>,
    config?: MatDialogConfig<D>,
  ): MatDialogRef<T, R> {
    return this.dialog.open(component, {
      width: '480px',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      ...config,
    });
  }

  closeAll(): void {
    this.dialog.closeAll();
  }
}
