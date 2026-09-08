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
import {
  GridComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
  selector: 'app-kpi-sparkline',
  standalone: true,
  template: `<div #chartHost class="kpi-sparkline" role="img" [attr.aria-label]="label() + ' trend'"></div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .kpi-sparkline {
      width: 100%;
      height: 100%;
      min-height: 2.75rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiSparklineComponent implements AfterViewInit, OnDestroy {
  readonly data = input<number[]>([]);
  readonly color = input('#3b82f6');
  readonly label = input('Metric');
  readonly labels = input<string[] | undefined>(undefined);

  private readonly chartHost = viewChild.required<ElementRef<HTMLDivElement>>('chartHost');
  private chart: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const values = this.data();
      const lineColor = this.color();
      const metricLabel = this.label();
      const pointLabels = this.labels();

      if (this.chart) {
        this.chart.setOption(this.buildOption(values, lineColor, metricLabel, pointLabels), true);
      }
    });
  }

  ngAfterViewInit(): void {
    const host = this.chartHost().nativeElement;
    this.chart = echarts.init(host);
    this.chart.setOption(
      this.buildOption(this.data(), this.color(), this.label(), this.labels()),
    );

    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
    });
    this.resizeObserver.observe(host);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
    this.chart = null;
  }

  private buildOption(
    values: number[],
    lineColor: string,
    metricLabel: string,
    pointLabels?: string[],
  ): echarts.EChartsCoreOption {
    const categories =
      pointLabels?.length === values.length
        ? pointLabels
        : values.map((_, index) => `Day ${index + 1}`);

    return {
      animation: true,
      grid: { left: 4, right: 4, top: 6, bottom: 4 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: '#0f172a',
        borderColor: 'transparent',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        padding: [8, 10],
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [params];
          const first = items[0] as { axisValue?: string; data?: number };
          const value = first?.data ?? 0;
          const axis = first?.axisValue ?? '';
          return `<strong>${metricLabel}</strong><br/>${axis}: ${value}`;
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        show: false,
        data: categories,
      },
      yAxis: {
        type: 'value',
        show: false,
        scale: true,
      },
      series: [
        {
          type: 'line',
          smooth: 0.35,
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: false,
          emphasis: {
            focus: 'series',
            scale: true,
            itemStyle: {
              color: lineColor,
              borderColor: '#fff',
              borderWidth: 2,
            },
          },
          lineStyle: {
            width: 2,
            color: lineColor,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${lineColor}55` },
              { offset: 1, color: `${lineColor}08` },
            ]),
          },
          data: values,
        },
      ],
    };
  }
}
