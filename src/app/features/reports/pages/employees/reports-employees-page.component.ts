import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  EmployeesReport,
  ReportExportFormat,
  ReportsService,
} from '../../../../core/services/reports.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ReportsBarChartComponent } from '../../components/reports-bar-chart.component';

@Component({
  selector: 'app-reports-employees-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
    ReportsBarChartComponent,
  ],
  templateUrl: './reports-employees-page.component.html',
  styleUrl: './reports-employees-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsEmployeesPageComponent implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly report = signal<EmployeesReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);

  readonly canExport = this.auth.hasPermission('reports:export');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports.getEmployees().subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load employees report.');
        this.loading.set(false);
      },
    });
  }

  exportReport(format: ReportExportFormat): void {
    if (!this.canExport) {
      return;
    }
    this.exporting.set(true);
    this.reports.exportReport({ reportType: 'EMPLOYEES', format }).subscribe({
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

  isEmpty(report: EmployeesReport): boolean {
    return report.totals.employees === 0;
  }
}
