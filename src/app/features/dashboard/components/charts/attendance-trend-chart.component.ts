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
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { DashboardAttendancePoint } from '../../../../core/services/dashboard.service';

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

@Component({
  selector: 'app-attendance-trend-chart',
  standalone: true,
  template: `<div #host class="chart-host" role="img" aria-label="Attendance trend"></div>`,
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
export class AttendanceTrendChartComponent implements AfterViewInit, OnDestroy {
  readonly series = input<DashboardAttendancePoint[]>([]);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private chart: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const data = this.series();
      if (this.chart) {
        this.chart.setOption(this.buildOption(data), true);
      }
    });
  }

  ngAfterViewInit(): void {
    const el = this.host().nativeElement;
    this.chart = echarts.init(el);
    this.chart.setOption(this.buildOption(this.series()));
    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  private buildOption(data: DashboardAttendancePoint[]): echarts.EChartsCoreOption {
    const labels = data.map((p) => p.label);
    const present = data.map((p) => p.present);
    const absent = data.map((p) => p.absent);
    const maxY = Math.max(1400, ...present.map((v, i) => v + absent[i]));

    return {
      animation: true,
      grid: { left: 44, right: 16, top: 20, bottom: 28 },
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
          const day = (items[0] as { axisValue?: string })?.axisValue ?? '';
          const lines = items
            .map((item) => {
              const row = item as { seriesName?: string; data?: number; color?: string };
              const color = row.color ?? '#334155';
              return `<span style="color:${color};font-weight:600">${row.seriesName}</span> : ${row.data}`;
            })
            .join('<br/>');
          return `<strong>${day}</strong><br/>${lines}`;
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
        min: 0,
        max: maxY,
        interval: Math.ceil(maxY / 4 / 50) * 50,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      },
      series: [
        {
          name: 'present',
          type: 'line',
          smooth: 0.35,
          data: present,
          symbol: 'circle',
          symbolSize: 7,
          showSymbol: false,
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6', borderColor: '#fff', borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59,130,246,0.35)' },
              { offset: 1, color: 'rgba(59,130,246,0.02)' },
            ]),
          },
          emphasis: { focus: 'series', scale: true },
        },
        {
          name: 'absent',
          type: 'line',
          smooth: 0.35,
          data: absent,
          symbol: 'circle',
          symbolSize: 7,
          showSymbol: false,
          lineStyle: { color: '#ef4444', width: 2 },
          itemStyle: { color: '#ef4444', borderColor: '#fff', borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239,68,68,0.15)' },
              { offset: 1, color: 'rgba(239,68,68,0.02)' },
            ]),
          },
          emphasis: { focus: 'series', scale: true },
        },
      ],
    };
  }
}
