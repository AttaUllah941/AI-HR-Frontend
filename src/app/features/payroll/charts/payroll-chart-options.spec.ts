import { describe, expect, it } from 'vitest';
import { ChartTheme } from '../../../shared/charts/chart-theme';
import { breakdownOption, compact, costOption, money, monthShort } from './payroll-chart-options';

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

type Series = Array<{ name: string; data: number[] }>;

describe('payroll chart options', () => {
  it('formats money in the given currency without needless decimals', () => {
    // Intl separates a currency code from the digits with a non-breaking space; compare with a plain one.
    const plain = (s: string) => s.replace(/ /g, ' ');
    expect(plain(money(4706250, 'PKR'))).toBe('PKR 4,706,250');
    expect(plain(money(53400.5, 'PKR'))).toBe('PKR 53,400.50');
    expect(money(1200, 'USD')).toBe('$1,200');
    expect(money(10, 'NOT-A-CURRENCY')).toContain('10');
  });

  it('shortens axis labels and month names', () => {
    expect(compact(4_700_000)).toBe('4.7M');
    expect(compact(950)).toBe('950');
    expect(monthShort(10)).toBe('Oct');
    expect(monthShort(13)).toBe('13');
  });

  it('cost chart plots gross and net per month', () => {
    const opt = costOption(
      [
        { month: 8, grossPay: 4_922_829, netPay: 4_684_086 },
        { month: 9, grossPay: 4_950_046, netPay: 4_708_829 },
      ],
      'PKR',
      theme,
    ) as { series: Series; xAxis: { data: string[] } };
    expect(opt.xAxis.data).toEqual(['Aug', 'Sep']);
    expect(opt.series.map((s) => s.name)).toEqual(['Gross pay', 'Net pay']);
    expect(opt.series[1]!.data).toEqual([4_684_086, 4_708_829]);
  });

  it('breakdown stacks net + tax + other deductions up to the gross', () => {
    const opt = breakdownOption(
      [{ month: 10, grossPay: 1000, netPay: 900, totalTax: 60, totalDeductions: 40 }],
      'PKR',
      theme,
    ) as { series: Series };
    const sum = opt.series.reduce((s, x) => s + x.data[0]!, 0);
    expect(sum).toBe(1000);
  });

  it('derives other deductions when the API does not send them', () => {
    const opt = breakdownOption([{ month: 10, grossPay: 1000, netPay: 900, totalTax: 60 }], 'PKR', theme) as { series: Series };
    expect(opt.series.find((s) => s.name === 'Other deductions')!.data[0]).toBe(40);
  });
});
