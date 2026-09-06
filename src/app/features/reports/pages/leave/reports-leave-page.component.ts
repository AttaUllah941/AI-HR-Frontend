import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import {
  LeaveReport,
  ReportExportFormat,
  ReportsService,
} from '../../../../core/services/reports.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ReportsBarChartComponent } from '../../components/reports-bar-chart.component';

@Component({
  selector: 'app-reports-leave-page',
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
  ],
  templateUrl: './reports-leave-page.component.html',
  styleUrl: './reports-leave-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsLeavePageComponent implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly currentYear = new Date().getFullYear();
  readonly yearOptions = [this.currentYear - 1, this.currentYear, this.currentYear + 1];

  readonly report = signal<LeaveReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);

  readonly canExport = this.auth.hasPermission('reports:export');
  readonly yearControl = new FormControl(this.currentYear, { nonNullable: true });

  ngOnInit(): void {
    this.yearControl.valueChanges.subscribe(() => this.reload());
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports.getLeave({ year: this.yearControl.value }).subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load leave report.');
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
        reportType: 'LEAVE',
        format,
        year: this.yearControl.value,
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
