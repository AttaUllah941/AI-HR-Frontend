import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  RecruitmentReport,
  ReportExportFormat,
  ReportsService,
} from '../../../../core/services/reports.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ReportsBarChartComponent } from '../../components/reports-bar-chart.component';

@Component({
  selector: 'app-reports-recruitment-page',
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
  templateUrl: './reports-recruitment-page.component.html',
  styleUrl: './reports-recruitment-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsRecruitmentPageComponent implements OnInit {
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly report = signal<RecruitmentReport | null>(null);
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
    this.reports.getRecruitment().subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(
          err?.error?.message || err?.message || 'Unable to load recruitment report.',
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
    this.reports.exportReport({ reportType: 'RECRUITMENT', format }).subscribe({
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

  isEmpty(report: RecruitmentReport): boolean {
    return (
      report.charts.jobsByStatus.length === 0 &&
      report.charts.applicationsByStatus.length === 0 &&
      report.charts.interviewsByStatus.length === 0 &&
      report.charts.offersByStatus.length === 0
    );
  }
}
