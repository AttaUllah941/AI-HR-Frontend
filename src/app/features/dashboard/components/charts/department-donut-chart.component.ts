import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardDepartmentSlice } from '../../../../core/services/dashboard.service';
import { EchartComponent } from '../../../../shared/charts/echart.component';
import { departmentOption } from './dashboard-chart-options';

@Component({
  selector: 'app-department-donut-chart',
  standalone: true,
  imports: [EchartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-echart [build]="build()" label="Employees by department" height="19rem" />`,
})
export class DepartmentDonutChartComponent {
  readonly slices = input<DashboardDepartmentSlice[]>([]);
  /** Total shown in the middle of the donut; defaults to the sum of the slices. */
  readonly total = input<number | null>(null);
  protected readonly build = computed(() => {
    const slices = this.slices();
    const total = this.total() ?? slices.reduce((s, x) => s + x.value, 0);
    return (theme: Parameters<typeof departmentOption>[2], size: { narrow: boolean }) =>
      departmentOption(slices, total, theme, size.narrow);
  });
}
