import { describe, expect, it } from 'vitest';
import type { ChartTheme } from '../../../shared/charts/chart-theme';
import { barChartOption, chartSummary, isEmptyChart } from './reports-bar-chart.component';

const THEME = {
  dark: true,
  fontFamily: 'Inter',
  text: 'rgb(1, 2, 3)',
  muted: 'rgb(4, 5, 6)',
  grid: 'rgb(7, 8, 9)',
  surface: 'rgb(10, 11, 12)',
  primary: 'rgb(13, 14, 15)',
  success: 'rgb(0, 0, 0)',
  warning: 'rgb(0, 0, 0)',
  danger: 'rgb(0, 0, 0)',
  info: 'rgb(0, 0, 0)',
  palette: [],
} as ChartTheme;

const POINTS = [
  { label: 'Present', value: 12 },
  { label: 'Absent', value: 3 },
];

describe('isEmptyChart', () => {
  it('is empty with no points or only zero values', () => {
    expect(isEmptyChart(undefined)).toBe(true);
    expect(isEmptyChart([])).toBe(true);
    expect(isEmptyChart([{ label: 'A', value: 0 }])).toBe(true);
    expect(isEmptyChart(POINTS)).toBe(false);
  });
});

describe('chartSummary', () => {
  it('lists every value for screen readers', () => {
    expect(chartSummary('By status', POINTS)).toBe('By status: Present 12, Absent 3');
    expect(chartSummary('Hours', POINTS, 'h')).toBe('Hours: Present 12 h, Absent 3 h');
    expect(chartSummary('', [])).toBe('Bar chart');
  });
});

describe('barChartOption', () => {
  const option = barChartOption(POINTS, THEME, { width: 600, narrow: false }) as Record<string, any>;

  it('takes every colour from the theme, so dark mode works', () => {
    const text = JSON.stringify(option);
    expect(option['series'][0].itemStyle.color).toBe(THEME.primary);
    expect(option['xAxis'].axisLabel.color).toBe(THEME.muted);
    expect(option['yAxis'].splitLine.lineStyle.color).toBe(THEME.grid);
    expect(option['tooltip'].backgroundColor).toBe(THEME.surface);
    // The old light-only colours must be gone.
    for (const old of ['#0ea5e9', '#334155', '#64748b', '#e2e8f0', '#fff']) {
      expect(text).not.toContain(old);
    }
  });

  it('plots the points and shows whole-number ticks only', () => {
    expect(option['xAxis'].data).toEqual(['Present', 'Absent']);
    expect(option['series'][0].data).toEqual([12, 3]);
    expect(option['yAxis'].minInterval).toBe(1);
  });

  it('escapes labels in the tooltip', () => {
    const html = option['tooltip'].formatter({ name: '<img src=x onerror=1>', value: 5 }) as string;
    expect(html).not.toContain('<img');
    expect(html).toContain('&#60;img');
  });

  it('rotates labels when the chart is narrow or crowded', () => {
    const narrow = barChartOption(POINTS, THEME, { width: 300, narrow: true }) as Record<string, any>;
    expect(narrow['xAxis'].axisLabel.rotate).toBe(30);
    expect(option['xAxis'].axisLabel.rotate).toBe(0);
  });
});
