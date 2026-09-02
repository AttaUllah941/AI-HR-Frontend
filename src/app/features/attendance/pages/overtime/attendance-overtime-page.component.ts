import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  AttendanceService,
  OvertimeRequest,
  OvertimeStatus,
} from '../../../../core/services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { OvertimeFormDialogComponent } from '../../dialogs/overtime-form-dialog.component';
import { filter } from 'rxjs';

const STATUS_OPTIONS: Array<{ value: OvertimeStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

@Component({
  selector: 'app-attendance-overtime-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
  ],
  templateUrl: './attendance-overtime-page.component.html',
  styleUrl: './attendance-overtime-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceOvertimePageComponent implements OnInit {
  private readonly attendance = inject(AttendanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<OvertimeRequest[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuItem = signal<OvertimeRequest | null>(null);

  readonly canCreate = this.auth.hasPermission('attendance:create');
  readonly canApprove = this.auth.hasPermission('attendance:approve');
  readonly statusOptions = STATUS_OPTIONS;
  readonly statusControl = new FormControl<OvertimeStatus | ''>('', { nonNullable: true });

  ngOnInit(): void {
    this.statusControl.valueChanges.subscribe(() => this.reload());
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.attendance.listOvertime(this.statusControl.value || undefined).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load overtime requests. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openForm(): void {
    this.dialog
      .open(OvertimeFormDialogComponent, {
        data: {},
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

  setMenuItem(item: OvertimeRequest): void {
    this.menuItem.set(item);
  }

  approve(item: OvertimeRequest): void {
    this.confirm
      .open({
        title: 'Approve overtime',
        message: `Approve ${item.minutes} minutes of overtime for ${item.employee?.firstName ?? 'employee'} ${item.employee?.lastName ?? ''}?`,
        confirmLabel: 'Approve',
        icon: 'check_circle',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.attendance.approveOvertime(item.id).subscribe({
          next: () => {
            this.toast.success('Overtime approved');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to approve overtime');
          },
        });
      });
  }

  reject(item: OvertimeRequest): void {
    this.confirm
      .open({
        title: 'Reject overtime',
        message: `Reject this overtime request?`,
        confirmLabel: 'Reject',
        destructive: true,
        icon: 'cancel',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.attendance.rejectOvertime(item.id).subscribe({
          next: () => {
            this.toast.success('Overtime rejected');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to reject overtime');
          },
        });
      });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatHours(minutes: number): string {
    return `${Math.round((minutes / 60) * 10) / 10}h`;
  }

  statusClass(status: OvertimeStatus): string {
    if (status === 'APPROVED') {
      return 'att-status-pill att-status-pill--present';
    }
    if (status === 'REJECTED') {
      return 'att-status-pill att-status-pill--absent';
    }
    return 'att-status-pill att-status-pill--late';
  }

  statusLabel(status: OvertimeStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
