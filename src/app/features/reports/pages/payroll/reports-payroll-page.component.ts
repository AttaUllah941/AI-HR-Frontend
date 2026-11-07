import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import {
  PayrollAnalyticsReport,
  ReportExportFormat,
  ReportsService,
} from '../../../../core/services/reports.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ReportsBarChartComponent } from '../../components/reports-bar-chart.component';
import { SmartLoaderComponent } from '../../../../shared/smart-loader/smart-loader.component';
import { LOADER_MESSAGES } from '../../../../shared/smart-loader/loader-messages';

@Component({
  selector: 'app-reports-payroll-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatMenuModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
    ReportsBarChartComponent,
    SmartLoaderComponent,
  ],
  templateUrl: './reports-payroll-page.component.html',
  styleUrl: './reports-payroll-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPayrollPageComponent implements OnInit {
  protected readonly exportMessages = LOADER_MESSAGES.export;
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly currentYear = new Date().getFullYear();
  readonly yearOptions = [this.currentYear - 1, this.currentYear, this.currentYear + 1];
  readonly monthOptions = [
    { value: null as number | null, label: 'All months' },
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dec' },
  ];

  readonly report = signal<PayrollAnalyticsReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);

  readonly canExport = this.auth.hasPermission('reports:export');
  readonly yearControl = new FormControl(this.currentYear, { nonNullable: true });
  readonly monthControl = new FormControl<number | null>(null);

  ngOnInit(): void {
    this.yearControl.valueChanges.subscribe(() => this.reload());
    this.monthControl.valueChanges.subscribe(() => this.reload());
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const month = this.monthControl.value ?? undefined;
    this.reports.getPayroll({ year: this.yearControl.value, month }).subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load payroll report.');
        this.loading.set(false);
      },
    });
  }

  exportReport(format: ReportExportFormat): void {
    if (!this.canExport) {
      return;
    }
    this.exporting.set(true);
    this.reports
      .exportReport({
        reportType: 'PAYROLL',
        format,
        year: this.yearControl.value,
        month: this.monthControl.value ?? undefined,
      })
      .subscribe({
        next: () => {
          this.toast.success(`${format} download ready.`);
          this.exporting.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Export failed.');
          this.exporting.set(false);
        },
      });
  }

  formatNumber(value: number, digits = 0): string {
    return this.reports.formatNumber(value, digits);
  }

  monthLabel(month: number): string {
    return this.reports.monthLabel(month);
  }

  statusLabel(status: string): string {
    return this.reports.statusLabel(status);
  }

  statusClass(status: string): string {
    return `reports-status-pill reports-status-pill--${this.reports.statusTone(status)}`;
  }
}
