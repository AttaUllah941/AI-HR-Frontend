import { describe, expect, it } from 'vitest';
import { buildReportFileName } from './reports.service';

describe('buildReportFileName', () => {
  const date = new Date('2026-10-24T10:00:00Z');

  it('uses the .xlsx extension for XLSX exports', () => {
    expect(buildReportFileName('PAYROLL', 'XLSX', date)).toBe('zenith-payroll-2026-10-24.xlsx');
  });

  it('keeps csv, pdf and json extensions', () => {
    expect(buildReportFileName('LEAVE', 'CSV', date)).toBe('zenith-leave-2026-10-24.csv');
    expect(buildReportFileName('LEAVE', 'PDF', date)).toBe('zenith-leave-2026-10-24.pdf');
    expect(buildReportFileName('LEAVE', 'JSON', date)).toBe('zenith-leave-2026-10-24.json');
  });
});
