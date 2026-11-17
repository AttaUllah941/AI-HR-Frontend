import { describe, expect, it } from 'vitest';
import { normalizeDashboardSummary } from './dashboard.service';

describe('normalizeDashboardSummary', () => {
  it('fills safe defaults when permission-gated sections are missing', () => {
    const summary = normalizeDashboardSummary({
      greeting: { firstName: 'Ada', message: 'Good morning, Ada', period: 'morning', date: '' },
    });
    expect(summary.kpis).toEqual([]);
    expect(summary.aiInsights.items).toEqual([]);
    expect(summary.attendanceTrend.series).toEqual([]);
    expect(summary.departmentDistribution.total).toBe(0);
    expect(summary.hiringFunnel.stages).toEqual([]);
    expect(summary.employeeGrowth.points).toEqual([]);
    expect(summary.previewMode).toBe(false);
    expect(summary.modules).toEqual({});
  });

  it('keeps server data untouched', () => {
    const summary = normalizeDashboardSummary({
      kpis: [{ key: 'k', label: 'K', value: 3, icon: 'groups', tone: 'primary' }],
      hiringFunnel: { period: 'Current pipeline', stages: [{ label: 'Applied', value: 2 }] },
    });
    expect(summary.kpis).toHaveLength(1);
    expect(summary.hiringFunnel.stages[0].value).toBe(2);
  });
});
