import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  GlobalSearchHit,
  GlobalService,
  RecentSearchItem,
  SearchBookmark,
} from '../../../core/services/global.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';

export interface CommandPaletteData {
  initialQuery?: string;
}

type PaletteKind = 'action' | 'go' | 'hit' | 'recent' | 'bookmark';

interface PaletteItem {
  id: string;
  kind: PaletteKind;
  icon: string;
  title: string;
  subtitle?: string;
  badge?: string;
  run: () => void;
}

interface PaletteSection {
  title: string;
  items: Array<PaletteItem & { index: number }>;
}

interface Destination {
  label: string;
  route: string;
  icon: string;
  permission?: string;
}

const TYPE_LABELS: Record<string, string> = {
  employees: 'Employees',
  departments: 'Departments',
  branches: 'Branches',
  candidates: 'Candidates',
  jobs: 'Jobs',
  files: 'Files',
  users: 'Users',
};

const DESTINATIONS: Destination[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'dashboard', permission: 'dashboard:view' },
  { label: 'Employees', route: '/employees', icon: 'groups', permission: 'employees:view' },
  { label: 'Attendance', route: '/attendance', icon: 'schedule', permission: 'attendance:view' },
  { label: 'Leave', route: '/leave', icon: 'event_available', permission: 'leave:view' },
  { label: 'Payroll', route: '/payroll', icon: 'payments', permission: 'payroll:view' },
  { label: 'Recruitment', route: '/recruitment', icon: 'work', permission: 'recruitment:view' },
  { label: 'Performance', route: '/performance', icon: 'trending_up', permission: 'performance:view' },
  { label: 'Organization', route: '/organization', icon: 'apartment', permission: 'organization:view' },
  { label: 'Documents', route: '/files', icon: 'description', permission: 'files:view' },
  { label: 'Reports', route: '/reports', icon: 'analytics', permission: 'reports:view' },
  { label: 'AI Assistant', route: '/ai/assistant', icon: 'auto_awesome', permission: 'ai:view' },
  { label: 'Notifications', route: '/notifications/inbox', icon: 'notifications', permission: 'notifications:view' },
  { label: 'Settings', route: '/settings', icon: 'settings', permission: 'settings:view' },
  { label: 'My profile', route: '/profile/overview', icon: 'person' },
];

/**
 * Ctrl/Cmd+K palette: quick actions, "go to" destinations, global search results, recent
 * searches and bookmarks. Fully keyboard driven (combobox + listbox pattern):
 * ArrowUp/ArrowDown move, Enter runs, Escape closes.
 */
