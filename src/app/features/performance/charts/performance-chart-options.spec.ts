import { describe, expect, it } from 'vitest';
import { ChartTheme } from '../../../shared/charts/chart-theme';
import { goalSlices, goalsOption, reviewSlices, reviewsOption, statusText } from './performance-chart-options';

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

describe('performance chart options', () => {
  it('turns status codes into readable text', () => {
    expect(statusText('IN_PROGRESS')).toBe('In progress');
    expect(statusText('ACTIVE')).toBe('Active');
  });

  it('keeps goal slices in a stable order and drops empty statuses', () => {
    const s = goalSlices({ COMPLETED: 5, ACTIVE: 80, CANCELLED: 0, DRAFT: 2 }, theme);
    expect(s.map((x) => x.key)).toEqual(['ACTIVE', 'COMPLETED', 'DRAFT']);
    expect(s[0]!.color).toBe(theme.primary);
  });

  it('orders review slices from draft to completed', () => {
    const s = reviewSlices({ COMPLETED: 3, DRAFT: 1, SUBMITTED: 4 }, theme);
    expect(s.map((x) => x.key)).toEqual(['DRAFT', 'SUBMITTED', 'COMPLETED']);
  });

  it('donut shows the goal total in the middle', () => {
    const opt = goalsOption({ ACTIVE: 80, COMPLETED: 20 }, theme) as { title: { text: string } };
    expect(opt.title.text).toBe('100');
  });

  it('review bars carry one value per status', () => {
    const opt = reviewsOption({ DRAFT: 2, COMPLETED: 6 }, theme) as { series: Array<{ data: Array<{ value: number }> }> };
    expect(opt.series[0]!.data.map((d) => d.value)).toEqual([2, 6]);
  });

  it('copes with no data', () => {
    expect(goalSlices(undefined, theme)).toEqual([]);
    expect(reviewSlices({}, theme)).toEqual([]);
  });
});
