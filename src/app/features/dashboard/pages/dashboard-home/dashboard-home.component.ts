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
import {
  DashboardKpiTrend,
  DashboardService,
  DashboardSummary,
} from '../../../../core/services/dashboard.service';

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
  ],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly summary = signal<DashboardSummary | null>(null);

  readonly iconStyles: Record<string, { bg: string; color: string }> = {
    primary: { bg: '#eff6ff', color: '#3b82f6' },
    secondary: { bg: '#f5f3ff', color: '#8b5cf6' },
    success: { bg: '#ecfdf5', color: '#22c55e' },
    warning: { bg: '#fffbeb', color: '#f59e0b' },
    danger: { bg: '#fef2f2', color: '#ef4444' },
    info: { bg: '#ecfeff', color: '#06b6d4' },
  };

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
