import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { LeaveService, LeaveType } from '../../../../core/services/leave.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { LeaveTypeFormDialogComponent } from '../../dialogs/leave-type-form-dialog.component';

@Component({
  selector: 'app-leave-types-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './leave-types-page.component.html',
  styleUrl: './leave-types-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveTypesPageComponent implements OnInit {
  private readonly leave = inject(LeaveService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<LeaveType[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly canUpdate = this.auth.hasPermission('leave:update');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.leave.listTypes().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load leave types. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openForm(leaveType: LeaveType | null = null): void {
    this.dialog
      .open(LeaveTypeFormDialogComponent, {
        data: { leaveType },
        width: '560px',
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

  remove(item: LeaveType): void {
    this.confirm
      .open({
        title: 'Delete leave type',
        message: `Are you sure you want to delete “${item.name}”? This action cannot be undone.`,
        confirmLabel: 'Delete leave type',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.deletingId.set(item.id);
        this.leave.deleteType(item.id).subscribe({
          next: () => {
            this.toast.success('Leave type deleted');
            this.deletingId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.deletingId.set(null);
            this.toast.error(err.message || 'Unable to delete leave type');
          },
        });
      });
  }
}
