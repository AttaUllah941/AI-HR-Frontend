import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardFunnelStage } from '../../../../core/services/dashboard.service';
import { EchartComponent } from '../../../../shared/charts/echart.component';
import { hiringOption } from './dashboard-chart-options';

@Component({
  selector: 'app-hiring-funnel-chart',
  standalone: true,
  imports: [EchartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-echart [build]="build()" label="Candidates in each hiring stage" height="17rem" />`,
})
export class HiringFunnelChartComponent {
  readonly stages = input<DashboardFunnelStage[]>([]);
  protected readonly build = computed(() => {
    const stages = this.stages();
    return (theme: Parameters<typeof hiringOption>[1]) => hiringOption(stages, theme);
  });
}
