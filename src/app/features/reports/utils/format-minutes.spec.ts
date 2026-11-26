import { describe, expect, it } from 'vitest';
import { formatMinutes } from './format-minutes';

describe('formatMinutes', () => {
  it('formats minutes, hours and mixed values', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(125)).toBe('2h 5m');
  });

  it('adds thousands separators to large hour counts', () => {
    expect(formatMinutes(60 * 1234 + 5)).toBe('1,234h 5m');
  });

  it('treats missing, negative and non-finite values as zero and rounds fractions', () => {
    expect(formatMinutes(null)).toBe('0m');
    expect(formatMinutes(undefined)).toBe('0m');
    expect(formatMinutes(-30)).toBe('0m');
    expect(formatMinutes(Number.NaN)).toBe('0m');
    expect(formatMinutes(59.6)).toBe('1h');
  });
});
