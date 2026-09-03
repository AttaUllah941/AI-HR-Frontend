import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  LeaveRequest,
  LeaveRequestStatus,
  LeaveService,
} from '../../../../core/services/leave.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { LeaveRequestFormDialogComponent } from '../../dialogs/leave-request-form-dialog.component';

const STATUS_OPTIONS: Array<{ value: LeaveRequestStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

@Component({
  selector: 'app-leave-requests-page',
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
  templateUrl: './leave-requests-page.component.html',
  styleUrl: './leave-requests-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveRequestsPageComponent implements OnInit {
  private readonly leave = inject(LeaveService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<LeaveRequest[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuItem = signal<LeaveRequest | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = 20;

  readonly canCreate = this.auth.hasPermission('leave:create');
  readonly canApprove = this.auth.hasPermission('leave:approve');
  readonly canUpdate = this.auth.hasPermission('leave:update');
  readonly statusOptions = STATUS_OPTIONS;
  readonly statusControl = new FormControl<LeaveRequestStatus | ''>('', { nonNullable: true });

  ngOnInit(): void {
    this.statusControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.leave
      .listRequests({
        status: this.statusControl.value || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.pagination.total);
          this.totalPages.set(res.pagination.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Unable to load leave requests. Please try again.');
          this.loading.set(false);
        },
      });
  }

  openApply(): void {
    this.dialog
      .open(LeaveRequestFormDialogComponent, {
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

  setMenuItem(item: LeaveRequest): void {
    this.menuItem.set(item);
  }

  view(item: LeaveRequest): void {
    this.dialog.open(LeaveRequestFormDialogComponent, {
      data: { request: item, viewOnly: true },
      width: '520px',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
  }

  edit(item: LeaveRequest): void {
    this.dialog
      .open(LeaveRequestFormDialogComponent, {
        data: { request: item },
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

  approve(item: LeaveRequest): void {
    this.confirm
      .open({
        title: 'Approve leave',
        message: `Approve leave for ${item.employee?.firstName ?? 'employee'} ${item.employee?.lastName ?? ''} (${item.days} day(s))?`,
        confirmLabel: 'Approve',
        icon: 'check_circle',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.leave.approveRequest(item.id).subscribe({
          next: () => {
            this.toast.success('Leave approved');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to approve leave');
          },
        });
      });
  }

  reject(item: LeaveRequest): void {
    this.confirm
      .open({
        title: 'Reject leave',
        message: 'Reject this leave request?',
        confirmLabel: 'Reject',
        destructive: true,
        icon: 'cancel',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.leave.rejectRequest(item.id).subscribe({
          next: () => {
            this.toast.success('Leave rejected');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to reject leave');
          },
        });
      });
  }

  cancel(item: LeaveRequest): void {
    this.confirm
      .open({
        title: 'Cancel leave',
        message: 'Cancel this leave request?',
        confirmLabel: 'Cancel request',
        destructive: true,
        icon: 'event_busy',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.leave.cancelRequest(item.id).subscribe({
          next: () => {
            this.toast.success('Leave cancelled');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to cancel leave');
          },
        });
      });
  }

  prevPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((p) => p - 1);
    this.reload();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((p) => p + 1);
    this.reload();
  }

  formatDate(value: string): string {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) {
      return value;
    }
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  dayTypeLabel(value: string): string {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  statusClass(status: LeaveRequestStatus): string {
    if (status === 'APPROVED') {
      return 'leave-status-pill leave-status-pill--approved';
    }
    if (status === 'REJECTED') {
      return 'leave-status-pill leave-status-pill--rejected';
    }
    if (status === 'CANCELLED') {
      return 'leave-status-pill leave-status-pill--cancelled';
    }
    return 'leave-status-pill leave-status-pill--pending';
  }

  statusLabel(status: LeaveRequestStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  canShowMenu(_item: LeaveRequest): boolean {
    return true;
  }

  canCancel(item: LeaveRequest): boolean {
    if (item.status === 'PENDING' && this.canCreate) {
      return true;
    }
    if (item.status === 'APPROVED' && (this.canApprove || this.canUpdate)) {
      return true;
    }
    return false;
  }
}
