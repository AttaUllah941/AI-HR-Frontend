import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  ReportExportFormat,
  ReportType,
  ReportsService,
  ReportsSummary,
} from '../../../../core/services/reports.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ReportsBarChartComponent } from '../../components/reports-bar-chart.component';

@Component({
  selector: 'app-reports-overview-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
    ReportsBarChartComponent,
  ],
  templateUrl: './reports-overview-page.component.html',
  styleUrl: './reports-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsOverviewPageComponent implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly summary = signal<ReportsSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);

  readonly canExport = this.auth.hasPermission('reports:export');

  readonly kpis = computed(() => {
    const k = this.summary()?.kpis;
    return [
      { key: 'employees', label: 'Employees', value: k?.employees ?? 0, icon: 'groups', tone: 'info' },
      { key: 'active', label: 'Active', value: k?.activeEmployees ?? 0, icon: 'badge', tone: 'success' },
      {
        key: 'attendance',
        label: 'Attendance today',
        value: k?.attendanceToday ?? 0,
        icon: 'schedule',
        tone: 'neutral',
      },
      {
        key: 'leave',
        label: 'Pending leave',
        value: k?.pendingLeave ?? 0,
        icon: 'event_available',
        tone: 'warning',
      },
      { key: 'jobs', label: 'Open jobs', value: k?.openJobs ?? 0, icon: 'work', tone: 'info' },
      {
        key: 'candidates',
        label: 'Candidates',
        value: k?.candidates ?? 0,
        icon: 'person_search',
        tone: 'neutral',
      },
      {
        key: 'goals',
        label: 'Active goals',
        value: k?.activeGoals ?? 0,
        icon: 'flag',
        tone: 'success',
      },
      {
        key: 'payroll',
        label: 'Payroll runs (YTD)',
        value: k?.payrollRunsYear ?? 0,
        icon: 'payments',
        tone: 'warning',
      },
    ];
  });

  readonly moduleIcons: Record<string, string> = {
    ATTENDANCE: 'schedule',
    LEAVE: 'event_available',
    PAYROLL: 'payments',
    RECRUITMENT: 'work',
    PERFORMANCE: 'trending_up',
    EMPLOYEES: 'groups',
  };

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load reports overview.');
        this.loading.set(false);
      },
    });
  }

  exportOverview(format: ReportExportFormat): void {
    this.runExport('OVERVIEW', format);
  }

  private runExport(reportType: ReportType, format: ReportExportFormat): void {
    if (!this.canExport) {
      return;
    }
    this.exporting.set(true);
    this.reports.exportReport({ reportType, format }).subscribe({
      next: () => {
        this.toast.success(`${format} export started.`);
        this.exporting.set(false);
        this.reload();
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.toast.error(err?.error?.message || err?.message || 'Export failed.');
        this.exporting.set(false);
      },
    });
  }

  formatNumber(value: number): string {
    return this.reports.formatNumber(value);
  }

  reportTypeLabel(type: string): string {
    return this.reports.reportTypeLabel(type);
  }

  statusClass(status: string): string {
    return `reports-status-pill reports-status-pill--${this.reports.statusTone(status)}`;
  }
}
