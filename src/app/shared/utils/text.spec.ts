import { describe, expect, it } from 'vitest';
import { humanizeCode, initials } from './text';

describe('humanizeCode', () => {
  it('turns codes into readable names and keeps short acronyms upper case', () => {
    expect(humanizeCode('HR_ADMIN')).toBe('HR Admin');
    expect(humanizeCode('SUPER_ADMIN')).toBe('Super Admin');
    expect(humanizeCode('EMPLOYEE')).toBe('Employee');
    expect(humanizeCode('it-support')).toBe('IT Support');
  });

  it('can produce sentence case for labels', () => {
    expect(humanizeCode('PENDING_VERIFICATION', true)).toBe('Pending verification');
  });

  it('copes with empty input', () => {
    expect(humanizeCode('')).toBe('');
    expect(humanizeCode(null)).toBe('');
    expect(humanizeCode(undefined)).toBe('');
  });
});

describe('initials', () => {
  it('uses the first letter of each name', () => {
    expect(initials('ada', 'lovelace')).toBe('AL');
    expect(initials('Ada', '')).toBe('A');
  });

  it('falls back to the email, then to nothing', () => {
    expect(initials('', '', 'grace@example.com')).toBe('G');
    expect(initials(null, null)).toBe('');
  });
});
