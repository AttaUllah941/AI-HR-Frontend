import { describe, expect, it } from 'vitest';
import { ChartTheme } from '../../../../shared/charts/chart-theme';
import {
  attendanceOption,
  axisMax,
  departmentOption,
  growthAxis,
  hiringOption,
  niceCeil,
  toAttendanceBars,
} from './dashboard-chart-options';

const theme: ChartTheme = {
  dark: false,
  fontFamily: 'Inter',
  text: 'rgb(30, 30, 40)',
  muted: 'rgb(100, 110, 120)',
  grid: 'rgb(230, 232, 236)',
  surface: 'rgb(255, 255, 255)',
  primary: 'rgb(79, 70, 229)',
  success: 'rgb(34, 197, 94)',
  warning: 'rgb(245, 158, 11)',
  danger: 'rgb(239, 68, 68)',
  info: 'rgb(6, 182, 212)',
  palette: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#64748b'],
};

describe('dashboard chart options', () => {
  it('niceCeil gives friendly axis maxima', () => {
    expect(niceCeil(0)).toBe(1);
    expect(niceCeil(3)).toBe(5);
    expect(niceCeil(38)).toBe(50);
    expect(niceCeil(120)).toBe(200);
  });

  it('hiring funnel scale fits the data instead of a fixed 600+ axis', () => {
    const stages = [
      { label: 'Applied', value: 6 },
      { label: 'Screening', value: 4 },
      { label: 'Interview', value: 8 },
    ];
    const opt = hiringOption(stages, theme) as { xAxis: { max: number } };
    expect(opt.xAxis.max).toBe(10); // was max(600, ...) + 50, which flattened every bar to a dot
    expect(axisMax(24)).toBe(30);
    expect(axisMax(40)).toBe(50);
    expect(axisMax(38)).toBe(40);
    expect(axisMax(0)).toBe(5);
  });

  it('attendance: on-time is present minus late, and weekends are flagged', () => {
    const bars = toAttendanceBars([
      { label: 'Fri', date: '2026-11-20', present: 38, absent: 1, late: 3 },
      { label: 'Sat', date: '2026-11-21', present: 0, absent: 0, late: 0 },
    ]);
    expect(bars[0]).toMatchObject({ onTime: 35, late: 3, absent: 1, weekend: false });
    expect(bars[1]!.weekend).toBe(true);
  });

  it('attendance: weekend days carry no stacked values and get a faded placeholder column', () => {
    const opt = attendanceOption(
      [
        { label: 'Fri', date: '2026-11-20', present: 10, absent: 0, late: 1 },
        { label: 'Sat', date: '2026-11-21', present: 0, absent: 0, late: 0 },
      ],
      theme,
    ) as { series: Array<{ name: string; data: Array<number | null> }> };
    const byName = Object.fromEntries(opt.series.map((s) => [s.name, s.data]));
    expect(byName['On time']).toEqual([9, null]);
    expect(byName['Weekend']![1]).toBeGreaterThan(0);
    expect(byName['Weekend']![0]).toBeNull();
  });

  it('attendance: uses weekday labels when the date is missing (older API)', () => {
    const bars = toAttendanceBars([{ label: 'Sun', present: 0, absent: 0 }]);
    expect(bars[0]!.weekend).toBe(true);
  });

  it('department donut shows the total in the middle and sorts largest first', () => {
    const opt = departmentOption(
      [
        { label: 'QA', value: 7, color: '#000' },
        { label: 'Dev', value: 13, color: '#000' },
      ],
      40,
      theme,
    ) as { title: { text: string }; series: Array<{ data: Array<{ name: string }> }> };
    expect(opt.title.text).toBe('40');
    expect(opt.series[0]!.data.map((d) => d.name)).toEqual(['Dev', 'QA']);
  });

  it('growth axis is sized to the data and never negative', () => {
    expect(growthAxis([38, 39, 40])).toEqual({ min: 36, max: 42, interval: 2 });
    const flat = growthAxis([2, 2, 2]);
    expect(flat.min).toBeGreaterThanOrEqual(0);
    expect(flat.max).toBeGreaterThan(2);
  });
});
