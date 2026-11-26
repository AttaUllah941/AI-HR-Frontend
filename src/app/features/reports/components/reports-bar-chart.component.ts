import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartPoint } from '../../../core/services/reports.service';
import { ChartTheme, esc, tooltipStyle } from '../../../shared/charts/chart-theme';
import { ChartSize, EchartComponent } from '../../../shared/charts/echart.component';
import { echarts } from '../../../shared/charts/echarts-setup';

/** True when there is nothing worth drawing (no points, or every value is zero). */
export function isEmptyChart(points: readonly ChartPoint[] | null | undefined): boolean {
  return !points || points.length === 0 || points.every((p) => !p.value);
}

/** Spoken description of the chart, e.g. "Leave by status: Approved 4, Pending 2". */
export function chartSummary(title: string, points: readonly ChartPoint[], suffix = ''): string {
  const unit = suffix ? ` ${suffix}` : '';
  const body = points.map((p) => `${p.label} ${p.value}${unit}`).join(', ');
  return [title || 'Bar chart', body].filter(Boolean).join(': ');
}

/** Bar chart option that follows the app theme (light and dark), so no colours are hardcoded here. */
export function barChartOption(
  points: readonly ChartPoint[],
  theme: ChartTheme,
  size: ChartSize,
  suffix = '',
): echarts.EChartsCoreOption {
  const labels = points.map((p) => p.label);
  const values = points.map((p) => p.value);
  const unit = suffix ? ` ${suffix}` : '';
  const crowded = size.narrow || labels.length > 6;

  return {
    textStyle: { fontFamily: theme.fontFamily },
    grid: { left: 8, right: 12, top: 24, bottom: crowded ? 8 : 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: theme.grid } },
      ...tooltipStyle(theme),
      formatter: (params: unknown) => {
        const row = (Array.isArray(params) ? params[0] : params) as { name?: string; value?: number };
        return `<strong>${esc(row.name)}</strong><br/>${esc(row.value)}${esc(unit)}`;
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: theme.grid } },
      axisTick: { show: false },
      axisLabel: { color: theme.muted, fontSize: 11, interval: 0, rotate: crowded ? 30 : 0 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: theme.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: theme.grid, type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        data: values,
        barMaxWidth: 32,
        itemStyle: { color: theme.primary, borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top', color: theme.muted, fontSize: 11 },
        emphasis: { itemStyle: { color: theme.primary, shadowBlur: 8, shadowColor: theme.grid } },
      },
    ],
  };
}

@Component({
  selector: 'app-reports-bar-chart',
  standalone: true,
  imports: [EchartComponent],
  templateUrl: './reports-bar-chart.component.html',
  styleUrl: './reports-bar-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsBarChartComponent {
  readonly points = input<ChartPoint[]>([]);
  readonly title = input<string>('');
  readonly valueSuffix = input<string>('');

  protected readonly empty = computed(() => isEmptyChart(this.points()));
  protected readonly summary = computed(() => chartSummary(this.title(), this.points(), this.valueSuffix()));
  protected readonly build = computed(() => {
    const points = this.points() ?? [];
    const suffix = this.valueSuffix();
    return (theme: ChartTheme, size: ChartSize) => barChartOption(points, theme, size, suffix);
  });
}
