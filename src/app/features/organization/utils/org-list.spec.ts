import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { OrgList } from './org-list';

interface Row {
  name: string;
  level: number;
  isActive: boolean;
}

const ROWS: Row[] = [
  { name: 'Director', level: 5, isActive: true },
  { name: 'analyst', level: 2, isActive: true },
  { name: 'Intern', level: 1, isActive: false },
  { name: 'Manager 10', level: 4, isActive: true },
  { name: 'Manager 2', level: 3, isActive: false },
];

function make(rows: Row[] = ROWS) {
  const items = signal(rows);
  const list = new OrgList<Row>({
    items,
    searchText: (r) => r.name,
    sorters: { name: (r) => r.name, level: (r) => r.level },
    defaultSort: 'name',
  });
  return { items, list };
}

describe('OrgList', () => {
  it('sorts text case-insensitively and numbers inside text naturally', () => {
    const { list } = make();
    expect(list.pageItems().map((r) => r.name)).toEqual([
      'analyst',
      'Director',
      'Intern',
      'Manager 2',
      'Manager 10',
    ]);
  });

  it('flips direction on a second click and resets to ascending on a new column', () => {
    const { list } = make();
    list.sort('name');
    expect(list.ariaSort('name')).toBe('descending');
    list.sort('level');
    expect(list.ariaSort('level')).toBe('ascending');
    expect(list.ariaSort('name')).toBe('none');
    expect(list.pageItems().map((r) => r.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it('filters by search text and by status', () => {
    const { list } = make();
    list.setSearch('  MAN ');
    expect(list.total()).toBe(2);
    list.setStatus('inactive');
    expect(list.pageItems().map((r) => r.name)).toEqual(['Manager 2']);
    expect(list.hasFilters()).toBe(true);
    list.clearFilters();
    expect(list.total()).toBe(5);
    expect(list.hasFilters()).toBe(false);
  });

  it('pages the results and ignores unsupported page sizes', () => {
    const rows = Array.from({ length: 23 }, (_, i) => ({ name: `Row ${i}`, level: i, isActive: true }));
    const { list } = make(rows);
    list.setPageSize(10);
    list.setPageSize(7);
    expect(list.pageSize()).toBe(10);
    expect(list.totalPages()).toBe(3);
    list.nextPage();
    list.nextPage();
    list.nextPage();
    expect(list.currentPage()).toBe(3);
    expect([list.rangeStart(), list.rangeEnd()]).toEqual([21, 23]);
    list.prevPage();
    expect(list.currentPage()).toBe(2);
  });

  it('moves back to the last page when rows disappear', () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({ name: `Row ${i}`, level: i, isActive: true }));
    const { items, list } = make(rows);
    list.setPageSize(10);
    list.nextPage();
    expect(list.currentPage()).toBe(2);
    items.set(rows.slice(0, 10));
    expect(list.currentPage()).toBe(1);
    expect(list.pageItems().length).toBe(10);
  });

  it('reports an empty range when nothing matches', () => {
    const { list } = make();
    list.setSearch('zzz');
    expect([list.total(), list.rangeStart(), list.rangeEnd(), list.totalPages()]).toEqual([0, 0, 0, 1]);
  });
});
