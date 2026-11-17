import { beforeEach, describe, expect, it } from 'vitest';
import { SavedFilters, TablePrefs } from './table-prefs';

describe('TablePrefs', () => {
  beforeEach(() => localStorage.clear());

  it('starts comfortable with every column visible', () => {
    const prefs = new TablePrefs('t');
    expect(prefs.density()).toBe('comfortable');
    expect(prefs.hiddenAttr()).toBeNull();
    expect(prefs.isVisible('manager')).toBe(true);
  });

  it('toggles columns and exposes them for CSS matching', () => {
    const prefs = new TablePrefs('t');
    prefs.toggleColumn('manager');
    prefs.toggleColumn('joined');
    expect(prefs.hiddenAttr()).toBe('manager joined');
    expect(prefs.isVisible('manager')).toBe(false);
    prefs.toggleColumn('manager');
    expect(prefs.hiddenAttr()).toBe('joined');
  });

  it('persists across instances (per table)', () => {
    const a = new TablePrefs('employees');
    a.setDensity('compact');
    a.toggleColumn('status');

    const b = new TablePrefs('employees');
    expect(b.density()).toBe('compact');
    expect(b.isVisible('status')).toBe(false);
    expect(new TablePrefs('other').density()).toBe('comfortable');
  });

  it('ignores corrupt stored data', () => {
    localStorage.setItem('zh_table_t', '{not json');
    expect(new TablePrefs('t').density()).toBe('comfortable');
    localStorage.setItem('zh_table_t', JSON.stringify({ density: 'huge', hidden: [1, 'a'] }));
    const prefs = new TablePrefs('t');
    expect(prefs.density()).toBe('comfortable');
    expect(prefs.hidden()).toEqual(['a']);
  });

  it('reset() restores defaults', () => {
    const prefs = new TablePrefs('t');
    prefs.setDensity('compact');
    prefs.toggleColumn('x');
    prefs.reset();
    expect(prefs.density()).toBe('comfortable');
    expect(prefs.hiddenAttr()).toBeNull();
  });
});

describe('SavedFilters', () => {
  beforeEach(() => localStorage.clear());

  it('saves, replaces by name and persists', () => {
    const saved = new SavedFilters<{ status: string }>('t');
    expect(saved.save('Active', { status: 'ACTIVE' })).toBe(true);
    saved.save('Active', { status: 'ON_LEAVE' });
    expect(saved.filters()).toHaveLength(1);
    expect(new SavedFilters<{ status: string }>('t').filters()[0].value.status).toBe('ON_LEAVE');
  });

  it('rejects blank names and caps the list at 10', () => {
    const saved = new SavedFilters<number>('t');
    expect(saved.save('   ', 1)).toBe(false);
    for (let i = 0; i < 12; i += 1) {
      saved.save(`f${i}`, i);
    }
    expect(saved.filters()).toHaveLength(10);
    expect(saved.filters()[0].name).toBe('f11');
  });

  it('removes presets', () => {
    const saved = new SavedFilters<number>('t');
    saved.save('a', 1);
    saved.remove('a');
    expect(saved.filters()).toEqual([]);
  });
});
