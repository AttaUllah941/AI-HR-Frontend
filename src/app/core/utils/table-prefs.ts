import { computed, signal } from '@angular/core';

export type TableDensity = 'comfortable' | 'compact';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota): preferences just last for this session.
  }
}

interface StoredPrefs {
  density?: TableDensity;
  hidden?: string[];
}

/**
 * Per-table view preferences (row density and hidden columns), persisted in localStorage.
 * Bind `density()` to `[attr.data-density]` and `hiddenAttr()` to `[attr.data-hide]` on the
 * table's wrapper, and mark cells with `data-col="<id>"`; global CSS does the rest.
 */
export class TablePrefs {
  private readonly storageKey: string;

  readonly density = signal<TableDensity>('comfortable');
  readonly hidden = signal<readonly string[]>([]);
  /** Space-separated list for CSS `[data-hide~='col']` matching (null when nothing is hidden). */
  readonly hiddenAttr = computed(() => (this.hidden().length ? this.hidden().join(' ') : null));

  constructor(tableId: string) {
    this.storageKey = `zh_table_${tableId}`;
    const stored = readJson<StoredPrefs>(this.storageKey, {});
    if (stored.density === 'compact' || stored.density === 'comfortable') {
      this.density.set(stored.density);
    }
    if (Array.isArray(stored.hidden)) {
      this.hidden.set(stored.hidden.filter((c): c is string => typeof c === 'string'));
    }
  }

  isVisible(column: string): boolean {
    return !this.hidden().includes(column);
  }

  setDensity(density: TableDensity): void {
    this.density.set(density);
    this.persist();
  }

  toggleColumn(column: string): void {
    this.hidden.update((list) =>
      list.includes(column) ? list.filter((c) => c !== column) : [...list, column],
    );
    this.persist();
  }

  reset(): void {
    this.density.set('comfortable');
    this.hidden.set([]);
    this.persist();
  }

  private persist(): void {
    writeJson(this.storageKey, { density: this.density(), hidden: this.hidden() });
  }
}

export interface SavedFilter<T> {
  name: string;
  value: T;
}

/** Named filter presets for a list page, persisted in localStorage (max 10, newest first). */
export class SavedFilters<T> {
  private static readonly MAX = 10;
  private readonly storageKey: string;

  readonly filters = signal<ReadonlyArray<SavedFilter<T>>>([]);

  constructor(tableId: string) {
    this.storageKey = `zh_filters_${tableId}`;
    const stored = readJson<unknown>(this.storageKey, []);
    if (Array.isArray(stored)) {
      this.filters.set(
        stored.filter(
          (f): f is SavedFilter<T> =>
            !!f && typeof (f as SavedFilter<T>).name === 'string' && 'value' in (f as object),
        ),
      );
    }
  }

  /** Saves (or replaces by name) a preset. Blank names are ignored. */
  save(name: string, value: T): boolean {
    const trimmed = name.trim();
    if (!trimmed) {
      return false;
    }
    this.filters.update((list) =>
      [{ name: trimmed, value }, ...list.filter((f) => f.name !== trimmed)].slice(0, SavedFilters.MAX),
    );
    writeJson(this.storageKey, this.filters());
    return true;
  }

  remove(name: string): void {
    this.filters.update((list) => list.filter((f) => f.name !== name));
    writeJson(this.storageKey, this.filters());
  }
}
