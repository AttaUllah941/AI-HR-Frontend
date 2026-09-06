import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import {
  AttendanceReport,
  ReportExportFormat,
  ReportsService,
} from '../../../../core/services/reports.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ReportsBarChartComponent } from '../../components/reports-bar-chart.component';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: isoDate(from), to: isoDate(to) };
}

@Component({
  selector: 'app-reports-attendance-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
    ReportsBarChartComponent,
  ],
  templateUrl: './reports-attendance-page.component.html',
  styleUrl: './reports-attendance-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsAttendancePageComponent implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly defaults = defaultRange();

  readonly report = signal<AttendanceReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);

  readonly canExport = this.auth.hasPermission('reports:export');

  readonly dateFrom = new FormControl(this.defaults.from, { nonNullable: true });
  readonly dateTo = new FormControl(this.defaults.to, { nonNullable: true });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports
      .getAttendance({
        dateFrom: this.dateFrom.value,
        dateTo: this.dateTo.value,
      })
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.loading.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.error.set(
            err?.error?.message || err?.message || 'Unable to load attendance report.',
          );
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
        reportType: 'ATTENDANCE',
        format,
        dateFrom: this.dateFrom.value,
        dateTo: this.dateTo.value,
      })
      .subscribe({
        next: () => {
          this.toast.success(`${format} export started.`);
          this.exporting.set(false);
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

  statusLabel(status: string): string {
    return this.reports.statusLabel(status);
  }

  statusClass(status: string): string {
    return `reports-status-pill reports-status-pill--${this.reports.statusTone(status)}`;
  }
}
