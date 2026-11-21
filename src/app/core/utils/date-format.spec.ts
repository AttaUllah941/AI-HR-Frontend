import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatDuration,
  formatMonthYear,
  formatTime,
  fromIsoDate,
  toDate,
  toIsoDate,
  toIsoLocalDateTime,
} from './date-format';

describe('date-format', () => {
  it('formats dates and times consistently', () => {
    expect(formatDate('2026-11-21')).toBe('21 Nov 2026');
    expect(formatTime(new Date(2026, 10, 21, 9, 5))).toBe('09:05 AM');
    expect(formatTime(new Date(2026, 10, 21, 18, 30))).toBe('06:30 PM');
    expect(formatDateTime(new Date(2026, 10, 21, 9, 5))).toBe('21 Nov 2026, 09:05 AM');
    expect(formatMonthYear('2026-11-21')).toBe('November 2026');
  });

  it('returns the fallback for empty or invalid values', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatTime(undefined, 'n/a')).toBe('n/a');
    expect(toDate('')).toBeNull();
  });

  it('reads a date-only string as that local calendar day (no UTC shift)', () => {
    const d = toDate('2026-11-21')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 21]);
    expect(toIsoDate('2026-11-21')).toBe('2026-11-21');
    expect(fromIsoDate('2026-02-28')?.getDate()).toBe(28);
    expect(fromIsoDate('2026-13-45')).toBeNull();
  });

  it('builds the datetime-local wire format', () => {
    expect(toIsoLocalDateTime(new Date(2026, 10, 21, 9, 5))).toBe('2026-11-21T09:05');
    expect(toIsoLocalDateTime(null)).toBe('');
  });

  it('formats compact date ranges without repeating the month or year', () => {
    expect(formatDateRange('2026-10-14', '2026-10-14')).toBe('14 Oct 2026');
    expect(formatDateRange('2026-10-14', '2026-10-15')).toBe('14–15 Oct 2026');
    expect(formatDateRange('2026-10-28', '2026-11-02')).toBe('28 Oct – 02 Nov 2026');
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('30 Dec 2026 – 02 Jan 2027');
    expect(formatDateRange(null, null)).toBe('—');
    expect(formatDateRange('2026-10-14', null)).toBe('14 Oct 2026');
  });

  it('formats a duration between two instants', () => {
    expect(formatDuration(new Date(2026, 10, 21, 9, 0), new Date(2026, 10, 21, 16, 45))).toBe('7h 45m');
    expect(formatDuration(new Date(2026, 10, 21, 9, 0), null)).toBeNull();
  });
});
