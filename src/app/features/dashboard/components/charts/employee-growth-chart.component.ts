import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardGrowthPoint } from '../../../../core/services/dashboard.service';
import { EchartComponent } from '../../../../shared/charts/echart.component';
import { growthOption } from './dashboard-chart-options';

@Component({
  selector: 'app-employee-growth-chart',
  standalone: true,
  imports: [EchartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-echart [build]="build()" label="Headcount by month this year" height="17rem" />`,
})
export class EmployeeGrowthChartComponent {
  readonly points = input<DashboardGrowthPoint[]>([]);
  protected readonly build = computed(() => {
    const points = this.points();
    return (theme: Parameters<typeof growthOption>[1]) => growthOption(points, theme);
  });
}
