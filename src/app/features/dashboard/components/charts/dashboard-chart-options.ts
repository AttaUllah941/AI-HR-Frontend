import {
  DashboardAttendancePoint,
  DashboardDepartmentSlice,
  DashboardFunnelStage,
  DashboardGrowthPoint,
} from '../../../../core/services/dashboard.service';
import { ChartTheme, esc, tooltipStyle, withAlpha } from '../../../../shared/charts/chart-theme';

/** ECharts option builders for the dashboard. Pure functions of (data, theme) so they are easy to test. */

type Opt = Record<string, unknown>;

const SHORT_DAY = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });

function axisBase(t: ChartTheme) {
  return {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: t.muted, fontSize: 11, fontFamily: t.fontFamily },
  };
}

/** Next "nice" number at or above `n` (1, 2, 5 x 10^k), used for friendly axis maxima. */
export function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * pow;
}

/** Axis maximum a little above the data and on a round step, so the top gridline is a clean tick (24 -> 30, 40 -> 50). */
export function axisMax(n: number): number {
  if (n <= 5) return 5;
  const step = n <= 10 ? 2 : n <= 20 ? 5 : n <= 100 ? 10 : 50;
  return Math.ceil((n * 1.05) / step) * step;
}

// ---------------------------------------------------------------------------
// Attendance: stacked bars (on time / late / absent) with weekends shown as faded columns.
// ---------------------------------------------------------------------------
export interface AttendanceBar {
  label: string;
  caption: string;
  weekend: boolean;
  onTime: number;
  late: number;
  absent: number;
}

export function toAttendanceBars(points: DashboardAttendancePoint[]): AttendanceBar[] {
  return points.map((p) => {
    const date = p.date ? new Date(`${p.date}T00:00:00`) : null;
    const weekend = date ? date.getDay() === 0 || date.getDay() === 6 : p.label === 'Sat' || p.label === 'Sun';
    const late = Math.min(p.late ?? 0, p.present);
    return {
      label: p.label,
      caption: date ? `${p.label}\n${SHORT_DAY.format(date)}` : p.label,
      weekend,
      // `present` already counts late arrivals, so on-time is what is left.
      onTime: Math.max(0, p.present - late),
      late,
      absent: p.absent,
    };
  });
}