@Component({
  selector: 'app-command-palette-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './command-palette-dialog.component.html',
  styleUrl: './command-palette-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteDialogComponent implements OnInit {
  private readonly global = inject(GlobalService);
  private readonly auth = inject(AuthService);
  private readonly attendance = inject(AttendanceService);
  private readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<CommandPaletteDialogComponent>);
  readonly data = inject<CommandPaletteData>(MAT_DIALOG_DATA, { optional: true });

  readonly query = new FormControl(this.data?.initialQuery ?? '', { nonNullable: true });
  readonly queryText = signal(this.data?.initialQuery ?? '');
  readonly hits = signal<GlobalSearchHit[]>([]);
  readonly recent = signal<RecentSearchItem[]>([]);
  readonly bookmarks = signal<SearchBookmark[]>([]);
  readonly loading = signal(false);
  readonly activeIndex = signal(0);

  private readonly actions = computed<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];
    if (this.auth.hasPermission('leave:create')) {
      items.push({
        id: 'action-request-leave',
        kind: 'action',
        icon: 'event_available',
        title: 'Request leave',
        subtitle: 'Open the leave request form',
        run: () => this.navigate('/leave/requests', { action: 'apply' }),
      });
    }
    if (this.auth.hasPermission('attendance:create')) {
      items.push({
        id: 'action-clock-in',
        kind: 'action',
        icon: 'login',
        title: 'Clock in',
        subtitle: 'Start your work day now',
        run: () => this.clockIn(),
      });
    }
    const dark = this.theme.mode() === 'dark';
    items.push({
      id: 'action-theme',
      kind: 'action',
      icon: dark ? 'light_mode' : 'dark_mode',
      title: dark ? 'Switch to light theme' : 'Switch to dark theme',
      run: () => {
        this.theme.setMode(dark ? 'light' : 'dark');
        this.dialogRef.close();
      },
    });
    return items;
  });

  private readonly destinations = computed<PaletteItem[]>(() =>
    DESTINATIONS.filter((d) => !d.permission || this.auth.hasPermission(d.permission)).map((d) => ({
      id: `go-${d.route}`,
      kind: 'go' as const,
      icon: d.icon,
      title: `Go to ${d.label}`,
      run: () => this.navigate(d.route),
    })),
  );

  readonly sections = computed<PaletteSection[]>(() => {
    const q = this.queryText().trim().toLowerCase();
    const groups: Array<{ title: string; items: PaletteItem[] }> = [];

    const matching = (items: PaletteItem[]) =>
      q ? items.filter((i) => i.title.toLowerCase().includes(q)) : items;

    const actions = matching(this.actions());
    if (actions.length) {
      groups.push({ title: 'Quick actions', items: actions });
    }

    const go = q ? matching(this.destinations()) : [];
    if (go.length) {
      groups.push({ title: 'Go to', items: go });
    }

    if (this.hits().length) {
      groups.push({
        title: 'Results',
        items: this.hits().map((hit) => ({
          id: `hit-${hit.type}-${hit.id}`,
          kind: 'hit' as const,
          icon: hit.icon,
          title: hit.title,
          subtitle: hit.subtitle,
          badge: this.typeLabel(hit.type),
          run: () => this.navigate(hit.route),
        })),
      });
    }

    if (!q) {
      if (this.recent().length) {
        groups.push({
          title: 'Recent',
          items: this.recent().map((item) => ({
            id: `recent-${item.id}`,
            kind: 'recent' as const,
            icon: 'history',
            title: item.query,
            subtitle: `${item.resultCount} results`,
            run: () => this.navigate('/search', { q: item.query }),
          })),
        });
      }
      if (this.bookmarks().length) {
        groups.push({
          title: 'Bookmarks',
          items: this.bookmarks().map((bm) => ({
            id: `bookmark-${bm.id}`,
            kind: 'bookmark' as const,
            icon: bm.icon || 'bookmark',
            title: bm.title,
            subtitle: bm.route,
            run: () => this.navigate(bm.route),
          })),
        });
      }
    }

    let index = 0;
    return groups.map((group) => ({
      title: group.title,
      items: group.items.map((item) => ({ ...item, index: index++ })),
    }));
  });

  private readonly flat = computed(() => this.sections().flatMap((s) => s.items));
  readonly activeId = computed(() => this.flat()[this.activeIndex()]?.id ?? null);

  ngOnInit(): void {
    this.global
      .listRecent()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.recent.set(res.items.slice(0, 5)),
        error: () => undefined,
      });
    this.global
      .listBookmarks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.bookmarks.set(res.items.slice(0, 5)),
        error: () => undefined,
      });

    // Commands filter instantly; the (slower) server search is debounced and cancels stale calls.
    this.query.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.queryText.set(value);
      this.activeIndex.set(0);
    });

    this.query.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          const trimmed = q.trim();
          if (trimmed.length < 2) {
            this.hits.set([]);
            this.loading.set(false);
            return of(null);
          }
          this.loading.set(true);
          return this.global
            .search({ q: trimmed, pageSize: 8, saveRecent: false })
            .pipe(catchError(() => of({ items: [] as GlobalSearchHit[] })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) {
          this.hits.set(res.items);
          this.loading.set(false);
          this.activeIndex.set(0);
        }
      });

    if ((this.data?.initialQuery ?? '').trim().length >= 2) {
      this.query.setValue(this.data!.initialQuery!.trim());
    }
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.flat().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (count) {
          this.activeIndex.update((i) => (i + 1) % count);
          this.scrollActiveIntoView();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) {
          this.activeIndex.update((i) => (i - 1 + count) % count);
          this.scrollActiveIntoView();
        }
        break;
      case 'Home':
        if (count && !this.query.value) {
          event.preventDefault();
          this.activeIndex.set(0);
        }
        break;
      case 'Enter': {
        const item = this.flat()[this.activeIndex()];
        if (item) {
          event.preventDefault();
          item.run();
        }
        break;
      }
    }
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() => {
      const id = this.activeId();
      if (id) {
        document.getElementById(id)?.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  setActive(index: number): void {
    this.activeIndex.set(index);
  }

  run(item: PaletteItem): void {
    item.run();
  }

  openFullSearch(): void {
    const q = this.query.value.trim();
    this.dialogRef.close();
    void this.router.navigate(['/search'], { queryParams: q ? { q } : {} });
  }

  typeLabel(type: string): string {
    return TYPE_LABELS[type] ?? type;
  }

  private navigate(route: string, queryParams?: Record<string, string>): void {
    this.dialogRef.close();
    void this.router.navigate([route], queryParams ? { queryParams } : undefined);
  }

  private clockIn(): void {
    this.dialogRef.close();
    this.attendance.clockIn().subscribe({
      next: () => this.toast.success('Clocked in. Have a great day!'),
      error: (err: Error) => this.toast.error(err.message || 'Unable to clock in'),
    });
  }
}
