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
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { DashboardGrowthPoint } from '../../../../core/services/dashboard.service';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
  selector: 'app-employee-growth-chart',
  standalone: true,
  template: `<div #host class="chart-host" role="img" aria-label="Employee growth"></div>`,
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
export class EmployeeGrowthChartComponent implements AfterViewInit, OnDestroy {
  readonly points = input<DashboardGrowthPoint[]>([]);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private chart: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const data = this.points();
      if (this.chart) {
        this.chart.setOption(this.buildOption(data), true);
      }
    });
  }

  ngAfterViewInit(): void {
    const el = this.host().nativeElement;
    this.chart = echarts.init(el);
    this.chart.setOption(this.buildOption(this.points()));
    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  private buildOption(points: DashboardGrowthPoint[]): echarts.EChartsCoreOption {
    const labels = points.map((p) => p.label);
    const values = points.map((p) => p.value);
    const min = Math.min(...values) - 30;
    const max = Math.max(...values) + 20;

    return {
      animation: true,
      grid: { left: 48, right: 16, top: 20, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: '#334155', fontSize: 12 },
        extraCssText: 'box-shadow: 0 4px 12px rgb(15 23 42 / 0.08); border-radius: 8px;',
        axisPointer: {
          type: 'line',
          lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
        },
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [params];
          const row = items[0] as { axisValue?: string; data?: number };
          return `<strong>${row.axisValue}</strong><br/>Employees: ${row.data?.toLocaleString()}`;
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        min,
        max,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      },
      series: [
        {
          type: 'line',
          data: values,
          symbol: 'circle',
          symbolSize: 8,
          showSymbol: true,
          lineStyle: { color: '#22c55e', width: 2 },
          itemStyle: { color: '#22c55e', borderColor: '#fff', borderWidth: 2 },
          emphasis: {
            scale: true,
            itemStyle: { borderWidth: 3, shadowBlur: 6, shadowColor: 'rgba(34,197,94,0.35)' },
          },
        },
      ],
    };
  }
}
