import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { DashboardFunnelStage } from '../../../../core/services/dashboard.service';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
  selector: 'app-hiring-funnel-chart',
  standalone: true,
  template: `<div #host class="chart-host" role="img" aria-label="Hiring funnel"></div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .chart-host {
      width: 100%;
      height: 16.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HiringFunnelChartComponent implements AfterViewInit, OnDestroy {
  readonly stages = input<DashboardFunnelStage[]>([]);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private chart: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const data = this.stages();
      if (this.chart) {
        this.chart.setOption(this.buildOption(data), true);
      }
    });
  }

  ngAfterViewInit(): void {
    const el = this.host().nativeElement;
    this.chart = echarts.init(el);
    this.chart.setOption(this.buildOption(this.stages()));
    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  private buildOption(stages: DashboardFunnelStage[]): echarts.EChartsCoreOption {
    const labels = stages.map((s) => s.label);
    const values = stages.map((s) => s.value);
    const maxX = Math.max(600, ...values) + 50;

    return {
      animation: true,
      grid: { left: 72, right: 16, top: 12, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(59,130,246,0.06)' } },
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: '#334155', fontSize: 12 },
        extraCssText: 'box-shadow: 0 4px 12px rgb(15 23 42 / 0.08); border-radius: 8px;',
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [params];
          const row = items[0] as { name?: string; value?: number };
          return `<strong>${row.name}</strong><br/>${row.value} candidates`;
        },
      },
      xAxis: {
        type: 'value',
        max: maxX,
        interval: 150,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: labels,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: values,
          barWidth: 16,
          itemStyle: {
            color: '#22d3ee',
            borderRadius: [0, 20, 20, 0],
          },
          emphasis: {
            itemStyle: {
              color: '#06b6d4',
              shadowBlur: 6,
              shadowColor: 'rgba(6,182,212,0.35)',
            },
          },
        },
      ],
    };
  }
}
