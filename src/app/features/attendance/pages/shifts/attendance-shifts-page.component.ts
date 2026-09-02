import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { AttendanceService, Shift } from '../../../../core/services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ShiftFormDialogComponent } from '../../dialogs/shift-form-dialog.component';

@Component({
  selector: 'app-attendance-shifts-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './attendance-shifts-page.component.html',
  styleUrl: './attendance-shifts-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceShiftsPageComponent implements OnInit {
  private readonly attendance = inject(AttendanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<Shift[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly canUpdate = this.auth.hasPermission('attendance:update');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.attendance.listShifts().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load shifts. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openForm(shift: Shift | null = null): void {
    this.dialog
      .open(ShiftFormDialogComponent, {
        data: { shift },
        width: '520px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reload();
        }
      });
  }

  remove(item: Shift): void {
    this.confirm
      .open({
        title: 'Delete shift',
        message: `Are you sure you want to delete “${item.name}”? This action cannot be undone.`,
        confirmLabel: 'Delete shift',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.deletingId.set(item.id);
        this.attendance.deleteShift(item.id).subscribe({
          next: () => {
            this.toast.success('Shift deleted');
            this.deletingId.set(null);
            this.reload();
          },
          error: () => {
            this.deletingId.set(null);
            this.toast.error('Unable to delete shift');
          },
        });
      });
  }
}