export function attendanceOption(points: DashboardAttendancePoint[], t: ChartTheme): Opt {
  const bars = toAttendanceBars(points);
  const tallest = Math.max(1, ...bars.map((b) => b.onTime + b.late + b.absent));
  const ceiling = axisMax(tallest);
  const barWidth = 18;
  // Soft green / sage / pale yellow stack, as in the reference chart.
  const colors = t.dark
    ? { onTime: '#3fae74', late: '#e8de8a', absent: '#7fa89d' }
    : { onTime: '#2e8b57', late: '#e8e49b', absent: '#8fb5ab' };

  const stackSeries = (name: string, key: 'onTime' | 'late' | 'absent', color: string) => ({
    name,
    type: 'bar',
    stack: 'attendance',
    barWidth,
    barGap: '-100%',
    itemStyle: { color, borderRadius: 2 },
    emphasis: { focus: 'series' },
    data: bars.map((b) => (b.weekend ? null : b[key])),
  });

  return {
    textStyle: { fontFamily: t.fontFamily },
    grid: { left: 40, right: 8, top: 36, bottom: 30 },
    legend: {
      data: ['On time', 'Late', 'Absent'],
      top: 0,
      right: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { color: t.muted, fontSize: 12, fontFamily: t.fontFamily },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' } },
      ...tooltipStyle(t),
      formatter: (params: unknown) => {
        const items = (Array.isArray(params) ? params : [params]) as Array<{ dataIndex: number; seriesName: string; value: number | null; color: string }>;
        const bar = bars[items[0]?.dataIndex ?? 0];
        if (!bar) return '';
        const heading = `<strong>${esc(bar.caption.replace('\n', ', '))}</strong>`;
        if (bar.weekend) return `${heading}<br/><span style="color:${t.muted}">Weekend, no attendance expected</span>`;
        const rows = [
          ['On time', bar.onTime, colors.onTime],
          ['Late', bar.late, colors.late],
          ['Absent', bar.absent, colors.absent],
        ]
          .map(
            ([name, n, c]) =>
              `<div style="display:flex;justify-content:space-between;gap:20px"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${c};margin-right:6px"></span>${name}</span><strong>${n}</strong></div>`,
          )
          .join('');
        return `${heading}<div style="margin-top:6px">${rows}</div>`;
      },
    },
    xAxis: {
      type: 'category',
      data: bars.map((b) => b.caption),
      ...axisBase(t),
      axisLine: { show: true, lineStyle: { color: t.grid } },
      axisLabel: {
        ...axisBase(t).axisLabel,
        lineHeight: 15,
        interval: 0,
        color: (_value: string, index: number) => (bars[index]?.weekend ? withAlpha(t.muted, 0.55) : t.muted),
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: ceiling,
      minInterval: 1,
      ...axisBase(t),
      splitLine: { lineStyle: { color: t.grid, type: 'dashed', opacity: 0.8 } },
    },
    series: [
      {
        name: 'Weekend',
        type: 'bar',
        barWidth,
        barGap: '-100%',
        silent: true,
        // Hatched track, like the reference's empty columns.
        itemStyle: {
          color: t.grid,
          opacity: 0.55,
          borderRadius: 6,
          decal: {
            symbol: 'rect',
            symbolSize: 1,
            rotation: Math.PI / 4,
            dashArrayX: [1, 0],
            dashArrayY: [2, 4],
            color: t.muted,
          },
        },
        data: bars.map((b) => (b.weekend ? ceiling : null)),
        z: 1,
      },
      stackSeries('On time', 'onTime', colors.onTime),
      stackSeries('Absent', 'absent', colors.absent),
      stackSeries('Late', 'late', colors.late),
    ],
  };
}

// ---------------------------------------------------------------------------
// Departments: donut with the total in the middle and a legend that shows count and share.
// ---------------------------------------------------------------------------
export function departmentOption(
  slices: DashboardDepartmentSlice[],
  total: number,
  t: ChartTheme,
  narrow = false,
): Opt {
  const sorted = [...slices].sort((a, b) => b.value - a.value);
  const sum = sorted.reduce((s, x) => s + x.value, 0) || 1;
  const pct = new Map(sorted.map((s) => [s.label, Math.round((s.value / sum) * 100)]));
  const count = new Map(sorted.map((s) => [s.label, s.value]));

  return {
    textStyle: { fontFamily: t.fontFamily },
    color: t.palette,
    title: {
      text: String(total),
      subtext: 'employees',
      left: narrow ? '50%' : 104,
      top: narrow ? 56 : 'middle',
      textAlign: 'center',
      itemGap: 2,
      textStyle: { fontSize: 30, fontWeight: 700, color: t.text, fontFamily: t.fontFamily },
      subtextStyle: { fontSize: 12, color: t.muted, fontFamily: t.fontFamily },
    },
    tooltip: {
      trigger: 'item',
      ...tooltipStyle(t),
      formatter: (p: unknown) => {
        const item = p as { name: string; value: number; percent: number; color: string };
        return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:6px"></span><strong>${esc(item.name)}</strong><br/>${item.value} employees (${item.percent}%)`;
      },
    },
    legend: {
      type: narrow ? 'plain' : 'scroll',
      orient: narrow ? 'horizontal' : 'vertical',
      ...(narrow ? { left: 'center', bottom: 0 } : { left: 224, top: 'middle' }),
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 11,
      icon: 'circle',
      tooltip: { show: true, ...tooltipStyle(t) },
      pageIconColor: t.muted,
      pageTextStyle: { color: t.muted },
      formatter: (name: string) =>
        narrow ? `{n|${name}}  {v|${count.get(name) ?? 0}}` : `{n|${name}}  {v|${count.get(name) ?? 0}}  {p|${pct.get(name) ?? 0}%}`,
      textStyle: {
        color: t.muted,
        fontSize: 12,
        fontFamily: t.fontFamily,
        rich: {
          n: { color: t.muted, width: 164, fontSize: 12, fontFamily: t.fontFamily, overflow: 'truncate', ellipsis: '…' },
          v: { color: t.text, fontWeight: 700, width: 22, align: 'right', fontSize: 12, fontFamily: t.fontFamily },
          p: { color: t.muted, width: 34, align: 'right', fontSize: 11, fontFamily: t.fontFamily },
        },
      },
    },
    series: [
      {
        type: 'pie',
        radius: narrow ? [48, 70] : [64, 92],
        center: narrow ? ['50%', 78] : [104, '50%'],
        padAngle: 2,
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: t.surface, borderWidth: 2 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 5 },
        data: sorted.map((s) => ({ name: s.label, value: s.value })),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Hiring pipeline: horizontal bars on a scale that fits the data, with value labels.
// ---------------------------------------------------------------------------
export function hiringOption(stages: DashboardFunnelStage[], t: ChartTheme): Opt {
  const total = stages.reduce((s, x) => s + x.value, 0) || 1;
  const order = [0, 1, 5, 3, 2];
  const max = Math.max(1, ...stages.map((s) => s.value));

  return {
    textStyle: { fontFamily: t.fontFamily },
    grid: { left: 8, right: 44, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'item',
      ...tooltipStyle(t),
      formatter: (p: unknown) => {
        const item = p as { name: string; value: number };
        const share = Math.round((item.value / total) * 100);
        return `<strong>${esc(item.name)}</strong><br/>${item.value} candidates (${share}% of pipeline)`;
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: axisMax(max),
      minInterval: 1,
      splitNumber: 4,
      ...axisBase(t),
      splitLine: { lineStyle: { color: t.grid, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: stages.map((s) => s.label),
      ...axisBase(t),
      axisLabel: { ...axisBase(t).axisLabel, fontSize: 12, color: t.text },
    },
    series: [
      {
        type: 'bar',
        barWidth: 18,
        showBackground: true,
        backgroundStyle: { color: t.grid, opacity: 0.35, borderRadius: 9 },
        label: { show: true, position: 'right', color: t.text, fontWeight: 600, fontSize: 12, fontFamily: t.fontFamily },
        data: stages.map((s, i) => ({
          name: s.label,
          value: s.value,
          itemStyle: { color: t.palette[order[i % order.length]!], borderRadius: 9 },
        })),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Headcount growth: area line on an axis sized to the data, last value labelled.
// ---------------------------------------------------------------------------
export function growthAxis(values: number[]): { min: number; max: number; interval: number } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(2, Math.ceil((hi - lo) * 0.5));
  const rough = (hi - lo + 2 * pad) / 4;
  const interval = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((s) => s >= rough) ?? 1000;
  return {
    min: Math.max(0, Math.floor((lo - pad) / interval) * interval),
    max: Math.ceil((hi + pad) / interval) * interval,
    interval,
  };
}

export function growthOption(points: DashboardGrowthPoint[], t: ChartTheme): Opt {
  const values = points.map((p) => p.value);
  const axis = growthAxis(values.length ? values : [0]);
  const last = points.length - 1;

  return {
    textStyle: { fontFamily: t.fontFamily },
    grid: { left: 40, right: 20, top: 28, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: t.muted, type: 'dashed', width: 1 } },
      ...tooltipStyle(t),
      formatter: (params: unknown) => {
        const row = (Array.isArray(params) ? params : [params])[0] as { dataIndex: number; axisValue: string; data: { value: number } };
        const i = row.dataIndex;
        const now = points[i]?.value ?? 0;
        const delta = i > 0 ? now - (points[i - 1]?.value ?? 0) : 0;
        const change = i > 0 ? `<br/><span style="color:${delta > 0 ? t.success : delta < 0 ? t.danger : t.muted}">${delta > 0 ? '+' : ''}${delta} vs ${esc(points[i - 1]?.label)}</span>` : '';
        return `<strong>${esc(row.axisValue)}</strong><br/>${now.toLocaleString('en-US')} employees${change}`;
      },
    },
    xAxis: { type: 'category', boundaryGap: false, data: points.map((p) => p.label), ...axisBase(t) },
    yAxis: {
      type: 'value',
      min: axis.min,
      max: axis.max,
      interval: axis.interval,
      ...axisBase(t),
      splitLine: { lineStyle: { color: t.grid, type: 'dashed' } },
    },
    series: [
      {
        name: 'Employees',
        type: 'line',
        smooth: 0.25,
        symbol: 'circle',
        symbolSize: 8,
        // Points stay invisible until hovered, except the latest one which is always marked.
        itemStyle: { color: t.primary, borderColor: t.surface, borderWidth: 2, opacity: 0 },
        lineStyle: { color: t.primary, width: 2.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(t.primary, 0.28) },
              { offset: 1, color: withAlpha(t.primary, 0.02) },
            ],
          },
        },
        emphasis: { focus: 'series', scale: true, itemStyle: { opacity: 1 } },
        data: values.map((value, i) =>
          i === last
            ? {
                value,
                itemStyle: { opacity: 1 },
                label: { show: true, position: 'top', color: t.text, fontWeight: 700, fontSize: 12, fontFamily: t.fontFamily },
              }
            : { value },
        ),
      },
    ],
  };
}
