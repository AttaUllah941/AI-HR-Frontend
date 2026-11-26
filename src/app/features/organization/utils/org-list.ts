import { computed, signal, type Signal } from '@angular/core';

export const ORG_PAGE_SIZES = [10, 25, 50, 100] as const;

export type OrgStatusFilter = 'all' | 'active' | 'inactive';
export type OrgSortDir = 'asc' | 'desc';

type SortValue = string | number;

/** What the shared footer needs; any paged list (client- or server-side) can provide it. */
export interface OrgPagerControls {
  readonly total: Signal<number>;
  readonly currentPage: Signal<number>;
  readonly totalPages: Signal<number>;
  readonly pageSize: Signal<number>;
  readonly rangeStart: Signal<number>;
  readonly rangeEnd: Signal<number>;
  setPageSize(value: string | number): void;
  prevPage(): void;
  nextPage(): void;
}

/** What the shared toolbar needs from a list; `OrgList` implements it. */
export interface OrgListControls extends OrgPagerControls {
  readonly search: Signal<string>;
  readonly status: Signal<OrgStatusFilter>;
  readonly hasFilters: Signal<boolean>;
  setSearch(value: string): void;
  setStatus(value: OrgStatusFilter): void;
  clearFilters(): void;
}

export interface OrgListOptions<T> {
  items: Signal<readonly T[]>;
  /** Text the search box matches against (case-insensitive, substring). */
  searchText: (item: T) => string;
  /** One accessor per sortable column, keyed by the id passed to `sort()`. */
  sorters: Record<string, (item: T) => SortValue>;
  defaultSort: string;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

/**
 * Client-side search, status filter, sort and paging for the Organization lists. The API returns
 * every record for these small collections, so the work happens here instead of on the server.
 */
export class OrgList<T extends { isActive: boolean }> implements OrgListControls {
  readonly search = signal('');
  readonly status = signal<OrgStatusFilter>('all');
  readonly sortBy = signal<string>('');
  readonly sortDir = signal<OrgSortDir>('asc');
  readonly pageSize = signal<number>(25);
  private readonly page = signal(1);

  readonly hasFilters = computed(() => this.search().trim() !== '' || this.status() !== 'all');

  private readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.status();
    return this.options.items().filter((item) => {
      if (status === 'active' && !item.isActive) return false;
      if (status === 'inactive' && item.isActive) return false;
      return query === '' || this.options.searchText(item).toLowerCase().includes(query);
    });
  });

  private readonly sorted = computed(() => {
    const read = this.options.sorters[this.sortBy()];
    const rows = [...this.filtered()];
    if (!read) return rows;
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return rows.sort((a, b) => dir * compare(read(a), read(b)));
  });

  readonly total = computed(() => this.sorted().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  /** Clamped, so deleting the last row of the last page lands on the new last page. */
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly pageItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });
  readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1,
  );
  readonly rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize(), this.total()));

  constructor(private readonly options: OrgListOptions<T>) {
    this.sortBy.set(options.defaultSort);
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  setStatus(value: OrgStatusFilter): void {
    this.status.set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.status.set('all');
    this.page.set(1);
  }

  /** Click a header to sort by it (ascending first); click again to flip the direction. */
  sort(key: string): void {
    if (this.sortBy() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(key);
      this.sortDir.set('asc');
    }
    this.page.set(1);
  }

  sortIcon(key: string): string {
    if (this.sortBy() !== key) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  ariaSort(key: string): 'ascending' | 'descending' | 'none' {
    if (this.sortBy() !== key) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  setPageSize(value: string | number): void {
    const size = Number(value);
    if (!(ORG_PAGE_SIZES as readonly number[]).includes(size)) return;
    this.pageSize.set(size);
    this.page.set(1);
  }

  prevPage(): void {
    this.page.set(Math.max(1, this.currentPage() - 1));
  }

  nextPage(): void {
    this.page.set(Math.min(this.totalPages(), this.currentPage() + 1));
  }
}
