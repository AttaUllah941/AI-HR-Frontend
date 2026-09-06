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
import { ChartPoint } from '../../../core/services/reports.service';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
  selector: 'app-reports-bar-chart',
  standalone: true,
  template: `<div #host class="chart-host" role="img" [attr.aria-label]="title() || 'Bar chart'"></div>`,
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
export class ReportsBarChartComponent implements AfterViewInit, OnDestroy {
  readonly points = input<ChartPoint[]>([]);
  readonly title = input<string>('');
  readonly valueSuffix = input<string>('');

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private chart: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const data = this.points();
      const title = this.title();
      const suffix = this.valueSuffix();
      if (this.chart) {
        this.chart.setOption(this.buildOption(data, title, suffix), true);
      }
    });
  }

  ngAfterViewInit(): void {
    const el = this.host().nativeElement;
    this.chart = echarts.init(el);
    this.chart.setOption(this.buildOption(this.points(), this.title(), this.valueSuffix()));
    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  private buildOption(
    points: ChartPoint[],
    title: string,
    suffix: string,
  ): echarts.EChartsCoreOption {
    const labels = points.map((p) => p.label);
    const values = points.map((p) => p.value);
    const maxY = Math.max(5, ...values) * 1.15;

    return {
      animation: true,
      title: title
        ? {
            text: title,
            left: 0,
            top: 0,
            textStyle: {
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
            },
          }
        : undefined,
      grid: { left: 44, right: 12, top: title ? 36 : 16, bottom: 40 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(14,165,233,0.06)' } },
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: '#334155', fontSize: 12 },
        extraCssText: 'box-shadow: 0 4px 12px rgb(15 23 42 / 0.08); border-radius: 8px;',
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [params];
          const row = items[0] as { name?: string; value?: number };
          const unit = suffix ? ` ${suffix}` : '';
          return `<strong>${row.name}</strong><br/>${row.value}${unit}`;
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          interval: 0,
          rotate: labels.length > 6 ? 30 : 0,
        },
      },
      yAxis: {
        type: 'value',
        max: maxY,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: values,
          barMaxWidth: 28,
          itemStyle: {
            color: '#0ea5e9',
            borderRadius: [6, 6, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: '#0284c7',
              shadowBlur: 6,
              shadowColor: 'rgba(2,132,199,0.28)',
            },
          },
        },
      ],
    };
  }
}
