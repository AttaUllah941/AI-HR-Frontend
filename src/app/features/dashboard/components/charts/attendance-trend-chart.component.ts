import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardAttendancePoint } from '../../../../core/services/dashboard.service';
import { EchartComponent } from '../../../../shared/charts/echart.component';
import { attendanceOption } from './dashboard-chart-options';

@Component({
  selector: 'app-attendance-trend-chart',
  standalone: true,
  imports: [EchartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-echart [build]="build()" label="Attendance for the last 7 days: on time, late and absent" height="17rem" />`,
})
export class AttendanceTrendChartComponent {
  readonly series = input<DashboardAttendancePoint[]>([]);
  protected readonly build = computed(() => {
    const data = this.series();
    return (theme: Parameters<typeof attendanceOption>[1]) => attendanceOption(data, theme);
  });
}
