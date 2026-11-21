import { ChartTheme, esc, tooltipStyle } from '../../../shared/charts/chart-theme';

/** ECharts options for the payroll screens. Pure functions of (data, currency, theme) so they can be tested. */
type Opt = Record<string, unknown>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface MonthPoint {
  month: number;
  grossPay: number;
  netPay: number;
  totalTax?: number;
  totalDeductions?: number;
}

export function monthShort(month: number): string {
  return MONTHS[month - 1] ?? String(month);
}

/** "PKR 4,706,250": whole amounts without decimals, fractions with two. */
export function money(amount: number, currency: string): string {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-US')}`;
  }
}

/** "4.7M": short axis labels so big salary totals do not crowd the axis. */
export function compact(amount: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
}

function base(t: ChartTheme) {
  return {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: t.muted, fontSize: 11, fontFamily: t.fontFamily },
  };
}

function legend(t: ChartTheme, names: string[]) {
  return {
    data: names,
    top: 0,
    right: 0,
    icon: 'roundRect',
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 16,
    textStyle: { color: t.muted, fontSize: 12, fontFamily: t.fontFamily },
  };
}

function row(name: string, value: number, color: string, currency: string): string {
  return `<div style="display:flex;justify-content:space-between;gap:24px"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-right:6px"></span>${esc(name)}</span><strong>${esc(money(value, currency))}</strong></div>`;
}

/** Gross vs net pay per month (clustered bars). */
export function costOption(months: MonthPoint[], currency: string, t: ChartTheme): Opt {
  const ceiling = Math.max(1, ...months.map((m) => m.grossPay));
  return {
    textStyle: { fontFamily: t.fontFamily },
    grid: { left: 52, right: 8, top: 36, bottom: 28 },
    legend: legend(t, ['Gross pay', 'Net pay']),
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' } },
      ...tooltipStyle(t),
      formatter: (params: unknown) => {
        const items = (Array.isArray(params) ? params : [params]) as Array<{ dataIndex: number }>;
        const m = months[items[0]?.dataIndex ?? 0];
        if (!m) return '';
        return `<strong>${monthShort(m.month)}</strong><div style="margin-top:6px">${row('Gross pay', m.grossPay, t.palette[0]!, currency)}${row('Net pay', m.netPay, t.success, currency)}</div>`;
      },
    },
    xAxis: { type: 'category', data: months.map((m) => monthShort(m.month)), ...base(t) },
    yAxis: {
      type: 'value',
      min: 0,
      ...base(t),
      axisLabel: { ...base(t).axisLabel, formatter: (v: number) => compact(v) },
      splitLine: { lineStyle: { color: t.grid, type: 'dashed' } },
      max: undefined,
      minInterval: Math.max(1, Math.floor(ceiling / 10)),
    },
    series: [
      { name: 'Gross pay', type: 'bar', barMaxWidth: 26, itemStyle: { color: t.palette[0], borderRadius: [4, 4, 0, 0] }, emphasis: { focus: 'series' }, data: months.map((m) => m.grossPay) },
      { name: 'Net pay', type: 'bar', barMaxWidth: 26, itemStyle: { color: t.success, borderRadius: [4, 4, 0, 0] }, emphasis: { focus: 'series' }, data: months.map((m) => m.netPay) },
    ],
  };
}

/** Where each month's gross pay goes: net to employees, tax and other deductions (stacked to the gross). */
export function breakdownOption(months: MonthPoint[], currency: string, t: ChartTheme): Opt {
  const rows = months.map((m) => {
    const tax = m.totalTax ?? 0;
    // Anything between gross and (net + tax) is other deductions, even if the API did not send it.
    const deductions = m.totalDeductions ?? Math.max(0, m.grossPay - m.netPay - tax);
    return { month: m.month, net: m.netPay, tax, deductions, gross: m.grossPay };
  });
  const bar = (name: string, key: 'net' | 'tax' | 'deductions', color: string) => ({
    name,
    type: 'bar',
    stack: 'gross',
    barMaxWidth: 34,
    itemStyle: { color, borderColor: t.surface, borderWidth: 1 },
    emphasis: { focus: 'series' },
    data: rows.map((r) => r[key]),
  });
  return {
    textStyle: { fontFamily: t.fontFamily },
    grid: { left: 52, right: 8, top: 36, bottom: 28 },
    legend: legend(t, ['Net pay', 'Tax', 'Other deductions']),
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' } },
      ...tooltipStyle(t),
      formatter: (params: unknown) => {
        const items = (Array.isArray(params) ? params : [params]) as Array<{ dataIndex: number }>;
        const r = rows[items[0]?.dataIndex ?? 0];
        if (!r) return '';
        return `<strong>${monthShort(r.month)}</strong><div style="margin-top:6px">${row('Net pay', r.net, t.success, currency)}${row('Tax', r.tax, t.warning, currency)}${row('Other deductions', r.deductions, t.info, currency)}<div style="margin-top:4px;padding-top:4px;border-top:1px solid ${t.grid}">${row('Gross pay', r.gross, t.palette[0]!, currency)}</div></div>`;
      },
    },
    xAxis: { type: 'category', data: rows.map((r) => monthShort(r.month)), ...base(t) },
    yAxis: {
      type: 'value',
      min: 0,
      ...base(t),
      axisLabel: { ...base(t).axisLabel, formatter: (v: number) => compact(v) },
      splitLine: { lineStyle: { color: t.grid, type: 'dashed' } },
    },
    series: [bar('Net pay', 'net', t.success), bar('Tax', 'tax', t.warning), bar('Other deductions', 'deductions', t.info)],
  };
}
