import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';

interface KpiCard {
  label: string;
  value: string;
  delta: string;
  deltaTone: 'up' | 'down' | 'neutral';
  hint?: string;
}

interface DeptSlice {
  name: string;
  count: number;
  pct: number;
}

interface BarPoint {
  label: string;
  value: number;
  height: number;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent {
  private readonly auth = inject(AuthService);

  readonly firstName = computed(() => this.auth.user()?.firstName || 'there');

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 18) {
      return 'Good afternoon';
    }
    return 'Good evening';
  });

  /**
   * Demo KPI values matching Lovable reference layout until domain APIs land.
   * Not claimed as live production metrics.
   */
  readonly kpis: KpiCard[] = [
    { label: 'Total Employees', value: '1,284', delta: '+12', deltaTone: 'up' },
    { label: 'Present Today', value: '1,142', delta: '89%', deltaTone: 'neutral', hint: 'of workforce' },
    { label: 'Absent', value: '48', delta: '-6', deltaTone: 'down' },
    { label: 'Late', value: '23', delta: '+4', deltaTone: 'up' },
    { label: 'Open Positions', value: '17', delta: '+3', deltaTone: 'up' },
    { label: 'Pending Leave', value: '9', delta: '-2', deltaTone: 'down' },
    { label: 'Payroll Status', value: 'Ready', delta: 'Nov', deltaTone: 'neutral' },
    { label: 'Perf. Score', value: '4.3', delta: '+0.2', deltaTone: 'up' },
  ];

  readonly insights = [
    'Attendance dropped 6% this week — highest impact in Support team.',
    'Marketing has the highest overtime — 142 hrs above baseline.',
    '3 employees flagged as at-risk of leaving (engagement + tenure signals).',
    'November payroll is ready to process — 1,284 employees, $4.82M total.',
  ];

  readonly attendanceTrend: BarPoint[] = [
    { label: 'Mon', value: 1180, height: 78 },
    { label: 'Tue', value: 1210, height: 84 },
    { label: 'Wed', value: 1095, height: 68 },
    { label: 'Thu', value: 1240, height: 90 },
    { label: 'Fri', value: 1142, height: 76 },
    { label: 'Sat', value: 420, height: 28 },
    { label: 'Sun', value: 380, height: 24 },
  ];

  readonly departments: DeptSlice[] = [
    { name: 'Engineering', count: 412, pct: 32 },
    { name: 'Sales', count: 218, pct: 17 },
    { name: 'Marketing', count: 156, pct: 12 },
    { name: 'Ops', count: 184, pct: 14 },
    { name: 'Support', count: 142, pct: 11 },
  ];

  readonly hiringFunnel: BarPoint[] = [
    { label: 'Applied', value: 580, height: 100 },
    { label: 'Screening', value: 310, height: 54 },
    { label: 'Interview', value: 168, height: 30 },
    { label: 'Offer', value: 42, height: 12 },
    { label: 'Hired', value: 28, height: 8 },
  ];

  readonly employeeGrowth: BarPoint[] = [
    { label: 'Jan', value: 1100, height: 55 },
    { label: 'Feb', value: 1120, height: 58 },
    { label: 'Mar', value: 1155, height: 64 },
    { label: 'Apr', value: 1170, height: 68 },
    { label: 'May', value: 1195, height: 74 },
    { label: 'Jun', value: 1210, height: 78 },
    { label: 'Jul', value: 1230, height: 84 },
    { label: 'Aug', value: 1255, height: 90 },
    { label: 'Sep', value: 1284, height: 100 },
  ];
}
