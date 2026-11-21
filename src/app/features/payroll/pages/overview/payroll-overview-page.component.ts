import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  PayrollMySummary,
  PayrollService,
  PayrollSummary,
} from '../../../../core/services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EchartComponent } from '../../../../shared/charts/echart.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { costOption } from '../../charts/payroll-chart-options';
import { PayrollRunFormDialogComponent } from '../../dialogs/payroll-run-form-dialog.component';

@Component({
  selector: 'app-payroll-overview-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
    DecimalPipe,
    EchartComponent,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './payroll-overview-page.component.html',
  styleUrl: './payroll-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollOverviewPageComponent implements OnInit {
  private readonly payroll = inject(PayrollService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly year = new Date().getFullYear();
  readonly companySummary = signal<PayrollSummary | null>(null);
  readonly mySummary = signal<PayrollMySummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isEmployeeView = signal(false);

  readonly canCreate = this.auth.hasPermission('payroll:create');
  /** Company-wide payroll visibility mirrors the server: payroll:update or payroll:approve. */
  readonly canManage =
    this.auth.hasPermission('payroll:update') || this.auth.hasPermission('payroll:approve');

  /** Every amount on this page is in the company's currency (the API says which one). */
  readonly currency = computed(
    () => this.companySummary()?.currency ?? this.mySummary()?.currency ?? 'USD',
  );

  readonly kpis = computed(() => {
    const cur = this.currency();
    if (this.isEmployeeView()) {
      const s = this.mySummary();
      return [
        { key: 'payslips', label: 'My payslips', value: s?.payslipCount ?? 0, icon: 'receipt_long', tone: 'info' },
        { key: 'gross', label: 'YTD gross', value: this.payroll.formatMoney(s?.ytdGross ?? 0, cur), icon: 'trending_up', tone: 'success' },
        { key: 'net', label: 'YTD net', value: this.payroll.formatMoney(s?.ytdNet ?? 0, cur), icon: 'account_balance_wallet', tone: 'neutral' },
      ];
    }

    const s = this.companySummary();
    const totalRuns =
      (s?.draftRuns ?? 0) +
      (s?.completedRuns ?? 0) +
      (s?.approvedRuns ?? 0) +
      (s?.paidRuns ?? 0) +
      (s?.runsByStatus?.['CANCELLED'] ?? 0) +
      (s?.runsByStatus?.['PROCESSING'] ?? 0);

    return [
      { key: 'runs', label: 'Payroll runs', value: totalRuns, icon: 'payments', tone: 'info' },
      { key: 'paid', label: 'Paid runs', value: s?.paidRuns ?? 0, icon: 'check_circle', tone: 'success' },
      { key: 'net', label: 'YTD net pay', value: this.payroll.formatMoney(s?.ytdNet ?? 0, cur), icon: 'account_balance_wallet', tone: 'warning' },
      { key: 'employees', label: 'On payroll', value: s?.activeSalaryStructures ?? 0, icon: 'groups', tone: 'neutral' },
    ];
  });

  /** Latest six runs, newest first (for the table). */
  readonly recentMonths = computed(() => [...(this.companySummary()?.months ?? [])].reverse().slice(0, 6));

  /** Same runs oldest to newest, for the chart. */
  readonly chartMonths = computed(() =>
    [...(this.companySummary()?.months ?? [])]
      .sort((a, b) => a.month - b.month)
      .map((m) => ({ month: m.month, grossPay: m.grossPay ?? 0, netPay: m.netPay ?? 0 })),
  );

  readonly chartBuild = computed(() => {
    const months = this.chartMonths();
    const currency = this.currency();
    return (theme: Parameters<typeof costOption>[2]) => costOption(months, currency, theme);
  });

  /** Year to date: how each unit of gross pay is split between employees, tax and other deductions. */
  readonly split = computed(() => {
    const s = this.companySummary();
    const gross = s?.ytdGross ?? 0;
    if (!s || gross <= 0) {
      return [];
    }
    const tax = s.ytdTax ?? 0;
    const net = s.ytdNet ?? 0;
    const other = Math.max(0, gross - net - tax);
    const row = (key: string, label: string, amount: number, color: string) => ({
      key,
      label,
      amount,
      color,
      percent: (amount / gross) * 100,
    });
    return [
      row('net', 'Paid to employees', net, 'var(--zh-success)'),
      row('tax', 'Tax withheld', tax, 'var(--zh-warning)'),
      row('other', 'Other deductions', other, 'var(--zh-secondary)'),
    ].filter((r) => r.amount > 0);
  });

  readonly recentPayslips = computed(() => this.mySummary()?.recentPayslips ?? []);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    if (this.canManage) {
      this.payroll.getSummary(this.year).subscribe({
        next: (summary) => {
          this.isEmployeeView.set(false);
          this.companySummary.set(summary);
          this.loading.set(false);
        },
        error: () => this.loadMySummaryFallback(),
      });
      return;
    }

    this.loadMySummary();
  }

  private loadMySummary(): void {
    this.payroll.getMySummary(this.year).subscribe({
      next: (summary) => {
        this.isEmployeeView.set(true);
        this.mySummary.set(summary);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        const message = err?.error?.message || err?.message || 'Unable to load payroll overview.';
        if (/employee profile/i.test(message)) {
          this.isEmployeeView.set(true);
          this.mySummary.set({
            year: this.year,
            employeeId: '',
            payslipCount: 0,
            ytdGross: 0,
            ytdNet: 0,
            ytdTax: 0,
            latestPayslip: null,
            recentPayslips: [],
          });
          this.error.set(null);
          this.loading.set(false);
          return;
        }
        this.error.set(message);
        this.loading.set(false);
      },
    });
  }

  private loadMySummaryFallback(): void {
    this.payroll.getMySummary(this.year).subscribe({
      next: (summary) => {
        this.isEmployeeView.set(true);
        this.mySummary.set(summary);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load payroll overview. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openCreateRun(): void {
    this.dialog
      .open(PayrollRunFormDialogComponent, {
        data: {},
        width: '480px',
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

  statusClass(status: string): string {
    const key = status.toLowerCase();
    return `payroll-status-pill payroll-status-pill--${key}`;
  }

  /** "PAID" -> "Paid", "ON_HOLD" -> "On hold". */
  statusLabel(status: string): string {
    const text = status.replace(/_/g, ' ').toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  formatMoney(amount: number, currency = this.currency()): string {
    return this.payroll.formatMoney(amount, currency);
  }

  payrollMonth(month: number): string {
    return this.payroll.monthLabel(month);
  }
}
