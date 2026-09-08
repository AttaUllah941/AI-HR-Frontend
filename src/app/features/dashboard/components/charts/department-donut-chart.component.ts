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
import { PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { DashboardDepartmentSlice } from '../../../../core/services/dashboard.service';

echarts.use([PieChart, LegendComponent, TooltipComponent, CanvasRenderer]);

@Component({
  selector: 'app-department-donut-chart',
  standalone: true,
  template: `<div #host class="chart-host" role="img" aria-label="Department distribution"></div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .chart-host {
      width: 100%;
      height: 17.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentDonutChartComponent implements AfterViewInit, OnDestroy {
  readonly slices = input<DashboardDepartmentSlice[]>([]);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private chart: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const data = this.slices();
      if (this.chart) {
        this.chart.setOption(this.buildOption(data), true);
      }
    });
  }

  ngAfterViewInit(): void {
    const el = this.host().nativeElement;
    this.chart = echarts.init(el);
    this.chart.setOption(this.buildOption(this.slices()));
    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  private buildOption(slices: DashboardDepartmentSlice[]): echarts.EChartsCoreOption {
    const valueByName = new Map(slices.map((s) => [s.label, s.value]));

    return {
      animation: true,
      tooltip: {
        trigger: 'item',
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: '#334155', fontSize: 12 },
        extraCssText: 'box-shadow: 0 4px 12px rgb(15 23 42 / 0.08); border-radius: 8px;',
        formatter: (params: unknown) => {
          const item = params as { name?: string; value?: number; percent?: number; color?: string };
          return `<strong>${item.name}</strong><br/>${item.value?.toLocaleString()} employees (${item.percent}%)`;
        },
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 14,
        icon: 'circle',
        formatter: (name: string) => {
          const value = valueByName.get(name) ?? 0;
          return `${name}  {bold|${value}}`;
        },
        textStyle: {
          color: '#64748b',
          fontSize: 11,
          rich: {
            bold: { color: '#0f172a', fontWeight: 700, fontSize: 11 },
          },
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['48%', '68%'],
          center: ['50%', '40%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 4,
          },
          label: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 6,
            itemStyle: { shadowBlur: 8, shadowColor: 'rgba(15,23,42,0.12)' },
          },
          data: slices.map((slice) => ({
            name: slice.label,
            value: slice.value,
            itemStyle: { color: slice.color },
          })),
        },
      ],
    };
  }
}
