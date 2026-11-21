import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  LeaveBalance,
  LeaveMySummary,
  LeaveRequest,
  LeaveRequestStatus,
  LeaveService,
} from '../../../../core/services/leave.service';
import { AuthService } from '../../../../core/services/auth.service';
import { formatDateRange } from '../../../../core/utils/date-format';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { LeaveRequestFormDialogComponent } from '../../dialogs/leave-request-form-dialog.component';

@Component({
  selector: 'app-leave-overview-page',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './leave-overview-page.component.html',
  styleUrl: './leave-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveOverviewPageComponent implements OnInit {
  private readonly leave = inject(LeaveService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly year = new Date().getFullYear();
  readonly summary = signal<LeaveMySummary | null>(null);
  readonly recent = signal<LeaveRequest[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly canCreate = this.auth.hasPermission('leave:create');

  readonly remainingDays = computed(() => {
    const s = this.summary();
    if (s?.remainingDays != null) {
      return s.remainingDays;
    }
    const balances = s?.balances ?? [];
    return balances.reduce((sum, b) => sum + this.leave.availableDays(b), 0);
  });

  readonly kpis = computed(() => {
    const s = this.summary();
    return [
      { key: 'remaining', label: 'Days remaining', value: Math.round(this.remainingDays() * 10) / 10, icon: 'beach_access', tone: 'info' },
      { key: 'pending', label: 'Pending requests', value: s?.pendingRequests ?? 0, icon: 'hourglass_top', tone: 'warning' },
      { key: 'approved', label: 'Approved this year', value: s?.approvedRequests ?? 0, icon: 'check_circle', tone: 'success' },
    ];
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.leave.getMySummary(this.year).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
        this.loadRecent(summary.employeeId);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        const message = err?.error?.message || err?.message || 'Unable to load leave overview.';
        // HR/admin accounts may lack an employee profile — show empty overview instead of blocking.
        if (/employee profile/i.test(message)) {
          this.summary.set({
            year: this.year,
            employeeId: '',
            balances: [],
            pendingRequests: 0,
            approvedRequests: 0,
            approvedDays: 0,
            pendingDays: 0,
            remainingDays: 0,
          });
          this.recent.set([]);
          this.error.set(null);
          this.loading.set(false);
          return;
        }
        this.error.set(message);
        this.loading.set(false);
      },
    });
  }

  /** The person's latest requests; a failure here just hides the panel, it never blocks the page. */
  private loadRecent(employeeId: string): void {
    if (!employeeId) {
      this.recent.set([]);
      return;
    }
    this.leave.listRequests({ employeeId, page: 1, pageSize: 5 }).subscribe({
      next: (res) => this.recent.set(res.items),
      error: () => this.recent.set([]),
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

  available(balance: LeaveBalance): number {
    return Math.round(this.leave.availableDays(balance) * 10) / 10;
  }

  /** Entitlement plus anything carried over: the size of the whole bar. */
  total(balance: LeaveBalance): number {
    return balance.entitled + balance.carriedForward;
  }

  usedPercent(balance: LeaveBalance): number {
    const total = this.total(balance);
    return total > 0 ? Math.min(100, (balance.used / total) * 100) : 0;
  }

  pendingPercent(balance: LeaveBalance): number {
    const total = this.total(balance);
    return total > 0 ? Math.min(100 - this.usedPercent(balance), (balance.pending / total) * 100) : 0;
  }

  /** Highlights balances that are nearly used up. */
  tone(balance: LeaveBalance): 'ok' | 'warn' | 'low' {
    const total = this.total(balance);
    if (total <= 0) {
      return 'ok';
    }
    const left = this.available(balance) / total;
    return left <= 0 ? 'low' : left <= 0.2 ? 'warn' : 'ok';
  }

  dateRange(item: LeaveRequest): string {
    return formatDateRange(item.startDate, item.endDate);
  }

  statusClass(status: LeaveRequestStatus): string {
    return `leave-status-pill leave-status-pill--${status.toLowerCase()}`;
  }

  statusLabel(status: LeaveRequestStatus): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }
}
