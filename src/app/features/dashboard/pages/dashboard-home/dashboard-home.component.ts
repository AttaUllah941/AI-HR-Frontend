import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AttendanceTrendChartComponent } from '../../components/charts/attendance-trend-chart.component';
import { DepartmentDonutChartComponent } from '../../components/charts/department-donut-chart.component';
import { HiringFunnelChartComponent } from '../../components/charts/hiring-funnel-chart.component';
import { EmployeeGrowthChartComponent } from '../../components/charts/employee-growth-chart.component';
import { DashboardClockCardComponent } from '../../components/dashboard-clock-card/dashboard-clock-card.component';
import {
  DashboardKpiTrend,
  DashboardService,
  DashboardSummary,
} from '../../../../core/services/dashboard.service';

import { ChartSkeletonComponent } from '../../../../shared/skeleton/chart-skeleton.component';
import { ErrorStateComponent } from '../../../../shared/error-state/error-state.component';
import { KpiCardSkeletonComponent } from '../../../../shared/skeleton/kpi-card-skeleton.component';
@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    AttendanceTrendChartComponent,
    DepartmentDonutChartComponent,
    HiringFunnelChartComponent,
    EmployeeGrowthChartComponent,
    DashboardClockCardComponent,
    ChartSkeletonComponent,
    ErrorStateComponent,
    KpiCardSkeletonComponent,
  ],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);

  protected readonly kpiPlaceholders = [0, 1, 2, 3];
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly summary = signal<DashboardSummary | null>(null);

  /** KPI icon colours come from the design tokens (soft tinted background + solid icon), so they work in dark mode. */
  readonly iconStyles: Record<string, { bg: string; color: string }> = Object.fromEntries(
    Object.entries({
      primary: 'var(--zh-primary)',
      secondary: 'oklch(62% 0.2 300)',
      success: 'var(--zh-success)',
      warning: 'var(--zh-warning)',
      danger: 'var(--zh-destructive)',
      info: 'oklch(70% 0.12 210)',
    }).map(([tone, color]) => [tone, { bg: `color-mix(in oklab, ${color} 15%, transparent)`, color }]),
  );

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.load();
  }

  formatKpiValue(value: number | string | null): string {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toLocaleString('en-US') : value.toString();
    }
    return value;
  }

  hasAttendanceData(data: DashboardSummary): boolean {
    return data.attendanceTrend.series.some((p) => p.present > 0 || p.absent > 0);
  }

  hasFunnelData(data: DashboardSummary): boolean {
    return data.hiringFunnel.stages.some((stage) => stage.value > 0);
  }

  hasGrowthData(data: DashboardSummary): boolean {
    return data.employeeGrowth.points.some((point) => point.value > 0);
  }

  trendIcon(trend?: DashboardKpiTrend): string | null {
    if (!trend || trend.direction === 'neutral') {
      return null;
    }
    return trend.direction === 'up' ? 'arrow_upward' : 'arrow_downward';
  }

  trendClass(trend?: DashboardKpiTrend): string {
    if (!trend) {
      return '';
    }
    if (trend.direction === 'neutral') {
      return 'is-neutral';
    }
    if (trend.value.trim().startsWith('-')) {
      return 'is-negative';
    }
    return 'is-positive';
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboard.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load dashboard data.');
        this.loading.set(false);
      },
    });
  }
}
