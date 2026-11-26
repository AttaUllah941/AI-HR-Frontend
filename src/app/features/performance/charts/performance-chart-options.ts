import { ChartTheme, esc, tooltipStyle } from '../../../shared/charts/chart-theme';

/** ECharts options for the performance overview. Pure functions of (data, theme) so they can be tested. */
type Opt = Record<string, unknown>;

export interface StatusSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

const GOAL_ORDER = ['ACTIVE', 'COMPLETED', 'DRAFT', 'CANCELLED'];
const REVIEW_ORDER = ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'ACKNOWLEDGED', 'COMPLETED', 'CANCELLED'];

/** "IN_PROGRESS" -> "In progress". */
export function statusText(status: string): string {
  const text = status.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function goalColor(status: string, t: ChartTheme): string {
  switch (status) {
    case 'ACTIVE':
      return t.primary;
    case 'COMPLETED':
      return t.success;
    case 'CANCELLED':
      return t.danger;
    default:
      return t.muted;
  }
}

function reviewColor(status: string, t: ChartTheme): string {
  switch (status) {
    case 'DRAFT':
      return t.muted;
    case 'IN_PROGRESS':
      return t.warning;
    case 'SUBMITTED':
      return t.primary;
    case 'ACKNOWLEDGED':
      return t.info;
    case 'COMPLETED':
      return t.success;
    default:
      return t.danger;
  }
}

function slices(
  counts: Record<string, number> | undefined,
  order: string[],
  color: (status: string, t: ChartTheme) => string,
  t: ChartTheme,
): StatusSlice[] {
  const data = counts ?? {};
  const keys = [...order, ...Object.keys(data).filter((k) => !order.includes(k))];
  return keys
    .filter((k) => (data[k] ?? 0) > 0)
    .map((k) => ({ key: k, label: statusText(k), value: data[k]!, color: color(k, t) }));
}

export function goalSlices(counts: Record<string, number> | undefined, t: ChartTheme): StatusSlice[] {
  return slices(counts, GOAL_ORDER, goalColor, t);
}

export function reviewSlices(counts: Record<string, number> | undefined, t: ChartTheme): StatusSlice[] {
  return slices(counts, REVIEW_ORDER, reviewColor, t);
}

/** Goals by status as a donut with the total in the middle. */
export function goalsOption(counts: Record<string, number> | undefined, t: ChartTheme): Opt {
  const data = goalSlices(counts, t);
  const total = data.reduce((s, d) => s + d.value, 0);
  return {
    textStyle: { fontFamily: t.fontFamily },
    tooltip: {
      trigger: 'item',
      ...tooltipStyle(t),
      formatter: (p: { name: string; value: number; percent: number; color: string }) =>
        `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-right:6px"></span>${esc(p.name)}: <strong>${p.value}</strong> (${Math.round(p.percent)}%)`,
    },
    title: {
      text: String(total),
      subtext: 'goals',
      left: 'center',
      top: 'middle',
      itemGap: 2,
      textStyle: { color: t.text, fontSize: 26, fontWeight: 700, fontFamily: t.fontFamily },
      subtextStyle: { color: t.muted, fontSize: 12, fontFamily: t.fontFamily },
    },
    series: [
      {
        type: 'pie',
        radius: ['58%', '82%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderColor: t.surface, borderWidth: 2, borderRadius: 4 },
        emphasis: { scale: true, scaleSize: 4 },
        data: data.map((d) => ({ name: d.label, value: d.value, itemStyle: { color: d.color } })),
      },
    ],
  };
}

/** Reviews by status as horizontal bars (a simple pipeline from draft to completed). */
export function reviewsOption(counts: Record<string, number> | undefined, t: ChartTheme): Opt {
  const data = reviewSlices(counts, t);
  return {
    textStyle: { fontFamily: t.fontFamily },
    grid: { left: 8, right: 28, top: 4, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' } },
      ...tooltipStyle(t),
      formatter: (params: unknown) => {
        const p = (Array.isArray(params) ? params[0] : params) as { dataIndex: number } | undefined;
        const d = data[p?.dataIndex ?? 0];
        return d ? `${esc(d.label)}: <strong>${d.value}</strong>` : '';
      },
    },
    xAxis: { type: 'value', minInterval: 1, show: false },
    yAxis: {
      type: 'category',
      inverse: true,
      data: data.map((d) => d.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: t.muted, fontSize: 12, fontFamily: t.fontFamily },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 18,
        label: { show: true, position: 'right', color: t.text, fontSize: 12, fontFamily: t.fontFamily },
        data: data.map((d) => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [0, 9, 9, 0] } })),
      },
    ],
  };
}
